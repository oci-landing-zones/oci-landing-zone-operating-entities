import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluate, setAssetLoader } from './jsonnetVm';
import { GeneratorError, generateFromUpstreamDefaults, generateOutputs } from './generate';
import { buildVirtualFs } from './virtualFs';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { newPlatform, newSharedPlatform } from '../services/platforms';
import { getHubKind, hubKindDefaults } from '../services/hubKinds';
import { generatorNames } from '../services/generatorNaming';
import type { HubKind, LzModel } from '../model/types';

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

describe('generated go-jsonnet runtime', () => {
  it('matches its recorded artifact checksums', () => {
    const runtimeDir = resolve('3rd/go-jsonnet');
    const checksums = readFileSync(resolve(runtimeDir, 'SHA256SUMS'), 'utf8').trim().split('\n');

    expect(checksums).toHaveLength(2);
    for (const line of checksums) {
      const [expected, filename] = line.trim().split(/\s+/);
      const actual = createHash('sha256').update(readFileSync(resolve(runtimeDir, filename))).digest('hex');
      expect(actual, filename).toBe(expected);
    }
  });
});

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
    expect(JSON.parse(files['network_pre.json'])).toEqual(fixture('oneoe_network_hub_a_pre.json'));
  }, 60_000);

  it('emits the full artifact set for a default wizard model', async () => {
    const out = await generateOutputs(emptyLzModel());
    expect(out.primary).toEqual(['network_pre.json', 'network.json']);
    // Hub A stages its rollout, so both network files exist; the rest ride along.
    expect(out.secondary).toContain('iam.json');
    expect(out.secondary).toContain('governance.json');
    expect(out.secondary).toContain('security_cis2.json');
    expect(out.secondary).toContain('observability_cis2.json');
    expect(out.secondary).not.toContain('network.json');
    expect(Object.keys(out.files).length).toBe(8);
    expect(out.config).toContain("kind: 'hub_a'");

    const net = JSON.parse(out.files['network.json']).network_configuration;
    expect(Object.keys(net.network_configuration_categories)).toContain('0-shared');
    const hub = net.network_configuration_categories['0-shared'].vcns['VCN-FRA-LZ-HUB-KEY'];
    expect(hub.cidr_blocks).toEqual(['10.0.0.0/21']);
    expectHubGeneratorContract(out.files, 'hub_a');
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
    expect(out.files['network_pre.json']).toBeDefined();
    expectHubGeneratorContract(out.files, hubKind);
  }, 60_000);

  it('keeps Hub B pre-network DRG routes separate from final firewall routes', async () => {
    const base = emptyLzModel();
    const out = await generateOutputs({
      ...base,
      network: { ...base.network, hubKind: 'hub_b', ...hubKindDefaults('hub_b') },
    });
    expect(out.files['network_pre.json']).toContain('Route to the 0.0.0.0/0 through DRG');
    expect(out.files['network.json']).toContain('OCI NFW PRIVATE IP OCID');
    expect(out.files['network.json']).toContain('Route to Public LB through the OCI Network Firewall');
  }, 60_000);

  it('includes Hub C external-firewall backend placeholders in the complete output set', async () => {
    const base = emptyLzModel();
    const out = await generateOutputs({
      ...base,
      network: { ...base.network, hubKind: 'hub_c', ...hubKindDefaults('hub_c') },
    });
    expect(out.files['network_pre.json']).toBeDefined();
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

  it('generates an OCVS platform only after its required SSH key is supplied', async () => {
    const base = emptyLzModel();
    const ocvs = newPlatform('ocvs', []);
    const model: LzModel = {
      ...base,
      environments: [{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }],
      platforms: [{ ...ocvs, ocvsParams: { ...ocvs.ocvsParams!, sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' } }],
    };
    const out = await generateOutputs(model);

    expect(out.files['ocvs.json']).toBeDefined();
    expect(out.files['network_pre.json']).toContain('PROVISIONING');
    expect(out.config).toContain("type: 'ocvs'");
  }, 60_000);

  it('generates an OCVS management cluster from the supported shared-platform scope', async () => {
    const base = emptyLzModel();
    const ocvs = newPlatform('ocvs', []);
    const model: LzModel = {
      ...base,
      sharedPlatforms: [{
        id: 'shared-ocv', key: 'ocv', type: 'ocvs', vcnCidr: '10.170.0.0/21', subnets: [],
        ocvsParams: { ...ocvs.ocvsParams!, sshAuthorizedKeys: 'ssh-rsa AAAATEST studio@example' },
      }],
    };
    const out = await generateOutputs(model);
    expect(out.files['ocvs.json']).toContain('CMP-LZ-SHARED-OCV-KEY');
    expect(out.files['network_pre.json']).toContain('SN-FRA-LZ-SHARED-PLATFORM-OCV-PROVISIONING-KEY');
  }, 60_000);

  it('generates a Custom network-only platform without an unsupported extension', async () => {
    const base = emptyLzModel();
    const model: LzModel = {
      ...base,
      environments: [{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }],
      platforms: [newPlatform('custom', [])],
    };
    const out = await generateOutputs(model);
    expect(out.config).not.toContain("type: 'custom'");
    expect(out.files['network.json']).toContain('10.0.80.0/21');
    expect(out.files['network.json']).toContain('10.0.80.0/24');
  }, 60_000);

  it('attaches every environment and shared platform VCN to the DRG', async () => {
    const base = emptyLzModel();
    const sharedOne = newSharedPlatform('custom', []);
    const sharedTwo = newSharedPlatform('custom', [sharedOne]);
    const environmentPlatform = newPlatform('custom', []);
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
