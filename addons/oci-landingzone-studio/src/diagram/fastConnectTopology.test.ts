import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { emptyHybridConnectivity } from '../services/hybridConnectivity';
import { providerServicesForRegion } from '../services/connectivityCatalog';
import { generatedRouteTables } from '../services/routingFixtures.testSupport';
import { hubKindDefaults } from '../services/hubKinds';
import { allFlowIds } from '../services/flowTrace';
import { buildGraphLayout as buildGraph } from './buildGraph';
import { hybridTopologySvg } from './hybridTopology';
import { absoluteNodeRects } from './flowGeometry';
import { structuralCrossings } from './layoutQuality';
import { toDrawioXml } from '../export/toDrawio';

function fixture() {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  hybrid.fast_connect_virtual_circuits.primary = {
    type: 'PRIVATE', remote_cidrs: ['172.20.0.0/16'], customer_asn: '65010', bandwidth_shape_name: '1 Gbps',
    provider_service_id: providerServicesForRegion(model.foundation.realm, model.foundation.region)[0].ocid,
    cross_connect_mappings: {
      primary: { customer_bgp_peering_ip: '172.30.0.1/30', oracle_bgp_peering_ip: '172.30.0.2/30', vlan: '100' },
      backup: { customer_bgp_peering_ip: '172.30.0.5/30', oracle_bgp_peering_ip: '172.30.0.6/30', vlan: '101' },
    },
  };
  return { model, circuit: hybrid.fast_connect_virtual_circuits.primary };
}

describe('FastConnect topology drawing', () => {
  it('shows an external customer router and one circuit for multiple BGP mappings', () => {
    const { model, circuit } = fixture();
    circuit.cross_connect_mappings!.primary.bgp_md5auth_key = 'EXAMPLE ONLY NOT A REAL KEY';
    const baseline = buildGraph(emptyLzModel(), 2);
    const graph = buildGraph(model, 2);
    const nodes = graph.nodes.filter((node) => ['premises', 'customerrouter', 'fastconnect'].includes(node.kind));
    const svg = nodes.map(hybridTopologySvg).join('');
    const provider = providerServicesForRegion(model.foundation.realm, model.foundation.region)[0].label;
    for (const value of ['On-Premises', 'Customer router', 'ASN 65010', 'FastConnect primary', provider, '1 Gbps', '172.30.0.1/30', '172.30.0.6/30', 'VLAN 100']) expect(svg).toContain(value.replaceAll('&', '&amp;'));
    expect(svg).not.toContain('Tunnel');
    expect(JSON.stringify(graph)).not.toContain(circuit.cross_connect_mappings!.primary.bgp_md5auth_key);
    expect(graph.edges.filter((edge) => edge.source === 'hybrid-fc-primary' && edge.target === 'drg')).toHaveLength(1);
    const premises = graph.nodes.find((node) => node.id === 'hybrid-fc-primary:premises')!;
    expect(-premises.x).toBeLessThan(720);
    expect(graph.nodes.find((node) => node.id === 'hybrid-fc-primary')!.parentId).toBeUndefined();
    expect(graph.nodes.find((node) => node.id === 'cmp-network')!.height).toBe(baseline.nodes.find((node) => node.id === 'cmp-network')!.height);
    for (const node of nodes) expect(toDrawioXml(graph)).toContain(encodeURIComponent(hybridTopologySvg(node)));
  });

  it('handles manual providers and direct connections without inventing provider names', () => {
    const { model, circuit } = fixture();
    circuit.provider_service_id = 'ocid1.providerservice.oc1.eu-frankfurt-1.example';
    const manual = buildGraph(model, 2).nodes.find((node) => node.kind === 'fastconnect')!;
    expect(hybridTopologySvg(manual)).toContain('Provider service');
    delete circuit.provider_service_id;
    delete circuit.cross_connect_mappings;
    const direct = buildGraph(model, 2).nodes.find((node) => node.kind === 'fastconnect')!;
    expect(hybridTopologySvg(direct)).toContain('Direct cross-connect');
    expect(hybridTopologySvg(direct)).not.toContain('172.30.');
    direct.fastConnect!.provider = '<script>alert("provider")</script>';
    expect(hybridTopologySvg(direct)).not.toContain('<script>');
    expect(hybridTopologySvg(direct)).toContain('&lt;script&gt;');
  });

  it('does not create a routed path for physical preparation without a virtual circuit', () => {
    const { model, circuit } = fixture();
    circuit.provision_fc_virtual_circuit = false;
    model.hybridConnectivity!.cross_connect_groups.fabric = { cross_connects: {} };
    const graph = buildGraph(model, 2);
    expect(graph.nodes.some((node) => node.kind === 'fastconnect')).toBe(false);
    expect(graph.nodes.some((node) => node.id === 'hybrid-physical-fabric')).toBe(true);
    expect(graph.edges.some((edge) => edge.source.startsWith('hybrid-fc-') || edge.source === 'hybrid-physical-fabric')).toBe(false);
    expect(allFlowIds(model).some((id) => id.includes('hybrid-fc-'))).toBe(false);
  });

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('%s follows both FastConnect directions and processes routing at the DRG', async (kind) => {
    const { model } = fixture();
    model.network = { hubKind: kind, ...hubKindDefaults(kind) };
    const tables = await generatedRouteTables(model);
    for (const direction of ['in', 'out']) {
      const graph = buildGraph(model, 5, { activeFlows: [`prod:hybrid-${direction}@hybrid-fc-primary:web`] }, undefined, tables);
      expect(graph.flowErrors).toBeUndefined();
      const flow = graph.edges.find((edge) => edge.waypoints)!;
      expect(flow.waypoints).toContain('hybrid-fc-primary:router');
      expect(flow.waypoints).toContain('hybrid-fc-primary');
      expect(direction === 'in' ? flow.waypoints![0] : flow.waypoints!.at(-1)).toBe('hybrid-fc-primary:router');
      const rects = absoluteNodeRects(graph.nodes);
      const dot = graph.nodes.find((node) => node.rtDotOwnerId === 'hybrid-fc-primary')!;
      expect(dot.rtDotPhysicalOwnerId).toBe('drg');
      const connection = graph.edges.find((edge) => edge.source === 'hybrid-fc-primary' && edge.target === 'drg')!;
      const port = rects.get(dot.id)!;
      expect({ x: port.x + port.width / 2, y: port.y + port.height / 2 }).toEqual(connection.points!.at(-1));
      expect(structuralCrossings({ ...graph, edges: graph.edges.filter((edge) => !graph.nodes.some((node) => node.id === edge.source && node.kind === 'rtdot')) })).toEqual([]);
    }
  }, 60_000);
});
