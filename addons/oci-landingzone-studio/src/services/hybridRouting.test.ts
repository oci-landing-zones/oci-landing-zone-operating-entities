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
import { validateDiagramLayout } from '../diagram/layoutQuality';
import { complexHybridModel } from '../diagram/complexHybrid.testSupport';

describe('hybrid routing views', () => {
  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('%s: shares one HC table between FastConnect and both VPN tunnels', async (kind) => {
    const model = complexHybridModel(kind);
    const network = await generateNetwork(model);
    const cpes = ['network_configuration', 'network_configuration_categories', '0-shared', 'non_vcn_specific_gateways', 'customer_premises_equipments']
      .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], network) as Record<string, Record<string, unknown>>;
    expect(Object.values(cpes)).toEqual([expect.objectContaining({ ip_address: '203.0.113.10', cpe_device_shape_vendor_name: 'Other' })]);
    expect(Object.values(cpes)[0]).not.toHaveProperty('cpe_device_shape_id');
    const drg = ['network_configuration', 'network_configuration_categories', '0-shared', 'non_vcn_specific_gateways',
      'dynamic_routing_gateways', 'DRG-FRA-LZ-HUB-KEY']
      .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], network) as {
        default_drg_route_tables: Record<string, { drg_route_table_id: string }>;
        drg_route_tables: Record<string, { display_name: string }>;
      };
    expect(drg.default_drg_route_tables.ipsec_tunnel.drg_route_table_id).toBe('DRGRT-FRA-LZ-HUB-HC-KEY');
    expect(drg.default_drg_route_tables.virtual_circuit.drg_route_table_id).toBe('DRGRT-FRA-LZ-HUB-HC-KEY');
    expect(drg.drg_route_tables['DRGRT-FRA-LZ-HUB-HC-KEY'].display_name).toBe('drgrt-fra-lz-hub-hc');
    expect(drg.drg_route_tables).not.toHaveProperty('DRGRT-FRA-LZ-HUB-VPN-KEY');
    expect(drg.drg_route_tables).not.toHaveProperty('DRGRT-FRA-LZ-HUB-FASTCONNECT-KEY');
    const tables = buildRouteTables(model, network);
    const hc = tables.find((table) => table.id === 'DRGRT-FRA-LZ-HUB-HC-KEY')!;
    expect(hc.associations).toEqual(expect.arrayContaining([
      { nodeId: 'hybrid-vpn-backup:tunnel-1', kind: 'drg-attachment' },
      { nodeId: 'hybrid-vpn-backup:tunnel-2', kind: 'drg-attachment' },
      { nodeId: 'hybrid-fc-primary', kind: 'drg-attachment' },
    ]));
    expect(hc.associations).toHaveLength(3);
    for (const environment of model.environments) for (const connection of ['hybrid-fc-primary', 'hybrid-vpn-backup']) {
      const flow = buildFlowTraces(model, [`${environment.name}:hybrid-in@${connection}:web`], 'kind', tables)[0];
      expect(flow.ok).toBe(true);
      expect(flow.hops.some((hop) => hop.tableId === hc.id)).toBe(true);
    }
    const graph = buildGraph(model, 5, { showFlows: true }, undefined, tables);
    expect(graph.nodes.filter((node) => node.id === hc.id)).toHaveLength(1);
    expect(graph.nodes.filter((node) => node.rtDotTableId === hc.id)).toHaveLength(3);
    expect(validateDiagramLayout(graph)).toEqual([]);
  }, 60_000);
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
      expect(tables.find((table) => table.id === 'DRGRT-FRA-LZ-HUB-HC-KEY')?.associations)
        .toEqual([
          { nodeId: 'hybrid-vpn-office:tunnel-1', kind: 'drg-attachment' },
          { nodeId: 'hybrid-vpn-office:tunnel-2', kind: 'drg-attachment' },
        ]);
      const graph = buildGraph(model);
      expect(graph.nodes.some((node) => node.id === 'hybrid-cpe-cpe')).toBe(true);
      for (const direction of ['out', 'in']) {
        const flowId = `prod:hybrid-${direction}@hybrid-vpn-office:web`;
        const traces = buildFlowTraces(model, [flowId], 'flow', tables);
        expect(traces).toHaveLength(1);
        expect(traces[0].ok).toBe(true);
        const nodes = traces[0].segments.flatMap((segment) => [segment.from, segment.to]);
        expect(nodes).toContain('hybrid-cpe-cpe');
        expect(nodes).toContain('hybrid-vpn-office:tunnel-1');
        expect(nodes).toContain('drg');
        const firewall = model.network.subnets.findIndex((sn) => ['fw-int', 'fw', 'trust'].includes(sn.name));
        if (kind !== 'hub_e') expect(nodes).toContain(`hub-vcn-sn-${firewall}`);
        const rendered = buildGraph(model, 5, { activeFlows: [flowId] }, undefined, tables);
        expect(rendered.flowErrors).toBeUndefined();
        expect(rendered.edges.some((edge) => edge.waypoints?.includes('hybrid-cpe-cpe'))).toBe(true);
        const rects = absoluteNodeRects(rendered.nodes);
        const vpn = rects.get('hybrid-vpn-office:tunnel-1')!;
        for (const port of rendered.nodes.filter((node) => node.rtDotPhysicalOwnerId === 'drg')) {
          expect([port.width, port.height]).toEqual([8, 8]);
          const connection = rendered.edges.find((edge) => edge.source === port.rtDotOwnerId && edge.target === 'drg'
            || edge.source === 'drg' && edge.target === port.rtDotOwnerId)!;
          const point = rects.get(port.id)!;
          const endpoint = connection.source === 'drg' ? connection.points![0] : connection.points!.at(-1)!;
          expect(point.x + port.width / 2).toBeCloseTo(endpoint.x, 8);
          expect(point.y + port.height / 2).toBeCloseTo(endpoint.y, 8);
          expect(port.rtDotPhysicalOwnerId).toBe('drg');
        }
        const drgOwners = rendered.nodes.filter((node) => node.rtDotPhysicalOwnerId === 'drg').map((node) => node.rtDotOwnerId);
        expect(drgOwners).toEqual(expect.arrayContaining(['attach-hub', 'attach-cmp-env-0', 'attach-cmp-env-1', 'hybrid-vpn-office:tunnel-1', 'hybrid-vpn-office:tunnel-2']));
        const flow = rendered.edges.find((edge) => edge.waypoints?.includes(vpn.id))!;
        for (const hop of flow.flowHops!) {
          const dot = rendered.nodes.find((node) => node.rtDotTableId === hop.tableId && node.rtDotOwnerId === hop.tableOwner);
          if (dot?.rtDotPhysicalOwnerId !== 'drg') continue;
          const visit = flow.visits![hop.visitIndex];
          const point = rects.get(dot.id)!;
          expect(flow.points![visit.pointIndex].x).toBeCloseTo(point.x + dot.width / 2, 8);
          expect(flow.points![visit.pointIndex].y).toBeCloseTo(point.y + dot.height / 2, 8);
          expect(visit.anchorId).toBe(dot.id);
        }
        if (direction === 'in') {
          const hop = flow.flowHops!.find((hop) => hop.tableId === 'DRGRT-FRA-LZ-HUB-HC-KEY')!;
          const visit = flow.visits![hop.visitIndex];
          const connection = rendered.edges.find((edge) => edge.source === vpn.id && edge.target === 'drg')!;
          expect(flow.points![visit.pointIndex]).toEqual(connection.points!.at(-1));
          expect(visit.anchorId).toBe(rendered.nodes.find((node) => node.rtDotOwnerId === vpn.id)!.id);
        }
        const table = rects.get('DRGRT-FRA-LZ-HUB-HC-KEY')!;
        expect(table.node.parentId).toBeUndefined();
        expect(rendered.tableColumns).toContain(table.x);
        expect(validateDiagramLayout(rendered)).toEqual([]);
      }
    }, 60_000);
  }

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('%s: traces each VPN through its selected CPE in both directions', async (kind) => {
    const model = emptyLzModel();
    model.network = { hubKind: kind, ...hubKindDefaults(kind) };
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    hybrid.customer_premises_equipments.east = { ip_address: '203.0.113.10' };
    hybrid.customer_premises_equipments.west = { ip_address: '203.0.113.20' };
    hybrid.ipsecs.office = { ...newVpn('east'), remote_cidrs: ['172.20.0.0/16'] };
    hybrid.ipsecs.branch = { ...newVpn('west'), remote_cidrs: ['172.21.0.0/16'] };
    const tables = await generatedRouteTables(model);
    const activeFlows = ['office', 'branch'].flatMap((name) => ['in', 'out'].map((direction) => `prod:hybrid-${direction}@hybrid-vpn-${name}:web`));
    const graph = buildGraph(model, 5, { activeFlows }, undefined, tables);
    expect(graph.flowErrors).toBeUndefined();
    expect(graph.nodes.filter((node) => node.kind === 'vpn')).toHaveLength(2);
    for (const [name, cpe, other] of [['office', 'east', 'west'], ['branch', 'west', 'east']]) for (const direction of ['in', 'out']) {
      const flowId = `prod:hybrid-${direction}@hybrid-vpn-${name}:web`;
      const trace = buildFlowTraces(model, [flowId], 'flow', tables)[0];
      expect(trace.ok).toBe(true);
      const flow = graph.edges.find((edge) => edge.id.startsWith(`flow-${flowId}`))!;
      expect(flow.waypoints).toContain(`hybrid-cpe-${cpe}`);
      expect(flow.waypoints).not.toContain(`hybrid-cpe-${other}`);
      expect(direction === 'in' ? flow.waypoints![0] : flow.waypoints!.at(-1)).toBe(`hybrid-cpe-${cpe}`);
    }
  }, 60_000);

  it('keeps one FastConnect virtual circuit and attachment for multiple BGP mappings and traces its router', async () => {
    const model = emptyLzModel();
    model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    hybrid.fast_connect_virtual_circuits.primary = {
      type: 'PRIVATE', remote_cidrs: ['172.20.0.0/16'], provider_service_id: 'ocid1.providerservice.oc1..example',
      cross_connect_mappings: {
        first: { customer_bgp_peering_ip: '172.30.0.1/30', oracle_bgp_peering_ip: '172.30.0.2/30', vlan: '100' },
        second: { customer_bgp_peering_ip: '172.30.1.1/30', oracle_bgp_peering_ip: '172.30.1.2/30', vlan: '101' },
      },
    };
    const tables = await generatedRouteTables(model);
    const activeFlows = ['prod:hybrid-in@hybrid-fc-primary:web', 'prod:hybrid-out@hybrid-fc-primary:web'];
    const graph = buildGraph(model, 5, { activeFlows }, undefined, tables);
    expect(graph.flowErrors).toBeUndefined();
    expect(graph.nodes.filter((node) => node.kind === 'fastconnect')).toHaveLength(1);
    expect(graph.nodes.find((node) => node.id === 'hybrid-fc-primary')?.fastConnect?.mappings).toHaveLength(2);
    expect(graph.edges.filter((edge) => edge.source === 'hybrid-fc-primary' && edge.target === 'drg')).toHaveLength(1);
    expect(tables.find((table) => table.id === 'DRGRT-FRA-LZ-HUB-HC-KEY')?.associations)
      .toEqual([{ nodeId: 'hybrid-fc-primary', kind: 'drg-attachment' }]);
    for (const direction of ['in', 'out']) {
      const flow = graph.edges.find((edge) => edge.id.startsWith(`flow-prod:hybrid-${direction}@hybrid-fc-primary:web`))!;
      expect(flow.waypoints).toContain('hybrid-fc-primary');
      expect(direction === 'in' ? flow.waypoints![0] : flow.waypoints!.at(-1)).toBe('hybrid-fc-primary:router');
    }
    hybrid.fast_connect_virtual_circuits.primary.provision_fc_virtual_circuit = false;
    const preparation = buildGraph(model, 5, { showFlows: true }, undefined, await generatedRouteTables(model));
    expect(preparation.nodes.some((node) => node.id.startsWith('hybrid-fc-primary'))).toBe(false);
    expect(buildFlowTraces(model, activeFlows, 'flow', await generatedRouteTables(model))).toEqual([]);
  }, 60_000);

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('%s: anchors VCN and RPC DRG route tables on their canonical DRG ports without a VPN', async (kind) => {
    const model = emptyLzModel();
    model.network = { hubKind: kind, ...hubKindDefaults(kind) };
    model.remotePeeringConnections = [{ id: 'peer', name: 'peer', role: 'acceptor', remoteCidrs: ['10.90.0.0/21'], peerRegionName: 'eu-amsterdam-1' }];
    const tables = await generatedRouteTables(model);
    const graph = buildGraph(model, 5, { showFlows: true }, undefined, tables);
    const rects = absoluteNodeRects(graph.nodes);
    const ports = graph.nodes.filter((node) => node.rtDotPhysicalOwnerId === 'drg');
    expect(ports.map((node) => node.rtDotOwnerId)).toEqual(expect.arrayContaining(['attach-hub', 'attach-cmp-env-0', 'attach-cmp-env-1', 'rpc-peer']));
    for (const port of ports) {
      const connection = graph.edges.find((edge) => edge.source === port.rtDotOwnerId && edge.target === 'drg'
        || edge.source === 'drg' && edge.target === port.rtDotOwnerId)!;
      const endpoint = connection.source === 'drg' ? connection.points![0] : connection.points!.at(-1)!;
      const rect = rects.get(port.id)!;
      expect(rect.x + rect.width / 2).toBeCloseTo(endpoint.x, 8);
      expect(rect.y + rect.height / 2).toBeCloseTo(endpoint.y, 8);
    }
  }, 60_000);

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
    expect(tables.find((table) => table.id === 'DRGRT-FRA-LZ-HUB-HC-KEY')?.associations)
      .toContainEqual({ nodeId: 'hybrid-fc-primary', kind: 'drg-attachment' });
    expect(buildFlowTraces(model, ['prod:hybrid-out@hybrid-fc-primary:web'], 'flow', tables)[0].ok).toBe(false);
    expect(buildFlowTraces(model, ['prod:hybrid-in@hybrid-fc-primary:web'], 'kind', tables)[0].ok).toBe(true);
    const selectors = ['network_configuration', 'network_configuration_categories', '0-shared', 'non_vcn_specific_gateways',
      'dynamic_routing_gateways', 'DRG-FRA-LZ-HUB-KEY', 'default_drg_route_tables']
      .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], network) as Record<string, unknown>;
    selectors.virtual_circuit = { drg_route_table_id: 'missing' };
    const changed = buildRouteTables(model, network);
    expect(changed.find((table) => table.id === 'DRGRT-FRA-LZ-HUB-HC-KEY')?.associations)
      .toEqual([
        { nodeId: 'hybrid-vpn-office:tunnel-1', kind: 'drg-attachment' },
        { nodeId: 'hybrid-vpn-office:tunnel-2', kind: 'drg-attachment' },
      ]);
    expect(buildFlowTraces(model, ['prod:hybrid-in@hybrid-fc-primary:web'], 'flow', changed)).toEqual([]);
  }, 60_000);
});
