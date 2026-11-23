import { describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { generateFromConfigCode } from '../generator/generate';
import { buildHomePrimaryConfigs, shouldSplitHomePrimary, deploymentDownloadFiles, homePrimaryDeploymentPlan } from './homePrimaryDeployment';

vi.mock('../generator/generate', () => ({ generateFromConfigCode: vi.fn(async (source: string) => {
  const config = JSON.parse(source);
  return config.stack_scope === 'home'
    ? { 'iam.json': '{}', 'governance_pre.json': '{}', 'governance.json': '{}', 'observability_cis1.json': '{}' }
    : { 'network.json': '{}', 'security_cis1_pre.json': '{}', 'security_cis1.json': '{}', 'observability_cis1.json': '{}', 'oke.json': '{}' };
}) }));

function design() {
  const model = emptyLzModel();
  model.foundation.tenancyHomeRegion = 'eu-frankfurt-1';
  model.foundation.region = 'eu-amsterdam-1';
  model.foundation.regionShortName = 'ams';
  return model;
}

describe('Home and Primary deployment packaging', () => {
  it('splits only standalone Primary designs whose tenancy home is another supported region', () => {
    const model = design();
    expect(shouldSplitHomePrimary(model)).toBe(true);
    model.foundation.stackScope = 'regional';
    expect(shouldSplitHomePrimary(model)).toBe(false);
    model.foundation.stackScope = 'complete';
    model.foundation.deploymentMode = 'primary-secondary';
    expect(shouldSplitHomePrimary(model)).toBe(true);
    model.foundation.deploymentMode = 'primary-only';
    model.foundation.drRegion = 'eu-madrid-1';
    expect(shouldSplitHomePrimary(model)).toBe(true);
    model.foundation.drRegion = 'eu-frankfurt-1';
    expect(shouldSplitHomePrimary(model)).toBe(false);
    delete model.foundation.drRegion;
    model.foundation.tenancyHomeRegion = 'eu-amsterdam-1';
    expect(shouldSplitHomePrimary(model)).toBe(false);
    model.foundation.tenancyHomeRegion = 'unknown';
    expect(shouldSplitHomePrimary(model)).toBe(false);
    model.foundation.tenancyHomeRegion = 'eu-frankfurt-1';
    model.foundation.region = 'unknown';
    expect(shouldSplitHomePrimary(model)).toBe(false);
  });

  it('derives reproducible regional sources without changing the editable design', () => {
    const model = design();
    const before = JSON.stringify(model);
    const { home, primary } = buildHomePrimaryConfigs(model)!;
    expect(home).toMatchObject({ stack_scope: 'home', region: 'eu-frankfurt-1', region_short_name: 'fra', primary_region: 'eu-amsterdam-1', primary_region_short_name: 'ams' });
    expect(primary).toMatchObject({ stack_scope: 'primary', region: 'eu-amsterdam-1', region_short_name: 'ams' });
    expect(home.environments).toEqual(primary.environments);
    expect(JSON.stringify(model)).toBe(before);
  });

  it('packages separate generated stacks, retains the import source and explains compartments-only handoff', async () => {
    const files = await deploymentDownloadFiles(design(), { config: 'editable studio source', files: { 'network.json': 'old flat artifact' } });
    expect(files['config.jsonnet']).toBe('editable studio source');
    expect(files['network.json']).toBeUndefined();
    expect(files['home_fra/iam.json']).toBe('{}');
    expect(files['home_fra/network.json']).toBeUndefined();
    expect(files['primary_ams/network.json']).toBe('{}');
    expect(JSON.parse(files['home_fra/config.jsonnet']).stack_scope).toBe('home');
    const homeGuide = files['home_fra/README.txt'];
    expect(homeGuide).toContain('save_output = true');
    expect(homeGuide).toContain('governance_pre.json');
    expect(homeGuide).not.toContain('network_output.json');
    const primaryGuide = files['primary_ams/README.txt'];
    expect(primaryGuide).toContain('compartments_output.json');
    expect(primaryGuide).toContain('oci_dependency_objects');
    expect(primaryGuide).toContain('local_dependency_file_paths');
    expect(primaryGuide).not.toContain('network_output.json');
    expect(files['README.txt']).toContain('new installation');
    expect(homePrimaryDeploymentPlan(design())[0].folder).toBe('home_fra');
  });

  it.each(['RPC-ACCEPTOR-KEY', 'ocid1.remotepeeringconnection.oc1..existing'])('documents external RPC dependencies only for logical peer IDs: %s', async (peerId) => {
    const model = design();
    model.remotePeeringConnections = [{ id: 'peer', name: 'peer', role: 'requester', peerId, peerRegionName: 'eu-madrid-1', remoteCidrs: ['172.20.0.0/16'] }];
    const files = await deploymentDownloadFiles(model, { config: 'source', files: {} });
    const primary = files['primary_ams/README.txt'];
    expect(files['home_fra/README.txt']).not.toContain('network_output.json');
    if (peerId.startsWith('ocid1.')) {
      expect(primary).not.toContain('network_output.json');
      expect(files['README.txt']).not.toContain('network_output.json');
    } else {
      expect(primary).toContain('network_output.json from the completed external RPC acceptor');
      expect(primary).toContain('oci_dependency_objects to ["compartments_output.json", "network_output.json"]');
      expect(primary).toContain('local_dependency_file_paths to the absolute paths of compartments_output.json from completed Home and network_output.json from the completed external RPC acceptor');
      expect(files['README.txt']).toContain('network_output.json from the completed external RPC acceptor');
    }
  });

  it('preserves merged source overrides and the Secondary region when generating three distinct regions', async () => {
    const model = design();
    model.foundation.deploymentMode = 'primary-secondary';
    model.foundation.drRegion = 'eu-madrid-1';
    const config = buildHomePrimaryConfigs(model)!.primary;
    config.environments.extra = structuredClone(Object.values(config.environments)[0]);
    const files = await deploymentDownloadFiles(model, { config: 'merged source', files: {} }, config);
    const home = JSON.parse(files['home_fra/config.jsonnet']);
    const primary = JSON.parse(files['primary_ams/config.jsonnet']);
    expect(home.dr_region).toBe('eu-madrid-1');
    expect(primary.dr_region).toBe('eu-madrid-1');
    expect(home.environments.extra).toBeDefined();
    expect(primary.environments.extra).toBeDefined();
    expect(files['config.jsonnet']).toBe('merged source');
    expect(files['primary_ams/README.txt']).toContain('Set save_output = true');
    expect(files['primary_ams/README.txt']).toContain('network_output.json for Secondary');
    expect(files['README.txt']).toContain('3. Deploy Secondary');
    expect(files['README.txt']).toContain('compartments_output.json from Home and network_output.json from Primary');
  });

  it('retains Primary network outputs for an RPC requester when Primary is the acceptor', async () => {
    const model = design();
    model.remotePeeringConnections = [{ id: 'peer', name: 'peer', role: 'acceptor', peerRegionName: 'eu-madrid-1', remoteCidrs: ['172.20.0.0/16'] }];
    const files = await deploymentDownloadFiles(model, { config: 'source', files: {} });
    expect(files['primary_ams/README.txt']).toContain('Set save_output = true');
    expect(files['primary_ams/README.txt']).toContain('network_output.json for RPC requesters');
    expect(files['home_fra/README.txt']).not.toContain('network_output.json');
  });

  it.each(['home', 'primary'])('blocks the ZIP when %s generated resources lack cost-center coverage', async (scope) => {
    const uncovered = JSON.stringify({ resources: { missing: { defined_tags: { 'tagns-lz-cost-governance.tag-lz-platform': 'network' } } } });
    vi.mocked(generateFromConfigCode).mockResolvedValueOnce(scope === 'home' ? { 'iam.json': uncovered } : { 'iam.json': '{}' });
    vi.mocked(generateFromConfigCode).mockResolvedValueOnce(scope === 'primary' ? { 'network.json': uncovered } : { 'network.json': '{}' });
    await expect(deploymentDownloadFiles(design(), { config: 'source', files: {} })).rejects.toThrow('no cost center');
  });

  it('packages a regional Secondary stack in its own folder with a reimport source and root index', async () => {
    const model = design();
    Object.assign(model.foundation, { stackScope: 'regional', homeRegion: 'eu-amsterdam-1', region: 'eu-madrid-1', regionShortName: 'mad' });
    const source = 'editable secondary source';
    const outputs = { 'network.json': '{"secondary":true}', 'security_cis1_pre.json': '{}', 'security_cis1.json': '{}', 'observability_cis1.json': '{}' };
    const files = await deploymentDownloadFiles(model, { config: source, files: outputs });
    expect(files['config.jsonnet']).toBe(source);
    expect(files['secondary_mad/config.jsonnet']).toBe(source);
    expect(files['secondary_mad/network.json']).toBe(outputs['network.json']);
    expect(files['network.json']).toBeUndefined();
    expect(files['README.txt']).toContain('secondary_mad/README.txt');
    expect(files['README.txt']).toContain('compartments_output.json from Home and network_output.json from Primary');
    expect(files['secondary_mad/README.txt']).toContain('Secondary stack (eu-madrid-1)');
    expect(files['secondary_mad/README.txt']).toContain('Home for compartments_output.json and Primary for network_output.json');
    expect(files['secondary_mad/README.txt']).toContain('oci_dependency_objects');
    expect(files['secondary_mad/README.txt']).toContain('local_dependency_file_paths');
    expect(Object.keys(files).filter((path) => !path.includes('/')).sort()).toEqual(['README.txt', 'config.jsonnet']);
  });

  it('preserves flat packaging for same-region designs', async () => {
    const model = design();
    model.foundation.tenancyHomeRegion = model.foundation.region;
    const files = { 'network.json': '{}', 'security_cis1_pre.json': '{}', 'security_cis1.json': '{}' };
    const bundled = await deploymentDownloadFiles(model, { config: 'source', files });
    expect(bundled['network.json']).toBe('{}');
    expect(bundled['config.jsonnet']).toBe('source');
    expect(Object.keys(bundled).some((path) => path.includes('/'))).toBe(false);
  });
});
