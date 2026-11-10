import { describe, expect, it } from 'vitest';
import type { HubKind, LzModel } from '../model/types';
import { emptyLzModel } from '../model/defaults';
import { generateNetwork } from '../generator/network';
import { allFlowIds, buildFlowTraces } from './flowTrace';
import { hubKindDefaults } from './hubKinds';
import { customDefaultSubnets, newPlatform, newSharedPlatform } from './platforms';
import { buildRouteTables } from './routeTables';
import { generatedRouteTables } from './routingFixtures.testSupport';

function peeredModel(hubKind: HubKind): LzModel {
  const model = emptyLzModel();
  model.network = { hubKind, ...hubKindDefaults(hubKind) };
  model.remotePeeringConnections = [
    { id: 'home', name: 'home_region', role: 'requester', remoteCidrs: ['10.90.0.0/21', '10.90.8.0/21'], peerRegionName: 'eu-amsterdam-1', peerId: 'RPC-HOME-KEY' },
    { id: 'peer', name: 'peer', role: 'acceptor', remoteCidrs: ['10.91.0.0/21'], peerRegionName: 'eu-paris-1' },
  ];
  return model;
}

function withPlatforms(model: LzModel): LzModel {
  const custom = newPlatform('custom', []);
  const oke = newPlatform('oke_simple', []);
  const extra = newPlatform('custom', [custom]);
  const shared = newSharedPlatform('custom', []);
  const extraShared = newSharedPlatform('custom', [shared]);
  model.platforms = [
    { ...custom, key: 'cus', vcnCidr: '10.1.0.0/21', subnets: customDefaultSubnets('10.1.0.0/21'), overrides: undefined },
    { ...oke, key: 'oke', vcnCidr: '10.2.0.0/20', okeParams: { ...oke.okeParams!, createFss: true }, overrides: undefined },
    { ...extra, key: 'aux', vcnCidr: '10.3.0.0/21', subnets: customDefaultSubnets('10.3.0.0/21'), overrides: undefined },
  ];
  model.sharedPlatforms = [
    { ...shared, key: 'cus', vcnCidr: '10.4.0.0/21', subnets: customDefaultSubnets('10.4.0.0/21') },
    { ...extraShared, key: 'aux', vcnCidr: '10.4.8.0/21', subnets: customDefaultSubnets('10.4.8.0/21') },
  ];
  return model;
}

type Resource = {
  display_name?: string;
  route_rules?: Record<string, Resource>;
  destination?: string;
  network_entity_key?: string;
  network_entity_id?: string;
  ipv4address?: string;
  subnet_id?: string;
  cidr_block?: string;
  cidr_blocks?: string[];
  subnets?: Record<string, Resource>;
  destination_type?: string;
  import_drg_route_distribution_key?: string;
  statements?: Record<string, { match_criteria: { drg_attachment_key: string } }>;
  network_details?: { type: string; attached_resource_key: string };
  next_hop_drg_attachment_key?: string;
};

function resourcesIn(value: unknown, resources = new Map<string, Resource>()): Map<string, Resource> {
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object' && !Array.isArray(child)) resources.set(key, child as Resource);
      resourcesIn(child, resources);
    }
  }
  return resources;
}

describe('canonical X-RPC routing', () => {
  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('retains every generated %s rule and its actual target with platforms and RPCs', async (hubKind) => {
    const model = withPlatforms(peeredModel(hubKind));
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc', database: 'per_environment',
      environments: model.environments.map((env) => env.id), notifications: { default: 'dba@example.com' },
      environmentVcnCidrs: { 'environment-1': '10.5.0.0/21', 'environment-2': '10.5.8.0/21' } };
    const network = await generateNetwork(model);
    const resources = resourcesIn(network);
    const tables = buildRouteTables(model, network);
    const actualTables = [...resources.entries()].filter(([, resource]) => resource.display_name && resource.route_rules);
    expect(tables.map((table) => table.id).sort()).toEqual(actualTables.map(([key]) => key).sort());
    for (const table of tables) {
      const generated = resources.get(table.sourceKey)!;
      const configured = table.rules.filter((rule) => rule.provenance === 'configured');
      expect(configured.map((rule) => rule.id).sort()).toEqual(Object.keys(generated.route_rules!).sort());
      for (const rule of configured) {
        const raw = generated.route_rules![rule.id];
        expect(rule.destination).toBe(raw.destination_type === 'SERVICE_CIDR_BLOCK' ? 'OSN Services' : raw.destination);
        expect(rule.targetKey).toBe(raw.next_hop_drg_attachment_key ?? raw.network_entity_key ?? raw.network_entity_id);
      }
    }
    for (const connection of model.remotePeeringConnections!) {
      const rpc = tables.find((table) => table.associations.some((owner) => owner.kind === 'rpc-attachment' && owner.nodeId === 'rpc-' + connection.id))!;
      expect(rpc).toBeDefined();
      expect(rpc.columns).toBe('drg');
      const generated = resources.get(rpc.sourceKey)!;
      if (hubKind === 'hub_e') {
        expect(rpc.importDistributionKey).toBe(generated.import_drg_route_distribution_key);
        expect(rpc.rules.every((rule) => rule.provenance === 'derived-import')).toBe(true);
        const distribution = resources.get(generated.import_drg_route_distribution_key!)!;
        const expected = Object.values(distribution.statements!).flatMap(({ match_criteria }) => {
          const attachment = resources.get(match_criteria.drg_attachment_key)!;
          return Object.values(resources.get(attachment.network_details!.attached_resource_key)!.subnets!)
            .map((subnet) => subnet.cidr_block);
        });
        expect(rpc.rules.map((rule) => rule.destination).sort()).toEqual(expected.sort());
      } else {
        expect(rpc.rules).toEqual([expect.objectContaining({ provenance: 'configured', destination: '0.0.0.0/0', flowTarget: 'attach-hub' })]);
      }
      const hub = tables.find((table) => table.associations.some((owner) => owner.nodeId === 'attach-hub' && owner.kind === 'drg-attachment'))!;
      const expected = hub.rules.filter((rule) => rule.flowTarget === 'rpc-' + connection.id);
      expect(expected.map((rule) => rule.destination).sort()).toEqual([...connection.remoteCidrs].sort());
      expect(expected.every((rule) => rule.provenance === 'expected-remote' && rule.targetType === 'RPC Attachment')).toBe(true);
    }
  }, 60_000);

  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('keeps real platform attachment associations without Projects VCNs in %s', async (hubKind) => {
    const model = withPlatforms(peeredModel(hubKind));
    model.environments.forEach((env) => { env.projectNetworkEnabled = false; });
    const tables = await generatedRouteTables(model);
    const spokes = tables.find((table) => table.name === 'drgrt-fra-lz-spokes')!;
    expect(spokes.associations.map((owner) => owner.nodeId).sort()).toEqual([
      'attach-cmp-env-0-plat-0', 'attach-cmp-env-0-plat-1', 'attach-cmp-env-0-plat-2',
      'attach-cmp-env-1-plat-0', 'attach-cmp-env-1-plat-1', 'attach-cmp-env-1-plat-2', 'attach-shared-0', 'attach-shared-1',
    ].sort());
    expect(tables.some((table) => table.name.includes('-proj-generic'))).toBe(false);
    expect(tables.flatMap((table) => table.associations).some((owner) => /^cmp-env-\d+-vcn-sn-/.test(owner.nodeId))).toBe(false);
  }, 60_000);

  it('imports the shared ExaCS VCN with no environments', async () => {
    const model = peeredModel('hub_e');
    model.environments = [];
    model.projects = [];
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc', notifications: { default: 'dba@example.com' } };
    const tables = await generatedRouteTables(model);
    expect(tables.find((table) => table.name === 'drgrt-fra-lz-spokes')!.associations)
      .toEqual([{ nodeId: 'attach-shared-0', kind: 'drg-attachment' }]);
    expect(tables.find((table) => table.name === 'drgrt-fra-lz-rpc-home-region')!.rules)
      .toContainEqual(expect.objectContaining({ flowTarget: 'attach-shared-0', provenance: 'derived-import' }));
    expect(tables.find((table) => table.name === 'rt-fra-lz-shared-exacs-generic')!.rules)
      .toContainEqual(expect.objectContaining({ destination: '10.90.0.0/21', nextHopKind: 'drg', provenance: 'configured' }));
  }, 60_000);

  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('keeps local flow decisions unchanged after adding RPCs in %s', async (hubKind) => {
    const model = peeredModel(hubKind);
    const local = { ...model, remotePeeringConnections: [] };
    const peeredTables = await generatedRouteTables(model);
    const localTables = await generatedRouteTables(local);
    const decisions = (source: LzModel, tables: ReturnType<typeof buildRouteTables>) =>
      buildFlowTraces(source, allFlowIds(source), 'kind', tables).map((trace) => ({
        id: trace.id, ok: trace.ok, hops: trace.hops.map((hop) => ({ node: hop.node, tableId: hop.tableId, ruleId: hop.ruleId })),
      }));
    expect(decisions(model, peeredTables)).toEqual(decisions(local, localTables));
  }, 60_000);
});
