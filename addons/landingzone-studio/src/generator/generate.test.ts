import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluate, setAssetLoader } from './jsonnetVm';
import { GeneratorError, generateFromUpstreamDefaults, generateOutputs } from './generate';
import { buildVirtualFs } from './virtualFs';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { newPlatform } from '../services/platforms';
import type { LzModel } from '../model/types';

/** The browser fetches the engine over HTTP; under vitest we read it off disk. */
beforeAll(() => {
  setAssetLoader(async () => ({
    wasmExecJs: readFileSync(resolve('3rd/go-jsonnet/wasm_exec.js'), 'utf8'),
    wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')),
  }));
});

const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve('../../blueprints/one-oe/runtime/one-stack', name), 'utf8'));

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
    expect(out.primary).toEqual(['network.json', 'network_pre.json']);
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
  }, 60_000);

  it('carries an OKE platform through to the generated network config', async () => {
    const base = emptyLzModel();
    const model: LzModel = {
      ...base,
      environments: [{ name: 'prod', securityZone: true, network: envNetworkDefaults(0) }],
      platforms: [newPlatform('oke_simple', [])],
    };
    const out = await generateOutputs(model);
    const body = out.files['network.json'];
    // The platform's per-environment VCN lands in the prod category.
    expect(body).toContain('10.140.0.0/21');
    // And OKE contributes its own extension artifacts alongside the core files.
    expect(Object.keys(out.files).some((f) => f.includes('oke'))).toBe(true);
  }, 60_000);

  it('surfaces a generator assertion as a GeneratorError instead of crashing', async () => {
    const base = emptyLzModel();
    // The prod spoke VCN deliberately overlaps the hub VCN; config.libsonnet asserts
    // that every VCN CIDR is disjoint.
    const model: LzModel = {
      ...base,
      environments: [{
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
