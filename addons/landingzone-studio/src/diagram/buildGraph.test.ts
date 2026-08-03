import { describe, expect, it } from 'vitest';
import { buildGraph } from './buildGraph';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { hubKindDefaults } from '../services/hubKinds';
import { newPlatform, newSharedPlatform } from '../services/platforms';
import type { Environment, LzModel } from '../model/types';

function env(name: string, securityZone: boolean, index: number): Environment {
  return { id: `environment-${index + 1}`, name, securityZone, network: envNetworkDefaults(index) };
}

describe('generator-aligned graph', () => {
  it('uses the fixed landing-zone and top-level compartment names', () => {
    const graph = buildGraph(emptyLzModel(), 1);
    expect(graph.nodes.find((node) => node.id === 'tenancy')?.label).toBe('OCI Tenancy');
    expect(graph.nodes.find((node) => node.id === 'landingzone')?.label).toBe('cmp-landingzone');
    expect(graph.nodes.find((node) => node.id === 'cmp-network')).toMatchObject({ label: 'cmp-lz-network', tone: 'yellow' });
    expect(graph.nodes.find((node) => node.id === 'cmp-security')).toMatchObject({ label: 'cmp-lz-security', tone: 'yellow' });
    expect(graph.nodes.find((node) => node.id === 'cmp-platform')).toMatchObject({ label: 'cmp-lz-platform', tone: 'yellow' });
  });

  it('shows cmp-lz-platform from Foundation onward with no default shared children', () => {
    const graph = buildGraph(emptyLzModel(), 1);
    expect(graph.nodes.some((node) => node.id === 'cmp-platform')).toBe(true);
    expect(graph.nodes.some((node) => node.id.startsWith('cmp-shared-platform-'))).toBe(false);
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
    expect(graph.nodes.find((node) => node.id === 'cmp-env-0-plat-0-sgw')?.label).toBe('sgw-fra-lz-prod-oke');
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'cmp-env-0-plat-0', target: 'attach-cmp-env-0-plat-0' }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'attach-cmp-env-0-plat-0', target: 'drg' }));
  });

  it('shows Hub E local NAT only for platform contracts that generate it', () => {
    const base = emptyLzModel();
    const custom = newPlatform('custom', []);
    const ocvs = newPlatform('ocvs', [custom]);
    const model: LzModel = {
      ...base,
      network: { hubKind: 'hub_e', ...hubKindDefaults('hub_e') },
      platforms: [custom, ocvs],
    };
    const graph = buildGraph(model, 4);
    expect(graph.nodes.some((node) => node.id === 'cmp-env-0-plat-0-natgw')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'cmp-env-0-plat-1-natgw')).toBe(false);
    expect(graph.nodes.some((node) => node.id === 'cmp-env-0-plat-1-sgw')).toBe(true);
  });

  it('places multiple shared compartments under platform and VCNs under network with attachments', () => {
    const first = newSharedPlatform('custom', []);
    const second = newSharedPlatform('ocvs', [first]);
    const model: LzModel = { ...emptyLzModel(), sharedPlatforms: [first, second] };
    const graph = buildGraph(model, 4);
    expect(graph.nodes.find((node) => node.id === 'cmp-shared-platform-0')).toMatchObject({ label: 'cmp-lz-shared-core', parentId: 'cmp-platform' });
    expect(graph.nodes.find((node) => node.id === 'cmp-shared-platform-1')).toMatchObject({ label: 'cmp-lz-shared-ocv', parentId: 'cmp-platform' });
    expect(graph.nodes.find((node) => node.id === 'shared-plat-vcn-0')).toMatchObject({ label: 'vcn-fra-lz-shared-core\n10.170.0.0/21', parentId: 'cmp-network' });
    expect(graph.nodes.find((node) => node.id === 'shared-plat-vcn-1')).toMatchObject({ label: 'vcn-fra-lz-shared-ocv\n10.170.8.0/21', parentId: 'cmp-network' });
    expect(graph.nodes.find((node) => node.id === 'attach-shared-0')?.label).toBe('drgatt-fra-lz-shared-core');
    expect(graph.nodes.find((node) => node.id === 'attach-shared-1')?.label).toBe('drgatt-fra-lz-shared-ocv');
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'shared-plat-vcn-1', target: 'attach-shared-1' }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'attach-shared-1', target: 'drg' }));
  });

  it('shows the generator-owned Hub E NAT gateway for shared Custom platforms only', () => {
    const custom = newSharedPlatform('custom', []);
    const ocvs = newSharedPlatform('ocvs', [custom]);
    const base = emptyLzModel();
    const graph = buildGraph({
      ...base,
      network: { hubKind: 'hub_e', ...hubKindDefaults('hub_e') },
      sharedPlatforms: [custom, ocvs],
    }, 4);
    expect(graph.nodes.find((node) => node.id === 'shared-plat-natgw-0')?.label).toBe('ngw-fra-lz-shared-core');
    expect(graph.nodes.find((node) => node.id === 'shared-plat-natgw-0')?.parentId).toBe('shared-plat-vcn-0');
    expect(graph.nodes.some((node) => node.id === 'shared-plat-natgw-1')).toBe(false);
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
    }
  });

  it('preserves route-table and packet-flow layers in diagram-only mode', () => {
    const dotted = buildGraph(emptyLzModel(), 3, { showDots: true });
    expect(dotted.nodes.some((node) => node.kind === 'rtdot')).toBe(true);
    const traced = buildGraph(emptyLzModel(), 3, {
      showDots: true, showEndpoints: true,
      activeFlows: ['prod:egress'],
    });
    expect(traced.edges.some((edge) => edge.animated)).toBe(true);
  });
});
