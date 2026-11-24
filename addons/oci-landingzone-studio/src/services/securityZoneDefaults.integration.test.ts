import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { emptyLzModel, normalizeModel } from '../model/defaults';
import { setAssetLoader } from '../generator/jsonnetVm';
import { generateOutputs } from '../generator/generate';
import { buildConfig } from './lzConfig';
import { importConfig } from './importConfig';
import { plannedDeploymentStages } from './deployment';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));
function model() {
  const current = emptyLzModel();
  current.foundation.notifications!.default = 'ops@customer.test';
  current.foundation.costGovernance!.recipients = 'finops@customer.test';
  return current;
}

describe('Security Zone defaults and Advanced selections', () => {
  it.each([1, 2] as const)('disables Recipe 01 independently and always follows baseline CIS%d', async (cisLevel) => {
    const current = model();
    current.foundation.cisLevel = cisLevel;
    current.foundation.securityZoneRecipe1CisLevel = cisLevel === 1 ? 2 : 1;
    Object.assign(current.foundation, { landingZoneSecurityZone: false });
    const config = buildConfig(current);
    expect(config).not.toHaveProperty('security_zone_recipe1_cis_level');
    expect(config).toHaveProperty('enable_landing_zone_security_zone', false);
    const restored = importConfig(config).model;
    expect(normalizeModel(restored).foundation).toHaveProperty('landingZoneSecurityZone', false);
    const generated = await generateOutputs(restored);
    expect(generated.files[`security_cis${cisLevel}_pre.json`]).toBeUndefined();
    for (const phase of ['']) {
      const security = JSON.parse(generated.files[`security_cis${cisLevel}${phase}.json`]);
      expect(security.security_zones_configuration.recipes).toEqual({});
      expect(security.security_zones_configuration.security_zones).toEqual({});
      expect(security.cloud_guard_configuration).toBeDefined();
      expect(Boolean(security.vaults_configuration)).toBe(cisLevel === 2);
    }
    Object.assign(restored.foundation, { landingZoneSecurityZone: true });
    const enabled = JSON.parse((await generateOutputs(restored)).files[`security_cis${cisLevel}.json`]).security_zones_configuration;
    expect(Object.values(enabled.recipes)).toEqual([expect.objectContaining({ cis_level: String(cisLevel) })]);
    Object.assign(restored.foundation, { landingZoneSecurityZone: false, sharedNetworkSecurityZone: true });
    restored.environments[0].securityZone = true;
    const advanced = JSON.parse((await generateOutputs(restored)).files[`security_cis${cisLevel}.json`]).security_zones_configuration;
    expect(Object.keys(advanced.recipes)).toHaveLength(2);
    expect(Object.values(advanced.security_zones).map((zone) => (zone as { compartment_id: string }).compartment_id).sort()).toEqual(['CMP-LZ-NETWORK-KEY', 'CMP-LZ-PROD-KEY']);
  }, 60000);

  it.each([1, 2] as const)('generates only Recipe 01 and the landing-zone target by default for CIS%d', async (cisLevel) => {
    const current = model();
    current.foundation.cisLevel = cisLevel;
    const generated = await generateOutputs(current);
    expect(generated.files[`security_cis${cisLevel}_pre.json`]).toBeUndefined();
    for (const phase of ['']) {
      const zones = JSON.parse(generated.files[`security_cis${cisLevel}${phase}.json`]).security_zones_configuration;
      expect(Object.keys(zones.recipes)).toHaveLength(1);
      expect(Object.values(zones.security_zones)).toEqual([expect.objectContaining({ compartment_id: 'CMP-LANDINGZONE-KEY' })]);
    }
    expect(generated.files[`security_cis${cisLevel}_pre.json`]).toBeUndefined();
    const stages = plannedDeploymentStages(buildConfig(current), Object.keys(generated.files));
    expect(stages).toHaveLength(1);
    expect(stages[0].files).toContain(`security_cis${cisLevel}.json`);
    expect(stages[0].files.some((file) => file.endsWith('_pre.json'))).toBe(false);
    const roots = stages[0].files.flatMap((file) => Object.keys(JSON.parse(generated.files[file])));
    expect(new Set(roots).size).toBe(roots.length);
    expect(importConfig(buildConfig(current)).model.foundation.sharedNetworkSecurityZone).toBe(false);
  }, 60000);

  it('generates only explicitly selected additional zones and round-trips their choices', async () => {
    const current = model();
    current.foundation.sharedNetworkSecurityZone = true;
    current.environments[0].securityZone = true;
    const restored = importConfig(buildConfig(current)).model;
    expect(restored.foundation.sharedNetworkSecurityZone).toBe(true);
    expect(restored.environments.map((env) => env.securityZone)).toEqual([true, false]);
    const output = await generateOutputs(restored);
    const zones = JSON.parse(output.files['security_cis1.json']).security_zones_configuration;
    const stages = plannedDeploymentStages(buildConfig(restored), Object.keys(output.files));
    expect(stages).toHaveLength(2);
    expect(stages[0].files).toContain('security_cis1_pre.json');
    expect(stages[1].files).toContain('security_cis1.json');
    expect(Object.keys(zones.recipes)).toHaveLength(3);
    expect(Object.values(zones.security_zones).map((zone) => (zone as { compartment_id: string }).compartment_id).sort()).toEqual(['CMP-LANDINGZONE-KEY', 'CMP-LZ-NETWORK-KEY', 'CMP-LZ-PROD-KEY']);
  }, 60000);

  it('preserves the shared-network zone in older saved and imported configurations', () => {
    const previous = model();
    delete previous.foundation.sharedNetworkSecurityZone;
    expect(buildConfig(normalizeModel(previous))).not.toHaveProperty('enable_shared_network_security_zone');
    expect(importConfig(buildConfig(previous)).model.foundation.sharedNetworkSecurityZone).toBe(true);
    expect(() => importConfig({ ...buildConfig(previous), enable_shared_network_security_zone: 'false' })).toThrow('enable_shared_network_security_zone');
  });
});

it.each([1, 2] as const)('uses two security phases only for selected environment Recipe 02 at CIS%d', async (cisLevel) => {
  const current = model(); current.foundation.cisLevel = cisLevel;
  current.environments[0].securityZone = true;
  const output = await generateOutputs(current);
  const pre = `security_cis${cisLevel}_pre.json`, final = `security_cis${cisLevel}.json`;
  const initial = JSON.parse(output.files[pre]).security_zones_configuration;
  const complete = JSON.parse(output.files[final]).security_zones_configuration;
  expect(Object.values(initial.security_zones)).toHaveLength(1);
  expect(Object.values(complete.security_zones)).toHaveLength(2);
  expect(complete.recipes['SZ-RCP-LZ-02-PROD-ENVIRONMENT-KEY']).toBeDefined();
  expect(complete.recipes['SZ-RCP-LZ-03-PROD-ENVIRONMENT-KEY']).toBeUndefined();
  const stages = plannedDeploymentStages(buildConfig(current), Object.keys(output.files));
  expect(stages).toHaveLength(2);
  expect(stages[0].files).toContain(pre); expect(stages[0].files).not.toContain(final);
  expect(stages[1].files).toContain(final); expect(stages[1].files).not.toContain(pre);
  expect(stages[0].description).toContain('before enabling additional environment Security Zones');
  expect(stages[1].description).toContain('Never include both security files');
}, 60000);

it('preserves Recipe 03 identities when reopening an older environment-zone source', async () => {
  const old = buildConfig(model()); delete old.security_zone_environment_recipe_number;
  old.security_targets = ['prod'];
  const restored = importConfig(old).model;
  expect(restored.foundation.environmentSecurityZoneRecipeNumber).toBe(3);
  expect(buildConfig(restored).security_zone_environment_recipe_number).toBeUndefined();
  const output = await generateOutputs(restored);
  const zones = JSON.parse(output.files['security_cis1.json']).security_zones_configuration;
  expect(zones.recipes['SZ-RCP-LZ-03-PROD-ENVIRONMENT-KEY']).toBeDefined();
  expect(zones.recipes['SZ-RCP-LZ-02-PROD-ENVIRONMENT-KEY']).toBeUndefined();
}, 60000);
