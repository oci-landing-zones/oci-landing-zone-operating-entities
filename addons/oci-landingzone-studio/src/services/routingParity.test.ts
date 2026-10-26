import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { HubKind } from '../model/types';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { generateOutputs } from '../generator/generate';
import { evaluate, setAssetLoader } from '../generator/jsonnetVm';
import { generatePreview } from '../generator/preview';
import { buildVirtualFs } from '../generator/virtualFs';
import { hubKindDefaults } from './hubKinds';
import { newPlatform, newSharedPlatform } from './platforms';
import { buildRouteTables } from './routeTables';

beforeAll(() => {
  setAssetLoader(async () => ({ wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')) }));
});

interface Resource {
  display_name?: string;
  route_rules?: Record<string, { destination: string; network_entity_key?: string; network_entity_id?: string }>;
  ipv4address?: string;
  import_drg_route_distribution_key?: string;
  statements?: Record<string, { match_criteria: { drg_attachment_key: string } }>;
  network_details?: { attached_resource_key: string; vcn_route_type?: string };
  subnets?: Record<string, { cidr_block: string }>;
}

function resourcesIn(value: unknown, resources = new Map<string, Resource>()): Map<string, Resource> {
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object' && !Array.isArray(child)) resources.set(key, child as Resource);
      resourcesIn(child, resources);
    }
  }
  return resources;
}

async function generatedRoutes(hubKind: HubKind) {
  const model = emptyLzModel();
  model.network = { hubKind, ...hubKindDefaults(hubKind) };
  const { files } = await generateOutputs(model);
  const network = JSON.parse(files['network.json']);
  return { tables: buildRouteTables(model, network), resources: resourcesIn(network) };
}

describe('generated route preview parity', () => {
  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('keeps OKE routing minimal only when %s emits the same DRG default', async (hubKind) => {
    const model = emptyLzModel();
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    model.environments.push({ id: 'environment-3', name: 'test', securityZone: false,
      network: envNetworkDefaults(2, 'test', model.environments.map((env) => env.network.vcnCidr)) });
    model.projects = [1, 2, 3].map((index) => ({ id: `project-${index}`, name: `proj${index}`, environments: 'all' }));
    const oke = newPlatform('oke_simple', [], model.environments);
    model.platforms = [{ ...oke, okeParams: { ...oke.okeParams!, createFss: true } }];
    model.sharedPlatforms = [{ ...newSharedPlatform('custom', []), key: 'core' }];
    model.remotePeeringConnections = [{ id: 'remote', name: 'remote', role: 'acceptor',
      remoteCidrs: ['10.90.0.0/21'], peerRegionName: 'eu-amsterdam-1' }];
    const { files } = await generateOutputs(model);
    const network = JSON.parse(files['network.json']);
    const preview = await generatePreview(model);
    expect(preview.network).toEqual(network);
    const resources = resourcesIn(network);
    const tables = buildRouteTables(model, preview.network);
    for (const table of tables.filter((table) => table.columns === 'vcn')) {
      const raw = resources.get(table.id)!.route_rules!;
      expect(table.rules.map((rule) => [rule.id, rule.destination, rule.targetKey]), table.name)
        .toEqual(Object.entries(raw).map(([id, rule]) => [id,
          rule.destination === 'all-services' ? 'OSN Services' : rule.destination,
          rule.network_entity_key ?? rule.network_entity_id]));
    }
    for (const env of model.environments) {
      for (const suffix of ['CP', 'INT-LB', 'PODS', 'WORKERS']) {
        const key = `RT-FRA-LZ-${env.name.toUpperCase()}-PLATFORM-OKE-${suffix}-KEY`;
        const rules = resources.get(key)!.route_rules!;
        expect(Object.keys(rules), key).toHaveLength(hubKind === 'hub_e' ? 10 : 2);
        const defaultRule = Object.values(rules).find((rule) => rule.destination === '0.0.0.0/0')!;
        expect(defaultRule.network_entity_key).toBe(hubKind === 'hub_e'
          ? `NGW-FRA-LZ-${env.name.toUpperCase()}-PLATFORM-OKE-KEY` : 'DRG-FRA-LZ-HUB-KEY');
        expect(Object.values(rules).some((rule) => rule.destination === '10.90.0.0/21')).toBe(hubKind === 'hub_e');
      }
      const fss = resources.get(`RT-FRA-LZ-${env.name.toUpperCase()}-PLATFORM-OKE-FSS-KEY`)!.route_rules!;
      expect(Object.values(fss).map((rule) => rule.destination)).toEqual(['all-services']);
    }
    model.foundation.stackScope = 'regional';
    model.foundation.homeRegion = 'eu-amsterdam-1';
    const regional = await generateOutputs(model);
    const regionalResources = resourcesIn(JSON.parse(regional.files['network.json']));
    for (const [key, resource] of resources) {
      if (key.startsWith('RT-') && key.includes('-PLATFORM-OKE-')) {
        expect(regionalResources.get(key)!.route_rules, key).toEqual(resource.route_rules);
      }
    }
  }, 60_000);

  it('retains explicit OKE routes in outputs without an equivalent DRG default', async () => {
    const { files } = buildVirtualFs();
    const entry = 'oke_route_policy_test.jsonnet';
    const result = await evaluate(entry, { ...files, [entry]: `
      local resources = import 'workload-extensions/oke/simple/oke_network_resources.libsonnet';
      local ctx = {
        n: (import 'naming.libsonnet')('fra'),
        routing: { hub: {route_key: 'hub', description: 'Hub', destination: '10.0.0.0/21'},
          peers: {peer: {description: 'Peer', destination: '10.1.0.0/21'}} },
        has_hub: true, use_local_natgw: false,
        drg_key: 'DRG', ngw_key: 'NAT', sgw_key: 'SGW',
        rt_cp_key: 'cp', rt_lb_key: 'lb', rt_workers_key: 'workers', rt_pods_key: 'pods', rt_fss_key: 'fss',
        display_segments: ['prod', 'oke'], is_overlay_network: false, create_fss: true,
      };
      {
        default_drg: resources.route_tables(ctx),
        local_nat: resources.route_tables(ctx + {use_local_natgw: true}),
        no_default: resources.route_tables(ctx, overlay_output=true),
        standalone: resources.route_tables(ctx + {has_hub: false, routing: null}),
        manual_peer: resources.route_tables(ctx + {has_hub: false}),
        overlay_cni: resources.route_tables(ctx + {is_overlay_network: true}),
      }` }) as Record<string, Record<string, { route_rules: Record<string, { destination: string; network_entity_key: string }> }>>;
    const destinations = (name: string) => Object.values(result[name].cp.route_rules).map((rule) => rule.destination).sort();
    expect(destinations('default_drg')).toEqual(['0.0.0.0/0', 'all-services']);
    expect(destinations('local_nat')).toEqual(['0.0.0.0/0', '10.0.0.0/21', '10.1.0.0/21', 'all-services']);
    expect(destinations('no_default')).toEqual(['10.0.0.0/21', '10.1.0.0/21', 'all-services']);
    expect(destinations('standalone')).toEqual(['all-services']);
    expect(destinations('manual_peer')).toEqual(['10.1.0.0/21', 'all-services']);
    expect(destinations('overlay_cni')).toEqual(['0.0.0.0/0', 'all-services']);
    expect(result.overlay_cni.pods).toBeUndefined();
    for (const tables of Object.values(result)) {
      expect(Object.values(tables.fss.route_rules).map((rule) => rule.destination)).toEqual(['all-services']);
    }
  });

  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('shows every generated route table in %s exactly once', async (hubKind) => {
    const { tables, resources } = await generatedRoutes(hubKind);
    const generatedNames = [...resources.entries()]
      .filter(([key, resource]) => /^(RT|DRGRT)-/.test(key) && resource.display_name !== undefined)
      .map(([, resource]) => resource.display_name);
    expect(tables.map((table) => table.name).sort()).toEqual(generatedNames.sort());
  }, 60_000);

  it('matches every Hub E VCN route, including local spoke NAT gateways', async () => {
    const { tables, resources } = await generatedRoutes('hub_e');
    for (const table of tables.filter((entry) => entry.columns === 'vcn')) {
      const generated = [...resources.values()].find((resource) => resource.display_name === table.name)!;
      const envIndex = table.attachTo?.match(/^cmp-env-(\d+)-/)?.[1];
      const expected = Object.values(generated.route_rules!).map((rule) => {
        const key = (rule.network_entity_key ?? rule.network_entity_id)!;
        const destination = rule.destination === 'all-services' ? 'OSN Services' : rule.destination;
        if (key.startsWith('DRG-')) return `${destination}:drg:drg`;
        if (key.startsWith('IGW-')) return `${destination}:igw:gw-igw`;
        expect(key).toMatch(/^(NGW|SGW)-/);
        const kind = key.startsWith('NGW-') ? 'natgw' : 'sgw';
        const node = envIndex === undefined ? `gw-${kind}` : `cmp-env-${envIndex}-${kind}`;
        return `${destination}:${kind}:${node}`;
      });
      expect(table.rules.map((rule) => `${rule.destination}:${rule.nextHopKind}:${rule.flowTarget}`).sort(), table.name)
        .toEqual(expected.sort());
    }
  }, 60_000);

  it.each([
    ['hub_a', 'rt-fra-lz-hub-lb'],
    ['hub_b', 'rt-fra-lz-hub-natgw'],
  ] as const)('matches generated project routes in %s %s', async (hubKind, tableId) => {
    const { tables, resources } = await generatedRoutes(hubKind);
    const preview = tables.find((table) => table.name === tableId)!;
    const generated = [...resources.values()].find((resource) => resource.display_name === preview.name)!;
    const expected = Object.values(generated.route_rules!).map((rule) => {
      const key = (rule.network_entity_key ?? rule.network_entity_id)!;
      return key.startsWith('DRG-')
        ? `${rule.destination}:drg:drg`
        : `${rule.destination}:firewall:${resources.get(key)!.ipv4address}`;
    });
    expect(preview.rules.map((rule) => `${rule.destination}:${rule.nextHopKind}:${rule.flowTarget}`).sort())
      .toEqual(expected.sort());
  }, 60_000);

  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('shows the subnet prefixes imported by %s hub DRG', async (hubKind) => {
    const { tables, resources } = await generatedRoutes(hubKind);
    const preview = tables.find((table) => table.name === 'drgrt-fra-lz-hub')!;
    const generated = [...resources.values()].find((resource) => resource.display_name === preview.name)!;
    const distribution = resources.get(generated.import_drg_route_distribution_key!)!;
    const expected = Object.values(distribution.statements!).flatMap(({ match_criteria }) => {
      const attachment = resources.get(match_criteria.drg_attachment_key)!;
      // OCI defaults omitted VCN route types to SUBNET_CIDRS.
      expect(attachment.network_details!.vcn_route_type).toBeUndefined();
      const vcn = resources.get(attachment.network_details!.attached_resource_key)!;
      return Object.values(vcn.subnets!).map((subnet) => `${subnet.cidr_block}:${attachment.display_name}:Dynamic`);
    });
    expect(preview.rules.map((rule) => `${rule.destination}:${rule.target}:${rule.routeType}`).sort())
      .toEqual(expected.sort());
  }, 60_000);

  it('shows all Hub E spoke DRG imports, including the hub and other spokes', async () => {
    const { tables, resources } = await generatedRoutes('hub_e');
    const preview = tables.find((table) => table.name === 'drgrt-fra-lz-spokes')!;
    const generated = [...resources.values()].find((resource) => resource.display_name === preview.name)!;
    const distribution = resources.get(generated.import_drg_route_distribution_key!)!;
    const expected = Object.values(distribution.statements!).flatMap(({ match_criteria }) => {
      const attachment = resources.get(match_criteria.drg_attachment_key)!;
      expect(attachment.network_details!.vcn_route_type).toBeUndefined();
      const vcn = resources.get(attachment.network_details!.attached_resource_key)!;
      return Object.values(vcn.subnets!).map((subnet) => `${subnet.cidr_block}:${attachment.display_name}:Dynamic`);
    });
    expect(preview.rules.map((rule) => `${rule.destination}:${rule.target}:${rule.routeType}`).sort())
      .toEqual(expected.sort());
  }, 60_000);
});
