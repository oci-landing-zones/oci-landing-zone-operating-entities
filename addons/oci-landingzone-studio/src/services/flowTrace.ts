import type { LzModel } from '../model/types';
import type { RouteRule, RouteTable } from './routeTables';
import { routePriority } from './routeTables';
import { hasHubLoadBalancer } from './hubKinds';
import { contains, hostIpInSubnet, parseCidr } from './cidr';

import { hybridRoutes, vpnCpeNodeId } from './hybridConnectivity';

export type FlowKind = 'egress' | 'ingress' | 'east-west' | 'services' | 'hybrid-in' | 'hybrid-out';

/** A resolved flow to trace. Subnet indices default to 0 (web). */
export interface FlowSpec {
  hybridId?: string;
  id: string;
  kind: FlowKind;
  color: string;
  srcEnv: number;
  srcSubnet?: number;
  dstEnv?: number;     // east-west / ingress backend
  dstSubnet?: number;
}

export interface FlowHop {
  seq: number;
  node: string;
  /** Occurrence in the ordered resource visits, including attachment hairpins. */
  visitIndex: number;
  tableId?: string;
  /** Generated association owner; VCN ingress is applied at its attachment. */
  tableOwner?: string;
  rowIndex?: number;
  ruleId?: string;
  inspected?: boolean;
  label: string;
}

export interface FlowSegment { from: string; to: string }

export interface FlowTrace {
  id: string;
  kind: FlowKind;
  color: string;
  label: string;               // "prod web → INET" — shown in the moving packet pill
  ok: boolean;                 // false if the path could not fully resolve
  hops: FlowHop[];
  segments: FlowSegment[];
  highlights: { tableId: string; rows: number[] }[];
}

/**
 * Per-flow colours, assigned in activation order and never cycled: blue, aqua,
 * violet, magenta. The hues stay clear of the diagram's own red, amber and green,
 * and the set was checked for colour-blind and normal-vision separation across
 * every pair. Four is also the readable limit for paths on one diagram, so the
 * picker caps active flows at this length.
 */
export const FLOW_COLORS = ['#2a78d6', '#1baf7a', '#4a3aa7', '#d03f86'] as const;

/**
 * "Show all flows" draws too many paths for one colour each, so colour encodes
 * the traffic type instead — the same four validated hues.
 */
export const FLOW_KIND_COLORS: Record<FlowKind, string> = {
  egress: '#2a78d6',
  services: '#1baf7a',
  'east-west': '#4a3aa7',
  ingress: '#d03f86',
  'hybrid-in': '#d03f86',
  'hybrid-out': '#2a78d6',
};

export const FLOW_KIND_LABELS: Record<FlowKind, string> = {
  egress: 'Spoke → Internet',
  ingress: 'Internet → Spoke',
  'east-west': 'Spoke → spoke',
  services: 'Spoke → OCI Services',
  'hybrid-in': 'External network → Spoke',
  'hybrid-out': 'Spoke → External network',
};

/**
 * Every flow in the landing zone, traced from each environment's first endpoint:
 * egress, ingress, east-west to every other environment, and OCI services.
 */
export function allFlowIds(model: LzModel): string[] {
  const envs = model.environments.filter((env) => env.projectNetworkEnabled !== false && env.network.subnets.length > 0).map((env) => ({
    name: env.name.trim(),
    role: env.network?.subnets?.[0]?.name.split('-').pop() ?? '',
  })).filter((env) => env.name);
  return envs.flatMap((env) => {
    const pick = (id: string) => (env.role ? `${id}:${env.role}` : id);
    return [
      pick(`${env.name}:egress`),
      ...(hasHubLoadBalancer(model) ? [pick(`${env.name}:ingress`)] : []),
      ...envs.filter((other) => other.name !== env.name).map((other) => pick(`${env.name}>${other.name}:east-west`)),
      pick(`${env.name}:services`),
      ...hybridRoutes(model).flatMap((connection) => [pick(`${env.name}:hybrid-in@${connection.id}`), pick(`${env.name}:hybrid-out@${connection.id}`)]),
    ];
  });
}

const fwIp = (cidr: string) => hostIpInSubnet(cidr, 10);
const host32 = (cidr: string) => `${hostIpInSubnet(cidr, 10)}/32`;

/** Resource identity comes from the model; routing policy comes only from generated tables. */
function buildTopo(model: LzModel, tables: RouteTable[]) {
  const connections = hybridRoutes(model);
  const externalEndpoints = new Map(connections.map((connection) => [connection.id, connection.type === 'VPN'
    ? vpnCpeNodeId(model.hybridConnectivity!.ipsecs[connection.name]) : connection.id + ':router']));
  const tablesFor = (node: string, kind: RouteTable['associations'][number]['kind']) =>
    tables.filter((table) => table.associations.some((binding) => binding.nodeId === node && binding.kind === kind));
  const tableFor = (node: string, kind: RouteTable['associations'][number]['kind']) => {
    const matches = tablesFor(node, kind);
    return matches.length === 1 ? matches[0] : undefined;
  };
  const hubSub = (suffix: string) => {
    const key = suffix.replace(/^-/, '');
    const i = model.network.subnets.findIndex((sn) => sn.name === key || sn.name.endsWith(suffix));
    return i >= 0 ? { node: `hub-vcn-sn-${i}`, cidr: model.network.subnets[i].cidr } : null;
  };
  const fwNodes = ['-fw-int', '-fw-dmz', '-fw'].flatMap((suffix) => {
    const subnet = hubSub(suffix);
    return subnet ? [subnet] : [];
  });
  const trust = hubSub('-trust');
  const untrust = hubSub('-untrust');
  const lb = hasHubLoadBalancer(model) ? hubSub('-lb') : null;
  const envs = model.environments.map((env, i) => ({
    name: env.name.trim() || `env${i + 1}`,
    subnets: env.network.subnets.map((sn, j) => ({ cidr: sn.cidr, node: `cmp-env-${i}-vcn-sn-${j}`, role: sn.name.split('-').pop() || `sn${j}` })),
  }));
  const human = (node: string) => {
    const hybrid = connections.find((connection) => connection.id === node);
    if (hybrid) return `${hybrid.type} ${hybrid.name}`;
    const vpn = connections.find((connection) => connection.type === 'VPN'
      && (node === connection.id + ':tunnel-1' || node === connection.id + ':tunnel-2'));
    if (vpn) return `VPN ${vpn.name} Tunnel ${node.endsWith('-1') ? '1' : '2'}`;
    const cpe = Object.keys(model.hybridConnectivity?.customer_premises_equipments ?? {}).find((name) => node === `hybrid-cpe-${name}`);
    if (cpe) return `CPE ${cpe}`;
    if (node.startsWith('hybrid-cpe-existing:')) return 'Existing CPE';
    const router = connections.find((connection) => connection.type === 'FastConnect' && node === connection.id + ':router');
    if (router) return `FastConnect ${router.name} customer router`;
    if (node === 'drg') return 'DRG';
    const gateway = node.match(/(?:^|-)(igw|natgw|sgw)(?:-\d+)?$/)?.[1];
    if (gateway === 'igw') return 'Internet gateway';
    if (gateway === 'natgw') return 'NAT gateway';
    if (gateway === 'sgw') return 'Service gateway';
    if (node === 'attach-hub') return 'Hub attachment';
    const attachment = node.match(/^attach-cmp-env-(\d+)$/);
    if (attachment) return `${envs[+attachment[1]]?.name ?? ''} attachment`;
    const subnet = node.match(/^cmp-env-(\d+)-vcn-sn-(\d+)$/);
    if (subnet) return `${envs[+subnet[1]]?.name ?? ''} ${envs[+subnet[1]]?.subnets[+subnet[2]]?.role ?? ''}`.trim();
    const hub = node.match(/^hub-vcn-sn-(\d+)$/);
    return hub ? model.network.subnets[+hub[1]]?.name ?? node : node;
  };
  return { tableFor, hasConflictingBinding: (node: string, kind: RouteTable['associations'][number]['kind']) => tablesFor(node, kind).length > 1, fwNodes, trust, untrust, lb, envs, human, externalEndpoints };
}
type Topo = ReturnType<typeof buildTopo>;

/** OCI longest-prefix match, then static over implicit local or imported routes. */
export function matchRule(rules: RouteRule[], dest: string): { rule: RouteRule; i: number } | null {
  const candidates = rules.flatMap((rule, i) => {
    if (dest === 'OSN') return rule.destination === 'OSN Services' ? [{ rule, i, prefix: 0 }] : [];
    const prefix = rule.matchCidr && contains(rule.matchCidr, dest) ? parseCidr(rule.matchCidr)?.prefix : undefined;
    return prefix == null ? [] : [{ rule, i, prefix }];
  }).sort((a, b) => b.prefix - a.prefix
    || routePriority(a.rule) - routePriority(b.rule));
  const best = candidates[0];
  if (!best) return null;
  const tied = candidates.filter((candidate) => candidate.prefix === best.prefix && candidate.rule.routeType === best.rule.routeType);
  // Multiple equal paths cannot be presented as a single deterministic effective route.
  const target = (rule: RouteRule) => rule.targetKey ?? rule.targetNodeId ?? rule.flowTarget;
  if (tied.some(({ rule }) => rule.nextHopKind !== best.rule.nextHopKind || target(rule) !== target(best.rule))) return null;
  return { rule: best.rule, i: best.i };
}

interface Acc {
  hops: FlowHop[];
  visual: string[];
  highlights: Map<string, Set<number>>;
  ok: boolean;
}
function pushVisual(acc: Acc, node: string) {
  if (acc.visual.at(-1) !== node) acc.visual.push(node);
}
function hop(acc: Acc, node: string, label: string, table?: RouteTable, match?: { rule: RouteRule; i: number }, inspected = false, tableOwner = node) {
  const visitIndex = acc.visual.lastIndexOf(node);
  if (visitIndex < 0) { acc.ok = false; return; }
  acc.hops.push({ seq: acc.hops.length + 1, node, visitIndex, label, inspected,
    ...(table && match ? { tableId: table.id, tableOwner, ruleId: match.rule.id, rowIndex: match.i } : {}) });
  if (table && match) {
    const rows = acc.highlights.get(table.id) ?? new Set<number>();
    rows.add(match.i);
    acc.highlights.set(table.id, rows);
  }
}
function ruleHop(topo: Topo, acc: Acc, node: string, table: RouteTable, match: { rule: RouteRule; i: number }, owner = node) {
  const inspected = topo.fwNodes.some((fw) => fw.node === node) || node === topo.trust?.node || node === topo.untrust?.node;
  hop(acc, node, `${topo.human(node)}: ${match.rule.destination} → ${match.rule.target}${inspected ? ' (inspect)' : ''}`, table, match, inspected, owner);
}

function deliverLocal(topo: Topo, acc: Acc, rule: RouteRule, destination: string | null) {
  if (!destination || !rule.targetNodeId || !destination.startsWith(rule.targetNodeId + '-sn-')) { acc.ok = false; return; }
  pushVisual(acc, destination);
  hop(acc, destination, `→ ${topo.human(destination)} (local)`);
}

/** Route bindings distinguish VCN→DRG and DRG→VCN; they are never interchangeable. */
function walk(topo: Topo, acc: Acc, start: { node: string; dest: string; zone: number | 'hub'; kind?: RouteTable['associations'][number]['kind'] }, dstNode: string | null) {
  let node = start.node;
  let zone = start.zone;
  let kind: RouteTable['associations'][number]['kind'] = start.kind ?? 'subnet';
  for (let guard = 0; guard < 24; guard++) {
    const table = topo.tableFor(node, kind);
    const match = table ? matchRule(table.rules, start.dest) : null;
    if (!table || !match) { acc.ok = false; return; }
    ruleHop(topo, acc, node, table, match);
    const rule = match.rule;
    switch (rule.nextHopKind) {
      case 'local': deliverLocal(topo, acc, rule, dstNode); return;
      case 'drg': {
        node = zone === 'hub' ? 'attach-hub' : `attach-cmp-env-${zone}`;
        pushVisual(acc, node);
        pushVisual(acc, 'drg');
        kind = 'drg-attachment';
        break;
      }
      case 'attachment': {
        node = rule.targetNodeId ?? rule.flowTarget ?? '';
        if (!node) { acc.ok = false; return; }
        pushVisual(acc, node);
        const destination = node.match(/^attach-cmp-env-(\d+)$/);
        const vcn = node === 'attach-hub' ? 'hub-vcn' : destination ? `cmp-env-${destination[1]}-vcn` : '';
        if (!vcn) { acc.ok = false; return; }
        zone = node === 'attach-hub' ? 'hub' : +destination![1];
        if (topo.hasConflictingBinding(vcn, 'vcn-ingress')) { acc.ok = false; return; }
        const ingress = topo.tableFor(vcn, 'vcn-ingress');
        if (ingress) {
          // The ingress route is applied at the attachment, but bound to the VCN.
          const entry = matchRule(ingress.rules, start.dest);
          if (!entry) { acc.ok = false; return; }
          ruleHop(topo, acc, node, ingress, entry, vcn);
          if (entry.rule.nextHopKind === 'local') { deliverLocal(topo, acc, entry.rule, dstNode); return; }
          const target = entry.rule.targetNodeId ?? topo.fwNodes.find((fw) => fwIp(fw.cidr) === entry.rule.flowTarget)?.node;
          if (entry.rule.nextHopKind !== 'firewall' && entry.rule.nextHopKind !== 'nlb' || !target) { acc.ok = false; return; }
          node = target;
          pushVisual(acc, node);
          if (entry.rule.nextHopKind === 'nlb' && node === topo.trust?.node && start.dest === '0.0.0.0/0') {
            if (!topo.untrust) { acc.ok = false; return; }
            hop(acc, node, `${topo.human(node)}: inspect → untrust interface`, undefined, undefined, true);
            node = topo.untrust.node;
            pushVisual(acc, node);
          }
          kind = 'subnet';
          break;
        }
        if (!dstNode || !destination || !dstNode.startsWith(`cmp-env-${destination[1]}-vcn-sn-`)) { acc.ok = false; return; }
        pushVisual(acc, dstNode);
        hop(acc, dstNode, `→ ${topo.human(dstNode)}`);
        return;
      }
      case 'firewall':
      case 'nlb': {
        const target = rule.targetNodeId ?? (rule.nextHopKind === 'firewall'
          ? topo.fwNodes.find((fw) => fwIp(fw.cidr) === rule.flowTarget)?.node : rule.flowTarget);
        if (!target) { acc.ok = false; return; }
        node = target;
        pushVisual(acc, node);
        // The third-party firewall's internet-facing interface is not an OCI route rule.
        if (rule.nextHopKind === 'nlb' && node === topo.trust?.node && start.dest === '0.0.0.0/0') {
          if (!topo.untrust) { acc.ok = false; return; }
          hop(acc, node, `${topo.human(node)}: inspect → untrust interface`, undefined, undefined, true);
          node = topo.untrust.node;
          pushVisual(acc, node);
        }
        zone = 'hub';
        kind = 'subnet';
        break;
      }
      case 'natgw':
      case 'igw':
      case 'sgw': {
        const gateway = rule.targetNodeId ?? rule.flowTarget;
        if (!gateway) { acc.ok = false; return; }
        pushVisual(acc, gateway);
        hop(acc, gateway, `${topo.human(gateway)} → ${rule.nextHopKind === 'sgw' ? 'OCI Services' : 'Internet'}`);
        return;
      }
      case 'external': {
        const target = rule.targetNodeId ?? rule.flowTarget;
        if (!target) { acc.ok = false; return; }
        if (target.startsWith('hybrid-vpn-')) pushVisual(acc, target + ':tunnel-1');
        else pushVisual(acc, target);
        const endpoint = topo.externalEndpoints.get(target) ?? target;
        pushVisual(acc, endpoint);
        hop(acc, endpoint, `→ ${topo.human(endpoint)} (expected path; deployed routes are unavailable)`);
        return;
      }
      default: acc.ok = false; return;
    }
  }
  acc.ok = false;
}

export function traceFlow(model: LzModel, spec: FlowSpec, tables: RouteTable[] = []): FlowTrace {
  const topo = buildTopo(model, tables);
  const acc: Acc = { hops: [], visual: [], highlights: new Map(), ok: true };
  const source = topo.envs[spec.srcEnv];
  const srcSub = source?.subnets[spec.srcSubnet ?? 0];
  const destination = spec.dstEnv != null ? topo.envs[spec.dstEnv] : undefined;
  const dstSub = destination?.subnets[spec.dstSubnet ?? 0];
  const srcTag = `${source?.name ?? ''} ${srcSub?.role ?? 'vm'}`.trim();
  const backend = dstSub ?? srcSub;
  const dstTag = `${destination?.name ?? source?.name ?? ''} ${backend?.role ?? ''}`.trim();
  if (spec.kind === 'hybrid-in' || spec.kind === 'hybrid-out') {
    const connection = hybridRoutes(model).find((entry) => entry.id === spec.hybridId);
    const local = spec.kind === 'hybrid-in' ? backend : srcSub;
    const label = spec.kind === 'hybrid-in' ? `${connection?.name} → ${dstTag}` : `${srcTag} → ${connection?.name}`;
    if (!connection || !local || !connection.cidrs[0] || !parseCidr(connection.cidrs[0])) return finish(spec, { ...acc, ok: false }, label);
    if (spec.kind === 'hybrid-in') {
      pushVisual(acc, topo.externalEndpoints.get(connection.id)!);
      const ingress = connection.type === 'VPN' ? connection.id + ':tunnel-1' : connection.id;
      pushVisual(acc, ingress);
      pushVisual(acc, 'drg');
      walk(topo, acc, { node: ingress, kind: 'drg-attachment', dest: host32(local.cidr), zone: 'hub' }, local.node);
    } else {
      pushVisual(acc, local.node);
      walk(topo, acc, { node: local.node, dest: host32(connection.cidrs[0]), zone: spec.srcEnv }, null);
    }
    return finish(spec, acc, label);
  }
  const label = spec.kind === 'egress' ? `${srcTag} → INET` : spec.kind === 'services' ? `${srcTag} → OSN`
    : spec.kind === 'ingress' ? `INET → ${dstTag}` : `${srcTag} → ${dstTag}`;
  if (spec.kind === 'ingress') {
    if (!topo.lb || !backend || !tables.length) return finish(spec, { ...acc, ok: false }, label);
    pushVisual(acc, 'gw-igw');
    if (topo.hasConflictingBinding('gw-igw', 'gateway')) return finish(spec, { ...acc, ok: false }, label);
    const ingress = topo.tableFor('gw-igw', 'gateway');
    if (ingress) {
      const match = matchRule(ingress.rules, host32(topo.lb.cidr));
      if (!match) return finish(spec, { ...acc, ok: false }, label);
      ruleHop(topo, acc, 'gw-igw', ingress, match);
      const target = match.rule.targetNodeId ?? (match.rule.nextHopKind === 'firewall'
        ? topo.fwNodes.find((fw) => fwIp(fw.cidr) === match.rule.flowTarget)?.node : match.rule.flowTarget);
      if (!target || !['firewall', 'nlb'].includes(match.rule.nextHopKind)) return finish(spec, { ...acc, ok: false }, label);
      pushVisual(acc, target);
      hop(acc, target, `${topo.human(target)}: inspect → load balancer (local)`, undefined, undefined, true);
    } else hop(acc, 'gw-igw', 'Internet gateway → public load balancer');
    pushVisual(acc, topo.lb.node);
    walk(topo, acc, { node: topo.lb.node, dest: host32(backend.cidr), zone: 'hub' }, backend.node);
  } else {
    if (!srcSub) return finish(spec, { ...acc, ok: false }, label);
    pushVisual(acc, srcSub.node);
    if (spec.kind === 'east-west' && !dstSub) return finish(spec, { ...acc, ok: false }, label);
    const dest = spec.kind === 'services' ? 'OSN' : spec.kind === 'egress' ? '0.0.0.0/0' : host32(dstSub!.cidr);
    walk(topo, acc, { node: srcSub.node, dest, zone: spec.srcEnv }, spec.kind === 'east-west' ? dstSub!.node : null);
  }
  return finish(spec, acc, label);
}

function finish(spec: FlowSpec, acc: Acc, label: string): FlowTrace {
  return { id: spec.id, kind: spec.kind, color: spec.color, label, ok: acc.ok, hops: acc.hops,
    segments: acc.visual.slice(1).map((node, i) => ({ from: acc.visual[i], to: node })),
    highlights: [...acc.highlights].map(([tableId, rows]) => ({ tableId, rows: [...rows].sort((a, b) => a - b) })) };
}

/**
 * Resolve a picker flow id (`<envName>:<kind>` or `<srcEnv>>...<dstEnv>:east-west`)
 * into a FlowSpec against the model. East-west without an explicit dest defaults
 * to the first other environment.
 */
export function specFromId(model: LzModel, id: string, color: string): FlowSpec | null {
  const [scope, kindPart, role] = id.split(':');
  const [kind, hybridId] = (kindPart ?? '').split('@');
  if (!scope || !kind || !['egress', 'ingress', 'east-west', 'services', 'hybrid-in', 'hybrid-out'].includes(kind)) return null;
  if (kind === 'ingress' && !hasHubLoadBalancer(model)) return null;
  const available = (index: number) => index >= 0 && model.environments[index].projectNetworkEnabled !== false
    && model.environments[index].network.subnets.length > 0;
  const envIdx = (name: string) => model.environments.findIndex((e, index) => e.name.trim() === name && available(index));
  const hasRole = (index: number) => !role || model.environments[index].network.subnets.some((subnet) => subnet.name.split('-').pop() === role);

  if (kind === 'east-west') {
    const [src, dst] = scope.split('>');
    const srcEnv = envIdx(src);
    if (srcEnv < 0 || !hasRole(srcEnv)) return null;
    const dstEnv = dst ? envIdx(dst) : model.environments.findIndex((_, i) => i !== srcEnv && available(i));
    if (dstEnv < 0 || dstEnv === srcEnv) return null;
    return { id, kind, color, srcEnv, dstEnv };
  }
  const srcEnv = envIdx(scope);
  if (srcEnv < 0 || !hasRole(srcEnv)) return null;
  if (kind === 'hybrid-in' || kind === 'hybrid-out') {
    if (!hybridRoutes(model).some((connection) => connection.id === hybridId)) return null;
    return { id, kind, color, srcEnv, dstEnv: srcEnv, hybridId };
  }
  // Ingress backend defaults to the same env's web subnet.
  return { id, kind: kind as FlowKind, color, srcEnv, dstEnv: kind === 'ingress' ? srcEnv : undefined };
}

/**
 * Trace every active picker flow id. Each picked flow is EXPANDED to all
 * endpoints (spoke subnets) of its source environment — so one pick traces
 * web/app/db/infra together — with sub-trace ids `<baseId>#<subnetIdx>` that all
 * share the base flow's colour. A distinct colour is assigned per base flow.
 */
export function buildFlowTraces(model: LzModel, activeIds: string[], colorBy: 'flow' | 'kind' = 'flow', tables: RouteTable[] = []): FlowTrace[] {
  const out: FlowTrace[] = [];
  // `<env>:<kind>` = all endpoints; `<env>:<kind>:<role>` = a single endpoint.
  const allPicks = new Set(activeIds.filter((id) => id.split(':').length === 2));
  // One colour per flow, shared by every endpoint picked for it.
  const groups = [...new Set(activeIds.map((id) => id.split(':').slice(0, 2).join(':')))];
  activeIds.forEach((id) => {
    const parts = id.split(':');
    // Past the cap there is no distinguishable colour left; older saved selections are not drawn.
    const color = colorBy === 'kind'
      ? FLOW_KIND_COLORS[parts[1].split('@')[0] as FlowKind]
      : FLOW_COLORS[groups.indexOf(`${parts[0]}:${parts[1]}`)];
    if (!color) return;
    const role = parts.length >= 3 ? parts[2] : undefined;
    // Skip a specific-endpoint pick that's already covered by its all-endpoints pick.
    if (role && allPicks.has(`${parts[0]}:${parts[1]}`)) return;
    const base = specFromId(model, id, color);
    if (!base) return;
    const env = model.environments[base.srcEnv];
    const roleIdx = (r: string) => env ? env.network.subnets.findIndex((sn) => (sn.name.split('-').pop() || '') === r) : -1;
    const idxs = role ? [roleIdx(role)].filter((k) => k >= 0) : (env ? env.network.subnets.map((_, k) => k) : [0]);
    for (const k of idxs) {
      let dstSubnet = base.kind === 'ingress' ? k : base.dstSubnet;
      if (base.kind === 'east-west') {
        const sourceRole = env.network.subnets[k].name.split('-').pop();
        const destination = model.environments[base.dstEnv!];
        const matchingRole = destination.network.subnets.findIndex((subnet) => subnet.name.split('-').pop() === sourceRole);
        dstSubnet = matchingRole >= 0 ? matchingRole : 0;
      }
      const spec: FlowSpec = {
        ...base,
        id: `${id}#${k}`,
        // East-west pairs matching roles, falling back to the first destination
        // subnet when the two environments have different endpoint sets.
        srcSubnet: base.kind === 'ingress' ? base.srcSubnet : k,
        dstSubnet: base.kind === 'hybrid-in' ? k : dstSubnet,
      };
      const trace = traceFlow(model, spec, tables);
      if (trace.hops.length > 0) out.push(trace);
    }
  });
  return out;
}
