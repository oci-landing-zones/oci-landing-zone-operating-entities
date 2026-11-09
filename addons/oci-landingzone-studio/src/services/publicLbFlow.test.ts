import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform } from './platforms';
import { flowNetworks, flowPickerEnvironments } from './flowNetworks';
import { allFlowIds, buildFlowTraces, specFromId } from './flowTrace';
import { generatedRouteTables } from './routingFixtures.testSupport';
import { flowChoices } from '../components/FlowSidebar';
import { buildGraph } from '../diagram/buildGraph';
import { hubKindDefaults } from './hubKinds';

function fixture() {
  const model = emptyLzModel();
  const platform = newPlatform('oke_simple', [], model.environments);
  platform.environments = [model.environments[0].id];
  platform.okeParams = { ...platform.okeParams!, publicLoadBalancer: true, workerInternetAccess: false,
    podInternetAccess: false, workerSpokeAccess: false, podSpokeAccess: false, peerVcnCidrs: [] };
  model.platforms = [platform];
  return { model, platform };
}
const ids = ['prod/oke:lb:workers', 'prod/oke:lb:pods', 'prod/oke:lb-return:workers', 'prod/oke:lb-return:pods'];

describe('OKE hub public LB flows', () => {
  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('draws backend and response paths for %s independently of internet and peering', async (hubKind) => {
    const { model } = fixture();
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    const tables = await generatedRouteTables(model);
    const network = flowNetworks(model).find((n) => n.oke)!;
    const traces = buildFlowTraces(model, ids, 'kind', tables);
    expect(traces.map((t) => t.ok)).toEqual([true, true, true, true]);
    expect(traces.slice(0, 2).every((t) => t.segments[0].from === network.hubLb!.node)).toBe(true);
    expect(traces.slice(2).every((t) => t.segments.at(-1)?.to === network.hubLb!.node)).toBe(true);
    expect(traces.every((t) => t.segments.some((s) => s.to === 'drg'))).toBe(true);
    const picker = flowPickerEnvironments(model);
    expect(flowChoices(picker, picker.findIndex((n) => n.oke)).filter((c) => c.id.includes(':lb')).map((c) => c.label)).toEqual([
      'Hub public LB → Pods', 'Hub public LB → Workers', 'Pods → Hub public LB (response)', 'Workers → Hub public LB (response)',
    ]);
    expect(allFlowIds(model)).toEqual(expect.arrayContaining(ids));
    const graph = buildGraph(model, 4, { showFlows: true, activeFlows: ids }, undefined, tables);
    expect(graph.flowErrors ?? []).toEqual([]);
    expect(graph.edges.filter((e) => e.animated)).toHaveLength(4);
    expect(graph.nodes.find((n) => n.id === network.hubLb!.node)).toMatchObject({ icon: 'lb', caption: 'Example OKE public LB' });
  });

  it('omits pod paths with Flannel and removes saved LB paths when disabled', async () => {
    const { model, platform } = fixture();
    platform.okeParams!.cniType = 'overlay';
    let traces = buildFlowTraces(model, ids, 'kind', await generatedRouteTables(model));
    expect(traces.map((t) => t.id.split('#')[0])).toEqual([ids[0], ids[2]]);
    platform.okeParams!.publicLoadBalancer = false;
    expect(ids.every((id) => specFromId(model, id, '#000') === null)).toBe(true);
    traces = buildFlowTraces(model, ids, 'kind', await generatedRouteTables(model));
    expect(traces).toEqual([]);
    const picker = flowPickerEnvironments(model);
    expect(flowChoices(picker, picker.findIndex((n) => n.oke)).some((c) => c.id.includes(':lb'))).toBe(false);
  });
});
