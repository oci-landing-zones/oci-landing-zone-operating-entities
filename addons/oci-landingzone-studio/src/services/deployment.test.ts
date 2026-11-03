import { describe, expect, it } from 'vitest';
import { DEPLOY_TO_OCI_URL, ORCHESTRATOR_RELEASE_URL, deploymentReadme, deploymentPrerequisites, deploymentSettings, deploymentCliSteps, expectedDeploymentFiles } from './deployment';
import { emptyLzModel } from '../model/defaults';
import { buildConfig } from './lzConfig';
import { newPlatform } from './platforms';
import { emptyHybridConnectivity, newVpn } from './hybridConnectivity';

describe('default deployment settings', () => {
  it('presents preparation, phase 1 inputs and apply, then phase 2 inputs and apply in execution order', () => {
    const config = buildConfig(emptyLzModel());
    const guide = deploymentReadme(config, expectedDeploymentFiles(config));
    const prepare = guide.indexOf('1. Prepare the files');
    const create = guide.indexOf('2. Create and apply phase 1');
    const firstInputs = guide.indexOf('  security_cis2_pre.json');
    const firstApply = guide.indexOf('Select Create');
    const update = guide.indexOf('3. Update and apply phase 2');
    const finalInputs = guide.indexOf('  security_cis2.json');
    const finalApply = guide.indexOf('Save the updated variables');
    expect(prepare).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(prepare);
    expect(firstInputs).toBeGreaterThan(create);
    expect(firstApply).toBeGreaterThan(firstInputs);
    expect(update).toBeGreaterThan(firstApply);
    expect(finalInputs).toBeGreaterThan(update);
    expect(finalApply).toBeGreaterThan(finalInputs);
  });

  it('omits DR, RPC, firewall backend and external connection instructions from an ordinary Home guide', () => {
    const config = buildConfig(emptyLzModel());
    const guide = deploymentReadme(config, expectedDeploymentFiles(config));
    expect(guide).not.toContain('For DR');
    expect(guide).not.toContain('compartments_output.json');
    expect(guide).not.toContain('network_output.json');
    expect(guide).not.toContain('local_dependency_file_paths');
    expect(guide).not.toContain('RPC');
    expect(guide).not.toContain('network_backends.json');
    expect(guide).not.toContain('Complete external setup');
  });

  it('retains the pinned Orchestrator and private Object Storage default', () => {
    const url = new URL(DEPLOY_TO_OCI_URL);
    expect(`${url.origin}${url.pathname}`).toBe('https://cloud.oracle.com/resourcemanager/stacks/create');
    expect(url.searchParams.get('zipUrl')).toBe('https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.2.0.zip');
    expect(JSON.parse(url.searchParams.get('zipUrlVariables')!)).toEqual({ configuration_source: 'ocibucket' });
    expect(ORCHESTRATOR_RELEASE_URL).toBe('https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/releases/tag/v2.2.0');
  });

  it('packages the default settings and exact phase file lists without design values', () => {
    const config = buildConfig(emptyLzModel());
    const guide = deploymentReadme(config, ['iam.json', 'governance.json', 'network.json',
      'security_cis2_pre.json', 'security_cis2.json', 'observability_cis2_pre.json', 'observability_cis2.json']);
    expect(guide).toContain('rms-facade');
    expect(guide).toContain('configuration_source = "ocibucket"');
    expect(guide).toContain('oci_configuration_bucket');
    expect(guide).toContain('oci_configuration_objects');
    const [first, second] = guide.split('3. Update and apply phase 2');
    expect(first).toContain('security_cis2_pre.json');
    expect(second).toContain('security_cis2.json');
    expect(second).not.toContain('security_cis2_pre.json');
    expect(guide).not.toContain('save_output');
    expect(guide).not.toContain('oci_dependency_objects');
    expect(guide).not.toContain('private GitHub');
  });

  it('names RPC output settings only for acceptors and requesters using resource keys', () => {
    const config = buildConfig(emptyLzModel());
    const peer = { remote_cidrs: ['10.2.0.0/21'], peer_region_name: 'eu-amsterdam-1' };
    config.remote_peering_connections = { peer };
    expect(deploymentSettings(config).join('\n').replaceAll('`', '')).toContain('save_output = true');
    config.remote_peering_connections = { peer: { ...peer, peer_id: 'RPC-AMS-LZ-PEER-KEY' } };
    expect(deploymentSettings(config).join('\n').replaceAll('`', '')).toContain('Set oci_dependency_objects to network_output.json');
    config.remote_peering_connections = { peer: { ...peer, peer_id: 'ocid1.remotepeeringconnection.oc1..example' } };
    expect(deploymentSettings(config).join('\n')).not.toContain('oci_dependency_objects');
    expect(deploymentCliSteps(config).join('\n')).not.toContain('local_dependency_file_paths');
  });

  it.each([1, 2] as const)('always names both Home dependencies for CIS%d DR', (cis) => {
    const config = buildConfig(emptyLzModel());
    config.stack_scope = 'regional';
    config.cis_level = cis;
    const steps = [...deploymentPrerequisites(config), ...deploymentSettings(config)].join('\n').replaceAll('`', '');
    expect(steps).toContain('save_output = true');
    expect(steps).toContain('compartments_output.json');
    expect(steps).toContain('network_output.json');
    expect(steps).toContain('oci_dependency_objects');
    expect(steps.includes('encryption keys')).toBe(cis === 2);
    expect(deploymentCliSteps(config).join('\n').replaceAll('`', '')).toContain('local_dependency_file_paths to the absolute paths of compartments_output.json and network_output.json');
    const guide = deploymentReadme(config, expectedDeploymentFiles(config));
    expect(guide.indexOf('On Home, set save_output')).toBeLessThan(guide.indexOf('2. Create and apply phase 1'));
    expect(guide.indexOf('Set oci_dependency_objects')).toBeLessThan(guide.indexOf('Select Create'));
    expect(guide).not.toContain('Set save_output = true to write runtime outputs');
  });

  it('sets Home output publishing before applying and collects outputs after phase 2', () => {
    const config = buildConfig(emptyLzModel());
    config.dr_region = 'eu-amsterdam-1';
    const guide = deploymentReadme(config, expectedDeploymentFiles(config));
    expect(guide.indexOf('Set save_output = true')).toBeGreaterThan(guide.indexOf('2. Create and apply phase 1'));
    expect(guide.indexOf('Set save_output = true')).toBeLessThan(guide.indexOf('Select Create'));
    expect(guide.indexOf('Retain compartments_output.json and network_output.json')).toBeGreaterThan(guide.indexOf('Save the updated variables'));
    expect(guide).not.toContain('oci_dependency_objects');
  });

  it('previews OKE and Hub C files and retains the backend alternative in the packaged final phase', () => {
    const model = emptyLzModel();
    model.network.hubKind = 'hub_c';
    model.platforms = [newPlatform('oke_simple', [])];
    const config = buildConfig(model);
    const files = expectedDeploymentFiles(config);
    expect(files).toEqual(expect.arrayContaining(['network_backends.json', 'oke_clusters.json', 'oke_workers.json']));
    const guide = deploymentReadme(config, files);
    const second = guide.split('3. Update and apply phase 2')[1];
    expect(second).toContain('  network_backends.json');
    expect(second).not.toContain('  network.json');
    expect(second.indexOf('Configure the third-party firewall VMs')).toBeLessThan(second.indexOf('Replace oci_configuration_objects'));
    expect(second.indexOf('  network_backends.json')).toBeLessThan(second.indexOf('Save the updated variables'));
  });

  it('keeps connectivity on the normal ORM path and includes only its applicable handover without secrets', () => {
    const model = emptyLzModel();
    model.hybridConnectivity = emptyHybridConnectivity();
    model.hybridConnectivity.ipsecs.office = newVpn('office');
    model.hybridConnectivity.ipsecs.office.tunnels_management.tunnel_1.shared_secret = 'SyntheticSessionKey123';
    const config = buildConfig(model);
    const guide = deploymentReadme(config, expectedDeploymentFiles(config));
    expect(guide).toContain('Deploy with OCI Resource Manager');
    expect(guide).toContain('both Oracle tunnel endpoints');
    expect(guide.split('Updating an existing landing zone')[0]).not.toContain('Adding a connection');
    expect(guide).toContain('Use the existing stack and Terraform state.');
    expect(guide).not.toContain('provider activation');
    expect(guide).not.toContain('SyntheticSessionKey123');
    expect(guide).not.toContain('incompatible provider');
    expect(guide).not.toContain('agreed neighbors and advertisements');
    model.hybridConnectivity.ipsecs.office.tunnels_management.tunnel_1.routing = 'BGP';
    const bgp = buildConfig(model);
    expect(deploymentReadme(bgp, expectedDeploymentFiles(bgp))).toContain('For the BGP tunnels');
  });
});
