import { flowGroup } from '../diagram/flowOverlayGeometry';
import { flowDestinationSubnet, flowNetworks, flowPeerTargets, flowRoleAllowed } from './flowNetworks';
import type { LzModel } from '../model/types';
import type { RouteRule, RouteTable } from './routeTables';
import { hasHubLoadBalancer } from './hubKinds';
import { contains, hostIpInSubnet, parseCidr } from './cidr';

export type FlowKind = 'egress' | 'ingress' | 'east-west' | 'services' | 'api' | 'lb' | 'lb-return';

/** A resolved flow to trace. Subnet indices default to 0 (web). */
export interface FlowSpec {
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
 * the traffic type instead.
 */
export const FLOW_KIND_COLORS: Record<FlowKind, string> = {
  egress: '#2a78d6',
  api: '#ad6500',
  lb: '#d03f86',
  'lb-return': '#2a78d6',
  services: '#1baf7a',
  'east-west': '#4a3aa7',
  ingress: '#d03f86',
};

export const FLOW_KIND_LABELS: Record<FlowKind, string> = {
  egress: 'Spoke → Internet',
  ingress: 'Internet → Spoke',
  'east-west': 'Spoke → spoke',
  api: 'Kubernetes API Server',
  lb: 'Hub public LB → OKE',
  'lb-return': 'OKE → Hub public LB (response)',
  services: 'Spoke → OCI Services',
};

/**
 * Every flow in the landing zone, traced from each environment's first endpoint:
 * egress, ingress, east-west to every other environment, and OCI services.
 */
export function allFlowIds(model: LzModel): string[] {
  const networks = flowNetworks(model).filter((network) => network.available);
  return networks.flatMap((source) => {
    const picks = (kind: FlowKind, destination?: typeof source) => {
      const roles = source.subnets.filter((sn) => flowRoleAllowed(source, sn.role, kind, destination));
      if (!roles.length) return [];
      const scope = destination ? `${source.name}>${destination.name}` : source.name;
      return (source.oke ? roles : roles.slice(0, 1)).flatMap((sn) => {
        const peers = kind === 'east-west' && destination ? flowPeerTargets(source, sn.role, destination) : [];
        return peers.length ? peers.map((peer) => `${scope}:${kind}:${sn.role}:${peer.role}`) : [`${scope}:${kind}:${sn.role}`];
      });
    };
    return [...picks('lb'), ...picks('lb-return'), ...picks('egress'), ...(hasHubLoadBalancer(model) ? picks('ingress') : []),
      ...networks.filter((other) => other !== source).flatMap((other) => picks('east-west', other)), ...picks('services'), ...networks.filter((other) => other.apiEndpoint).flatMap((other) => picks('api', other))];
  });
}

const fwIp = (cidr: string) => hostIpInSubnet(cidr, 10);
const host32 = (cidr: string) => `${hostIpInSubnet(cidr, 10)}/32`;

/** Resource identity comes from the model; routing policy comes only from generated tables. */
function buildTopo(model: LzModel, tables: RouteTable[]) {
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
  const envs = flowNetworks(model);
  const human = (node: string) => {
    if (node === 'drg') return 'DRG';
    const gateway = node.match(/(?:^|-)(igw|natgw|sgw)(?:-\d+)?$/)?.[1];
    if (gateway === 'igw') return 'Internet gateway';
    if (gateway === 'natgw') return 'NAT gateway';
    if (gateway === 'sgw') return 'Service gateway';
    if (node === 'attach-hub') return 'Hub attachment';
    const network = envs.find((env) => env.attachment === node);
    if (network) return `${network.name} attachment`;
    const endpoint = envs.flatMap((env) => [...env.subnets, ...(env.apiEndpoint ? [env.apiEndpoint] : [])].map((sn) => ({ ...sn, name: env.name }))).find((sn) => sn.node === node);
    if (endpoint) return `${endpoint.name} ${endpoint.role}`;
    const attachment = node.match(/^attach-cmp-env-(\d+)$/);
    if (attachment) return `${envs[+attachment[1]]?.name ?? ''} attachment`;
    const subnet = node.match(/^cmp-env-(\d+)-vcn-sn-(\d+)$/);
    if (subnet) return `${envs[+subnet[1]]?.name ?? ''} ${envs[+subnet[1]]?.subnets[+subnet[2]]?.role ?? ''}`.trim();
    const hub = node.match(/^hub-vcn-sn-(\d+)$/);
    return hub ? model.network.subnets[+hub[1]]?.name ?? node : node;
  };
  return { hubCidr: model.network.hubVcnCidr, tableFor, hasConflictingBinding: (node: string, kind: RouteTable['associations'][number]['kind']) => tablesFor(node, kind).length > 1, fwNodes, trust, untrust, lb, envs, human };
}
type Topo = ReturnType<typeof buildTopo>;

/** OCI longest-prefix match; static routes win an equal-prefix dynamic route. */
export function matchRule(rules: RouteRule[], dest: string): { rule: RouteRule; i: number } | null {
  const candidates = rules.flatMap((rule, i) => {
    if (dest === 'OSN') return rule.destination === 'OSN Services' ? [{ rule, i, prefix: 0 }] : [];
    const prefix = rule.matchCidr && contains(rule.matchCidr, dest) ? parseCidr(rule.matchCidr)?.prefix : undefined;
    return prefix == null ? [] : [{ rule, i, prefix }];
  }).sort((a, b) => b.prefix - a.prefix
    || Number(a.rule.routeType === 'Dynamic') - Number(b.rule.routeType === 'Dynamic'));
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

/** Route bindings distinguish VCN→DRG and DRG→VCN; they are never interchangeable. */
function walk(topo: Topo, acc: Acc, start: { node: string; dest: string; zone: number | 'hub' }, dstNode: string | null) {
  let node = start.node;
  let zone = start.zone;
  let kind: RouteTable['associations'][number]['kind'] = 'subnet';
  for (let guard = 0; guard < 24; guard++) {
    if (zone === 'hub' && dstNode?.startsWith('hub-vcn-sn-') && contains(topo.hubCidr, start.dest)) {
      const inspected = topo.fwNodes.some((fw) => fw.node === node) || node === topo.trust?.node;
      hop(acc, node, `${topo.human(node)}: ${inspected ? 'inspect → ' : ''}local delivery to ${topo.human(dstNode)}`, undefined, undefined, inspected);
      pushVisual(acc, dstNode);
      hop(acc, dstNode, `→ ${topo.human(dstNode)}`);
      return;
    }
    const table = topo.tableFor(node, kind);
    const match = table ? matchRule(table.rules, start.dest) : null;
    if (!table || !match) { acc.ok = false; return; }
    ruleHop(topo, acc, node, table, match);
    const rule = match.rule;
    switch (rule.nextHopKind) {
      case 'drg': {
        node = zone === 'hub' ? 'attach-hub' : topo.envs[zone]?.attachment;
        pushVisual(acc, node);
        pushVisual(acc, 'drg');
        kind = 'drg-attachment';
        break;
      }
      case 'attachment': {
        node = rule.targetNodeId ?? rule.flowTarget ?? '';
        if (!node) { acc.ok = false; return; }
        pushVisual(acc, node);
        const destinationIndex = topo.envs.findIndex((env) => env.attachment === node);
        const destination = destinationIndex >= 0 ? topo.envs[destinationIndex] : undefined;
        const vcn = node === 'attach-hub' ? 'hub-vcn' : destination?.vcnNode ?? '';
        if (!vcn) { acc.ok = false; return; }
        zone = node === 'attach-hub' ? 'hub' : destinationIndex;
        if (topo.hasConflictingBinding(vcn, 'vcn-ingress')) { acc.ok = false; return; }
        const ingress = topo.tableFor(vcn, 'vcn-ingress');
        if (ingress) {
          // The ingress route is applied at the attachment, but bound to the VCN.
          const entry = matchRule(ingress.rules, start.dest);
          if (!entry) { acc.ok = false; return; }
          ruleHop(topo, acc, node, ingress, entry, vcn);
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
        if (!dstNode || !destination || ![...destination.subnets, ...(destination.apiEndpoint ? [destination.apiEndpoint] : [])].some((sn) => sn.node === dstNode)) { acc.ok = false; return; }
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
  const dstSub = spec.kind === 'api' ? destination?.apiEndpoint : destination?.subnets[spec.dstSubnet ?? 0];
  const srcTag = `${source?.name ?? ''} ${srcSub?.role ?? 'vm'}`.trim();
  const backend = dstSub ?? srcSub;
  const dstTag = `${destination?.name ?? source?.name ?? ''} ${backend?.role ?? ''}`.trim();
  const label = spec.kind === 'egress' ? `${srcTag} → INET` : spec.kind === 'services' ? `${srcTag} → OSN`
    : spec.kind === 'ingress' ? `INET → ${dstTag}` : `${srcTag} → ${dstTag}`;
  if (spec.kind === 'lb' || spec.kind === 'lb-return') {
    const lb = source?.hubLb;
    const response = spec.kind === 'lb-return';
    const lbLabel = response ? `${srcTag} → Hub public LB (response)` : `Hub public LB → ${srcTag}`;
    if (!srcSub || !lb || !tables.length || !flowRoleAllowed(source, srcSub.role, spec.kind)) return finish(spec, { ...acc, ok: false }, lbLabel);
    pushVisual(acc, response ? srcSub.node : lb.node);
    walk(topo, acc, { node: response ? srcSub.node : lb.node, dest: host32(response ? lb.cidr : srcSub.cidr), zone: response ? spec.srcEnv : 'hub' }, response ? lb.node : srcSub.node);
    return finish(spec, acc, lbLabel);
  }
  if (spec.kind === 'ingress') {
    if (source?.oke || !topo.lb || !backend || !tables.length) return finish(spec, { ...acc, ok: false }, label);
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
    if (!srcSub || !tables.length) return finish(spec, { ...acc, ok: false }, label);
    if (!flowRoleAllowed(source, srcSub.role, spec.kind, destination, dstSub?.role)) return finish(spec, { ...acc, ok: false }, label);
    pushVisual(acc, srcSub.node);
    if ((spec.kind === 'east-west' || spec.kind === 'api') && !dstSub) return finish(spec, { ...acc, ok: false }, label);
    const dest = spec.kind === 'services' ? 'OSN' : spec.kind === 'egress' ? '0.0.0.0/0' : host32(dstSub!.cidr);
    if (spec.kind === 'api' && destination?.vcnNode === source.vcnNode) {
      if (!topo.tableFor(srcSub.node, 'subnet')) return finish(spec, { ...acc, ok: false }, label);
      hop(acc, srcSub.node, `${srcTag}: local VCN routing → Kubernetes API Server (TCP 6443)`);
      pushVisual(acc, dstSub!.node);
      hop(acc, dstSub!.node, '→ Kubernetes API Server (TCP 6443)');
    } else walk(topo, acc, { node: srcSub.node, dest, zone: source.apiOnly ? 'hub' : spec.srcEnv }, spec.kind === 'east-west' || spec.kind === 'api' ? dstSub!.node : null);
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
  const [scope, kind, role, targetRole] = id.split(':');
  if (!scope || !kind || !['egress', 'ingress', 'east-west', 'services', 'api', 'lb', 'lb-return'].includes(kind)) return null;
  if (kind === 'ingress' && !hasHubLoadBalancer(model)) return null;
  const networks = flowNetworks(model);
  const available = (index: number) => index >= 0 && networks[index].available && networks[index].subnets.length > 0;
  const envIdx = (name: string) => networks.findIndex((e, index) => e.name === name && available(index));
  const hasRole = (index: number, destination?: number) => networks[index].subnets.some((subnet) =>
    (!role || subnet.role === role) && flowRoleAllowed(networks[index], subnet.role, kind, destination === undefined ? undefined : networks[destination], targetRole),
  );

  if (kind === 'east-west' || kind === 'api') {
    const [src, dst] = scope.split('>');
    const srcEnv = envIdx(src);
    if (srcEnv < 0) return null;
    const dstEnv = dst ? envIdx(dst) : networks.findIndex((_, i) => i !== srcEnv && available(i));
    if (dstEnv < 0 || (dstEnv === srcEnv && kind !== 'api') || !hasRole(srcEnv, dstEnv)) return null;
    return { id, kind, color, srcEnv, dstEnv, ...(targetRole ? { dstSubnet: networks[dstEnv].subnets.findIndex((sn) => sn.role === targetRole) } : {}) };
  }
  const srcEnv = envIdx(scope);
  if (srcEnv < 0 || !hasRole(srcEnv)) return null;
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
  const groups = [...new Set(activeIds.map(flowGroup))];
  activeIds.forEach((id) => {
    const parts = id.split(':');
    // Past the cap there is no distinguishable colour left; older saved selections are not drawn.
    const color = colorBy === 'kind'
      ? FLOW_KIND_COLORS[parts[1] as FlowKind]
      : FLOW_COLORS[groups.indexOf(flowGroup(id))];
    if (!color) return;
    const role = parts.length >= 3 ? parts[2] : undefined;
    // Skip a specific-endpoint pick that's already covered by its all-endpoints pick.
    if (role && allPicks.has(`${parts[0]}:${parts[1]}`)) return;
    const base = specFromId(model, id, color);
    if (!base) return;
    const env = flowNetworks(model)[base.srcEnv];
    const roleIdx = (r: string) => env ? env.subnets.findIndex((sn) => sn.role === r) : -1;
    const idxs = role ? [roleIdx(role)].filter((k) => k >= 0) : (env ? env.subnets.map((_, k) => k) : [0]);
    for (const k of idxs) {
      let dstSubnet = base.kind === 'ingress' ? k : base.dstSubnet;
      if (base.kind === 'east-west' && base.dstSubnet === undefined) {
        const sourceRole = env.subnets[k].role;
        const destination = flowNetworks(model)[base.dstEnv!];
        dstSubnet = destination.subnets.indexOf(flowDestinationSubnet(env, sourceRole, destination));
      }
      const spec: FlowSpec = {
        ...base,
        id: `${id}#${k}`,
        // East-west pairs matching roles, falling back to the first destination
        // subnet when the two environments have different endpoint sets.
        srcSubnet: base.kind === 'ingress' ? base.srcSubnet : k,
        dstSubnet,
      };
      const trace = traceFlow(model, spec, tables);
      if (trace.hops.length > 0) out.push(trace);
    }
  });
  return out;
}
