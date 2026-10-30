import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform } from './platforms';
import { flowNetworks, flowPickerEnvironments } from './flowNetworks';
import { allFlowIds, buildFlowTraces, specFromId } from './flowTrace';
import { flowChoices } from '../components/FlowSidebar';
import { generatedRouteTables } from './routingFixtures.testSupport';
import { buildGraph } from '../diagram/buildGraph';
import { hubKindDefaults } from './hubKinds';

function fixture() {
  const model = emptyLzModel();
  const oke = newPlatform('oke_simple', [], model.environments);
  oke.environments = [model.environments[0].id];
  oke.okeParams = { ...oke.okeParams!, workerInternetAccess: false, podInternetAccess: false };
  model.platforms = [oke];
  return { model, oke };
}

describe('Kubernetes API Server flow', () => {
  it('offers only administrative source endpoints covered by the allowed CIDRs and removes stale selections', async () => {
    const { model, oke } = fixture();
    const web = flowNetworks(model)[1].subnets.find((sn) => sn.role === 'web')!;
    oke.okeParams!.apiAllowedCidrs = [web.cidr];
    const picker = flowPickerEnvironments(model);
    const source = picker.findIndex((n) => n.name === 'preprod');
    expect(picker[source].rolesFor('api', 'prod/oke')).toEqual(['web']);
    expect(flowChoices(picker, source).find((c) => c.id === 'preprod>prod/oke:api')?.label).toBe('Spoke → prod/oke API Server');
    const id = 'preprod>prod/oke:api:web';
    expect(allFlowIds(model)).toContain(id);
    const tables = await generatedRouteTables(model);
    const [trace] = buildFlowTraces(model, [id], 'kind', tables);
    expect(trace.ok).toBe(true);
    expect(trace.segments.at(-1)?.to).toBe(flowNetworks(model).find((n) => n.oke)!.apiEndpoint!.node);
    const graph = buildGraph(model, 4, { showFlows: true, activeFlows: [id] }, undefined, tables);
    expect(graph.flowErrors ?? []).toEqual([]);
    expect(graph.edges.filter((e) => e.animated)).toHaveLength(1);
    expect(graph.nodes.some((n) => n.endpointName === 'prod-oke-API Server')).toBe(true);
    oke.okeParams!.apiAllowedCidrs = [];
    expect(specFromId(model, id, '#000')).toBeNull();
    expect(buildFlowTraces(model, [id], 'kind', tables)).toEqual([]);
  });

  it('keeps same-cluster worker and pod access without internet or a matching administrative CIDR', async () => {
    const { model, oke } = fixture();
    oke.okeParams!.apiAllowedCidrs = ['192.0.2.0/24'];
    const ids = ['prod/oke>prod/oke:api:workers', 'prod/oke>prod/oke:api:pods'];
    const traces = buildFlowTraces(model, ids, 'kind', await generatedRouteTables(model));
    expect(traces.map((t) => t.ok)).toEqual([true, true]);
    expect(traces.every((t) => t.segments.length === 1 && !t.segments.some((s) => s.to === 'drg'))).toBe(true);
  });

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('traces allowed hub sources over the generated %s route', async (hubKind) => {
    const { model, oke } = fixture();
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    const hub = flowNetworks(model).find((n) => n.apiOnly)!;
    const subnet = hub.subnets.find((sn) => sn.role === 'mgmt') ?? hub.subnets[0];
    oke.okeParams!.apiAllowedCidrs = [subnet.cidr];
    const id = `Hub>prod/oke:api:${subnet.role}`;
    const [trace] = buildFlowTraces(model, [id], 'kind', await generatedRouteTables(model));
    expect(trace.ok).toBe(true);
    expect(trace.segments[0].from).toBe(subnet.node);
    expect(trace.segments.some((s) => s.to === 'drg')).toBe(true);
  });
});
