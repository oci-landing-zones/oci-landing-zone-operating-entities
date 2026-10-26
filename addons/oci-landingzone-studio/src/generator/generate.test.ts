import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluate, setAssetLoader } from './jsonnetVm';
import { GeneratorError, generateFromUpstreamDefaults, generateOutputs } from './generate';
import { buildVirtualFs } from './virtualFs';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { applyPlatformPatch, newPlatform, newSharedPlatform, okeNetworkProfilePatch, platformEnvInstances } from '../services/platforms';
import { configuredVcnCidrs } from '../services/exadata';
import { getHubKind, hubKindDefaults } from '../services/hubKinds';
import { generatorNames } from '../services/generatorNaming';
import type { HubKind, LzModel } from '../model/types';
import { createRegionalModel } from '../services/regionalDeployment';
import { buildRouteTables } from '../services/routeTables';
import { buildGraph } from '../diagram/buildGraph';

/** The browser fetches the engine over HTTP; under vitest we read it off disk. */
beforeAll(() => {
  setAssetLoader(async () => ({
    wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')),
  }));
});

const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve('../../blueprints/one-oe/runtime/one-stack', name), 'utf8'));

const PUBLIC_HUB_SUBNETS: Record<HubKind, string[]> = {
  hub_a: ['fw-dmz', 'lb'],
  hub_b: ['lb'],
  hub_c: ['untrust', 'lb'],
  hub_e: ['lb'],
};

function collectObjects(value: unknown, output: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!value || typeof value !== 'object') return output;
  if (!Array.isArray(value)) output.push(value as Record<string, unknown>);
  Object.values(value).forEach((child) => collectObjects(child, output));
  return output;
}

function expectHubGeneratorContract(files: Record<string, string>, hubKind: HubKind) {
  const network = JSON.parse(files['network.json']);
  const objects = collectObjects(network);
  expect(objects.some((entry) => entry.display_name === generatorNames.hubVcn('fra'))).toBe(true);
  expect(objects.some((entry) => entry.display_name === generatorNames.hubDrg('fra'))).toBe(true);
  expect(objects.some((entry) => entry.display_name === generatorNames.hubAttachment('fra'))).toBe(true);

  for (const subnet of getHubKind(hubKind)!.defaultSubnets) {
    const name = generatorNames.hubSubnet('fra', subnet.name);
    const generated = objects.find((entry) => entry.display_name === name && entry.cidr_block === subnet.cidr);
    expect(generated, `${hubKind} ${name}`).toBeDefined();
    const isPublic = generated?.prohibit_internet_ingress === false
      && generated?.prohibit_public_ip_on_vnic === false;
    expect(isPublic, `${hubKind} ${name} public classification`).toBe(PUBLIC_HUB_SUBNETS[hubKind].includes(subnet.name));
  }
}

describe('virtualFs', () => {
  it('uses repository-relative generator paths without rewriting imports', () => {
    const { files, entry, defaults } = buildVirtualFs();
    expect(entry).toBe('landing_zone_multi.jsonnet');
    expect(defaults).toBe('defaults.libsonnet');
    expect(files[entry]).toBeDefined();
    expect(files[defaults]).toBeDefined();
    expect(files['workload-extensions/oke/simple/oke_network_resources.libsonnet']).toBeDefined();
  });
});

describe('generator (go-jsonnet wasm)', () => {
  it.each(['abcd', ' fr2', 'fr2 ', 'fr-2'])('rejects a custom region short name over three characters: %j', async (regionShortName) => {
    const model = emptyLzModel();
    model.foundation.regionShortName = regionShortName;
    const output = generateOutputs(model);
    await expect(output).rejects.toBeInstanceOf(GeneratorError);
    await expect(output).rejects.toThrow('Use 3 characters or fewer for the region short name.');
  });

  it.each(['fr2', 'FR2'])('uses custom region short name %s in generated resource names', async (regionShortName) => {
    const model = emptyLzModel();
    model.foundation.regionShortName = regionShortName;
    const out = await generateOutputs(model);
    expect(out.config).toContain(`region_short_name: '${regionShortName}'`);
    expect(out.files['network.json']).toContain('vcn-fr2-lz-hub');
    expect(out.files['network.json']).not.toContain('vcn-fra-lz-hub');
  }, 60_000);

  it('rejects an oversized saved short name before evaluating topology naming limits', async () => {
    const model = emptyLzModel();
    model.foundation.regionShortName = 'custom';
    model.sharedPlatforms = [{ ...newSharedPlatform('custom', []), key: 'core' }];
    await expect(generateOutputs(model)).rejects.toThrow('Use 3 characters or fewer for the region short name.');
  }, 60_000);

  it('generates complete cross-tenancy acceptor and requester IAM from Studio RPC inputs', async () => {
    const model = emptyLzModel();
    model.environments = []; model.projects = [];
    model.remotePeeringConnections = [
      { id: 'accept', name: 'accept', role: 'acceptor', peerRegionName: 'eu-amsterdam-1', remoteCidrs: ['10.4.0.0/21'], peerTenancyOcid: 'ocid1.tenancy.oc1..requester', requestorGroupOcid: 'ocid1.group.oc1..networkadmin' },
      { id: 'request', name: 'request', role: 'requester', peerRegionName: 'eu-paris-1', remoteCidrs: ['10.5.0.0/21'], peerId: 'RPC-PEER-KEY', peerTenancyOcid: 'ocid1.tenancy.oc1..acceptor' },
    ];
    const out = await generateOutputs(model);
    expect(out.files['iam.json']).toContain('ocid1.tenancy.oc1..requester');
    expect(out.files['iam.json']).toContain('ocid1.group.oc1..networkadmin');
    expect(out.files['iam.json']).toContain('ocid1.tenancy.oc1..acceptor');
    expect(out.files['network.json']).toContain('RPC-PEER-KEY');
  }, 60_000);
  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('generates %s regional DR with X-RPC and no environments', async (hubKind) => {
    const model = createRegionalModel();
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    Object.assign(model.foundation, { homeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1', regionShortName: 'ams' });
    model.remotePeeringConnections = [{ id: 'home', name: 'home', role: 'requester', remoteCidrs: ['10.3.0.0/21'], peerRegionName: 'eu-frankfurt-1', peerId: 'RPC-HOME-KEY' }];
    const out = await generateOutputs(model);
    expect(out.files['iam.json']).toBeUndefined();
    expect(out.files['governance.json']).toBeUndefined();
    expect(out.files['security_cis2_pre.json']).toContain('vaults');
    const security = JSON.stringify(JSON.parse(out.files['security_cis2.json']));
    expect(security).not.toContain('security_zones');
    expect(security).not.toContain('cloud_guard');
    const objects = collectObjects(JSON.parse(out.files['network.json']));
    expect(objects.some((object) => object.peer_key === 'RPC-HOME-KEY')).toBe(true);
    expect(objects.some((object) => object.type === 'REMOTE_PEERING_CONNECTION')).toBe(true);
    const rpcTable = objects.find((object) => object.display_name === 'drgrt-ams-lz-rpc-home')!;
    const diagramTable = buildRouteTables(model, JSON.parse(out.files['network.json'])).find((table) => table.name === rpcTable.display_name)!;
    expect(diagramTable.name).toBe(rpcTable.display_name);
    expect(diagramTable.rules.some((rule) => rule.destination === '0.0.0.0/0')).toBe(hubKind !== 'hub_e');
    expect(buildGraph(model, 5).nodes.some((node) => node.id === 'rpc-home')).toBe(true);
  }, 60_000);
  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('generates %s without environments', async (hubKind) => {
    const model = emptyLzModel();
    model.environments = [];
    model.projects = [];
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    const out = await generateOutputs(model);
    expect(out.files['network.json']).toContain('0-shared');
    expect(out.files['iam.json']).toBeDefined();
    expect(out.config).toContain('environments: {}');
  }, 60_000);
  it('keeps canonical identities for repeated and same-named relative imports', async () => {
    const files = {
      'main.jsonnet': `
        local left = import 'a/use.jsonnet';
        local right = import 'b/use.jsonnet';
        [left, right, left]
      `,
      'a/use.jsonnet': `{
        profile: import './profiles.libsonnet',
        shared: import '../shared.libsonnet',
      }`,
      'a/profiles.libsonnet': "'profile-a'",
      'b/use.jsonnet': `{
        profile: import './profiles.libsonnet',
        shared: import '../shared.libsonnet',
      }`,
      'b/profiles.libsonnet': "'profile-b'",
      'shared.libsonnet': "'shared'",
    };

    await expect(evaluate('main.jsonnet', files)).resolves.toEqual([
      { profile: 'profile-a', shared: 'shared' },
      { profile: 'profile-b', shared: 'shared' },
      { profile: 'profile-a', shared: 'shared' },
    ]);
  }, 60_000);

  // Booting the wasm engine and evaluating the full generator takes a second or two.
  it('reproduces upstream\'s checked-in hub_a blueprints byte-for-byte', async () => {
    const files = await generateFromUpstreamDefaults('hub_a');
    expect(JSON.parse(files['network.json'])).toEqual(fixture('oneoe_network_hub_a.json'));
  }, 60_000);

  it('emits the full artifact set for a default wizard model', async () => {
    const out = await generateOutputs(emptyLzModel());
    expect(out.primary).toEqual(['network.json']);
    expect(out.secondary).toContain('iam.json');
    expect(out.secondary).toContain('governance.json');
    expect(out.secondary).toContain('security_cis2.json');
    expect(out.secondary).toContain('observability_cis2.json');
    expect(out.secondary).not.toContain('network.json');
    expect(Object.keys(out.files).length).toBe(7);
    expect(out.config).toContain("kind: 'hub_a'");

    const net = JSON.parse(out.files['network.json']).network_configuration;
    expect(Object.keys(net.network_configuration_categories)).toContain('0-shared');
    const hub = net.network_configuration_categories['0-shared'].vcns['VCN-FRA-LZ-HUB-KEY'];
    expect(hub.cidr_blocks).toEqual(['10.0.0.0/21']);
    expectHubGeneratorContract(out.files, 'hub_a');
  }, 60_000);

  it('writes configured One-OE recipients to their notification topics', async () => {
    const base = emptyLzModel();
    const out = await generateOutputs({
      ...base,
      foundation: { ...base.foundation, notifications: { useSingleRecipient: false,
        default: 'ops@example.com, noc@example.com', cloudguard: 'security@example.com',
        iam: 'iam@example.com', network: 'network@example.com', security: 'soc@example.com',
      } },
    });
    const topics = JSON.parse(out.files['observability_cis2.json']).notifications_configuration.topics;
    const recipients = (key: string) => topics[`NOTT-LZ-${key}-KEY`].subscriptions[0].values;
    expect(recipients('CLOUDGUARD')).toEqual(['security@example.com']);
    expect(recipients('IAM')).toEqual(['iam@example.com']);
    expect(recipients('NETWORK')).toEqual(['network@example.com']);
    expect(recipients('SECURITY')).toEqual(['soc@example.com']);
  }, 60_000);

  it('uses one recipient for all One-OE topics in single-email mode', async () => {
    const model = emptyLzModel();
    model.foundation.notifications = {
      useSingleRecipient: true, default: 'ops@example.com',
      cloudguard: 'old@example.com', iam: '', network: '', security: '',
    };
    const out = await generateOutputs(model);
    const topics = JSON.parse(out.files['observability_cis2.json']).notifications_configuration.topics;
    for (const topic of Object.values(topics) as Array<{ subscriptions: Array<{ values: string[] }> }>) {
      expect(topic.subscriptions[0].values).toEqual(['ops@example.com']);
    }
  }, 60_000);

  it('uses the One-OE Network recipients when ExaCS is enabled', async () => {
    const model = emptyLzModel();
    model.foundation.notifications = {
      useSingleRecipient: false,
      default: 'ops@example.com', cloudguard: '', iam: '', network: 'network@example.com', security: '',
    };
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.notifications.default = 'db@example.com';
    const out = await generateOutputs(model);
    const topics = JSON.parse(out.files['observability_cis2.json']).notifications_configuration.topics;
    expect(topics['NOTT-LZ-NETWORK-KEY'].subscriptions[0].values).toEqual(['network@example.com']);
    expect(out.files['observability_cis2.json']).toContain('NOTT-LZ-EXACS-DB-WORKLOADS-KEY');
  }, 60_000);

  it.each(['exacc', 'exacs'] as const)('routes %s project topics to different environment teams', async (type) => {
    const model = emptyLzModel();
    const design = model.exadata[type];
    design.enabled = true;
    design.service = 'autonomous';
    design.projectDb = { 'environment-1': ['project-1'], 'environment-2': ['project-1'] };
    design.notifications = {
      useSingleRecipient: false, default: '', dbWorkloads: 'dba@example.com', infraWorkloads: 'infra@example.com',
      projectEmails: { 'environment-1': 'prod-dba@example.com', 'environment-2': 'preprod-dba@example.com' },
    };
    const out = await generateOutputs(model);
    const topics = JSON.parse(out.files['observability_cis2.json']).notifications_configuration.topics;
    const code = type.toUpperCase();
    expect(topics[`NOTT-LZ-PROD-${code}-PROJECTS-KEY`].subscriptions[0].values).toEqual(['prod-dba@example.com']);
    expect(topics[`NOTT-LZ-PREPROD-${code}-PROJECTS-KEY`].subscriptions[0].values).toEqual(['preprod-dba@example.com']);
    expect(topics[`NOTT-LZ-${code}-DB-WORKLOADS-KEY`].subscriptions[0].values).toEqual(['dba@example.com']);
    expect(topics[`NOTT-LZ-${code}-SHARED-INFRA-WORKLOADS-KEY`].subscriptions[0].values).toEqual(['infra@example.com']);
  }, 60_000);

  it.each([['exacc', 2], ['exacc', 3], ['exacs', 2], ['exacs', 3]] as const)(
    'separates %s UC%s infrastructure and DBA topics without AVMC tiers', async (type, useCase) => {
    const model = emptyLzModel();
    const design = model.exadata[type];
    design.enabled = true;
    design.service = 'vmc';
    design.environments = ['environment-1'];
    if (type === 'exacc') {
      model.exadata.exacc.database = 'per_environment';
      model.exadata.exacc.shared = useCase === 2;
    } else {
      model.exadata.exacs.database = 'per_environment';
      model.exadata.exacs.infrastructure = useCase === 2 ? 'shared' : 'per_environment';
    }
    design.notifications = {
      useSingleRecipient: false, default: '', infraWorkloads: 'shared-infra@example.com',
      environmentInfraEmails: { 'environment-1': 'prod-infra@example.com' },
      environmentDbEmails: { 'environment-1': 'prod-dba@example.com' },
    };
    const out = await generateOutputs(model);
    const topics = JSON.parse(out.files['observability_cis2.json']).notifications_configuration.topics;
    const code = type.toUpperCase();
    expect(Object.keys(topics)).toContain(`NOTT-LZ-PROD-${code}-INFRA-WORKLOADS-KEY`);
    expect(topics[`NOTT-LZ-PROD-${code}-INFRA-WORKLOADS-KEY`].subscriptions[0].values).toEqual(['prod-infra@example.com']);
    expect(topics[`NOTT-LZ-PROD-${code}-DB-WORKLOADS-KEY`].subscriptions[0].values).toEqual(['prod-dba@example.com']);
    expect(topics[`NOTT-LZ-PROD-${code}-PROJECTS-KEY`]).toBeUndefined();
    const observability = JSON.parse(out.files['observability_cis2.json']);
    const rules = observability.events_configuration.event_rules;
    expect(rules[`RUL-LZ-PROD-NOTIFICATION-PLATFORM-${code}-DB-KEY`].destination_topic_ids)
      .toEqual([`NOTT-LZ-PROD-${code}-DB-WORKLOADS-KEY`]);
    expect(rules[`RUL-LZ-PROD-NOTIFICATION-PLATFORM-${code}-VMC-KEY`].destination_topic_ids)
      .toEqual([`NOTT-LZ-PROD-${code}-INFRA-WORKLOADS-KEY`]);
    const platformAlarms = Object.values(observability.alarms_configuration.alarms) as Array<{
      compartment_id: string; destination_topic_ids: string[];
    }>;
    const destinations = platformAlarms.filter((alarm) => alarm.compartment_id === `CMP-LZ-PROD-${code}-DB-KEY`)
      .flatMap((alarm) => alarm.destination_topic_ids);
    expect(destinations.filter((topic) => topic === `NOTT-LZ-PROD-${code}-DB-WORKLOADS-KEY`)).toHaveLength(3);
    expect(destinations.filter((topic) => topic === `NOTT-LZ-PROD-${code}-INFRA-WORKLOADS-KEY`)).toHaveLength(4);
  }, 60_000);

  it('emits the selected CIS level 1 artifact family', async () => {
    const base = emptyLzModel();
    const out = await generateOutputs({
      ...base,
      foundation: { ...base.foundation, cisLevel: 1 },
    });

    expect(out.config).toContain('cis_level: 1');
    expect(out.secondary).toContain('security_cis1.json');
    expect(out.secondary).toContain('observability_cis1.json');
    expect(out.secondary).not.toContain('security_cis2.json');
    expect(out.secondary).not.toContain('observability_cis2.json');
  }, 60_000);

  it('generates Hub E as a final-only no-firewall bundle', async () => {
    const base = emptyLzModel();
    const model: LzModel = {
      ...base,
      network: { ...base.network, hubKind: 'hub_e', ...hubKindDefaults('hub_e') },
    };
    const out = await generateOutputs(model);

    expect(out.config).toContain("kind: 'hub_e'");
    expect(out.files['network.json']).toBeDefined();
    expect(out.files['network_pre.json']).toBeUndefined();
    expect(out.files['network.json']).toContain('SN-FRA-LZ-HUB-LB-KEY');
    expect(out.files['network.json']).not.toContain('NFW-FRA-LZ-HUB');
    expectHubGeneratorContract(out.files, 'hub_e');
  }, 60_000);

  it.each(['hub_b', 'hub_c'] as const)('generates the canonical %s hub layout', async (hubKind) => {
    const base = emptyLzModel();
    const out = await generateOutputs({
      ...base,
      network: { ...base.network, hubKind, ...hubKindDefaults(hubKind) },
    });

    expect(out.config).toContain(`kind: '${hubKind}'`);
    expect(out.files['network.json']).toBeDefined();
    expectHubGeneratorContract(out.files, hubKind);
  }, 60_000);

  it('includes Hub C external-firewall backend placeholders in the complete output set', async () => {
    const base = emptyLzModel();
    const out = await generateOutputs({
      ...base,
      network: { ...base.network, hubKind: 'hub_c', ...hubKindDefaults('hub_c') },
    });
    expect(out.files['network_backends.json']).toContain('NETWORK FIREWALL-1 PRIVATE IP OCID IN TRUST SUBNET');
    expect(out.files['network_backends.json']).toContain('NETWORK FIREWALL-1 PRIVATE IP OCID IN UNTRUST SUBNET');
  }, 60_000);

  it('carries an OKE platform through to the generated network config', async () => {
    const base = emptyLzModel();
    const model: LzModel = {
      ...base,
      environments: [{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }],
      platforms: [newPlatform('oke_simple', [])],
    };
    const out = await generateOutputs(model);
    const body = out.files['network.json'];
    // The platform's per-environment VCN lands in the prod category.
    expect(body).toContain('10.0.80.0/20');
    // And OKE contributes its own extension artifacts alongside the core files.
    expect(Object.keys(out.files).some((f) => f.includes('oke'))).toBe(true);
  }, 60_000);

  it('uses generator-owned OKE profile subnets when cluster_size is selected', async () => {
    const base = emptyLzModel();
    const oke = newPlatform('oke_simple', []);
    const model: LzModel = {
      ...base,
      environments: [{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }],
      platforms: [{ ...oke, subnets: [], vcnCidr: '10.140.0.0/20', okeParams: { ...oke.okeParams!, clusterSize: 'small', cniType: 'overlay', podsCidr: '10.244.0.0/16', createFss: true, publicLoadBalancer: true } }],
    };
    const out = await generateOutputs(model);
    expect(out.config).toContain("cluster_size: 'small'");
    expect(out.config).not.toContain('subnets: {}');
    expect(out.files['network.json']).toContain('SN-FRA-LZ-PROD-PLATFORM-OKE-FSS-KEY');
  }, 60_000);

  it('exports named One-OE networks and distinct additional networks through Jsonnet', async () => {
    const model = emptyLzModel();
    model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
    model.foundation.cisLevel = 1;
    model.environments = ['dev', 'uat', 'dr', 'sandbox', 'demo'].map((name, index) => ({
      id: name, name, securityZone: false,
      network: envNetworkDefaults(index, name, index === 4 ? ['10.1.192.0/21'] : []),
    }));
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc',
      database: 'per_environment', environments: model.environments.map((env) => env.id),
      notifications: { default: 'team@example.com' } };
    const out = await generateOutputs(model);
    const network = out.files['network.json'];
    for (const cidr of ['10.1.64.0/21', '10.1.128.0/21', '10.0.200.0/21',
      '10.1.104.0/21', '10.1.168.0/21', '10.0.240.0/22',
      '10.1.192.0/21', '10.1.200.0/21', '10.1.208.0/21', '10.1.216.0/21']) expect(network).toContain(cidr);
    expect(network).not.toContain('10.172.');
  }, 60_000);

  it('generates a Custom network-only platform without an unsupported extension', async () => {
    const base = emptyLzModel();
    const model: LzModel = {
      ...base,
      environments: [{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }],
      platforms: [newPlatform('custom', [], [{ id: 'environment-1', name: 'prod' }])],
    };
    const out = await generateOutputs(model);
    expect(out.config).not.toContain("type: 'custom'");
    expect(out.files['network.json']).toContain('10.0.112.0/21');
    expect(out.files['network.json']).toContain('10.0.112.0/24');
  }, 60_000);

  it('attaches every environment and shared platform VCN to the DRG', async () => {
    const base = emptyLzModel();
    const sharedOne = newSharedPlatform('custom', []);
    const sharedTwo = newSharedPlatform('custom', [sharedOne]);
    const environmentPlatform = newPlatform('custom', [], [{ id: 'environment-1', name: 'prod' }]);
    const model: LzModel = {
      ...base,
      environments: [{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }],
      platforms: [environmentPlatform],
      sharedPlatforms: [sharedOne, sharedTwo],
    };
    const out = await generateOutputs(model);
    const body = out.files['network.json'];

    expect(body).toContain(generatorNames.environmentPlatformAttachment('fra', 'prod', environmentPlatform.key));
    expect(body).toContain(generatorNames.sharedPlatformAttachment('fra', sharedOne.key));
    expect(body).toContain(generatorNames.sharedPlatformAttachment('fra', sharedTwo.key));
  }, 60_000);

  it('surfaces a generator assertion as a GeneratorError instead of crashing', async () => {
    const base = emptyLzModel();
    // The prod spoke VCN deliberately overlaps the hub VCN; config.libsonnet asserts
    // that every VCN CIDR is disjoint.
    const model: LzModel = {
      ...base,
      environments: [{
        id: 'environment-1',
        name: 'prod',
        securityZone: false,
        network: { ...envNetworkDefaults(0), vcnCidr: base.network.hubVcnCidr },
      }],
      projects: [],
      platforms: [],
    };
    await expect(generateOutputs(model)).rejects.toThrow(GeneratorError);
  }, 60_000);
});

it.each(['medium', 'large'] as const)('generates OKE %s after resizing alongside default project networks', async (size) => {
  const model = emptyLzModel();
  const platform = newPlatform('oke_simple', []);
  model.platforms = [platform];
  model.platforms = [applyPlatformPatch(platform, okeNetworkProfilePatch(platform, size), model.environments, configuredVcnCidrs(model))];
  const out = await generateOutputs(model);
  for (const instance of platformEnvInstances(model.platforms[0], model.environments)) {
    expect(out.files['network.json']).toContain(instance.vcnCidr);
  }
  expect(Object.keys(out.files).some((file) => file.includes('oke'))).toBe(true);
}, 60_000);
