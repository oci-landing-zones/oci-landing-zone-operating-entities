import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluate, setAssetLoader } from '../generator/jsonnetVm';
import { emptyLzModel } from '../model/defaults';
import type { HubKind, LzModel } from '../model/types';
import { buildConfig, serializeConfig } from './lzConfig';
import { importConfig } from './importConfig';
import { newPlatform, newSharedPlatform, okeNetworkProfilePatch, applyPlatformPatch } from './platforms';
import { hubKindDefaults } from './hubKinds';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));

async function roundTrip(model: LzModel) {
  const source = serializeConfig(model);
  const config = await evaluate('config.jsonnet', { 'config.jsonnet': source });
  const imported = importConfig(config);
  const restored = await evaluate('restored.jsonnet', { 'restored.jsonnet': serializeConfig(imported.model) });
  expect(restored).toEqual(config);
  return imported;
}

describe('Studio config import', () => {
  it.each<HubKind>(['hub_a', 'hub_b', 'hub_c', 'hub_e'])('restores %s foundation and project membership', async (hubKind) => {
    const model = emptyLzModel();
    model.foundation.cisLevel = 1;
    model.foundation.notifications = { useSingleRecipient: false, default: '', cloudguard: 'cg@example.com', iam: '', network: 'net@example.com', security: '' };
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    model.environments[0].name = 'Test stage';
    model.projects.push({ id: 'partial', name: 'App One', environments: [model.environments[0].id] });
    const { model: imported } = await roundTrip(model);
    expect(imported.projects.find((p) => p.name === 'App One')?.environments).toHaveLength(1);
  });

  it('restores custom and OKE parameters and per-environment networks', async () => {
    const model = emptyLzModel();
    for (const type of ['custom', 'oke_simple'] as const) model.platforms.push(newPlatform(type, model.platforms, model.environments));
    model.platforms[1].okeParams!.cniType = 'overlay';
    model.platforms[1].okeParams!.podsCidr = '172.20.0.0/16';
    model.platforms[1].okeParams!.apiAllowedCidrs = ['192.168.2.0/24', '192.168.1.0/24'];
    model.sharedPlatforms.push(newSharedPlatform('custom', []));
    const { model: imported } = await roundTrip(model);
    expect(imported.platforms.some((p) => p.okeParams?.podsCidr === '172.20.0.0/16')).toBe(true);
    expect(imported.sharedPlatforms.map((p) => p.type)).toEqual(['custom']);
  });

  it.each(['environment', 'shared'])('rejects unsupported OCVS extensions in the %s scope', (scope) => {
    const config = buildConfig(emptyLzModel());
    const entry = { network: { vcn: '10.200.0.0/21' }, extension: { type: 'ocvs', params: {} } };
    if (scope === 'shared') config.shared_platforms = { vmw: entry };
    else config.environments.prod.platforms = { vmw: entry };
    expect(() => importConfig(config)).toThrow(/extension\.type.*unsupported/);
  });

  it('preserves manual OKE subnet maps and differing parameters under the same key', async () => {
    const model = emptyLzModel();
    const platform = newPlatform('oke_simple', [], model.environments);
    delete platform.okeParams!.clusterSize;
    platform.subnets = [{ name: 'workers', cidr: '10.0.82.0/23', locked: true }];
    platform.environments = [model.environments[0].id];
    model.platforms = [platform, { ...structuredClone(platform), id: 'second', environments: [model.environments[1].id], okeParams: { ...platform.okeParams!, workerBootVolumeSize: 100 } }];
    await roundTrip(model);
  });

  it('preserves a network-only shared platform whose key is exacc', async () => {
    const model = emptyLzModel();
    const shared = newSharedPlatform('custom', []);
    shared.key = 'exacc';
    model.sharedPlatforms = [shared];
    const imported = await roundTrip(model);
    expect(imported.model.exadata.exacc.enabled).toBe(false);
    expect(imported.model.sharedPlatforms[0].key).toBe('exacc');
  });

  it.each(['exacc', 'exacs'] as const)('restores %s placement, tiers and notification topics', async (type) => {
    for (const placement of ['shared', 'hybrid', 'dedicated'] as const) {
      const model = emptyLzModel();
      const design = model.exadata[type];
      design.enabled = true;
      design.service = 'both';
      design.database = placement === 'shared' ? 'shared' : 'per_environment';
      if (type === 'exacc') model.exadata.exacc.shared = placement !== 'dedicated';
      else model.exadata.exacs.infrastructure = placement === 'dedicated' ? 'per_environment' : 'shared';
      design.environments = model.environments.map((e) => e.id);
      design.projectDb = Object.fromEntries(model.environments.map((env) => [env.id, [model.projects[0].id]]));
      design.notifications = {
        useSingleRecipient: false, default: '', dbWorkloads: 'db@example.com', infraWorkloads: 'infra@example.com',
        projectEmails: Object.fromEntries(model.environments.map((env, index) => [env.id, `project${index}@example.com`])),
        environmentDbEmails: Object.fromEntries(model.environments.map((env) => [env.id, 'dba@example.com'])),
        environmentInfraEmails: Object.fromEntries(model.environments.map((env) => [env.id, 'envinfra@example.com'])),
      };
      expect((await roundTrip(model)).warnings.join(' ')).toContain('VMC');
    }
  });

  it.each(['exacc', 'exacs'] as const)('requires review of the unexported %s service selection', async (type) => {
    const model = emptyLzModel();
    model.exadata[type].enabled = true;
    model.exadata[type].service = 'vmc';
    model.exadata[type].notifications.default = 'ops@example.com';
    const imported = await roundTrip(model);
    expect(imported.model.exadata[type].service).toBe('none');
    expect(imported.warnings).not.toHaveLength(0);
  });

  it('retains Exadata fallback recipients when environment key sorting changes the order', async () => {
    const model = emptyLzModel();
    const design = model.exadata.exacs;
    design.enabled = true;
    design.service = 'vmc';
    design.infrastructure = 'per_environment';
    design.database = 'per_environment';
    design.environments = model.environments.map((env) => env.id);
    design.notifications = { useSingleRecipient: false, default: '',
      environmentInfraEmails: Object.fromEntries(model.environments.map((env) => [env.id, `${env.name}-infra@example.com`])),
      environmentDbEmails: Object.fromEntries(model.environments.map((env) => [env.id, `${env.name}-db@example.com`])),
    };
    await roundTrip(model);
  });

  it('updates the imported Exadata fallback after visible recipients are edited', async () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.notifications = { useSingleRecipient: false, default: '', dbWorkloads: 'old@example.com', infraWorkloads: 'infra@example.com' };
    const imported = (await roundTrip(model)).model;
    imported.exadata.exacs.notifications.dbWorkloads = 'new@example.com';
    const params = buildConfig(imported).shared_platforms.exacs.extension!.params!;
    expect(params.notification_emails).toMatchObject({ default: ['new@example.com'], db_workloads: ['new@example.com'] });
  });

  it('can change an imported OKE network profile and return to manual subnets', async () => {
    const model = emptyLzModel();
    model.platforms = [newPlatform('oke_simple', [], model.environments)];
    const imported = (await roundTrip(model)).model;
    const platform = imported.platforms[0];
    imported.platforms[0] = applyPlatformPatch(platform, okeNetworkProfilePatch(platform, 'medium'), imported.environments, []);
    const vcns = Object.values(buildConfig(imported).environments).map((env) => env.platforms.oke.network!.vcn);
    expect(vcns.every((vcn) => vcn.endsWith('/18'))).toBe(true);
    expect(new Set(vcns).size).toBe(2);
    const resized = imported.platforms[0];
    imported.platforms[0] = applyPlatformPatch(resized, okeNetworkProfilePatch(resized, undefined), imported.environments, []);
    expect(imported.platforms[0].okeParams!.clusterSize).toBeUndefined();
    expect(imported.platforms[0].subnets.length).toBeGreaterThan(0);
  });

  it.each([null, [], 'config', {}, { ...buildConfig(emptyLzModel()), cis_level: '2' }])('rejects malformed config %j', (value) => {
    expect(() => importConfig(value)).toThrow();
  });

  it('rejects unsupported fields and extensions with the configuration path', () => {
    expect(() => importConfig({ ...buildConfig(emptyLzModel()), unsupported: true })).toThrow(/unsupported/);
    const config = buildConfig(emptyLzModel());
    config.shared_platforms.extra = { extension: { type: 'unknown' } };
    expect(() => importConfig(config)).toThrow(/shared_platforms.extra/);
  });

  it('rejects silently dropped project fields', () => {
    const config = buildConfig(emptyLzModel());
    (config.environments.prod.projects.proj1 as Record<string, unknown>).unexpected = true;
    expect(() => importConfig(config)).toThrow(/projects.proj1/);
  });

  it('rejects non-object subnet maps and invalid array values', () => {
    const config = buildConfig(emptyLzModel());
    expect(() => importConfig({ ...config, security_targets: [4] })).toThrow(/security_targets/);
    expect(() => importConfig({ ...config, hub: { ...config.hub, network: { ...config.hub.network, subnets: [] } } })).toThrow(/subnets/);
  });
});
