import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform, newSharedPlatform } from './platforms';
import { createDrDraft, createDrHubNetwork, drNetworkOptions, drRegionOptions } from './disasterRecoveryDesign';
import { validateSubnetCidr } from './cidr';

describe('DR design selections', () => {
  it('defaults OCVS production to its DR reservation without reusing Home addresses', () => {
    const model = emptyLzModel();
    const platform = newPlatform('ocvs', [], model.environments);
    platform.environments = [model.environments[0].id];
    model.platforms = [platform];
    const draft = createDrDraft(model);
    expect(draft.platformVcnCidrs?.[`platform:${platform.id}:${model.environments[0].id}`]).toBe('10.0.224.0/22');
  });
  it('uses the requested EXACS DR ranges independently of the Home ranges', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.database = 'per_environment';
    model.exadata.exacs.environments = model.environments.map((env) => env.id);
    const original = structuredClone(model);
    const draft = createDrDraft(model);
    expect(draft.platformVcnCidrs).toEqual({
      [`extension:environment:${model.environments[0].id}:exacs`]: '10.0.240.0/21',
      [`extension:environment:${model.environments[1].id}:exacs`]: '10.0.248.0/21',
    });
    expect(model).toEqual(original);
  });
  it('inherits an independent copy of Home notification recipients and their topic mode', () => {
    const model = emptyLzModel();
    model.foundation.notifications = { default: 'home@example.com', cloudguard: 'cg@example.com', iam: 'iam@example.com', network: 'net@example.com', security: 'sec@example.com', useSingleRecipient: false };
    const draft = createDrDraft(model);
    expect(draft.notifications).toEqual(model.foundation.notifications);
    draft.notifications!.network = 'dr@example.com';
    expect(model.foundation.notifications.network).toBe('net@example.com');
  });
  it('starts the DR hub at the requested range with contained, nonoverlapping subnets', () => {
    for (const kind of ['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const) {
      const network = createDrHubNetwork(kind);
      expect(network.hubVcnCidr).toBe('10.0.192.0/21');
      network.subnets.forEach((subnet, index) => expect(validateSubnetCidr(subnet.cidr, network.hubVcnCidr, network.subnets.filter((_, other) => other !== index))).toBeNull());
    }
  });
  it('includes only production by default with its DR range and leaves platforms optional', () => {
    const model = emptyLzModel();
    const original = structuredClone(model);
    const draft = createDrDraft(model);
    expect(draft.region).toBe('');
    expect(draft.hubKind).toBe(model.network.hubKind);
    expect(draft.projectNetworkIds).toEqual([`projects:${model.environments[0].id}`]);
    const network = draft.projectNetworks![draft.projectNetworkIds[0]];
    expect(network.vcnCidr).toBe('10.0.200.0/21');
    network.subnets.forEach((subnet, index) => expect(validateSubnetCidr(subnet.cidr, network.vcnCidr, network.subnets.filter((_, other) => other !== index))).toBeNull());
    expect(draft.platformIds).toEqual([]);
    expect(model).toEqual(original);
  });

  it('offers only different regions in the source realm', () => {
    const model = emptyLzModel();
    model.foundation.realm = 'oc19';
    model.foundation.region = 'eu-frankfurt-2';
    expect(drRegionOptions(model).map((region) => region.id)).toEqual(['eu-madrid-2']);
    expect(drRegionOptions(emptyLzModel()).some((region) => region.id === 'eu-frankfurt-1')).toBe(false);
  });

  it('uses actual per-environment VCNs and stable scope identities', () => {
    const model = emptyLzModel();
    const platform = newPlatform('ocvs', [], model.environments);
    platform.overrides = { [model.environments[1].id]: { vcnCidr: '10.20.0.0/21' } };
    model.platforms = [platform];
    model.sharedPlatforms = [newSharedPlatform('ocvs', [])];
    const options = drNetworkOptions(model);
    expect(options.platforms).toHaveLength(3);
    expect(options.platforms.some((option) => option.vcnCidr === '10.20.0.0/21')).toBe(true);
    expect(new Set([...options.projects, ...options.platforms].map((option) => option.id)).size).toBe(5);
    model.environments[0].name = 'production';
    expect(drNetworkOptions(model).projects[0].id).toBe(options.projects[0].id);
  });

  it('lists EXACS infrastructure and database scopes without inventing an infrastructure VCN', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.database = 'per_environment';
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.environments = [model.environments[0].id];
    model.exadata.exacs.environmentVcnCidrs[model.environments[0].id] = '10.12.0.0/21';
    const platforms = drNetworkOptions(model).platforms;
    expect(platforms).toHaveLength(2);
    expect(platforms.find((option) => option.scope === 'Shared')?.vcnCidr).toBeUndefined();
    expect(platforms.find((option) => option.scope === 'prod')?.vcnCidr).toBe('10.12.0.0/21');
  });

  it('does not offer project VCNs for environments without an address range', () => {
    const model = emptyLzModel();
    model.environments[0].network.vcnCidr = '';
    expect(drNetworkOptions(model).projects).toHaveLength(1);
  });
});
