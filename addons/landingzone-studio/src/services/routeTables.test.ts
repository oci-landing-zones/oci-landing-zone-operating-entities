import { beforeAll, describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import type { HubKind, LzModel } from '../model/types';
import { generateNetwork } from '../generator/network';
import { hubKindDefaults } from './hubKinds';
import { newPlatform, newSharedPlatform } from './platforms';
import { buildRouteTables } from './routeTables';
import { generatedRouteTables } from './routingFixtures.testSupport';

type Obj = Record<string, unknown>;
const at = (root: unknown, ...path: string[]): Obj => path.reduce<unknown>((value, key) => (value as Obj)[key], root) as Obj;
const models = new Map<HubKind, LzModel>();
const networks = new Map<HubKind, unknown>();
beforeAll(async () => {
  for (const kind of ['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const) {
    const model = emptyLzModel();
    model.network = { hubKind: kind, ...hubKindDefaults(kind) };
    models.set(kind, model);
    networks.set(kind, await generateNetwork(model));
  }
}, 60_000);

describe('canonical generated routing inventory', () => {
  it.each([
    ['hub_a', 7, ['gw-igw', 'gw-natgw']],
    ['hub_b', 5, ['gw-natgw']],
    ['hub_c', 6, ['gw-igw']],
    ['hub_e', 2, []],
  ] as const)('keeps %s actual table inventory and gateway associations', (kind, hubCount, gatewayOwners) => {
    const tables = buildRouteTables(models.get(kind)!, networks.get(kind));
    expect(tables.filter((table) => table.name.startsWith('rt-fra-lz-hub-'))).toHaveLength(hubCount);
    expect(tables.filter((table) => table.columns === 'drg')).toHaveLength(2);
    expect(tables.flatMap((table) => table.associations).filter((association) => association.kind === 'gateway').map((association) => association.nodeId).sort()).toEqual([...gatewayOwners].sort());
    expect(tables.every((table) => table.id === table.sourceKey)).toBe(true);
    for (const table of tables) expect(new Set(table.rules.map((rule) => rule.id)).size).toBe(table.rules.length);
  });

  it('separates VCN ingress and DRG attachment routing at the hub', () => {
    const tables = buildRouteTables(models.get('hub_a')!, networks.get('hub_a'));
    expect(tables.find((table) => table.name === 'rt-fra-lz-hub-ingress')!.associations)
      .toEqual([{ nodeId: 'hub-vcn', kind: 'vcn-ingress' }]);
    expect(tables.find((table) => table.name === 'drgrt-fra-lz-hub')!.associations)
      .toEqual([{ nodeId: 'attach-hub', kind: 'drg-attachment' }]);
    expect(tables.find((table) => table.name === 'drgrt-fra-lz-spokes')!.associations.map((entry) => entry.nodeId).sort())
      .toEqual(['attach-cmp-env-0', 'attach-cmp-env-1']);
  });

  it('shares the generated management and Projects VCN tables across their true subnet owners', () => {
    const tables = buildRouteTables(models.get('hub_a')!, networks.get('hub_a'));
    expect(tables.find((table) => table.name === 'rt-fra-lz-hub-mgmt')!.associations.map((entry) => entry.nodeId).sort())
      .toEqual(['hub-vcn-sn-3', 'hub-vcn-sn-4', 'hub-vcn-sn-5']);
    expect(tables.find((table) => table.name === 'rt-fra-lz-prod-proj-generic')!.associations.map((entry) => entry.nodeId).sort())
      .toEqual([0, 1, 2, 3].map((index) => 'cmp-env-0-vcn-sn-' + index));
  });

  it('resolves Network Firewall private-IP and NLB targets from generated resources', () => {
    const a = buildRouteTables(models.get('hub_a')!, networks.get('hub_a'));
    expect(a.find((table) => table.name === 'rt-fra-lz-hub-lb')!.rules.find((rule) => rule.destination === '0.0.0.0/0'))
      .toMatchObject({ nextHopKind: 'firewall', flowTarget: '10.0.0.10', targetNodeId: 'hub-vcn-sn-0', provenance: 'configured' });
    const c = buildRouteTables(models.get('hub_c')!, networks.get('hub_c'));
    expect(c.find((table) => table.name === 'rt-fra-lz-hub-igw')!.rules[0])
      .toMatchObject({ nextHopKind: 'nlb', flowTarget: 'hub-vcn-sn-0', targetKey: 'NLB-FRA-LZ-HUB-UNTRUST-KEY' });
  });

  it('distinguishes configured DRG rules from expected distribution imports', () => {
    const a = buildRouteTables(models.get('hub_a')!, networks.get('hub_a'));
    const hub = a.find((table) => table.name === 'drgrt-fra-lz-hub')!;
    expect(hub.rules).toHaveLength(8);
    expect(hub.rules.every((rule) => rule.provenance === 'derived-import' && rule.routeType === 'Dynamic' && rule.sourceAttachmentKey)).toBe(true);
    expect(hub.rules.map((rule) => rule.destination).sort()).toEqual(models.get('hub_a')!.environments.flatMap((env) => env.network.subnets.map((subnet) => subnet.cidr)).sort());
    expect(a.find((table) => table.name === 'drgrt-fra-lz-spokes')!.rules).toEqual([
      expect.objectContaining({ destination: '0.0.0.0/0', provenance: 'configured', routeType: 'Static', flowTarget: 'attach-hub' }),
    ]);
    const e = buildRouteTables(models.get('hub_e')!, networks.get('hub_e'));
    expect(e.find((table) => table.name === 'drgrt-fra-lz-spokes')!.rules.every((rule) => rule.provenance === 'derived-import')).toBe(true);
  });

  it('uses changed canonical rules, retains external targets and never substitutes hub recipes', () => {
    const network = structuredClone(networks.get('hub_a'));
    const vcn = at(network, 'network_configuration', 'network_configuration_categories', '0-shared', 'vcns', 'VCN-FRA-LZ-HUB-KEY');
    const ruleTable = at(vcn, 'route_tables', 'RT-FRA-LZ-HUB-LB-KEY');
    ruleTable.route_rules = { 'reviewed-rule': { destination: '192.0.2.0/24', destination_type: 'CIDR_BLOCK', network_entity_id: 'external-private-ip' } };
    const table = buildRouteTables(models.get('hub_a')!, network).find((entry) => entry.name === 'rt-fra-lz-hub-lb')!;
    expect(table.rules.filter((rule) => rule.provenance === 'configured')).toEqual([expect.objectContaining({ id: 'reviewed-rule', destination: '192.0.2.0/24', targetKey: 'external-private-ip', nextHopKind: 'unresolved' })]);
    expect(table.note).toContain('dependency outputs');
  });

  it('keeps unassociated generated tables and supports explicitly declared default associations', () => {
    const network = structuredClone(networks.get('hub_e'));
    const vcn = at(network, 'network_configuration', 'network_configuration_categories', '0-shared', 'vcns', 'VCN-FRA-LZ-HUB-KEY');
    const tables = at(vcn, 'route_tables');
    tables['EXTRA-TABLE'] = { display_name: 'unassociated', route_rules: {} };
    vcn.default_route_table_key = 'RT-FRA-LZ-HUB-MGMT-KEY';
    delete at(vcn, 'subnets', 'SN-FRA-LZ-HUB-LB-KEY').route_table_key;
    at(vcn, 'vcn_specific_gateways', 'service_gateways', 'SGW-FRA-LZ-HUB-KEY').route_table_key = 'EXTRA-TABLE';
    const result = buildRouteTables(models.get('hub_e')!, network);
    expect(result.find((table) => table.id === 'EXTRA-TABLE')!.associations).toEqual([{ nodeId: 'gw-sgw', kind: 'gateway' }]);
    expect(result.find((table) => table.name === 'rt-fra-lz-hub-mgmt')!.associations).toContainEqual({ nodeId: 'hub-vcn-sn-0', kind: 'subnet' });
    delete at(vcn, 'vcn_specific_gateways', 'service_gateways', 'SGW-FRA-LZ-HUB-KEY').route_table_key;
    expect(buildRouteTables(models.get('hub_e')!, network).find((table) => table.id === 'EXTRA-TABLE')).toMatchObject({ associations: [], attachTo: undefined });
  });

  it('uses VCN CIDR import mode and static VCN-ingress advertisements only when generated', () => {
    const network = structuredClone(networks.get('hub_e'));
    const drg = at(network, 'network_configuration', 'network_configuration_categories', '0-shared', 'non_vcn_specific_gateways', 'dynamic_routing_gateways', 'DRG-FRA-LZ-HUB-KEY');
    at(drg, 'drg_attachments', 'DRGATT-FRA-LZ-PROD-PROJ-KEY', 'network_details').vcn_route_type = 'VCN_CIDRS';
    const hub = buildRouteTables(models.get('hub_e')!, network).find((table) => table.name === 'drgrt-fra-lz-hub')!;
    expect(hub.rules).toContainEqual(expect.objectContaining({ destination: '10.0.64.0/21', flowTarget: 'attach-cmp-env-0' }));
    expect(hub.rules.some((rule) => rule.destination === '10.0.64.0/24')).toBe(false);
  });

  it('binds real OKE, Custom and Exadata platform tables without project networks', async () => {
    const model = emptyLzModel();
    model.environments.forEach((env) => { env.projectNetworkEnabled = false; });
    model.platforms = [newPlatform('oke_simple', [])];
    model.sharedPlatforms = [newSharedPlatform('custom', [])];
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc', notifications: { default: 'db@example.com' } };
    const tables = await generatedRouteTables(model);
    expect(tables.some((table) => table.name.includes('proj-generic'))).toBe(false);
    expect(tables.filter((table) => table.name.includes('-oke-')).every((table) => table.associations.some((entry) => entry.nodeId.includes('-plat-')))).toBe(true);
    expect(tables.find((table) => table.name === 'rt-fra-lz-shared-core-generic')!.associations).toEqual([{ nodeId: 'shared-plat-vcn-0-sn-0', kind: 'subnet' }]);
    expect(tables.find((table) => table.name === 'rt-fra-lz-shared-exacs-generic')!.associations.length).toBeGreaterThan(0);
  }, 60_000);
});
