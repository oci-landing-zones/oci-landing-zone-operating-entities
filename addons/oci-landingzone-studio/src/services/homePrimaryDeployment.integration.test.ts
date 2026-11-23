import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluate, setAssetLoader } from '../generator/jsonnetVm';
import { emptyLzModel } from '../model/defaults';
import { serializeConfig } from './lzConfig';
import { deploymentDownloadFiles, homePrimaryDeploymentPlan } from './homePrimaryDeployment';
import { defaultCostGovernance } from './costGovernance';
import { importConfig } from './importConfig';
import { generateOutputs } from '../generator/generate';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')) })));

describe('real Home and Primary deployment generation', () => {
  it('keeps FinOps governance bootstrap and final phases in Home only', async () => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { region: 'eu-amsterdam-1', regionShortName: 'ams', tenancyHomeRegion: 'eu-frankfurt-1' });
    model.foundation.costGovernance = { ...defaultCostGovernance(), tagsEnabled: true, tagResourceLabels: true, ownerEmail: 'owner@customer.test', recipients: 'budgets@customer.test' };
    const files = await deploymentDownloadFiles(model, { config: serializeConfig(model), files: {} });
    expect(files['home_fra/governance_pre.json']).toBeDefined();
    expect(files['primary_ams/governance_pre.json']).toBeUndefined();
    const [home, primary] = homePrimaryDeploymentPlan(model);
    expect(home.stages).toHaveLength(2);
    expect(home.stages[0].files).toContain('governance_pre.json');
    expect(home.stages[0].files).not.toContain('governance.json');
    expect(home.stages[1].files).toContain('governance.json');
    expect(home.stages[1].files).not.toContain('governance_pre.json');
    expect(primary.stages.flatMap((stage) => stage.files).some((file) => file.startsWith('governance'))).toBe(false);
  }, 60000);

  it('wraps real regional outputs in the Secondary folder and retains the import source', async () => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { stackScope: 'regional', region: 'eu-madrid-1', regionShortName: 'mad', homeRegion: 'eu-amsterdam-1', tenancyHomeRegion: 'eu-frankfurt-1' });
    const generated = await generateOutputs(model);
    const files = await deploymentDownloadFiles(model, generated);
    expect(files['config.jsonnet']).toBe(generated.config);
    expect(files['secondary_mad/config.jsonnet']).toBe(generated.config);
    expect(files['secondary_mad/network.json']).toBe(generated.files['network.json']);
    expect(files['secondary_mad/iam.json']).toBeUndefined();
    expect(files['secondary_mad/governance.json']).toBeUndefined();
    expect(files['network.json']).toBeUndefined();
    const source = await evaluate('config.jsonnet', { 'config.jsonnet': files['config.jsonnet'] });
    expect(source).toMatchObject({ region: 'eu-madrid-1', primary_region: 'eu-amsterdam-1', primary_region_short_name: 'ams', tenancy_home_region: 'eu-frankfurt-1' });
    const imported = importConfig(source);
    expect(imported.model.foundation).toMatchObject({ stackScope: 'regional', region: 'eu-madrid-1', homeRegion: 'eu-amsterdam-1', tenancyHomeRegion: 'eu-frankfurt-1' });
    expect(files['secondary_mad/README.txt']).toContain('Home for compartments_output.json and Primary for network_output.json');
    expect(files['README.txt']).toContain('secondary_mad/README.txt');
  }, 60000);

  it('preserves the selected third region in both real Home and Primary sources', async () => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { region: 'eu-amsterdam-1', regionShortName: 'ams', tenancyHomeRegion: 'eu-frankfurt-1', deploymentMode: 'primary-secondary', drRegion: 'eu-madrid-1' });
    const files = await deploymentDownloadFiles(model, { config: serializeConfig(model), files: {} });
    expect(JSON.parse(files['home_fra/config.jsonnet']).dr_region).toBe('eu-madrid-1');
    expect(JSON.parse(files['primary_ams/config.jsonnet']).dr_region).toBe('eu-madrid-1');
    expect(files['home_fra/network.json']).toBeUndefined();
    expect(files['primary_ams/network.json']).toBeDefined();
    expect(files['primary_ams/README.txt']).toContain('network_output.json for Secondary');
    expect(files['home_fra/README.txt']).not.toContain('network_output.json');
    expect(files['README.txt']).toContain('3. Deploy Secondary (eu-madrid-1)');
  }, 60000);

  it.each([1, 2] as const)('generates two isolated deployable stacks for CIS%d', async (cisLevel) => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { cisLevel, region: 'eu-amsterdam-1', regionShortName: 'ams', tenancyHomeRegion: 'eu-frankfurt-1', deploymentMode: 'primary-only' });
    const source = serializeConfig(model);
    const files = await deploymentDownloadFiles(model, { config: source, files: {} });
    expect(files['config.jsonnet']).toBe(source);
    const imported = importConfig(await evaluate('config.jsonnet', { 'config.jsonnet': files['config.jsonnet'] }));
    expect(imported.model.foundation.tenancyHomeRegion).toBe('eu-frankfurt-1');
    expect(imported.model.foundation.region).toBe('eu-amsterdam-1');
    expect(homePrimaryDeploymentPlan(imported.model).map(({ folder }) => folder)).toEqual(['home_fra', 'primary_ams']);
    expect(files['home_fra/iam.json']).toBeDefined();
    expect(files['home_fra/governance.json']).toBeDefined();
    expect(files['home_fra/network.json']).toBeUndefined();
    expect(files[`home_fra/security_cis${cisLevel}_pre.json`]).toBeUndefined();
    expect(files[`home_fra/security_cis${cisLevel}.json`]).toContain('cloud_guard_configuration');
    expect(files[`home_fra/observability_cis${cisLevel}.json`]).toContain('iam');
    expect(files['primary_ams/iam.json']).toBeUndefined();
    expect(files['primary_ams/governance.json']).toBeUndefined();
    expect(files['primary_ams/network.json']).toBeDefined();
    expect(files[`primary_ams/security_cis${cisLevel}_pre.json`]).toBeDefined();
    expect(files[`primary_ams/security_cis${cisLevel}.json`]).not.toContain('cloud_guard_configuration');
    expect(files[`primary_ams/observability_cis${cisLevel}.json`]).not.toContain('TOPIC-IAM-KEY');
  }, 60000);
});
