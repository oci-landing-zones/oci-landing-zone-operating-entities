import { describe, expect, it } from 'vitest';
import { allFlowIds, buildFlowTraces, FLOW_KIND_COLORS, matchRule, specFromId, traceFlow } from './flowTrace';
import { emptyLzModel } from '../model/defaults';
import { hubKindDefaults } from './hubKinds';
import { newPlatform } from './platforms';
import { generatedRouteTables } from './routingFixtures.testSupport';
import type { RouteRule } from './routeTables';

const C = '#2196F3';
const segments = (trace: ReturnType<typeof traceFlow>) => trace.segments.map((edge) => `${edge.from}->${edge.to}`);
const rule = (id: string, cidr: string, target: string, routeType: 'Static' | 'Dynamic' = 'Static'): RouteRule => ({
  id, destination: cidr, matchCidr: cidr, targetType: 'VCN Attachment', target, routeType,
  nextHopKind: 'attachment', flowTarget: target, provenance: 'configured',
});

describe('flowTrace generated routing inventory', () => {
  it('traces local inter-subnet delivery and highlights the implicit rule without sending it to the DRG', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const trace = traceFlow(model, { id: 'local', kind: 'east-west', color: C, srcEnv: 0, dstEnv: 0, dstSubnet: 1 }, tables);
    expect(trace.ok).toBe(true);
    expect(segments(trace)).toEqual(['cmp-env-0-vcn-sn-0->cmp-env-0-vcn-sn-1']);
    const selected = tables.find((table) => table.id === trace.hops[0].tableId)!.rules[trace.hops[0].rowIndex!];
    expect(selected.provenance).toBe('implicit-local');
    expect(trace.hops[0].ruleId).toBe(selected.id);
    expect(trace.hops.at(-1)?.label).toContain('(local)');
  });

  it('applies a local VCN-ingress route at its attachment and refuses to deliver it into another VCN', async () => {
    const model = emptyLzModel();
    model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
    const tables = await generatedRouteTables(model);
    const source = tables.find((table) => table.associations.some((binding) => binding.nodeId === 'cmp-env-0-vcn-sn-0'))!;
    const local = source.rules.find((rule) => rule.provenance === 'implicit-local')!;
    tables.push({ ...source, id: 'local-ingress', rules: [local], associations: [{ nodeId: 'cmp-env-0-vcn', kind: 'vcn-ingress' }] });
    const [trace] = buildFlowTraces(model, ['preprod>prod:east-west:web'], 'flow', tables);
    expect(trace.ok).toBe(true);
    expect(trace.hops.find((hop) => hop.tableId === 'local-ingress')).toMatchObject({ node: 'attach-cmp-env-0', tableOwner: 'cmp-env-0-vcn', ruleId: local.id });
    local.targetNodeId = 'cmp-env-1-vcn';
    expect(buildFlowTraces(model, ['preprod>prod:east-west:web'], 'flow', tables)[0].ok).toBe(false);
  });

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('resolves every supported traffic kind from actual %s tables', async (hubKind) => {
    const model = emptyLzModel();
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    const tables = await generatedRouteTables(model);
    const traces = buildFlowTraces(model, allFlowIds(model), 'kind', tables);
    expect(traces).toHaveLength(8);
    expect(traces.map((trace) => [trace.id, trace.ok])).toEqual(traces.map((trace) => [trace.id, true]));
    for (const trace of traces) {
      expect(trace.color).toBe(FLOW_KIND_COLORS[trace.kind]);
      for (const hop of trace.hops) {
        const visits = [trace.segments[0]?.from, ...trace.segments.map((edge) => edge.to)];
        expect(visits[hop.visitIndex]).toBe(hop.node);
        if (!hop.tableId) continue;
        const table = tables.find((table) => table.id === hop.tableId)!;
        expect(table).toBeDefined();
        expect(table.rules[hop.rowIndex!].id).toBe(hop.ruleId);
        expect(table.associations.some((binding) => binding.nodeId === hop.tableOwner)).toBe(true);
        const ingress = table.associations.some((binding) => binding.kind === 'vcn-ingress' && binding.nodeId === hop.tableOwner);
        expect(hop.tableOwner).toBe(ingress ? 'hub-vcn' : hop.node);
        if (ingress) expect(hop.node).toBe('attach-hub');
      }
    }
    const egress = traces.find((trace) => trace.kind === 'egress')!;
    expect(egress.hops.at(-1)?.label).toBe(`${hubKind === 'hub_c' ? 'Internet gateway' : 'NAT gateway'} → Internet`);
    expect(traces.find((trace) => trace.kind === 'services')?.hops.at(-1)?.label).toBe('Service gateway → OCI Services');
    const expectedEgress = {
      hub_a: ['cmp-env-0-vcn-sn-0', 'attach-cmp-env-0', 'drg', 'attach-hub', 'hub-vcn-sn-2', 'gw-natgw'],
      hub_b: ['cmp-env-0-vcn-sn-0', 'attach-cmp-env-0', 'drg', 'attach-hub', 'hub-vcn-sn-1', 'gw-natgw'],
      hub_c: ['cmp-env-0-vcn-sn-0', 'attach-cmp-env-0', 'drg', 'attach-hub', 'hub-vcn-sn-1', 'hub-vcn-sn-0', 'gw-igw'],
      hub_e: ['cmp-env-0-vcn-sn-0', 'cmp-env-0-natgw'],
    }[hubKind];
    expect(segments(egress)).toEqual(expectedEgress.slice(1).map((node, index) => `${expectedEgress[index]}->${node}`));
    const ingress = traces.find((trace) => trace.kind === 'ingress')!;
    expect(ingress.hops.filter((hop) => hop.inspected).map((hop) => hop.node)).toEqual({
      hub_a: ['hub-vcn-sn-0'], hub_b: ['hub-vcn-sn-1'], hub_c: ['hub-vcn-sn-0'], hub_e: [],
    }[hubKind]);
  });

  it('keeps repeated hub attachment occurrences distinct during a firewall hairpin', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const [trace] = buildFlowTraces(model, ['prod>preprod:east-west:web'], 'flow', tables);
    expect(trace.ok).toBe(true);
    const visits = trace.hops.filter((hop) => hop.node === 'attach-hub');
    expect(visits).toHaveLength(2);
    expect(visits[1].visitIndex).toBeGreaterThan(visits[0].visitIndex);
    expect(visits[0].tableId).not.toBe(visits[1].tableId);
    expect(visits[0]).toMatchObject({ node: 'attach-hub', tableOwner: 'hub-vcn' });
    expect(visits[1]).toMatchObject({ node: 'attach-hub', tableOwner: 'attach-hub' });
    expect(segments(trace)).toContain('hub-vcn-sn-2->attach-hub');
  });

  it('does not use a VCN ingress table when leaving that VCN', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const ingress = tables.find((table) => table.associations.some((binding) => binding.kind === 'vcn-ingress' && binding.nodeId === 'hub-vcn'))!;
    const [trace] = buildFlowTraces(model, ['prod:ingress:web'], 'flow', tables);
    expect(trace.ok).toBe(true);
    expect(trace.hops.some((hop) => hop.tableId === ingress.id)).toBe(false);
  });

  it('follows changed generated rules and bindings without depending on table names', async () => {
    const model = emptyLzModel();
    const tables = structuredClone(await generatedRouteTables(model));
    tables.forEach((table, index) => { table.id = `arbitrary-${index}`; });
    const source = tables.find((table) => table.associations.some((binding) => binding.nodeId === 'cmp-env-0-vcn-sn-0' && binding.kind === 'subnet'))!;
    source.rules = [{ ...source.rules[0], id: 'changed-default', nextHopKind: 'natgw', flowTarget: 'cmp-env-0-natgw', targetNodeId: 'cmp-env-0-natgw' }];
    const [trace] = buildFlowTraces(model, ['prod:egress:web'], 'flow', tables);
    expect(trace.ok).toBe(true);
    expect(trace.hops[0]).toMatchObject({ tableId: source.id, ruleId: 'changed-default' });
    expect(segments(trace)).toEqual(['cmp-env-0-vcn-sn-0->cmp-env-0-natgw']);
  });

  it('fails closed when generation is unavailable, a binding is missing or a target is unresolved', async () => {
    const model = emptyLzModel();
    const spec = { id: 'prod:egress', kind: 'egress' as const, color: C, srcEnv: 0 };
    expect(traceFlow(model, spec).ok).toBe(false);
    const tables = structuredClone(await generatedRouteTables(model));
    const source = tables.find((table) => table.associations.some((binding) => binding.nodeId === 'cmp-env-0-vcn-sn-0' && binding.kind === 'subnet'))!;
    source.rules[0].nextHopKind = 'unresolved';
    expect(traceFlow(model, spec, tables).ok).toBe(false);
    source.associations = [];
    expect(traceFlow(model, spec, tables).ok).toBe(false);
  });

  it.each(['gateway', 'vcn-ingress'] as const)('fails closed on conflicting optional %s bindings', async (kind) => {
    const model = emptyLzModel();
    model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
    const tables = structuredClone(await generatedRouteTables(model));
    const binding = { nodeId: kind === 'gateway' ? 'gw-igw' : 'cmp-env-0-vcn', kind };
    const template = tables.find((table) => table.kind === 'spoke')!;
    tables.push({ ...template, id: 'conflict-one', associations: [binding] }, { ...template, id: 'conflict-two', associations: [binding] });
    const trace = traceFlow(model, { id: 'prod:ingress', kind: 'ingress', color: C, srcEnv: 0, dstEnv: 0 }, tables);
    expect(trace.ok).toBe(false);
    expect(trace.segments.at(-1)?.to).not.toBe('cmp-env-0-vcn-sn-0');
  });

  it('uses the actual source attachment when a DRG table is shared', async () => {
    const model = emptyLzModel();
    const [trace] = buildFlowTraces(model, ['preprod:egress:web'], 'flow', await generatedRouteTables(model));
    expect(trace.hops[1].node).toBe('attach-cmp-env-1');
    expect(trace.hops[1].label).toMatch(/^preprod attachment: /);
  });

  it('matches east-west roles after reordering and retains every source when the destination is shorter', async () => {
    const model = emptyLzModel();
    model.environments[1].network.subnets.reverse();
    let traces = buildFlowTraces(model, ['prod>preprod:east-west'], 'flow', await generatedRouteTables(model));
    expect(traces).toHaveLength(4);
    expect(traces.every((trace) => trace.ok)).toBe(true);
    expect(traces.map((trace) => trace.segments.at(-1)?.to)).toEqual([
      'cmp-env-1-vcn-sn-3', 'cmp-env-1-vcn-sn-2', 'cmp-env-1-vcn-sn-1', 'cmp-env-1-vcn-sn-0',
    ]);
    model.environments[1].network.subnets = model.environments[1].network.subnets.slice(0, 1);
    traces = buildFlowTraces(model, ['prod>preprod:east-west'], 'flow', await generatedRouteTables(model));
    expect(traces).toHaveLength(4);
    expect(traces.every((trace) => trace.ok && trace.segments.at(-1)?.to === 'cmp-env-1-vcn-sn-0')).toBe(true);
  });

  it('expands endpoint picks with stable group colours and deduplicates all-endpoint picks', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const traces = buildFlowTraces(model, ['prod:egress', 'prod:egress:web', 'preprod:services'], 'flow', tables);
    expect(traces).toHaveLength(8);
    expect(traces.slice(0, 4).map((trace) => trace.hops[0].tableOwner)).toEqual([
      'cmp-env-0-vcn-sn-0', 'cmp-env-0-vcn-sn-1', 'cmp-env-0-vcn-sn-2', 'cmp-env-0-vcn-sn-3',
    ]);
    expect(traces.map((trace) => trace.id)).toEqual([
      'prod:egress#0', 'prod:egress#1', 'prod:egress#2', 'prod:egress#3',
      'preprod:services#0', 'preprod:services#1', 'preprod:services#2', 'preprod:services#3',
    ]);
    const roles = buildFlowTraces(model, ['prod:egress:web', 'preprod:services', 'prod:egress:infra'], 'flow', tables);
    expect(roles[0].color).toBe(roles.at(-1)?.color);
    expect(roles[0].color).not.toBe(roles[1].color);
  });

  it('drops disabled networks, removed roles and ingress when OKE suppresses the hub LB', async () => {
    const model = emptyLzModel();
    model.environments[1].projectNetworkEnabled = false;
    expect(buildFlowTraces(model, ['prod>preprod:east-west:web', 'preprod:egress:web'], 'flow', await generatedRouteTables(model))).toEqual([]);
    expect(specFromId(model, 'prod:east-west', C)).toBeNull();
    expect(specFromId(model, 'prod:egress:removed', C)).toBeNull();
    model.platforms = [newPlatform('oke_simple', [], model.environments)];
    expect(specFromId(model, 'prod:ingress:web', C)).toBeNull();
    expect(allFlowIds(model).some((id) => id.includes(':ingress'))).toBe(false);
    model.environments[0].network.subnets = [];
    expect(allFlowIds(model)).toEqual([]);
  });

  it('resolves explicit/default east-west destinations and rejects invalid picker IDs', () => {
    const model = emptyLzModel();
    expect(specFromId(model, 'prod:egress', C)).toMatchObject({ kind: 'egress', srcEnv: 0 });
    expect(specFromId(model, 'prod>preprod:east-west', C)).toMatchObject({ srcEnv: 0, dstEnv: 1 });
    expect(specFromId(model, 'prod:east-west', C)).toMatchObject({ srcEnv: 0, dstEnv: 1 });
    expect(specFromId(model, 'prod>prod:east-west', C)).toBeNull();
    expect(specFromId(model, 'bogus:egress', C)).toBeNull();
  });
});

describe('effective rule selection', () => {
  it('prefers a static route over an equal implicit local prefix, and local over a broader default', () => {
    const local: RouteRule = { ...rule('local', '10.0.0.0/16', 'vcn'), nextHopKind: 'local', provenance: 'implicit-local', routeType: 'Implicit' };
    const configured = rule('static', '10.0.0.0/16', 'firewall');
    expect(matchRule([local, configured], '10.0.1.10/32')?.rule.id).toBe('static');
    expect(matchRule([rule('default', '0.0.0.0/0', 'drg'), local], '10.0.1.10/32')?.rule.id).toBe('local');
    expect(matchRule([local, rule('specific', '10.0.1.0/24', 'firewall')], '10.0.1.10/32')?.rule.id).toBe('specific');
  });
  it('prefers longest prefix, then static, without treating import priority as forwarding preference', () => {
    const rules = [rule('default', '0.0.0.0/0', 'hub'), rule('dynamic', '10.0.0.0/16', 'dynamic', 'Dynamic'), rule('static', '10.0.0.0/16', 'static')];
    expect(matchRule(rules, '10.0.1.10/32')?.rule.id).toBe('static');
    const imported = [{ ...rules[1], id: 'later', importPriority: 20 }, { ...rules[1], id: 'first', flowTarget: 'first', importPriority: 10 }];
    expect(matchRule(imported, '10.0.1.10/32')).toBeNull();
  });
  it('does not guess between equal-cost different targets or confuse an SGW default with OSN routing', () => {
    expect(matchRule([rule('one', '10.0.0.0/16', 'one'), rule('two', '10.0.0.0/16', 'two')], '10.0.1.10/32')).toBeNull();
    expect(matchRule([{ ...rule('one', '0.0.0.0/0', 'sgw'), nextHopKind: 'sgw' }], 'OSN')).toBeNull();
  });
});
