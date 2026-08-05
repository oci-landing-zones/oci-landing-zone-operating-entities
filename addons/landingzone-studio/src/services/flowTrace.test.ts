import { describe, expect, it } from 'vitest';
import { buildFlowTraces, specFromId, traceFlow, type FlowSpec } from './flowTrace';
import { emptyLzModel } from '../model/defaults';
import { hubKindDefaults } from './hubKinds';

const C = '#2196F3';
// Default model: hub subnets fw-dmz(0) lb(1) fw-int(2) mgmt(3) mon(4) dns(5);
// envs prod(0) preprod(1), spoke subnets web/app/db/infra; dmzIp 10.0.0.4, intIp 10.0.2.4.
const seq = (hops: { node: string; tableId?: string; rowIndex?: number }[]) =>
  hops.map((h) => [h.node, h.tableId, h.rowIndex]);
const segs = (s: { from: string; to: string }[]) => s.map((e) => `${e.from}->${e.to}`);

describe('flowTrace — walks the route tables per the validated OCI spec', () => {
  it('EGRESS: spoke VM → DRG → hub ingress → INT FW → NAT GW', () => {
    const t = traceFlow(emptyLzModel(), { id: 'prod:egress', kind: 'egress', color: C, srcEnv: 0, srcSubnet: 0 });
    expect(t.ok).toBe(true);
    expect(seq(t.hops)).toEqual([
      ['cmp-env-0-vcn-sn-0', 'rt-ssn-0', 0],
      ['attach-cmp-env-0', 'rt-drg-spokes', 0],
      ['attach-hub', 'rt-hub-ingress', 0],
      ['hub-vcn-sn-2', 'rt-hub-internal', 0],
      ['gw-natgw', undefined, undefined],
    ]);
    expect(t.hops.find((h) => h.tableId === 'rt-hub-internal')!.inspected).toBe(true);
    expect(t.highlights).toEqual([
      { tableId: 'rt-ssn-0', rows: [0] },
      { tableId: 'rt-drg-spokes', rows: [0] },
      { tableId: 'rt-hub-ingress', rows: [0] },
      { tableId: 'rt-hub-internal', rows: [0] },
    ]);
    expect(segs(t.segments)).toEqual([
      'cmp-env-0-vcn-sn-0->attach-cmp-env-0',
      'attach-cmp-env-0->drg',
      'drg->attach-hub',
      'attach-hub->hub-vcn-sn-2',
      'hub-vcn-sn-2->gw-natgw',
    ]);
  });

  it('SERVICES: spoke VM → spoke SGW → OSN (longest-prefix prefers OSN over 0/0)', () => {
    const t = traceFlow(emptyLzModel(), { id: 'prod:services', kind: 'services', color: C, srcEnv: 0, srcSubnet: 0 });
    expect(t.ok).toBe(true);
    expect(seq(t.hops)).toEqual([
      ['cmp-env-0-vcn-sn-0', 'rt-ssn-0', 1],
      ['cmp-env-0-sgw', undefined, undefined],
    ]);
    expect(t.highlights).toEqual([{ tableId: 'rt-ssn-0', rows: [1] }]);
    expect(segs(t.segments)).toEqual(['cmp-env-0-vcn-sn-0->cmp-env-0-sgw']);
  });

  it('EAST-WEST prod→preprod: INT-FW hairpin, longest-prefix picks the per-spoke rule', () => {
    const t = traceFlow(emptyLzModel(), { id: 'prod>preprod:east-west', kind: 'east-west', color: C, srcEnv: 0, srcSubnet: 0, dstEnv: 1, dstSubnet: 0 });
    expect(t.ok).toBe(true);
    expect(seq(t.hops)).toEqual([
      ['cmp-env-0-vcn-sn-0', 'rt-ssn-0', 0],
      ['attach-cmp-env-0', 'rt-drg-spokes', 0],
      ['attach-hub', 'rt-hub-ingress', 2],
      ['hub-vcn-sn-2', 'rt-hub-internal', 2],
      ['attach-hub', 'rt-drg-hub', 1],
      ['cmp-env-1-vcn-sn-0', undefined, undefined],
    ]);
    // The hairpin retraces the hub attachment + DRG.
    expect(segs(t.segments)).toEqual([
      'cmp-env-0-vcn-sn-0->attach-cmp-env-0',
      'attach-cmp-env-0->drg',
      'drg->attach-hub',
      'attach-hub->hub-vcn-sn-2',
      'hub-vcn-sn-2->attach-hub',
      'attach-hub->drg',
      'drg->attach-cmp-env-1',
      'attach-cmp-env-1->cmp-env-1-vcn-sn-0',
    ]);
    expect(t.highlights).toContainEqual({ tableId: 'rt-drg-hub', rows: [1] });
  });

  it('INGRESS: INET → IGW → DMZ FW → LB → INT FW → DRG → spoke VM (LB→backend inspected, post-fix)', () => {
    const t = traceFlow(emptyLzModel(), { id: 'prod:ingress', kind: 'ingress', color: C, srcEnv: 0, dstEnv: 0, dstSubnet: 0 });
    expect(t.ok).toBe(true);
    expect(seq(t.hops)).toEqual([
      ['gw-igw', 'rt-hub-igw', 0],
      ['hub-vcn-sn-0', 'rt-hub-dmz', undefined],   // DMZ FW local-delivers to the LB
      ['hub-vcn-sn-1', 'rt-hub-lb', 1],            // LB → INT FW (the bug-fix: not straight to DRG)
      ['hub-vcn-sn-2', 'rt-hub-internal', 1],      // INT FW → DRG
      ['attach-hub', 'rt-drg-hub', 0],             // prod VCN → prod attach
      ['cmp-env-0-vcn-sn-0', undefined, undefined],
    ]);
    // The LB→backend leg is inspected by the internal firewall (regression guard for the rt-hub-lb fix).
    expect(t.highlights).toContainEqual({ tableId: 'rt-hub-lb', rows: [1] });
    expect(t.highlights.find((h) => h.tableId === 'rt-hub-internal')).toEqual({ tableId: 'rt-hub-internal', rows: [1] });
    // rt-hub-ingress is NOT consulted on egress-to-DRG (only entering the VCN from the DRG).
    expect(t.highlights.find((h) => h.tableId === 'rt-hub-ingress')).toBeUndefined();
  });

  it('specFromId resolves picker ids; east-west without a dest defaults to the first other env', () => {
    const m = emptyLzModel();
    expect(specFromId(m, 'prod:egress', C)).toMatchObject<Partial<FlowSpec>>({ kind: 'egress', srcEnv: 0 });
    expect(specFromId(m, 'prod>preprod:east-west', C)).toMatchObject<Partial<FlowSpec>>({ kind: 'east-west', srcEnv: 0, dstEnv: 1 });
    expect(specFromId(m, 'prod:east-west', C)).toMatchObject<Partial<FlowSpec>>({ kind: 'east-west', srcEnv: 0, dstEnv: 1 });
    expect(specFromId(m, 'bogus:egress', C)).toBeNull();
  });

  it('buildFlowTraces expands each pick to all env endpoints, distinct colour per base flow', () => {
    const traces = buildFlowTraces(emptyLzModel(), ['prod:egress', 'preprod:services']);
    // 4 prod endpoints (egress) + 4 preprod endpoints (services).
    expect(traces).toHaveLength(8);
    expect(traces.every((t) => t.ok)).toBe(true);
    // One colour per base flow (shared across its endpoint sub-traces).
    expect(new Set(traces.map((t) => t.color)).size).toBe(2);
    expect(traces.map((t) => t.id)).toEqual([
      'prod:egress#0', 'prod:egress#1', 'prod:egress#2', 'prod:egress#3',
      'preprod:services#0', 'preprod:services#1', 'preprod:services#2', 'preprod:services#3',
    ]);
    // Each prod egress sub-trace starts at its own spoke subnet.
    expect(traces.slice(0, 4).map((t) => t.hops[0].node)).toEqual([
      'cmp-env-0-vcn-sn-0', 'cmp-env-0-vcn-sn-1', 'cmp-env-0-vcn-sn-2', 'cmp-env-0-vcn-sn-3',
    ]);
    expect(traces[4].hops[0].node).toBe('cmp-env-1-vcn-sn-0');
  });

  it('Hub E traces local spoke egress and direct spoke-to-spoke routing', () => {
    const base = emptyLzModel();
    const model = { ...base, network: { ...base.network, hubKind: 'hub_e' as const, ...hubKindDefaults('hub_e') } };
    const egress = traceFlow(model, { id: 'prod:egress', kind: 'egress', color: C, srcEnv: 0, srcSubnet: 0 });
    expect(egress.ok).toBe(true);
    expect(segs(egress.segments)).toEqual(['cmp-env-0-vcn-sn-0->cmp-env-0-natgw']);
    const eastWest = traceFlow(model, { id: 'prod>preprod:east-west', kind: 'east-west', color: C, srcEnv: 0, srcSubnet: 0, dstEnv: 1, dstSubnet: 0 });
    expect(eastWest.ok).toBe(true);
    expect(segs(eastWest.segments)).toEqual([
      'cmp-env-0-vcn-sn-0->attach-cmp-env-0', 'attach-cmp-env-0->drg',
      'drg->attach-cmp-env-1', 'attach-cmp-env-1->cmp-env-1-vcn-sn-0',
    ]);
  });

  it('Hub B traces all routed traffic through its single OCI Network Firewall', () => {
    const base = emptyLzModel();
    const model = { ...base, network: { ...base.network, hubKind: 'hub_b' as const, ...hubKindDefaults('hub_b') } };
    const egress = traceFlow(model, { id: 'prod:egress', kind: 'egress', color: C, srcEnv: 0, srcSubnet: 0 });
    expect(egress.ok).toBe(true);
    expect(segs(egress.segments)).toEqual([
      'cmp-env-0-vcn-sn-0->attach-cmp-env-0', 'attach-cmp-env-0->drg', 'drg->attach-hub',
      'attach-hub->hub-vcn-sn-1', 'hub-vcn-sn-1->gw-natgw',
    ]);
    expect(egress.hops.find((h) => h.tableId === 'rt-hub-fw')!.inspected).toBe(true);
    const ingress = traceFlow(model, { id: 'prod:ingress', kind: 'ingress', color: C, srcEnv: 0, dstEnv: 0, dstSubnet: 0 });
    expect(ingress.ok).toBe(true);
    expect(segs(ingress.segments)).toEqual([
      'gw-igw->hub-vcn-sn-0', 'hub-vcn-sn-0->hub-vcn-sn-1', 'hub-vcn-sn-1->attach-hub',
      'attach-hub->drg', 'drg->attach-cmp-env-0', 'attach-cmp-env-0->cmp-env-0-vcn-sn-0',
    ]);
    const eastWest = traceFlow(model, { id: 'prod>preprod:east-west', kind: 'east-west', color: C, srcEnv: 0, srcSubnet: 0, dstEnv: 1, dstSubnet: 0 });
    expect(eastWest.ok).toBe(true);
    expect(eastWest.hops.some((h) => h.tableId === 'rt-hub-fw')).toBe(true);
  });

  it('Hub C traces traffic through trust and untrust NLB/firewall pairs', () => {
    const base = emptyLzModel();
    const model = { ...base, network: { ...base.network, hubKind: 'hub_c' as const, ...hubKindDefaults('hub_c') } };
    const egress = traceFlow(model, { id: 'prod:egress', kind: 'egress', color: C, srcEnv: 0, srcSubnet: 0 });
    expect(egress.ok).toBe(true);
    expect(segs(egress.segments)).toEqual([
      'cmp-env-0-vcn-sn-0->attach-cmp-env-0', 'attach-cmp-env-0->drg', 'drg->attach-hub',
      'attach-hub->hub-vcn-sn-1', 'hub-vcn-sn-1->hub-vcn-sn-0', 'hub-vcn-sn-0->gw-igw',
    ]);
    const ingress = traceFlow(model, { id: 'prod:ingress', kind: 'ingress', color: C, srcEnv: 0, dstEnv: 0, dstSubnet: 0 });
    expect(ingress.ok).toBe(true);
    expect(segs(ingress.segments)).toEqual([
      'gw-igw->hub-vcn-sn-0', 'hub-vcn-sn-0->hub-vcn-sn-2', 'hub-vcn-sn-2->attach-hub',
      'attach-hub->drg', 'drg->attach-cmp-env-0', 'attach-cmp-env-0->cmp-env-0-vcn-sn-0',
    ]);
    const eastWest = traceFlow(model, { id: 'prod>preprod:east-west', kind: 'east-west', color: C, srcEnv: 0, srcSubnet: 0, dstEnv: 1, dstSubnet: 0 });
    expect(eastWest.ok).toBe(true);
    expect(eastWest.hops.some((h) => h.node === 'hub-vcn-sn-1')).toBe(true);
  });
});
