/**
 * flowTrace — the packet-flow engine. Given the canonical model and a flow spec,
 * it WALKS the route tables (buildRouteTables) hop by hop: at each node it
 * longest-prefix-matches the destination against the governing route table,
 * follows the matched rule's nextHop to the next node, and resolves which table
 * governs there. The route tables are the single source of truth, so editing a
 * CIDR or a rule re-routes the trace automatically.
 *
 * OCI routing semantics encoded in the walk:
 *   - A spoke subnet's table (rt-ssn-*) routes egress; default → DRG, OSN → SGW.
 *   - Leaving a VCN toward the DRG, the packet enters via that VCN's attachment
 *     and the DRG attachment table (rt-drg-<env>/rt-drg-hub) decides the next hop.
 *   - Entering the hub VCN FROM the DRG, the hub attachment's ingress table
 *     (rt-hub-ingress) decides the next hop — typically the internal firewall.
 *     This table is consulted ONLY on ingress-to-VCN, never on the way back out.
 *   - A firewall re-injects into its OWN subnet, so after inspection the next hop
 *     comes from that subnet's table (rt-hub-internal / rt-hub-dmz).
 *   - Ingress from the internet (IGW → DMZ FW → LB → INT FW → DRG → spoke) DNATs
 *     at the load balancer: the destination is rewritten to the backend VM there.
 *
 * Output mirrors the ONTV flow feature: an ordered hop list (step-by-step), the
 * animated path segments (node-id pairs), and the route-table rows to highlight.
 */

import type { LzModel } from '../model/types';
import { buildRouteTables, type RouteRule } from './routeTables';
import { contains, hostIpInSubnet, parseCidr } from './cidr';

export type FlowKind = 'egress' | 'ingress' | 'east-west' | 'services';

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
  tableId?: string;
  rowIndex?: number;
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

/** Distinct per-flow colours, assigned in activation order. */
export const FLOW_COLORS = ['#2196F3', '#FF9800', '#4CAF50', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A', '#FF5722'] as const;

const fwIp = (stored: string | undefined, cidr: string) => (stored || '').trim() || hostIpInSubnet(cidr);
const host32 = (cidr: string) => `${hostIpInSubnet(cidr, 10)}/32`;

/** Topology index derived from the model + generated route tables. */
function buildTopo(model: LzModel) {
  const tables = buildRouteTables(model);
  const tableById = new Map(tables.map((t) => [t.id, t]));

  const hubSub = (suffix: string) => {
    const i = model.network.subnets.findIndex((sn) => sn.name.endsWith(suffix));
    return i >= 0 ? { node: `hub-vcn-sn-${i}`, cidr: model.network.subnets[i].cidr } : null;
  };
  const fwInt = hubSub('-fw-int');
  const fwDmz = hubSub('-fw-dmz');
  const lb = hubSub('-lb');
  const intIp = fwInt ? fwIp(model.network.fwIntIp, fwInt.cidr) : '';
  const dmzIp = fwDmz ? fwIp(model.network.fwDmzIp, fwDmz.cidr) : '';

  const envs = model.environments.map((e, i) => ({
    idx: i,
    name: e.name.trim() || `env${i + 1}`,
    attach: `attach-cmp-env-${i}`,
    drgTable: `rt-drg-${e.name.trim() || `env${i + 1}`}`,
    subnets: e.network.subnets.map((sn, j) => ({ cidr: sn.cidr, node: `cmp-env-${i}-vcn-sn-${j}`, role: sn.name.split('-').pop() || `sn${j}` })),
    sgw: `cmp-env-${i}-sgw`,
  }));

  // Map a firewall private IP back to its subnet node + governing table.
  const fwByIp = (ip: string): { node: string; table: string } | null => {
    if (fwInt && ip === intIp) return { node: fwInt.node, table: 'rt-hub-internal' };
    if (fwDmz && ip === dmzIp) return { node: fwDmz.node, table: 'rt-hub-dmz' };
    return null;
  };

  // Short human names for the step-by-step labels.
  const human = (id: string): string => {
    if (id === 'gw-igw') return 'IGW';
    if (id === 'gw-natgw') return 'NAT GW';
    if (id === 'gw-sgw') return 'Hub SGW';
    if (id === 'drg') return 'DRG';
    if (id === 'attach-hub') return 'Hub attach';
    if (fwInt && id === fwInt.node) return 'INT FW';
    if (fwDmz && id === fwDmz.node) return 'DMZ FW';
    if (lb && id === lb.node) return 'LB';
    const at = id.match(/^attach-cmp-env-(\d+)$/);
    if (at) return `${envs[+at[1]]?.name ?? at[1]} attach`;
    const sg = id.match(/^cmp-env-(\d+)-sgw$/);
    if (sg) return `${envs[+sg[1]]?.name ?? sg[1]} SGW`;
    const sub = id.match(/^cmp-env-(\d+)-vcn-sn-(\d+)$/);
    if (sub) return `VM ${envs[+sub[1]]?.subnets[+sub[2]]?.role ?? ''}`.trim();
    const hub = id.match(/^hub-vcn-sn-(\d+)$/);
    if (hub) return model.network.subnets[+hub[1]]?.name.split('-').pop() ?? id;
    return id;
  };

  return { tableById, fwInt, fwDmz, lb, intIp, dmzIp, envs, fwByIp, human };
}
type Topo = ReturnType<typeof buildTopo>;

/** Longest-prefix-match a destination against a table's rules. dest = "ip/32", "0.0.0.0/0", or "OSN". */
function matchRule(rules: RouteRule[], dest: string): { rule: RouteRule; i: number } | null {
  if (dest === 'OSN') {
    const i = rules.findIndex((r) => r.nextHopKind === 'sgw' || r.destination === 'OSN Services');
    return i >= 0 ? { rule: rules[i], i } : null;
  }
  let best = -1;
  let bestPrefix = -1;
  rules.forEach((r, i) => {
    if (!r.matchCidr || !contains(r.matchCidr, dest)) return;
    const p = parseCidr(r.matchCidr)?.prefix ?? -1;
    if (p > bestPrefix) { bestPrefix = p; best = i; }
  });
  return best >= 0 ? { rule: rules[best], i: best } : null;
}

/** Mutable accumulator threaded through the walk. */
interface Acc {
  hops: FlowHop[];
  visual: string[];
  highlights: Map<string, Set<number>>;
  ok: boolean;
}

function pushVisual(acc: Acc, node: string) {
  if (acc.visual[acc.visual.length - 1] !== node) acc.visual.push(node);
}
function highlight(acc: Acc, tableId: string, row: number) {
  const set = acc.highlights.get(tableId) ?? new Set<number>();
  set.add(row);
  acc.highlights.set(tableId, set);
}

/**
 * Walk the route tables from an initial state until the packet reaches a terminal
 * (internet gateway, service gateway, or delivery into the destination spoke).
 * `zone` is the env index the packet currently sits in, or 'hub'.
 */
function walk(
  topo: Topo,
  acc: Acc,
  start: { table: string; dest: string; zone: number | 'hub' },
  dstNode: string | null,
) {
  let tableId = start.table;
  const dest = start.dest;
  let zone = start.zone;

  for (let guard = 0; guard < 16; guard++) {
    const table = topo.tableById.get(tableId);
    if (!table) { acc.ok = false; return; }
    const m = matchRule(table.rules, dest);
    if (!m) { acc.ok = false; return; }
    highlight(acc, tableId, m.i);
    const inspected = tableId === 'rt-hub-internal' || tableId === 'rt-hub-dmz';
    acc.hops.push({
      seq: acc.hops.length + 1, node: table.attachTo, tableId, rowIndex: m.i, inspected,
      label: `${topo.human(table.attachTo)}: ${m.rule.destination} → ${m.rule.target}${inspected ? ' (inspect)' : ''}`,
    });

    const rule = m.rule;
    switch (rule.nextHopKind) {
      case 'drg': {
        const attach = zone === 'hub' ? 'attach-hub' : `attach-cmp-env-${zone}`;
        pushVisual(acc, attach);
        pushVisual(acc, 'drg');
        tableId = zone === 'hub' ? 'rt-drg-hub' : topo.envs[zone].drgTable;
        break;
      }
      case 'attachment': {
        const target = rule.flowTarget ?? '';
        pushVisual(acc, target);
        if (target === 'attach-hub') {
          tableId = 'rt-hub-ingress';
          zone = 'hub';
        } else {
          // Delivered into a spoke VCN → local delivery to the destination VM.
          const e = target.match(/^attach-cmp-env-(\d+)$/);
          zone = e ? +e[1] : zone;
          const deliver = dstNode ?? (e ? `cmp-env-${e[1]}-vcn-sn-0` : '');
          if (deliver) {
            pushVisual(acc, deliver);
            acc.hops.push({ seq: acc.hops.length + 1, node: deliver, label: `→ ${topo.human(deliver)}` });
          }
          return;
        }
        break;
      }
      case 'firewall': {
        const fw = topo.fwByIp(rule.flowTarget ?? '');
        if (!fw) { acc.ok = false; return; }
        pushVisual(acc, fw.node);
        tableId = fw.table;
        zone = 'hub';
        break;
      }
      case 'natgw':
      case 'igw': {
        const gw = rule.flowTarget ?? (rule.nextHopKind === 'natgw' ? 'gw-natgw' : 'gw-igw');
        pushVisual(acc, gw);
        acc.hops.push({ seq: acc.hops.length + 1, node: gw, label: `${topo.human(gw)} → Internet` });
        return;
      }
      case 'sgw': {
        const gw = rule.flowTarget ?? 'gw-sgw';
        pushVisual(acc, gw);
        acc.hops.push({ seq: acc.hops.length + 1, node: gw, label: `${topo.human(gw)} → OSN` });
        return;
      }
      default:
        acc.ok = false;
        return;
    }
  }
  acc.ok = false;
}

/** Trace one resolved flow spec into hops + animated segments + table highlights. */
export function traceFlow(model: LzModel, spec: FlowSpec): FlowTrace {
  const topo = buildTopo(model);
  const acc: Acc = { hops: [], visual: [], highlights: new Map(), ok: true };

  const srcEnv = topo.envs[spec.srcEnv];
  const srcSub = srcEnv?.subnets[spec.srcSubnet ?? 0];
  const dstEnv = spec.dstEnv != null ? topo.envs[spec.dstEnv] : undefined;
  const dstSub = dstEnv?.subnets[spec.dstSubnet ?? 0];

  // Source → destination label for the moving packet pill.
  const srcTag = `${srcEnv?.name ?? ''} ${srcSub?.role ?? 'vm'}`.trim();
  const dstTag = `${dstEnv?.name ?? srcEnv?.name ?? ''} ${dstSub?.role ?? srcSub?.role ?? ''}`.trim();
  const label = spec.kind === 'egress' ? `${srcTag} → INET`
    : spec.kind === 'services' ? `${srcTag} → OSN`
    : spec.kind === 'ingress' ? `INET → ${dstTag}`
    : `${srcTag} → ${dstTag}`;

  if (spec.kind === 'ingress') {
    // Internet → IGW → DMZ FW → LB → (DNAT) → INT FW → DRG → spoke VM.
    const backend = dstSub ?? srcSub;
    const dstNode = backend?.node ?? null;
    if (topo.lb && backend) {
      pushVisual(acc, 'gw-igw');
      // IGW ingress: matches the LB subnet prefix → DMZ FW.
      const igw = topo.tableById.get('rt-hub-igw');
      const mIgw = igw ? matchRule(igw.rules, host32(topo.lb.cidr)) : null;
      if (igw && mIgw && topo.fwDmz) {
        highlight(acc, 'rt-hub-igw', mIgw.i);
        acc.hops.push({ seq: 1, node: 'gw-igw', tableId: 'rt-hub-igw', rowIndex: mIgw.i, label: `IGW: ${mIgw.rule.destination} → ${mIgw.rule.target}` });
        pushVisual(acc, topo.fwDmz.node);
        // DMZ FW inspects, then local-delivers to the LB (intra-VCN, no routed hop).
        acc.hops.push({ seq: 2, node: topo.fwDmz.node, tableId: 'rt-hub-dmz', inspected: true, label: 'DMZ FW: inspect ingress → LB (local)' });
        pushVisual(acc, topo.lb.node);
        // From the LB the destination is the DNATed backend VM.
        walk(topo, acc, { table: 'rt-hub-lb', dest: host32(backend.cidr), zone: 'hub' }, dstNode);
      } else {
        acc.ok = false;
      }
    } else {
      acc.ok = false;
    }
    return finish(spec, acc, label);
  }

  if (!srcSub) return finish(spec, { ...acc, ok: false }, label);
  pushVisual(acc, srcSub.node);

  if (spec.kind === 'services') {
    walk(topo, acc, { table: `rt-ssn-${spec.srcEnv}-${spec.srcSubnet ?? 0}`, dest: 'OSN', zone: spec.srcEnv }, null);
  } else if (spec.kind === 'egress') {
    walk(topo, acc, { table: `rt-ssn-${spec.srcEnv}-${spec.srcSubnet ?? 0}`, dest: '0.0.0.0/0', zone: spec.srcEnv }, null);
  } else {
    // east-west: destination is a host in the dest spoke subnet.
    if (!dstSub) return finish(spec, { ...acc, ok: false }, label);
    walk(topo, acc, { table: `rt-ssn-${spec.srcEnv}-${spec.srcSubnet ?? 0}`, dest: host32(dstSub.cidr), zone: spec.srcEnv }, dstSub.node);
  }
  return finish(spec, acc, label);
}

function finish(spec: FlowSpec, acc: Acc, label: string): FlowTrace {
  const segments: FlowSegment[] = [];
  for (let i = 1; i < acc.visual.length; i++) segments.push({ from: acc.visual[i - 1], to: acc.visual[i] });
  return {
    id: spec.id, kind: spec.kind, color: spec.color, label, ok: acc.ok,
    hops: acc.hops, segments,
    highlights: [...acc.highlights].map(([tableId, rows]) => ({ tableId, rows: [...rows].sort((a, b) => a - b) })),
  };
}

/**
 * Resolve a picker flow id (`<envName>:<kind>` or `<srcEnv>>...<dstEnv>:east-west`)
 * into a FlowSpec against the model. East-west without an explicit dest defaults
 * to the first other environment.
 */
export function specFromId(model: LzModel, id: string, color: string): FlowSpec | null {
  const [scope, kind] = id.split(':');
  if (!scope || !kind || !['egress', 'ingress', 'east-west', 'services'].includes(kind)) return null;
  const envIdx = (name: string) => model.environments.findIndex((e) => (e.name.trim() || '') === name);

  if (kind === 'east-west') {
    const [src, dst] = scope.split('>');
    const srcEnv = envIdx(src);
    if (srcEnv < 0) return null;
    let dstEnv = dst ? envIdx(dst) : model.environments.findIndex((_, i) => i !== srcEnv);
    if (dstEnv < 0) dstEnv = srcEnv;
    return { id, kind, color, srcEnv, dstEnv };
  }
  const srcEnv = envIdx(scope);
  if (srcEnv < 0) return null;
  // Ingress backend defaults to the same env's web subnet.
  return { id, kind: kind as FlowKind, color, srcEnv, dstEnv: kind === 'ingress' ? srcEnv : undefined };
}

/**
 * Trace every active picker flow id. Each picked flow is EXPANDED to all
 * endpoints (spoke subnets) of its source environment — so one pick traces
 * web/app/db/infra together — with sub-trace ids `<baseId>#<subnetIdx>` that all
 * share the base flow's colour. A distinct colour is assigned per base flow.
 */
export function buildFlowTraces(model: LzModel, activeIds: string[]): FlowTrace[] {
  const out: FlowTrace[] = [];
  // `<env>:<kind>` = all endpoints; `<env>:<kind>:<role>` = a single endpoint.
  const allPicks = new Set(activeIds.filter((id) => id.split(':').length === 2));
  activeIds.forEach((id, i) => {
    const color = FLOW_COLORS[i % FLOW_COLORS.length];
    const parts = id.split(':');
    const role = parts.length >= 3 ? parts[2] : undefined;
    // Skip a specific-endpoint pick that's already covered by its all-endpoints pick.
    if (role && allPicks.has(`${parts[0]}:${parts[1]}`)) return;
    const base = specFromId(model, `${parts[0]}:${parts[1]}`, color);
    if (!base) return;
    const env = model.environments[base.srcEnv];
    const roleIdx = (r: string) => env ? env.network.subnets.findIndex((sn) => (sn.name.split('-').pop() || '') === r) : -1;
    const idxs = role ? [roleIdx(role)].filter((k) => k >= 0) : (env ? env.network.subnets.map((_, k) => k) : [0]);
    for (const k of idxs) {
      const spec: FlowSpec = {
        ...base,
        id: `${id}#${k}`,
        // egress/services/east-west vary the SOURCE endpoint; ingress/east-west
        // vary the destination (backend) endpoint.
        srcSubnet: base.kind === 'ingress' ? base.srcSubnet : k,
        dstSubnet: base.kind === 'ingress' || base.kind === 'east-west' ? k : base.dstSubnet,
      };
      const trace = traceFlow(model, spec);
      if (trace.hops.length > 0) out.push(trace);
    }
  });
  return out;
}
