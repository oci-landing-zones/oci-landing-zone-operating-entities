import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { createDrDraft, createDrHubNetwork } from './disasterRecoveryDesign';
import { drEnvironmentNetworkError, drExacsNetworkError, drOcvsNetworkError, rebaseDrEnvironmentNetwork } from './disasterRecoveryNetwork';

describe('DR environment CIDR editing', () => {
  it('allows supported OCVS sizes and rejects overlaps and noncanonical VCNs', () => {
    const model = emptyLzModel();
    const id = 'platform:ocvs:prod';
    const draft = { ...createDrDraft(model), hubNetwork: createDrHubNetwork('hub_a'), platformIds: [id, 'other'], platformVcnCidrs: { other: '10.0.240.0/21' } };
    for (const cidr of ['10.0.224.0/22', '10.0.224.0/21', '10.0.224.0/23', '10.0.224.0/24']) expect(drOcvsNetworkError(model, draft, id, cidr)).toBeNull();
    for (const cidr of ['invalid', '10.0.224.0/20', '10.0.224.0/25', '10.0.225.0/22', '10.0.64.0/21', '10.0.192.0/21', '10.0.200.0/21', '10.0.240.0/21']) expect(drOcvsNetworkError(model, draft, id, cidr)).not.toBeNull();
  });
  it('validates EXACS spoke edits against required subnet size and other regional networks', () => {
    const model = emptyLzModel();
    const id = `extension:environment:${model.environments[0].id}:exacs`;
    const other = `extension:environment:${model.environments[1].id}:exacs`;
    const draft = { ...createDrDraft(model), hubNetwork: createDrHubNetwork('hub_a'), platformIds: [id, other], platformVcnCidrs: { [id]: '10.0.240.0/21', [other]: '10.0.248.0/21' } };
    expect(drExacsNetworkError(model, draft, id, '10.1.240.0/21')).toBeNull();
    expect(drExacsNetworkError(model, draft, id, '10.0.240.0/21')).toBeNull();
    const custom = [{ name: 'db', cidr: '10.0.242.0/24' }, { name: 'backup', cidr: '10.0.243.0/24' }];
    expect(drExacsNetworkError(model, draft, id, '10.0.240.0/21', custom)).toBeNull();
    expect(drExacsNetworkError(model, draft, id, '10.0.240.0/21', [{ name: 'db', cidr: '10.0.248.0/24' }, custom[1]])).toContain('Outside the VCN');
    expect(drExacsNetworkError(model, draft, id, '10.0.240.0/21', [custom[0], { name: 'backup', cidr: custom[0].cidr }])).toContain('Overlaps');
    for (const cidr of ['invalid', '10.1.240.0/24', '10.0.64.0/21', '10.0.192.0/21', '10.0.200.0/21', '10.0.248.0/21']) {
      expect(drExacsNetworkError(model, draft, id, cidr)).not.toBeNull();
    }
  });
  it('rebases preprod subnets and leaves its Home network unchanged', () => {
    const model = emptyLzModel();
    const env = model.environments[1];
    const original = structuredClone(env.network);
    const network = rebaseDrEnvironmentNetwork(env.network, '10.0.208.0/21');
    expect(network.subnets.map((subnet) => subnet.cidr)).toEqual(['10.0.208.0/24', '10.0.209.0/24', '10.0.210.0/24', '10.0.211.0/24']);
    expect(drEnvironmentNetworkError(model, createDrDraft(model), `projects:${env.id}`, network)).toBeNull();
    expect(env.network).toEqual(original);
  });
  it('rejects invalid ranges, undersized VCNs and overlaps with Home or selected DR networks', () => {
    const model = emptyLzModel();
    const source = model.environments[1].network;
    const id = `projects:${model.environments[1].id}`;
    const draft = { ...createDrDraft(model), hubNetwork: createDrHubNetwork('hub_a') };
    for (const cidr of ['invalid', '10.0.208.0/24', source.vcnCidr, '10.0.192.0/21', '10.0.200.0/21']) {
      expect(drEnvironmentNetworkError(model, draft, id, rebaseDrEnvironmentNetwork(source, cidr))).not.toBeNull();
    }
  });
});
