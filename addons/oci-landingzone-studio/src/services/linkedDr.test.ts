import { describe, expect, it } from 'vitest';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { syncDrEnvironments } from './linkedDr';
import { newPlatform, platformSubnetsForEnv, platformVcnForEnv } from './platforms';

function regional() {
  const model = emptyLzModel();
  model.foundation = { ...model.foundation, stackScope: 'regional', homeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1', regionShortName: 'ams' };
  return model;
}

describe('linked environment synchronization', () => {
  it('retains regional inputs by stable identity and clones only newly added Home environments', () => {
    const dr = regional();
    dr.environments[0].projectNetworkEnabled = false;
    dr.environments[0].network = { vcnCidr: '172.16.0.0/21', subnets: [{ name: 'recovery', cidr: '172.16.1.0/24' }] };
    const home = emptyLzModel();
    home.environments = [home.environments[1], { ...home.environments[0], name: 'production', securityZone: false },
      { id: 'added', name: 'dev', securityZone: false, network: envNetworkDefaults(2, 'dev') }];
    const snapshot = structuredClone({ dr, home });
    const synced = syncDrEnvironments(dr, home);
    expect(synced.environments.map((env) => env.id)).toEqual(home.environments.map((env) => env.id));
    expect(synced.environments[1]).toMatchObject({ name: 'production', securityZone: false, network: dr.environments[0].network, projectNetworkEnabled: false });
    expect(synced.environments[2]).toEqual(home.environments[2]);
    expect(synced.environments[2].network).not.toBe(home.environments[2].network);
    expect(synced.foundation).toMatchObject({ stackScope: 'regional', region: 'eu-amsterdam-1', regionShortName: 'ams', homeRegion: 'eu-frankfurt-1' });
    expect({ dr, home }).toEqual(snapshot);
  });

  it('prunes removed environment references throughout placements, overrides and Exadata', () => {
    const dr = regional();
    const [kept, removed] = dr.environments.map((env) => env.id);
    dr.projects[0].environments = [kept, removed];
    const platform = newPlatform('custom', []);
    dr.platforms = [{ ...platform, environments: [kept, removed], overrides: {
      [kept]: { vcnCidr: '172.16.0.0/21' }, [removed]: { vcnCidr: '172.17.0.0/21' },
    } }];
    for (const type of ['exacc', 'exacs'] as const) {
      dr.exadata[type].environments = [kept, removed];
      dr.exadata[type].projectDb = { [kept]: [dr.projects[0].id], [removed]: [dr.projects[0].id] };
      dr.exadata[type].notifications = { default: 'keep@example.com', projectEmails: { [kept]: 'k@example.com', [removed]: 'r@example.com' },
        environmentInfraEmails: { [kept]: 'k@example.com', [removed]: 'r@example.com' }, environmentDbEmails: { [removed]: 'r@example.com' } };
    }
    dr.exadata.exacs.environmentVcnCidrs = { [kept]: '172.18.0.0/21', [removed]: '172.19.0.0/21' };
    const home = emptyLzModel();
    home.environments = [home.environments[0]];
    const synced = syncDrEnvironments(dr, home);
    expect(synced.projects[0].environments).toEqual([kept]);
    expect(synced.platforms[0].environments).toEqual([kept]);
    expect(synced.platforms[0].overrides).toEqual({ [kept]: { vcnCidr: '172.16.0.0/21' } });
    for (const type of ['exacc', 'exacs'] as const) {
      expect(synced.exadata[type].environments).toEqual([kept]);
      expect(synced.exadata[type].projectDb).toEqual({ [kept]: [dr.projects[0].id] });
      expect(synced.exadata[type].notifications).toMatchObject({ default: 'keep@example.com', projectEmails: { [kept]: 'k@example.com' },
        environmentInfraEmails: { [kept]: 'k@example.com' }, environmentDbEmails: {} });
    }
    expect(synced.exadata.exacs.environmentVcnCidrs).toEqual({ [kept]: '172.18.0.0/21' });
  });

  it.each(['custom', 'oke_simple'] as const)('preserves effective %s platform networks when Home changes environment order', (type) => {
    const dr = regional();
    dr.platforms = [{ ...newPlatform(type, []), vcnCidr: '172.20.0.0/21', overrides: undefined }];
    const platform = dr.platforms[0];
    const before = dr.environments.map((env, index) => ({ id: env.id,
      vcn: platformVcnForEnv(platform, env.id, index), subnets: platformSubnetsForEnv(platform, env.id, index) }));
    const home = emptyLzModel();
    home.environments.reverse();
    const synced = syncDrEnvironments(dr, home);
    synced.environments.forEach((env, index) => {
      expect(platformVcnForEnv(synced.platforms[0], env.id, index)).toBe(before.find((value) => value.id === env.id)!.vcn);
      expect(platformSubnetsForEnv(synced.platforms[0], env.id, index)).toEqual(before.find((value) => value.id === env.id)!.subnets);
    });
    expect(syncDrEnvironments(synced, home)).toBe(synced);
  });

  it('allocates an independent network for newly added all-environment custom platforms', () => {
    const dr = regional();
    dr.platforms = [newPlatform('custom', [])];
    const home = emptyLzModel();
    home.environments.push({ id: 'added', name: 'dev', securityZone: false, network: envNetworkDefaults(2, 'dev') });
    const synced = syncDrEnvironments(dr, home);
    const allocated = synced.platforms[0].overrides?.added;
    expect(allocated?.vcnCidr).toBeTruthy();
    expect(allocated?.subnets?.length).toBeGreaterThan(0);
    expect(allocated?.vcnCidr).not.toBe(home.environments[2].network.vcnCidr);
    expect(syncDrEnvironments(synced, home)).toBe(synced);
  });

  it('avoids reusing an existing OKE network when Home inserts an environment before it', () => {
    const dr = regional();
    dr.platforms = [newPlatform('oke_simple', [])];
    const home = emptyLzModel();
    home.environments.unshift({ id: 'added', name: 'dev', securityZone: false, network: envNetworkDefaults(2, 'dev') });
    const synced = syncDrEnvironments(dr, home);
    const networks = synced.environments.map((env, index) => platformVcnForEnv(synced.platforms[0], env.id, index));
    expect(networks.every(Boolean)).toBe(true);
    expect(new Set(networks).size).toBe(networks.length);
    expect(platformVcnForEnv(synced.platforms[0], dr.environments[0].id, 1)).toBe(dr.platforms[0].vcnCidr);
    expect(syncDrEnvironments(synced, home)).toBe(synced);
  });

  it('accepts zero Home environments while preserving hub and shared inputs', () => {
    const dr = regional();
    dr.projects[0].environments = [dr.environments[0].id];
    const home = { ...emptyLzModel(), environments: [] };
    const synced = syncDrEnvironments(dr, home);
    expect(synced.environments).toEqual([]);
    expect(synced.projects[0].environments).toEqual([]);
    expect(synced.network).toEqual(dr.network);
    expect(synced.sharedPlatforms).toEqual(dr.sharedPlatforms);
  });

  it('returns the original model when the effective linked design has not changed', () => {
    const dr = regional();
    expect(syncDrEnvironments(dr, emptyLzModel())).toBe(dr);
  });
});
