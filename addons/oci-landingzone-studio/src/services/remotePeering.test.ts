import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { buildConfig } from './lzConfig';
import { newPlatform } from './platforms';
import { autofillRemotePeeringCidrs, defaultRemotePeeringName, remotePeeringIssues } from './remotePeering';

describe('RPC Kubernetes CIDR validation', () => {
  it.each(['servicesCidr', 'podsCidr'] as const)('rejects a remote network overlapping OKE %s', (field) => {
    const model = emptyLzModel();
    const platform = newPlatform('oke_simple', [], model.environments);
    platform.okeParams = { ...platform.okeParams!, cniType: 'overlay', podsCidr: '10.244.0.0/16' };
    model.platforms = [platform];
    model.remotePeeringConnections = [{ id: 'peer', name: 'peer', role: 'acceptor', peerRegionName: 'eu-amsterdam-1',
      remoteCidrs: [platform.okeParams[field]!] }];

    expect(remotePeeringIssues(model)).toEqual([expect.objectContaining({
      connectionId: 'peer', field: 'remoteCidrs', message: expect.stringMatching(/overlaps.*OKE/),
    })]);
  });

  it('permits an independent remote network and ignores an unplaced OKE platform', () => {
    const model = emptyLzModel();
    const platform = newPlatform('oke_simple', [], model.environments);
    platform.environments = [];
    model.platforms = [platform];
    model.remotePeeringConnections = [{ id: 'peer', name: 'peer', role: 'acceptor', peerRegionName: 'eu-amsterdam-1', remoteCidrs: ['10.96.0.0/16'] }];
    expect(remotePeeringIssues(model)).toEqual([]);
    platform.environments = 'all';
    model.remotePeeringConnections[0].remoteCidrs = ['172.20.0.0/16'];
    expect(remotePeeringIssues(model)).toEqual([]);
  });
});

describe('default RPC connection names', () => {
  it.each([
    [[], 'rpc-1'],
    [['rpc-1'], 'rpc-2'],
    [['rpc-1', 'rpc-3'], 'rpc-4'],
    [['custom-peer', 'rpc_3', 'rpc-4'], 'rpc-5'],
  ])('avoids collisions with existing and normalized names: %j', (names, expected) => {
    expect(defaultRemotePeeringName((names as string[]).map((name) => ({ name })))).toBe(expected);
  });
});

describe('linked RPC CIDR autocompletion', () => {
  function pair() {
    const model = emptyLzModel();
    model.foundation.drRegion = 'eu-amsterdam-1';
    model.remotePeeringConnections = [{ id: 'rpc', name: 'rpc-1', role: 'acceptor' as const, peerRegionName: '', remoteCidrs: [] }];
    const peer = emptyLzModel();
    peer.foundation.region = 'eu-amsterdam-1';
    peer.network.hubVcnCidr = '172.20.0.0/21';
    peer.environments = [peer.environments[0]];
    peer.environments[0].network.vcnCidr = '172.20.64.0/21';
    return { model, peer };
  }

  it('fills actual peer VCNs in the model and export without mutating its inputs', () => {
    const { model, peer } = pair();
    const filled = autofillRemotePeeringCidrs(model, peer);
    expect(filled.remotePeeringConnections![0].remoteCidrs).toEqual(['172.20.0.0/21', '172.20.64.0/21']);
    expect(buildConfig(filled).remote_peering_connections!['rpc-1'].remote_cidrs).toEqual(['172.20.0.0/21', '172.20.64.0/21']);
    expect(model.remotePeeringConnections![0].remoteCidrs).toEqual([]);
    expect(autofillRemotePeeringCidrs(filled, peer)).toBe(filled);
  });

  it('uses Primary networks in DR and excludes networkless environments', () => {
    const { model, peer } = pair();
    model.foundation.stackScope = 'regional';
    model.foundation.homeRegion = 'eu-frankfurt-1';
    peer.foundation.region = 'eu-frankfurt-1';
    peer.environments[0].projectNetworkEnabled = false;
    expect(autofillRemotePeeringCidrs(model, peer).remotePeeringConnections![0].remoteCidrs).toEqual(['172.20.0.0/21']);
  });

  it('preserves manual routes and avoids unavailable, unrelated, foreign or ambiguous peers', () => {
    const { model, peer } = pair();
    expect(autofillRemotePeeringCidrs(model)).toBe(model);
    model.remotePeeringConnections![0].remoteCidrs = ['192.168.0.0/24'];
    expect(autofillRemotePeeringCidrs(model, peer)).toBe(model);
    model.remotePeeringConnections![0].remoteCidrs = [];
    model.remotePeeringConnections![0].peerRegionName = 'us-phoenix-1';
    expect(autofillRemotePeeringCidrs(model, peer)).toBe(model);
    model.remotePeeringConnections![0].peerRegionName = '';
    model.remotePeeringConnections![0].peerTenancyOcid = 'ocid1.tenancy.oc1..foreign';
    expect(autofillRemotePeeringCidrs(model, peer)).toBe(model);
    delete model.remotePeeringConnections![0].peerTenancyOcid;
    model.remotePeeringConnections!.push({ ...model.remotePeeringConnections![0], id: 'second' });
    expect(autofillRemotePeeringCidrs(model, peer)).toBe(model);
  });

  it('keeps overlap errors visible instead of silently discarding peer networks', () => {
    const { model, peer } = pair();
    peer.network.hubVcnCidr = model.network.hubVcnCidr;
    expect(remotePeeringIssues(autofillRemotePeeringCidrs(model, peer))).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'remoteCidrs' })]));
  });
});

it('uses the known Secondary for empty RPC peers in validation and exported configuration', () => {
  const model = emptyLzModel();
  Object.assign(model.foundation, { deploymentMode: 'primary-only', drRegion: 'eu-amsterdam-1' });
  model.remotePeeringConnections = [{ id: 'rpc', name: 'rpc-1', role: 'acceptor', peerRegionName: '', remoteCidrs: ['172.20.0.0/16'] }];
  expect(remotePeeringIssues(model)).toEqual([]);
  expect(buildConfig(model).remote_peering_connections!['rpc-1'].peer_region_name).toBe('eu-amsterdam-1');
  model.remotePeeringConnections[0].peerRegionName = 'us-phoenix-1';
  expect(buildConfig(model).remote_peering_connections!['rpc-1'].peer_region_name).toBe('us-phoenix-1');
});
