import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { createRegionalModel, validateRegionalDeployment } from './regionalDeployment';
import { validateRemotePeering } from './remotePeering';
import { buildConfig, serializeConfig } from './lzConfig';
import { importConfig } from './importConfig';
import { newPlatform } from './platforms';
import { validateOkeModel } from './okeValidation';
import { validateExadataModel } from './exadata';
import { validateOcvsModel } from './ocvsValidation';
import { validatePlatformContracts } from './platformValidation';

describe('regional designs in the standard model', () => {
  it.each(['existing', 'imported'])('preserves %s inputs when changing deployment scope', (origin) => {
    const source = emptyLzModel();
    const oke = newPlatform('oke_simple', [], source.environments);
    oke.okeParams = { ...oke.okeParams!, servicesCidr: '172.25.0.0/16', podsCidr: '172.26.0.0/16', cniType: 'overlay', workerBootVolumeSize: 80 };
    source.platforms = [oke];
    source.sharedPlatforms = [{ id: 'shared', key: 'core', vcnCidr: '10.40.0.0/21', subnets: [{ name: 'app', cidr: '10.40.0.0/24' }] }];
    const model = origin === 'imported' ? importConfig(buildConfig(source)).model : structuredClone(source);
    const before = structuredClone(model);
    const config = buildConfig(model);
    model.foundation.stackScope = 'regional';
    expect(model).toEqual({ ...before, foundation: { ...before.foundation, stackScope: 'regional' } });
    expect(buildConfig(model)).toEqual({ ...config, stack_scope: 'regional' });
    expect(serializeConfig(model)).toContain("stack_scope: 'regional'");
    model.foundation.stackScope = 'complete';
    expect(model).toEqual({ ...before, foundation: { ...before.foundation, stackScope: 'complete' } });
    expect(buildConfig(model)).toEqual({ ...config, stack_scope: 'complete' });
  });
  it('ignores saved CIDRs of Projects VCNs omitted from the config', () => {
    const model = emptyLzModel();
    model.environments[0].projectNetworkEnabled = false;
    model.environments[0].network = { vcnCidr: model.network.hubVcnCidr, subnets: [{ name: '', cidr: '' }, { name: 'web', cidr: '' }, { name: 'web', cidr: '' }] };
    expect(buildConfig(model).environments.prod.project_network).toBeUndefined();
    expect(validateExadataModel(model)).toEqual([]);
    expect(validateOkeModel(model)).toEqual([]);
    expect(validateOcvsModel(model)).toEqual([]);
    expect(validatePlatformContracts(model)).toEqual([]);
  });
  it('starts blank without environments and requires Home prerequisites', () => {
    const model = createRegionalModel();
    expect(model.environments).toEqual([]);
    expect(model.projects).toEqual([]);
    expect(model.platforms).toEqual([]);
    expect(model.sharedPlatforms).toEqual([]);
    expect(model.remotePeeringConnections).toEqual([]);
    expect(buildConfig(model).stack_scope).toBe('regional');
    expect(validateRegionalDeployment(model)).toHaveLength(3);
    Object.assign(model.foundation, { region: 'eu-amsterdam-1', regionShortName: 'ams', homeRegion: 'eu-frankfurt-1', homePrerequisitesConfirmed: true });
    expect(validateRegionalDeployment(model)).toEqual([]);
  });
  it('requires a Home acceptor reference when a requester is configured', () => {
    const dr = createRegionalModel();
    Object.assign(dr.foundation, { region: 'eu-amsterdam-1', regionShortName: 'ams' });
    dr.remotePeeringConnections = [{ id: 'rpc-home', name: 'home', role: 'requester', remoteCidrs: ['10.20.0.0/21'], peerRegionName: 'eu-frankfurt-1', peerId: '' }];
    expect(validateRemotePeering(dr)).toEqual([expect.stringContaining('acceptor RPC OCID')]);
    dr.remotePeeringConnections![0].peerId = 'RPC-HOME-KEY';
    expect(validateRemotePeering(dr)).toEqual([]);
  });
  it('imports regional scope and both RPC roles without dropping fields', () => {
    const dr = createRegionalModel();
    Object.assign(dr.foundation, { region: 'eu-amsterdam-1', regionShortName: 'ams' });
    dr.remotePeeringConnections = [{ id: 'rpc-home', name: 'home', role: 'requester', remoteCidrs: ['10.20.0.0/21'], peerRegionName: 'eu-frankfurt-1', peerId: 'RPC-HOME-KEY' }];
    const config = buildConfig(dr);
    expect(buildConfig(importConfig(config).model)).toEqual(config);
    expect(serializeConfig(dr)).toContain("stack_scope: 'regional'");
    expect(serializeConfig(dr)).toContain("peer_id: 'RPC-HOME-KEY'");
    const home = emptyLzModel();
    home.foundation.drRegion = 'eu-amsterdam-1';
    home.remotePeeringConnections = [{ id: 'rpc', name: 'dr', role: 'acceptor', peerRegionName: 'eu-amsterdam-1', remoteCidrs: ['10.2.0.0/21'], peerTenancyOcid: 'ocid1.tenancy.oc1..peer', requestorGroupOcid: 'ocid1.group.oc1..group' }];
    expect(buildConfig(importConfig(buildConfig(home)).model)).toEqual(buildConfig(home));
  });
  it('rejects overlapping CIDRs, name collisions and cross-tenancy regional peers', () => {
    const model = createRegionalModel();
    Object.assign(model.foundation, { region: 'eu-amsterdam-1', regionShortName: 'ams' });
    model.remotePeeringConnections = [{ id: 'rpc-home', name: 'home', role: 'requester', remoteCidrs: ['10.20.0.0/21'], peerRegionName: 'eu-frankfurt-1', peerId: 'RPC-HOME-KEY' }];
    const rpc = model.remotePeeringConnections![0];
    rpc.remoteCidrs = [model.network.hubVcnCidr];
    rpc.peerTenancyOcid = 'ocid1.tenancy.oc1..peer';
    expect(validateRemotePeering(model).join('\n')).toMatch(/overlaps/);
    expect(validateRemotePeering(model).join('\n')).toMatch(/same-tenancy/);
    model.remotePeeringConnections!.push({ ...rpc, id: 'second' });
    expect(validateRemotePeering(model).join('\n')).toMatch(/unique/);
  });
  it('imports omitted empty maps but still rejects unsupported environment fields', () => {
    const model = emptyLzModel();
    model.environments = []; model.projects = [];
    const { environments: _environments, security_targets: _targets, shared_platforms: _shared, ...config } = buildConfig(model);
    expect(importConfig(config).model.environments).toEqual([]);
    expect(() => importConfig({ ...config, environments: { prod: { unknown: true } } })).toThrow(/unknown/);
  });
});
