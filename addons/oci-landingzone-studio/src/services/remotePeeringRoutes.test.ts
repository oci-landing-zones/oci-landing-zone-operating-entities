import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { HubKind, LzModel } from '../model/types';
import { emptyLzModel } from '../model/defaults';
import { generateOutputs } from '../generator/generate';
import { setAssetLoader } from '../generator/jsonnetVm';
import { allFlowIds, buildFlowTraces } from './flowTrace';
import { hubKindDefaults } from './hubKinds';
import { customDefaultSubnets, newPlatform, newSharedPlatform } from './platforms';
import { buildRouteTables } from './routeTables';

beforeAll(() => {
  setAssetLoader(async () => ({ wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')) }));
});

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
  const ocvs = newPlatform('ocvs', []);
  const sharedOcvs = newSharedPlatform('ocvs', []);
  model.platforms = [
    { ...custom, key: 'cus', vcnCidr: '10.1.0.0/21', subnets: customDefaultSubnets('10.1.0.0/21'), overrides: undefined },
    { ...oke, key: 'oke', vcnCidr: '10.2.0.0/20', okeParams: { ...oke.okeParams!, createFss: true }, overrides: undefined },
    { ...ocvs, key: 'ocv', vcnCidr: '10.3.0.0/21', ocvsParams: { ...ocvs.ocvsParams!, sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' }, overrides: undefined },
  ];
  model.sharedPlatforms = [
    { ...newSharedPlatform('custom', []), key: 'cus', vcnCidr: '10.4.0.0/21', subnets: customDefaultSubnets('10.4.0.0/21') },
    { ...sharedOcvs, key: 'sdc', vcnCidr: '10.4.8.0/21', ocvsParams: { ...sharedOcvs.ocvsParams!, sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' } },
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

describe('X-RPC route preview', () => {
  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('matches generated remote routes and incoming RPC tables for %s', async (hubKind) => {
    const model = withPlatforms(peeredModel(hubKind));
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc', database: 'per_environment',
      environments: model.environments.map((env) => env.id), notifications: { default: 'dba@example.com' },
      environmentVcnCidrs: { 'environment-1': '10.5.0.0/21', 'environment-2': '10.5.8.0/21' } };
    const { files } = await generateOutputs(model);
    const resources = resourcesIn(JSON.parse(files['network.json']));
    const generatedTables = [...resources.values()].filter((entry) => entry.display_name?.startsWith('rt-') && entry.route_rules);
    const tables = buildRouteTables(model);
    const remoteCidrs = model.remotePeeringConnections!.flatMap((connection) => connection.remoteCidrs);
    const isRemote = (rule: { destination?: string }) => remoteCidrs.includes(rule.destination ?? '');
    const remoteTargets = (table: Resource) => Object.values(table.route_rules!).filter(isRemote).map((rule) => {
      const key = (rule.network_entity_key ?? rule.network_entity_id)!;
      if (key.startsWith('DRG-')) return `${rule.destination}:drg:drg`;
      const target = resources.get(key)!;
      if (key.startsWith('NFW-')) return `${rule.destination}:firewall:${target.ipv4address}`;
      const subnet = resources.get(target.subnet_id!)!;
      return `${rule.destination}:nlb:hub-vcn-sn-${model.network.subnets.findIndex((entry) => entry.cidr === subnet.cidr_block)}`;
    }).sort();

    for (const table of tables.filter((entry) => entry.columns === 'vcn')) {
      const generated = generatedTables.find((entry) => entry.display_name === table.name);
      expect(generated, table.name).toBeDefined();
      expect(table.rules.filter(isRemote).map((rule) => `${rule.destination}:${rule.nextHopKind}:${rule.flowTarget}`).sort(), table.name)
        .toEqual(remoteTargets(generated!));
    }
    const generatedRemoteTables = generatedTables.filter((table) => remoteTargets(table).length > 0
      && (!/-(?:ocv|sdc)-/.test(table.display_name!) || table.display_name!.endsWith('-provisioning')));
    expect(tables.filter((table) => table.columns === 'vcn' && table.rules.some(isRemote)).map((table) => table.name).sort())
      .toEqual(generatedRemoteTables.map((table) => table.display_name).sort());

    for (const connection of model.remotePeeringConnections!) {
      const preview = tables.find((table) => table.id === `rt-rpc-${connection.id}`)!;
      const generated = [...resources.values()].find((entry) => entry.display_name === preview.name)!;
      const imported = generated.import_drg_route_distribution_key;
      const expected = imported
        ? Object.values(resources.get(imported)!.statements!).flatMap(({ match_criteria }) => {
          const attachment = resources.get(match_criteria.drg_attachment_key)!;
          const vcn = resources.get(attachment.network_details!.attached_resource_key)!;
          return vcn.cidr_blocks!.map((cidr) => `${cidr}:${attachment.display_name}:Dynamic`);
        })
        : Object.values(generated.route_rules!).map((rule) => `${rule.destination}:${resources.get(rule.next_hop_drg_attachment_key!)!.display_name}:Static`);
      expect(preview.rules.map((rule) => `${rule.destination}:${rule.target}:${rule.routeType}`).sort()).toEqual(expected.sort());
      const outbound = tables.find((table) => table.id === 'rt-drg-hub')!.rules.filter((rule) => rule.flowTarget === `rpc-${connection.id}`);
      expect(outbound.map((rule) => rule.destination)).toEqual(connection.remoteCidrs);
      expect(outbound.every((rule) => rule.targetType === 'RPC Attachment' && rule.routeType === 'Dynamic')).toBe(true);
      expect(tables.find((table) => table.id === 'rt-drg-spokes')!.rules.filter((rule) => rule.flowTarget === `rpc-${connection.id}`).map((rule) => rule.destination))
        .toEqual(hubKind === 'hub_e' ? connection.remoteCidrs : []);
    }
  }, 60_000);

  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('retains platform routes without project networks in %s', (hubKind) => {
    const model = withPlatforms(peeredModel(hubKind));
    model.environments.forEach((env) => { env.projectNetworkEnabled = false; });
    const tables = buildRouteTables(model);
    const spokes = tables.find((table) => table.id === 'rt-drg-spokes')!;
    expect(spokes).toBeDefined();
    expect([spokes.attachTo, ...(spokes.attachExtra ?? [])]).toEqual([
      'attach-cmp-env-0-plat-0', 'attach-cmp-env-0-plat-1', 'attach-cmp-env-0-plat-2',
      'attach-cmp-env-1-plat-0', 'attach-cmp-env-1-plat-1', 'attach-cmp-env-1-plat-2', 'attach-shared-0', 'attach-shared-1',
    ]);
    expect(tables.some((table) => table.id.startsWith('rt-ssn-'))).toBe(false);
    const removedCidrs = model.environments.map((env) => env.network.vcnCidr);
    expect(tables.flatMap((table) => table.rules).some((rule) => removedCidrs.includes(rule.destination))).toBe(false);
  });

  it('retains a shared platform attachment with no environments', () => {
    const model = peeredModel('hub_e');
    model.environments = [];
    model.sharedPlatforms = [newSharedPlatform('custom', [])];
    const tables = buildRouteTables(model);
    expect(tables.find((table) => table.id === 'rt-drg-spokes')!.attachTo).toBe('attach-shared-0');
    expect(tables.find((table) => table.id === 'rt-rpc-home')!.rules).toContainEqual(expect.objectContaining({ flowTarget: 'attach-shared-0' }));
  });

  it('imports the shared ExaCS VCN with no environments', async () => {
    const model = peeredModel('hub_e');
    model.environments = [];
    model.projects = [];
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc', notifications: { default: 'dba@example.com' } };
    const { files } = await generateOutputs(model);
    const resources = resourcesIn(JSON.parse(files['network.json']));
    const generated = [...resources.values()].find((entry) => entry.display_name === 'drgrt-fra-lz-rpc-home-region')!;
    const distribution = resources.get(generated.import_drg_route_distribution_key!)!;
    const imported = Object.values(distribution.statements!).map(({ match_criteria }) => resources.get(match_criteria.drg_attachment_key)!.display_name);
    const tables = buildRouteTables(model);
    expect(tables.find((table) => table.id === 'rt-rpc-home')!.rules.map((rule) => rule.target).sort()).toEqual(imported.sort());
    expect(tables.find((table) => table.id === 'rt-drg-spokes')!.attachTo).toBe('attach-shared-0');
    expect(tables.find((table) => table.name === 'rt-fra-lz-shared-exacs-generic')!.rules)
      .toContainEqual(expect.objectContaining({ destination: '10.90.0.0/21', nextHopKind: 'drg' }));
  }, 60_000);

  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('preserves local flow traces after adding RPCs in %s', (hubKind) => {
    const model = peeredModel(hubKind);
    const local = { ...model, remotePeeringConnections: [] };
    expect(buildFlowTraces(model, allFlowIds(model))).toEqual(buildFlowTraces(local, allFlowIds(local)));
  });
});
