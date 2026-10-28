import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { buildRouteTables } from './routeTables';
import { buildFlowTraces } from './flowTrace';
import { buildGraph } from '../diagram/buildGraph';
import { emptyHybridConnectivity, newVpn } from './hybridConnectivity';
import { hubKindDefaults } from './hubKinds';
import { generatedRouteTables } from './routingFixtures.testSupport';
import { generateNetwork } from '../generator/network';
import { absoluteNodeRects } from '../diagram/flowGeometry';
import { structuralCrossings } from '../diagram/layoutQuality';

describe('hybrid routing views', () => {
  for (const kind of ['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const) {
    it(`${kind}: displays generated ingress tables and traces both directions`, async () => {
      const model = emptyLzModel();
      model.network = { hubKind: kind, ...hubKindDefaults(kind) };
      model.hybridConnectivity = emptyHybridConnectivity();
      model.hybridConnectivity.customer_premises_equipments.cpe = { ip_address: '203.0.113.10' };
      const vpn = newVpn('cpe');
      vpn.remote_cidrs = ['172.20.0.0/16'];
      model.hybridConnectivity.ipsecs.office = vpn;
      const tables = await generatedRouteTables(model);
      expect(tables.find((table) => table.id === 'DRGRT-FRA-LZ-HUB-VPN-KEY')?.associations)
        .toContainEqual({ nodeId: 'hybrid-vpn-office', kind: 'drg-attachment' });
      const graph = buildGraph(model);
      expect(graph.nodes.some((node) => node.id === 'hybrid-vpn-office')).toBe(true);
      for (const direction of ['out', 'in']) {
        const flowId = `prod:hybrid-${direction}@hybrid-vpn-office:web`;
        const traces = buildFlowTraces(model, [flowId], 'flow', tables);
        expect(traces).toHaveLength(1);
        expect(traces[0].ok).toBe(true);
        const nodes = traces[0].segments.flatMap((segment) => [segment.from, segment.to]);
        expect(nodes).toContain('hybrid-vpn-office');
        expect(nodes).toContain('drg');
        const firewall = model.network.subnets.findIndex((sn) => ['fw-int', 'fw', 'trust'].includes(sn.name));
        if (kind !== 'hub_e') expect(nodes).toContain(`hub-vcn-sn-${firewall}`);
        const rendered = buildGraph(model, 5, { activeFlows: [flowId] }, undefined, tables);
        expect(rendered.flowErrors).toBeUndefined();
        expect(rendered.edges.some((edge) => edge.waypoints?.includes('hybrid-vpn-office'))).toBe(true);
        const rects = absoluteNodeRects(rendered.nodes);
        const vpn = rects.get('hybrid-vpn-office')!;
        const port = rendered.nodes.find((node) => node.rtDotOwnerId === vpn.id)!;
        expect(port.parentId).toBeUndefined();
        expect(rects.get(port.id)!.x + port.width / 2).toBe(vpn.x + vpn.width);
        expect(structuralCrossings(rendered)).toEqual([]);
      }
    }, 60_000);
  }

  it('uses generated FastConnect selectors and retains ambiguity between backup paths', async () => {
    const model = emptyLzModel();
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    hybrid.customer_premises_equipments.cpe = { ip_address: '203.0.113.10' };
    hybrid.ipsecs.office = { ...newVpn('cpe'), remote_cidrs: ['172.20.0.0/16'] };
    hybrid.fast_connect_virtual_circuits.primary = {
      type: 'PRIVATE', remote_cidrs: ['172.20.0.0/16'], provider_service_id: 'ocid1.providerservice.oc1..example',
    };
    const network = await generateNetwork(model);
    const tables = buildRouteTables(model, network);
    expect(tables.find((table) => table.id === 'DRGRT-FRA-LZ-HUB-FASTCONNECT-KEY')?.associations)
      .toContainEqual({ nodeId: 'hybrid-fc-primary', kind: 'drg-attachment' });
    expect(buildFlowTraces(model, ['prod:hybrid-out@hybrid-fc-primary:web'], 'flow', tables)[0].ok).toBe(false);
    expect(buildFlowTraces(model, ['prod:hybrid-in@hybrid-fc-primary:web'], 'kind', tables)[0].ok).toBe(true);
    const selectors = ['network_configuration', 'network_configuration_categories', '0-shared', 'non_vcn_specific_gateways',
      'dynamic_routing_gateways', 'DRG-FRA-LZ-HUB-KEY', 'default_drg_route_tables']
      .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], network) as Record<string, unknown>;
    selectors.virtual_circuit = { drg_route_table_id: 'missing' };
    const changed = buildRouteTables(model, network);
    expect(changed.find((table) => table.id === 'DRGRT-FRA-LZ-HUB-FASTCONNECT-KEY')?.associations).toEqual([]);
    expect(buildFlowTraces(model, ['prod:hybrid-in@hybrid-fc-primary:web'], 'flow', changed)).toEqual([]);
  }, 60_000);
});
