import { describe, expect, it } from 'vitest';
import { buildGraphLayout as buildGraph } from './buildGraph';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { hubKindDefaults } from '../services/hubKinds';
import { newPlatform, newSharedPlatform } from '../services/platforms';
import type { Environment, LzModel } from '../model/types';
import { generatedRouteTables } from '../services/routingFixtures.testSupport';
import { buildFlowTraces } from '../services/flowTrace';
import { absoluteNodeRects, flowAnchorPoint, type FlowPoint, type FlowRect } from './flowGeometry';
import { emptyHybridConnectivity, newVpn, vpnCpeNodeId } from '../services/hybridConnectivity';

function env(name: string, securityZone: boolean, index: number): Environment {
  return { id: `environment-${index + 1}`, name, securityZone, network: envNetworkDefaults(index) };
}

function flowAnchor(graph: ReturnType<typeof buildGraph>, id: string): FlowPoint {
  return flowAnchorPoint(absoluteNodeRects(graph.nodes).get(id)!);
}

function pathContains(points: FlowPoint[], point: FlowPoint): boolean {
  return points.slice(1).some((to, index) => {
    const from = points[index];
    return from.x === to.x
      ? point.x === from.x && point.y >= Math.min(from.y, to.y) && point.y <= Math.max(from.y, to.y)
      : point.y === from.y && point.x >= Math.min(from.x, to.x) && point.x <= Math.max(from.x, to.x);
  });
}

function crossesInterior(from: FlowPoint, to: FlowPoint, rect: FlowRect): boolean {
  if (from.y === to.y) {
    return from.y > rect.y && from.y < rect.y + rect.height &&
      Math.max(from.x, to.x) > rect.x && Math.min(from.x, to.x) < rect.x + rect.width;
  }
  return from.x > rect.x && from.x < rect.x + rect.width &&
    Math.max(from.y, to.y) > rect.y && Math.min(from.y, to.y) < rect.y + rect.height;
}

describe('generator-aligned graph', () => {
  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('places VPN outside the OCI region for %s with only DRG port clearance inside the network compartment', (kind) => {
    const model = emptyLzModel();
    model.network = { hubKind: kind, ...hubKindDefaults(kind) };
    const baseline = buildGraph(model, 2);
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    for (const [index, name] of ['office', 'backup'].entries()) {
      hybrid.customer_premises_equipments[`router-${name}`] = { ip_address: `203.0.113.${10 + index}` };
      hybrid.ipsecs[name] = { ...newVpn(`router-${name}`), remote_cidrs: ['172.20.0.0/16'] };
    }
    for (const step of [2, 5]) {
      const graph = buildGraph(model, step);
      const rects = absoluteNodeRects(graph.nodes);
      const region = rects.get('region')!;
      const vpns = ['office', 'backup'].map((name) => rects.get(`hybrid-cpe-router-${name}:premises`)!);
      for (const [index, vpn] of vpns.entries()) {
        expect(vpn.node.parentId).toBeUndefined();
        expect(vpn.node.kind).toBe('premises');
        expect(vpn.x + vpn.width).toBeLessThan(region.x);
        const tunnels = graph.edges.filter((edge) => edge.source.startsWith(`hybrid-vpn-${['office', 'backup'][index]}:tunnel-`) && edge.target === 'drg');
        expect(tunnels).toHaveLength(2);
        expect(new Set(tunnels.map((edge) => edge.targetPort)).size).toBe(2);
        expect(tunnels.every((edge) => edge.points!.length >= 2)).toBe(true);
      }
      expect(vpns[0].y + vpns[0].height).toBeLessThan(vpns[1].y);
    }
    const before = buildGraph(model, 2);
    expect(before.nodes.find((node) => node.id === 'hub-vcn')!.height)
      .toBe(baseline.nodes.find((node) => node.id === 'hub-vcn')!.height);
    expect(before.nodes.find((node) => node.id === 'cmp-network')!.height - baseline.nodes.find((node) => node.id === 'cmp-network')!.height)
      .toBe(before.nodes.find((node) => node.id === 'drg')!.height - baseline.nodes.find((node) => node.id === 'drg')!.height);
    hybrid.ipsecs.office.remote_cidrs = Array.from({ length: 12 }, (_, index) => `172.${20 + index}.0.0/16`);
    const widened = buildGraph(model, 2);
    expect(widened.nodes).toHaveLength(before.nodes.length);
    expect(widened.nodes.find((node) => node.id === 'hybrid-cpe-router-office:premises')!.height)
      .toBeGreaterThan(before.nodes.find((node) => node.id === 'hybrid-cpe-router-office:premises')!.height);
    expect(buildGraph(model, 1).nodes.some((node) => node.id.startsWith('hybrid-vpn-'))).toBe(false);
    hybrid.fast_connect_virtual_circuits.primary = { type: 'PRIVATE', remote_cidrs: ['172.20.0.0/16'] };
    expect(buildGraph(model, 2).nodes.find((node) => node.id === 'hybrid-fc-primary')?.parentId).toBeUndefined();
  });

  it('draws every CPE once and connects each VPN pair to its selected physical equipment', () => {
    const model = emptyLzModel();
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    hybrid.customer_premises_equipments = {
      east: { ip_address: '203.0.113.10' }, west: { ip_address: '203.0.113.20' }, spare: { ip_address: '203.0.113.30' },
    };
    hybrid.ipsecs.office = { ...newVpn('east'), remote_cidrs: ['172.20.0.0/16'] };
    hybrid.ipsecs.backup = { ...newVpn('east'), remote_cidrs: ['172.21.0.0/16'] };
    hybrid.ipsecs.branch = { ...newVpn('west'), remote_cidrs: ['172.22.0.0/16'] };
    for (const [name, id] of [['existing_a', 'ocid1.cpe.oc1..existingone'], ['existing_b', 'ocid1.cpe.oc1..existingone'], ['existing_c', 'ocid1.cpe.oc1..existingtwo']]) {
      hybrid.ipsecs[name] = { ...newVpn(''), cpe_key: undefined, cpe_id: id, remote_cidrs: ['172.23.0.0/16'] };
    }
    const graph = buildGraph(model, 2);
    expect(graph.nodes.filter((node) => node.kind === 'vpn')).toHaveLength(5);
    expect(graph.nodes.filter((node) => node.kind === 'vpntunnel')).toHaveLength(12);
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length);
    for (const [name, config] of Object.entries(hybrid.ipsecs)) {
      const cpe = vpnCpeNodeId(config);
      for (const tunnel of [1, 2]) expect(graph.edges).toContainEqual(expect.objectContaining({ source: cpe, target: `hybrid-vpn-${name}:tunnel-${tunnel}` }));
    }
    expect(graph.edges.some((edge) => edge.source === 'hybrid-cpe-spare' || edge.target === 'hybrid-cpe-spare')).toBe(false);
    expect(graph.nodes.find((node) => node.id === 'hybrid-cpe-east:premises')?.premises?.cidrs).toEqual(['172.20.0.0/16', '172.21.0.0/16']);
    expect(graph.nodes.find((node) => node.id === 'hybrid-cpe-west:premises')?.premises?.equipmentAddress).toBe('203.0.113.20');
    const rects = absoluteNodeRects(graph.nodes);
    const east = rects.get('hybrid-cpe-east:premises')!;
    for (const name of ['office', 'backup']) for (const tunnel of [1, 2]) {
      const row = rects.get(`hybrid-vpn-${name}:tunnel-${tunnel}`)!;
      expect(row.y).toBeGreaterThanOrEqual(east.y + 30);
      expect(row.y + row.height).toBeLessThanOrEqual(east.y + east.height);
    }
  });

  it('shows configured CPEs without inventing a VPN or DRG connection', () => {
    const model = emptyLzModel();
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    hybrid.customer_premises_equipments.unused = { ip_address: '203.0.113.30' };
    const graph = buildGraph(model, 2);
    expect(graph.nodes.find((node) => node.id === 'hybrid-cpe-unused')?.kind).toBe('vpn');
    expect(graph.nodes.some((node) => node.kind === 'vpntunnel')).toBe(false);
    expect(graph.edges.some((edge) => edge.source === 'hybrid-cpe-unused' || edge.target === 'hybrid-cpe-unused')).toBe(false);
  });

  it('uses the normalized custom region key for VCN names and firewall captions', () => {
    const model = emptyLzModel();
    model.foundation.regionShortName = ' FR2 ';
    const graph = buildGraph(model, 3);
    expect(graph.nodes.find((node) => node.id === 'hub-vcn')?.label).toBe('vcn-fr2-lz-hub\n10.0.0.0/21');
    expect(graph.nodes.filter((node) => node.icon === 'firewall').map((node) => node.caption)).toEqual(['nfw-fr2-lz-hub-dmz', 'nfw-fr2-lz-hub-int']);
    expect(model.foundation.regionShortName).toBe(' FR2 ');
  });

  it('shows EXACC as compartment-only and EXACS AVMC/VMC as a network in the unified Platforms step', () => {
    const model = emptyLzModel();
    model.exadata.exacc = { enabled: true, shared: true, environments: ['environment-1'], projectDb: {}, notifications: { default: 'ops@example.com' } };
    model.exadata.exacs = {
      enabled: true, infrastructure: 'shared', database: 'per_environment', service: 'vmc',
      environments: ['environment-1', 'environment-2'], sharedVcnCidr: '10.172.0.0/21',
      environmentVcnCidrs: { 'environment-1': '10.172.8.0/21', 'environment-2': '10.172.16.0/21' },
      projectDb: {}, notifications: { default: 'ops@example.com' },
    };
    expect(buildGraph(model, 3).nodes.some((node) => node.label.includes('exacc'))).toBe(false);
    const nodes = buildGraph(model, 4).nodes;
    expect(nodes.find((node) => node.label === 'cmp-lz-shared-exacc')?.kind).toBe('compartment');
    expect(nodes.some((node) => node.label.includes('shared-exacc') && node.kind === 'vcn')).toBe(false);
    expect(nodes.find((node) => node.label === 'cmp-lz-shared-exacs')?.kind).toBe('compartment');
    expect(nodes.some((node) => node.label.includes('shared-exacs') && node.kind === 'vcn')).toBe(false);
    expect(nodes.find((node) => node.label === 'vcn-fra-lz-prod-exacs\n10.172.8.0/21')?.kind).toBe('vcn');
    expect(nodes.find((node) => node.label === 'vcn-fra-lz-preprod-exacs\n10.172.16.0/21')?.kind).toBe('vcn');
    expect(nodes.find((node) => node.label === 'cmp-lz-prod-exacc')?.kind).toBe('compartment');
    expect(nodes.find((node) => node.label === 'cmp-lz-shared-exacc-infra')?.parentId).toBe('cmp-shared-exadata-exacc');
    expect(nodes.some((node) => node.label === 'cmp-lz-shared-exacc-db')).toBe(false);
    expect(nodes.find((node) => node.label === 'cmp-lz-prod-exacc-db')?.parentId).toBe('cmp-env-0-exadata-exacc');
    expect(nodes.some((node) => node.label === 'cmp-lz-prod-exacc-infra')).toBe(false);
    expect(nodes.find((node) => node.label === 'cmp-lz-prod-exacs-db')?.parentId).toBe('cmp-env-0-platform-comp-0');
  });

  it('shows platform children and selected Autonomous project DB compartments for both Exadata extensions', () => {
    const model = emptyLzModel();
    model.exadata.exacc = {
      enabled: true, shared: false, database: 'per_environment', service: 'autonomous',
      environments: ['environment-1'], projectDb: { 'environment-1': ['project-1'] },
      notifications: { default: 'ops@example.com' },
    };
    model.exadata.exacs = {
      enabled: true, infrastructure: 'per_environment', database: 'per_environment', service: 'both',
      environments: ['environment-1'], sharedVcnCidr: '10.172.0.0/21',
      environmentVcnCidrs: { 'environment-1': '10.172.8.0/21' },
      projectDb: { 'environment-1': ['project-1'] }, notifications: { default: 'ops@example.com' },
    };
    const nodes = buildGraph(model, 4).nodes;
    const exacc = nodes.find((node) => node.label === 'cmp-lz-prod-exacc')!;
    const exacs = nodes.find((node) => node.label === 'cmp-lz-prod-exacs')!;
    expect(nodes.filter((node) => node.parentId === exacc.id).map((node) => node.label).sort()).toEqual([
      'cmp-lz-prod-exacc-db', 'cmp-lz-prod-exacc-infra',
    ]);
    expect(nodes.filter((node) => node.parentId === exacs.id).map((node) => node.label).sort()).toEqual([
      'cmp-lz-prod-exacs-db', 'cmp-lz-prod-exacs-infra',
    ]);
    const project = nodes.find((node) => node.label === 'cmp-lz-prod-proj1')!;
    expect(nodes.filter((node) => node.parentId === project.id).map((node) => node.label).sort()).toEqual([
      'cmp-lz-prod-proj1-exacc-db', 'cmp-lz-prod-proj1-exacs-db',
    ]);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    for (const node of nodes) {
      if (!node.parentId) continue;
      const parent = byId.get(node.parentId)!;
      expect(node.y + node.height, `${node.id} bottom`).toBeLessThanOrEqual(parent.height);
    }
  });
  it('uses the fixed landing-zone and top-level compartment names', () => {
    const graph = buildGraph(emptyLzModel(), 1);
    expect(graph.nodes.find((node) => node.id === 'tenancy')?.label).toBe('OCI Tenancy');
    expect(graph.nodes.find((node) => node.id === 'landingzone')?.label).toBe('cmp-landingzone');
    expect(graph.nodes.find((node) => node.id === 'cmp-network')).toMatchObject({ label: 'cmp-lz-network', tone: 'yellow' });
    expect(graph.nodes.find((node) => node.id === 'cmp-security')).toMatchObject({ label: 'cmp-lz-security', tone: 'yellow' });
    expect(graph.nodes.find((node) => node.id === 'cmp-platform')).toMatchObject({ label: 'cmp-lz-platform', tone: 'yellow', compartmentScope: 'shared' });
  });

  it('shows cmp-lz-platform from Foundation onward with no default shared children', () => {
    const graph = buildGraph(emptyLzModel(), 1);
    expect(graph.nodes.some((node) => node.id === 'cmp-platform')).toBe(true);
    expect(graph.nodes.some((node) => node.id.startsWith('cmp-shared-platform-'))).toBe(false);
  });

  it('marks every explicit Security Zone target and no unrelated compartment', () => {
    const model: LzModel = {
      ...emptyLzModel(),
      environments: [env('prod', true, 0), env('preprod', false, 1)],
    };
    const graph = buildGraph(model, 4);

    expect(graph.nodes.find((node) => node.id === 'landingzone')?.secure).toBe(true);
    expect(graph.nodes.find((node) => node.id === 'cmp-network')?.secure).toBe(true);
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0')?.secure).toBe(true);
    expect(graph.nodes.find((node) => node.id === 'cmp-env-1')?.secure).toBe(false);
    expect(graph.nodes.find((node) => node.id === 'cmp-security')?.secure).toBeUndefined();
    expect(graph.nodes.find((node) => node.id === 'cmp-platform')?.secure).toBeUndefined();
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0-network')?.secure).toBeUndefined();
  });

  it.each([
    ['hub_a', ['fw-dmz', 'lb']],
    ['hub_b', ['lb']],
    ['hub_c', ['untrust', 'lb']],
    ['hub_e', ['lb']],
  ] as const)('derives exact names and public subnets for %s', (kind, publicKeys) => {
    const base = emptyLzModel();
    const model: LzModel = { ...base, network: { hubKind: kind, ...hubKindDefaults(kind) } };
    const graph = buildGraph(model, 2);
    expect(graph.nodes.find((node) => node.id === 'hub-vcn')?.label).toBe('vcn-fra-lz-hub\n10.0.0.0/21');
    const subnets = graph.nodes.filter((node) => node.parentId === 'hub-vcn' && node.kind === 'subnet');
    expect(subnets.map((node) => node.label.split('\n')[0])).toEqual(hubKindDefaults(kind).subnets.map((subnet) => `sn-fra-lz-hub-${subnet.name}`));
    expect(subnets.filter((node) => node.publicSubnet).map((node) => node.label.split('\n')[0])).toEqual(publicKeys.map((key) => `sn-fra-lz-hub-${key}`));
    expect(graph.nodes.find((node) => node.id === 'drg')?.label).toBe('drg-fra-lz-hub');
    expect(graph.nodes.find((node) => node.id === 'attach-hub')?.label).toBe('drgatt-fra-lz-hub');
  });

  it('uses the generator Network Firewall host offset', () => {
    const subnets = buildGraph(emptyLzModel(), 2).nodes.filter((node) => node.parentId === 'hub-vcn' && node.kind === 'subnet');
    expect(subnets[0].ipNote).toBe('10.0.0.10');
    expect(subnets[2].ipNote).toBe('10.0.2.10');
  });

  it('places environment platform VCNs in network and compartments in platform', () => {
    const platform = newPlatform('oke_simple', []);
    const model: LzModel = { ...emptyLzModel(), environments: [env('prod', true, 0)], platforms: [platform] };
    const graph = buildGraph(model, 4);
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0-network')?.label).toBe('cmp-lz-prod-network');
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0-platforms')?.label).toBe('cmp-lz-prod-platform');
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0-platform-comp-0')).toMatchObject({
      label: 'cmp-lz-prod-oke', parentId: 'cmp-env-0-platforms',
    });
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0-plat-0')).toMatchObject({
      label: 'vcn-fra-lz-prod-oke\n10.0.80.0/20', parentId: 'cmp-env-0-network',
    });
    expect(graph.nodes.find((node) => node.id === 'attach-cmp-env-0-plat-0')?.label).toBe('drgatt-fra-lz-prod-oke');
    expect(graph.nodes.filter((node) => node.parentId === 'cmp-env-0-plat-0' && node.kind === 'subnet').map((node) => node.label.split('\n')[0])).toEqual([
      'sn-fra-lz-prod-oke-pods', 'sn-fra-lz-prod-oke-workers', 'sn-fra-lz-prod-oke-lb', 'sn-fra-lz-prod-oke-cp',
    ]);
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0-plat-0-sgw')?.label).toBe('Service\nGateway');
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'cmp-env-0-plat-0', target: 'attach-cmp-env-0-plat-0' }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'attach-cmp-env-0-plat-0', target: 'drg' }));
  });

  it('shows Hub E local NAT for Custom and OKE platforms', () => {
    const base = emptyLzModel();
    const custom = newPlatform('custom', []);
    const oke = newPlatform('oke_simple', [custom]);
    const model: LzModel = {
      ...base,
      network: { hubKind: 'hub_e', ...hubKindDefaults('hub_e') },
      platforms: [custom, oke],
    };
    const graph = buildGraph(model, 4);
    expect(graph.nodes.some((node) => node.id === 'cmp-env-0-plat-0-natgw')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'cmp-env-0-plat-1-natgw')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'cmp-env-0-plat-1-sgw')).toBe(true);
  });

  it('aligns the Hub E NAT gateway with management without overlapping the service gateway', () => {
    const model = emptyLzModel();
    model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
    const graph = buildGraph(model, 3);
    const nat = graph.nodes.find((node) => node.id === 'gw-natgw')!;
    const mgmt = graph.nodes.find((node) => node.id === 'hub-vcn-sn-1')!;
    const sgw = graph.nodes.find((node) => node.id === 'gw-sgw')!;
    expect(nat.y + nat.height / 2).toBe(mgmt.y + mgmt.height / 2);
    expect(nat.y + nat.height).toBeLessThanOrEqual(sgw.y);
    expect(graph.nodes.filter((node) => node.icon === 'firewall')).toEqual([]);
  });

  it('does not invent a hub load balancer when OKE suppresses it in the generator', () => {
    const model = emptyLzModel();
    model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
    model.platforms = [newPlatform('oke_simple', [], model.environments)];
    const graph = buildGraph(model, 4);
    expect(graph.nodes.find((node) => node.id === 'hub-vcn-sn-0')?.icon).toBeUndefined();
    expect(graph.nodes.find((node) => node.id === 'hub-vcn-sn-0')?.publicSubnet).toBe(true);
  });

  it('places multiple shared compartments under platform and VCNs under network with attachments', () => {
    const first = newSharedPlatform('custom', []);
    const second = newSharedPlatform('custom', [first]);
    const model: LzModel = { ...emptyLzModel(), sharedPlatforms: [first, second] };
    const graph = buildGraph(model, 4);
    expect(graph.nodes.find((node) => node.id === 'cmp-shared-platform-0')).toMatchObject({ label: 'cmp-lz-shared-core', parentId: 'cmp-platform' });
    expect(graph.nodes.find((node) => node.id === 'cmp-shared-platform-1')).toMatchObject({ label: 'cmp-lz-shared-cor2', parentId: 'cmp-platform' });
    expect(graph.nodes.find((node) => node.id === 'shared-plat-vcn-0')).toMatchObject({ label: 'vcn-fra-lz-shared-core\n10.0.32.0/21', parentId: 'cmp-network' });
    expect(graph.nodes.find((node) => node.id === 'shared-plat-vcn-1')).toMatchObject({ label: 'vcn-fra-lz-shared-cor2\n10.0.40.0/21', parentId: 'cmp-network' });
    expect(graph.nodes.find((node) => node.id === 'attach-shared-0')?.label).toBe('drgatt-fra-lz-shared-core');
    expect(graph.nodes.find((node) => node.id === 'attach-shared-1')?.label).toBe('drgatt-fra-lz-shared-cor2');
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'shared-plat-vcn-1', target: 'attach-shared-1' }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'attach-shared-1', target: 'drg' }));
  });

  it('shows a Hub E NAT gateway for each shared Custom platform', () => {
    const custom = newSharedPlatform('custom', []);
    const second = newSharedPlatform('custom', [custom]);
    const base = emptyLzModel();
    const graph = buildGraph({
      ...base,
      network: { hubKind: 'hub_e', ...hubKindDefaults('hub_e') },
      sharedPlatforms: [custom, second],
    }, 4);
    expect(graph.nodes.find((node) => node.id === 'shared-plat-natgw-0')?.label).toBe('NAT\nGateway');
    expect(graph.nodes.find((node) => node.id === 'shared-plat-natgw-0')?.parentId).toBe('shared-plat-vcn-0');
    expect(graph.nodes.some((node) => node.id === 'shared-plat-natgw-1')).toBe(true);
  });

  it('keeps all structural nodes inside their parents', () => {
    const shared = newSharedPlatform('custom', []);
    const model: LzModel = { ...emptyLzModel(), platforms: [newPlatform('oke_simple', [])], sharedPlatforms: [shared] };
    const graph = buildGraph(model, 4);
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    for (const node of graph.nodes) {
      if (!node.parentId) continue;
      const parent = nodes.get(node.parentId)!;
      expect(node.x + node.width, `${node.id} right`).toBeLessThanOrEqual(parent.width);
      expect(node.y + node.height, `${node.id} bottom`).toBeLessThanOrEqual(parent.height);
    }
  });

  it('nests every gateway inside its VCN', () => {
    const base = emptyLzModel();
    const graph = buildGraph({
      ...base,
      network: { hubKind: 'hub_e', ...hubKindDefaults('hub_e') },
      platforms: [newPlatform('custom', [])],
      sharedPlatforms: [newSharedPlatform('custom', [])],
    }, 4);
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    const gateways = graph.nodes.filter((node) => node.kind === 'gateway');
    expect(gateways.length).toBeGreaterThan(0);
    for (const gateway of gateways) {
      expect(nodes.get(gateway.parentId ?? '')?.kind, gateway.id).toBe('vcn');
      expect(gateway.x + gateway.width / 2, `${gateway.id} icon centre`).toBe(0);
    }
  });

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('keeps %s gateways on compact VCN boundaries with readable service labels', (kind) => {
    const model = emptyLzModel();
    model.network = { hubKind: kind, ...hubKindDefaults(kind) };
    model.platforms = [newPlatform('oke_simple', [], model.environments), newPlatform('custom', [], model.environments)];
    model.sharedPlatforms = [newSharedPlatform('custom', [])];
    const before = structuredClone(model);
    const graph = buildGraph(model, 4, { showEndpoints: true });
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    for (const gateway of graph.nodes.filter((node) => node.kind === 'gateway')) {
      const vcn = nodes.get(gateway.parentId!)!;
      const network = nodes.get(vcn.parentId!)!;
      expect(gateway.x + gateway.width / 2, gateway.id).toBe(0);
      expect(vcn.x).toBe(46);
      expect(vcn.x + gateway.x, `${gateway.id} compartment inset`).toBeGreaterThanOrEqual(8);
      expect(vcn.x + vcn.width).toBeLessThanOrEqual(network.width);
      expect(gateway.label).toBe({ igw: 'Internet\nGateway', natgw: 'NAT\nGateway', sgw: 'Service\nGateway' }[gateway.icon as 'igw' | 'natgw' | 'sgw']);
      const subnets = graph.nodes.filter((node) => node.parentId === vcn.id && node.kind === 'subnet');
      subnets.forEach((subnet) => {
        expect(subnet.x).toBeGreaterThanOrEqual(gateway.x + gateway.width + 8);
        expect(subnet.width).toBe(300);
        expect(vcn.width - subnet.x - subnet.width - 10).toBeGreaterThanOrEqual(6);
        expect(subnet.label.split('\n')).toHaveLength(2);
      });
      expect(vcn.width).toBeLessThan(372);
    }
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0-vcn-sn-0')).toMatchObject({
      label: 'sn-fra-lz-prod-web\n10.0.64.0/24', endpointName: 'vm-prod-web',
    });
    expect(model).toEqual(before);
  });

  it('sizes project compartments to their content even when network endpoints grow', () => {
    const model = emptyLzModel();
    const normal = buildGraph(model, 4);
    const expanded = buildGraph(model, 4, { showEndpoints: true });
    for (const graph of [normal, expanded]) {
      const project = graph.nodes.find((node) => node.id === 'cmp-env-0-proj-0')!;
      const projects = graph.nodes.find((node) => node.id === 'cmp-env-0-projects')!;
      const platform = graph.nodes.find((node) => node.id === 'cmp-env-0-platforms')!;
      expect(project.height).toBe(42);
      expect(projects.height).toBe(project.y + project.height + 16);
      expect(projects.tone).toBe('projects');
      expect(platform.tone).toBe('platform');
      expect(platform.y).toBe(projects.y + projects.height + 12);
    }
  });

  it('preserves route-table and packet-flow layers in diagram-only mode', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const dotted = buildGraph(model, 3, { showDots: true }, undefined, tables);
    expect(dotted.nodes.some((node) => node.kind === 'rtdot')).toBe(true);
    const traced = buildGraph(model, 3, {
      showDots: true, showEndpoints: true,
      activeFlows: ['prod:egress'],
    }, undefined, tables);
    expect(traced.edges.some((edge) => edge.animated)).toBe(true);
  });

  it('keeps an active flow focused on its endpoints while displaying the complete routing configuration', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const graph = buildGraph(model, 3, { activeFlows: ['prod:egress:web'] }, undefined, tables);
    expect(graph.nodes.filter((node) => node.endpointName).map((node) => node.id)).toEqual(['cmp-env-0-vcn-sn-0']);
    expect(graph.nodes.filter((node) => node.kind === 'routetable')).toHaveLength(tables.length);

    const flow = graph.edges.find((edge) => edge.id === 'flow-prod:egress:web#0')!;
    expect(flow.points?.[0]).toEqual(flowAnchor(graph, 'cmp-env-0-vcn-sn-0'));
    expect(flow.points?.at(-1)).toEqual(flowAnchor(graph, 'gw-natgw'));
  });

  it('keeps all shared route-table attachment points visible during a flow', async () => {
    const model = emptyLzModel();
    const tables = await generatedRouteTables(model);
    const spokeTable = tables.find((table) => table.associations.some((association) => association.nodeId === 'attach-cmp-env-0' && association.kind === 'drg-attachment'))!;
    const graph = buildGraph(model, 3, {
      activeFlows: ['prod:egress:web'],
      openTables: [spokeTable.id],
    }, undefined, tables);
    expect(graph.nodes.find((node) => node.id === spokeTable.id)).toBeDefined();
    expect(graph.nodes.filter((node) => node.kind === 'rtdot' && node.rtDotTableId === spokeTable.id)).toHaveLength(spokeTable.associations.length);
  });

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)(
    'shows every %s route table, full rules, and all governed attachments in flow mode',
    async (kind) => {
      const model = emptyLzModel();
      model.network = { hubKind: kind, ...hubKindDefaults(kind) };
      const activeFlows = ['prod:egress:web'];
      const expected = await generatedRouteTables(model);
      const graph = buildGraph(model, 4, { showFlows: true, activeFlows }, undefined, expected);
      const tables = graph.nodes.filter((node) => node.kind === 'routetable');
      const trace = buildFlowTraces(model, activeFlows, 'flow', expected)[0];
      expect(tables.map((table) => table.id).sort()).toEqual(expected.map((table) => table.id).sort());
      for (const table of expected) {
        const node = tables.find((entry) => entry.id === table.id)!;
        expect(node.rtRows, table.id).toEqual(table.rules.map(({ id, destination, targetType, target, routeType, superseded }) => ({ id, destination, targetType, target, routeType, superseded })));
        expect(node.rtHighlight, table.id).toEqual(trace.highlights.find((entry) => entry.tableId === table.id)?.rows ?? []);
        const dots = graph.nodes.filter((entry) => entry.kind === 'rtdot' && entry.rtDotTableId === table.id);
        expect(dots, table.id).toHaveLength(table.associations.length);
        for (const dot of dots) expect(graph.edges.some((edge) => edge.source === dot.id && edge.target === table.id), dot.id).toBe(true);
      }
      const rects = absoluteNodeRects(graph.nodes);
      for (const table of tables) {
        const rect = rects.get(table.id)!;
        for (const other of graph.nodes.filter((node) => ['vcn', 'routetable', 'project', 'subnet', 'attachment', 'drg'].includes(node.kind) && node.id !== table.id)) {
          const target = rects.get(other.id)!;
          const overlaps = rect.x < target.x + target.width && rect.x + rect.width > target.x && rect.y < target.y + target.height && rect.y + rect.height > target.y;
          expect(overlaps, `${table.id} overlaps ${other.id}`).toBe(false);
        }
      }
    },
  );

  it('shows platform tables beside their actual environment or shared VCN and links every subnet', async () => {
    const model = {
      ...emptyLzModel(),
      platforms: [newPlatform('custom', [])],
      sharedPlatforms: [newSharedPlatform('custom', [])],
    };
    const tables = await generatedRouteTables(model);
    const graph = buildGraph(model, 4, { showFlows: true }, undefined, tables);
    expect(graph.nodes.filter((node) => node.kind === 'routetable').map((node) => node.id).sort()).toEqual(tables.map((table) => table.id).sort());
    for (const table of tables.filter((entry) => entry.associations.some((association) => association.kind === 'subnet' && (association.nodeId.includes('-plat-') || association.nodeId.startsWith('shared-plat-'))))) {
      const node = graph.nodes.find((entry) => entry.id === table.id)!;
      expect(node.rtRows).toHaveLength(table.rules.length);
      expect(graph.edges.filter((edge) => edge.target === table.id)).toHaveLength(table.associations.length);
      const dot = graph.nodes.find((entry) => entry.id === `dot-${table.id}`)!;
      const rect = absoluteNodeRects(graph.nodes).get(table.associations[0].nodeId)!;
      const landingzone = absoluteNodeRects(graph.nodes).get('landingzone')!;
      expect(dot.x + landingzone.x + dot.width / 2).toBe(rect.x + rect.width);
      expect(dot.y + landingzone.y + dot.height / 2).toBe(rect.y + rect.height / 2);
    }
  });

  it('shows every route table before a flow is selected, then changes highlights without hiding tables', async () => {
    const model = emptyLzModel();
    const inventory = await generatedRouteTables(model);
    const plain = buildGraph(model, 3, { showFlows: true }, undefined, inventory);
    const all = buildGraph(model, 3, { allFlows: true }, undefined, inventory);
    const focused = buildGraph(model, 3, { allFlows: true, focusFlow: 'prod:services' }, undefined, inventory);
    const tables = (graph: ReturnType<typeof buildGraph>) => graph.nodes.filter((node) => node.kind === 'routetable');
    expect(tables(plain)).toHaveLength(inventory.length);
    expect(tables(plain).every((node) => node.rtHighlight?.length === 0)).toBe(true);
    expect(tables(all).some((node) => !!node.rtHighlight?.length)).toBe(true);
    expect(tables(focused).map((node) => node.id)).toEqual(tables(all).map((node) => node.id));
    const serviceTrace = buildFlowTraces(model, ['prod:services'], 'flow', inventory)[0];
    expect(tables(focused).filter((node) => node.rtHighlight?.length).map((node) => node.id).sort()).toEqual(serviceTrace.highlights.map((entry) => entry.tableId).sort());
  });

  it('keeps all-endpoint flow branches anchored to their actual subnet centres', async () => {
    const model = emptyLzModel();
    const graph = buildGraph(model, 3, { activeFlows: ['prod:egress'] }, undefined, await generatedRouteTables(model));
    const flows = graph.edges.filter((edge) => edge.id.startsWith('flow-prod:egress#'));
    expect(flows).toHaveLength(4);
    flows.forEach((flow, index) => {
      expect(flow.points?.[0]).toEqual(flowAnchor(graph, `cmp-env-0-vcn-sn-${index}`));
    });
  });

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)(
    'routes every %s flow through its logical resources without crossing unrelated leaf resources',
    async (kind) => {
      const base = emptyLzModel();
      const model: LzModel = { ...base, network: { hubKind: kind, ...hubKindDefaults(kind) } };
      const leafKinds = new Set(['subnet', 'gateway', 'attachment', 'drg', 'routetable', 'project']);
      const tables = await generatedRouteTables(model);
      for (const activeFlow of ['prod:egress:web', 'prod:ingress:web', 'prod:east-west:web', 'prod:services:web']) {
        const graph = buildGraph(model, 3, { activeFlows: [activeFlow] }, undefined, tables);
        const flow = graph.edges.find((edge) => edge.id.startsWith('flow-'))!;
        const points = flow.points ?? [];
        const rects = absoluteNodeRects(graph.nodes);

        expect(points.length, activeFlow).toBeGreaterThan(1);
        points.slice(1).forEach((point, index) => {
          const previous = points[index];
          expect(point.x === previous.x || point.y === previous.y, `${activeFlow} segment ${index}`).toBe(true);
        });
        flow.waypoints?.forEach((id) => {
          expect(pathContains(points, flowAnchorPoint(rects.get(id)!)), `${activeFlow} misses ${id}`).toBe(true);
        });
        points.slice(1).forEach((point, index) => {
          const previous = points[index];
          for (const rect of rects.values()) {
            if (!leafKinds.has(rect.node.kind) || flow.waypoints?.includes(rect.id)) continue;
            expect(crossesInterior(previous, point, rect), `${activeFlow} crosses ${rect.id}`).toBe(false);
          }
        });
      }
    },
  );

  it('shows shared DRG route tables on each attachment and keeps attachment lines distinct', async () => {
    const model: LzModel = {
      ...emptyLzModel(),
      platforms: [newPlatform('custom', [])],
      sharedPlatforms: [newSharedPlatform('custom', [])],
    };
    const tables = await generatedRouteTables(model);
    const graph = buildGraph(model, 4, { showDots: true }, undefined, tables);
    const spokeTable = tables.find((table) => table.associations.some((association) => association.nodeId === 'attach-cmp-env-0' && association.kind === 'drg-attachment'))!;
    const spokeDots = graph.nodes.filter((node) => node.kind === 'rtdot' && node.rtDotTableId === spokeTable.id);
    expect(spokeDots).toHaveLength(spokeTable.associations.length);
    expect(spokeDots.length).toBeGreaterThanOrEqual(5);

    const drgEdges = graph.edges.filter((edge) => edge.target === 'drg' && edge.source.startsWith('attach-'));
    expect(drgEdges).toHaveLength(6);
    expect(new Set(drgEdges.map((edge) => edge.targetPort)).size).toBe(drgEdges.length);
  });
});
