import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform } from './platforms';
import { flowNetworks, flowPickerEnvironments } from './flowNetworks';
import { allFlowIds, buildFlowTraces, specFromId, traceFlow } from './flowTrace';
import { generatedRouteTables } from './routingFixtures.testSupport';
import { hubKindDefaults } from './hubKinds';
import { flowChoices } from '../components/FlowSidebar';
import { emptyHybridConnectivity, hybridRoutes, newVpn } from './hybridConnectivity';

function fixture() {
  const model = emptyLzModel();
  const platform = newPlatform('oke_simple', [], model.environments);
  platform.environments = [model.environments[0].id];
  platform.okeParams = { ...platform.okeParams!, workerInternetAccess: false, podInternetAccess: false };
  model.platforms = [platform];
  return { model, platform };
}

describe('OKE flow sources', () => {
  it('adds only OKE placements, preserves project indices and excludes unselected environments', () => {
    const { model } = fixture();
    model.environments[0].projectNetworkEnabled = false;
    model.platforms.unshift(newPlatform('custom', model.platforms, model.environments));
    const networks = flowNetworks(model);
    expect(networks[1].vcnNode).toBe('cmp-env-1-vcn');
    expect(networks.slice(2).filter((n) => n.oke).map((n) => [n.name, n.vcnNode])).toEqual([['prod/oke', 'cmp-env-0-plat-1']]);
    expect(flowPickerEnvironments(model).filter((n) => n.name !== 'Hub').map((n) => n.name)).toEqual(['preprod', 'prod/oke']);
    expect(networks[2].subnets.map((sn) => sn.role)).toEqual(['pods', 'workers']);
  });

  it('filters worker and pod paths independently while keeping OCI Services', async () => {
    const { model, platform } = fixture();
    const picker = () => flowPickerEnvironments(model).find((n) => n.name === 'prod/oke')!;
    expect(picker().rolesFor('egress')).toEqual([]);
    expect(picker().rolesFor('ingress')).toEqual([]);
    expect(picker().rolesFor('east-west', 'preprod')).toEqual([]);
    expect(picker().rolesFor('services')).toEqual(['pods', 'workers']);
    const tables = await generatedRouteTables(model);
    expect(buildFlowTraces(model, ['prod/oke:egress', 'prod/oke>preprod:east-west'], 'kind', tables)).toEqual([]);
    expect(buildFlowTraces(model, ['prod/oke:services'], 'kind', tables).map((t) => t.ok)).toEqual([true, true]);
    platform.okeParams!.podInternetAccess = true;
    expect(picker().rolesFor('egress')).toEqual(['pods']);
    expect(allFlowIds(model)).toContain('prod/oke:egress:pods');
    platform.okeParams!.cniType = 'overlay';
    expect(picker().roles).toEqual(['workers']);
    expect(picker().rolesFor('egress')).toEqual([]);
  });

  it('requires the opted-in component and matching peer CIDRs on OKE endpoints', async () => {
    const { model, platform } = fixture();
    const picker = () => flowPickerEnvironments(model);
    platform.okeParams!.workerSpokeAccess = true;
    platform.okeParams!.peerVcnCidrs = [model.environments[1].network.vcnCidr];
    const oke = () => picker().find((n) => n.name === 'prod/oke')!;
    expect(oke().rolesFor('east-west', 'preprod')).toEqual(['workers']);
    expect(oke().rolesFor('east-west', 'prod')).toEqual([]);
    expect(picker()[1].rolesFor('east-west', 'prod/oke')).toEqual(['web', 'app', 'db', 'infra']);
    const traces = buildFlowTraces(model, ['prod/oke>preprod:east-west:workers', 'preprod>prod/oke:east-west:web'], 'kind', await generatedRouteTables(model));
    expect(traces.map((t) => t.ok)).toEqual([true, true]);
    expect(traces[1].segments.at(-1)?.to).toBe(flowNetworks(model)[2].subnets.find((sn) => sn.role === 'workers')!.node);
    platform.okeParams!.peerVcnCidrs = [];
    expect(picker()[1].rolesFor('east-west', 'prod/oke')).toEqual([]);
    expect(oke().rolesFor('east-west', 'preprod')).toEqual([]);
  });

  it('applies OKE component peering controls to incoming and outgoing hybrid flows', async () => {
    const { model, platform } = fixture();
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    hybrid.customer_premises_equipments.office = { ip_address: '203.0.113.10' };
    hybrid.ipsecs.office = { ...newVpn('office'), remote_cidrs: ['172.20.0.0/16'] };
    const incoming = 'prod/oke:hybrid-in@hybrid-vpn-office:workers';
    const outgoing = 'prod/oke:hybrid-out@hybrid-vpn-office:workers';
    const choices = () => {
      const picker = flowPickerEnvironments(model);
      return flowChoices(picker, picker.findIndex((network) => network.oke), false, hybridRoutes(model))
        .filter((choice) => choice.id.includes(':hybrid-')).map((choice) => choice.id);
    };
    expect(choices()).toEqual([]);
    expect(specFromId(model, incoming, '#000')).toBeNull();
    const source = flowNetworks(model).findIndex((network) => network.oke);
    expect(traceFlow(model, { id: incoming, kind: 'hybrid-in', hybridId: 'hybrid-vpn-office', color: '#000', srcEnv: source, dstEnv: source, srcSubnet: 1, dstSubnet: 1 }, await generatedRouteTables(model)).ok).toBe(false);
    platform.okeParams!.workerSpokeAccess = true;
    platform.okeParams!.peerVcnCidrs = ['172.21.0.0/16'];
    expect(choices()).toEqual([]);
    platform.okeParams!.peerVcnCidrs = ['172.20.0.0/16'];
    expect(choices()).toEqual([outgoing, incoming]);
    expect(allFlowIds(model)).toEqual(expect.arrayContaining([incoming, outgoing]));
    expect(buildFlowTraces(model, [incoming, outgoing], 'kind', await generatedRouteTables(model)).map((trace) => trace.ok)).toEqual([true, true]);
    platform.okeParams!.peerVcnCidrs = ['172.20.0.0/24'];
    expect(choices()).toEqual([outgoing, incoming]);
    expect(buildFlowTraces(model, [incoming, outgoing], 'kind', await generatedRouteTables(model)).map((trace) => trace.ok)).toEqual([true, true]);
    platform.okeParams!.peerVcnCidrs = ['172.20.1.0/24'];
    expect(choices()).toEqual([]);
    platform.okeParams!.workerSpokeAccess = false;
    platform.okeParams!.workerInternetAccess = true;
    expect(choices()).toEqual([outgoing]);
    model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
    expect(choices()).toEqual([]);
  });

  it.each(['hub_a', 'hub_e'] as const)('traces OKE endpoints through generated %s routes', async (hubKind) => {
    const { model, platform } = fixture();
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    platform.okeParams!.workerInternetAccess = true;
    platform.okeParams!.podInternetAccess = true;
    const network = flowNetworks(model).find((n) => n.oke)!;
    const traces = buildFlowTraces(model, ['prod/oke:egress'], 'flow', await generatedRouteTables(model));
    expect(traces).toHaveLength(2);
    expect(traces.every((t) => t.ok)).toBe(true);
    expect(traces.map((t) => t.segments[0].from)).toEqual(network.subnets.map((s) => s.node));
    expect(traces[0].segments.map((s) => s.to)).toContain(hubKind === 'hub_e' ? `${network.vcnNode}-natgw` : network.attachment);
  });
});


it('targets only the specified peer subnet, including its label, route and saved selection validation', async () => {
  const { model, platform } = fixture();
  const destination = flowNetworks(model)[1];
  const db = destination.subnets.find((sn) => sn.role === 'db')!;
  platform.okeParams!.workerSpokeAccess = true;
  platform.okeParams!.peerVcnCidrs = [db.cidr];
  const picker = flowPickerEnvironments(model);
  const choices = flowChoices(picker, picker.findIndex((n) => n.oke));
  const peers = choices.filter((choice) => choice.id.includes(':east-west:'));
  expect(peers).toHaveLength(1);
  expect(peers[0].id).toBe('prod/oke>preprod:east-west:workers:db');
  expect(peers[0].label).toBe(`Workers → preprod / db (${db.cidr})`);
  expect(allFlowIds(model)).toContain(peers[0].id);
  expect(specFromId(model, 'prod/oke>preprod:east-west:workers:web', '#000')).toBeNull();
  const traces = buildFlowTraces(model, [peers[0].id], 'flow', await generatedRouteTables(model));
  expect(traces).toHaveLength(1);
  expect(traces[0].ok).toBe(true);
  expect(traces[0].segments.at(-1)?.to).toBe(db.node);
  expect(traces[0].label).toContain('preprod db');
  platform.okeParams!.peerVcnCidrs = [];
  expect(specFromId(model, peers[0].id, '#000')).toBeNull();
});


it('does not offer cross-spoke paths through a local NAT default without explicit peering', () => {
  const { model, platform } = fixture();
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  platform.okeParams!.workerInternetAccess = true;
  const picker = flowPickerEnvironments(model).find((n) => n.oke)!;
  expect(picker.rolesFor('egress')).toContain('workers');
  expect(picker.rolesFor('east-west', 'preprod')).toEqual([]);
  expect(specFromId(model, 'prod/oke>preprod:east-west:workers', '#000')).toBeNull();
});
