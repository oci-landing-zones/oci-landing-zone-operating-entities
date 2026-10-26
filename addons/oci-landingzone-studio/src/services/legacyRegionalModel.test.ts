import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { createDrDraft, createDrHubNetwork, type DrDesignDraft } from './disasterRecoveryDesign';
import { buildDrFileConfigs } from './disasterRecoveryGeneration';
import { buildConfig } from './lzConfig';
import { newPlatform } from './platforms';
import { legacyRegionalModel } from './regionalDeployment';
import { validateExadataModel } from './exadata';

function design() {
  const home = emptyLzModel();
  home.foundation.notifications!.default = 'home@example.com';
  const draft: DrDesignDraft = { ...createDrDraft(home), region: 'eu-amsterdam-1', regionConfirmed: true,
    hubNetwork: createDrHubNetwork(home.network.hubKind), projectNetworkIds: [] };
  return { home, draft };
}

describe('legacy regional design conversion', () => {
  it('retains a platform-only environment and excludes unselected Home resources', () => {
    const { home, draft } = design();
    const platform = newPlatform('custom', [], home.environments);
    home.platforms = [platform];
    const env = home.environments[1];
    const id = `platform:${platform.id}:${env.id}`;
    draft.platformIds = [id];
    draft.platformVcnCidrs = { [id]: '10.20.0.0/21' };
    draft.platformSubnets = { [id]: [{ name: 'core', cidr: '10.20.0.0/24' }] };
    const before = structuredClone(home);
    const model = legacyRegionalModel(home, draft);
    expect(model.environments.map((item) => item.id)).toEqual([env.id]);
    expect(model.environments[0].projectNetworkEnabled).toBe(false);
    expect(buildConfig(model)).toEqual({ ...buildDrFileConfigs(home, draft).dr, security_targets: [] });
    expect(home).toEqual(before);
    model.foundation.notifications!.default = 'changed@example.com';
    expect(home).toEqual(before);
  });


  it('keeps independent OKE settings and manual subnet edits without reusing platform identities', () => {
    const { home, draft } = design();
    const platform = newPlatform('oke_simple', [], home.environments);
    home.platforms = [platform];
    draft.platformIds = home.environments.map((env) => `platform:${platform.id}:${env.id}`);
    draft.platformVcnCidrs = Object.fromEntries(draft.platformIds.map((id, index) => [id, `10.${20 + index}.0.0/21`]));
    draft.platformOkeParams = Object.fromEntries(draft.platformIds.map((id, index) => [id, { ...platform.okeParams!, clusterSize: undefined, workerBootVolumeSize: 80 + index }]));
    const model = legacyRegionalModel(home, draft);
    expect(new Set(model.platforms.map((item) => item.id)).size).toBe(2);
    expect(buildConfig(model)).toEqual({ ...buildDrFileConfigs(home, draft).dr, security_targets: [] });
  });

  it('retains Exadata project tiers, selected networks, services and edited recipients', () => {
    const { home, draft } = design();
    const env = home.environments[0];
    Object.assign(home.exadata.exacs, { enabled: true, infrastructure: 'per_environment', database: 'per_environment', service: 'both', environments: [env.id], projectDb: { [env.id]: [home.projects[0].id] } });
    home.exadata.exacs.notifications.default = 'home-exacs@example.com';
    const id = `extension:environment:${env.id}:exacs`;
    draft.platformIds = [id];
    draft.platformVcnCidrs = { [id]: '10.20.0.0/21' };
    draft.platformNotificationEmails = { [id]: { default: 'dr-exacs@example.com' } };
    const model = legacyRegionalModel(home, draft);
    expect(model.exadata.exacs.service).toBe('both');
    expect(model.exadata.exacs.projectDb[env.id]).toEqual([`${home.projects[0].id}:${env.id}`]);
    expect(buildConfig(model)).toEqual({ ...buildDrFileConfigs(home, draft).dr, security_targets: [] });
  });

  it('preserves edited Exadata topic recipients and their independent fallback default', () => {
    const { home, draft } = design();
    const env = home.environments[0];
    Object.assign(home.exadata.exacs, { enabled: true, infrastructure: 'per_environment', database: 'per_environment', service: 'vmc', environments: [env.id],
      notifications: { useSingleRecipient: false, default: '', environmentInfraEmails: { [env.id]: 'infra@example.com' }, environmentDbEmails: { [env.id]: 'db@example.com' } } });
    const id = `extension:environment:${env.id}:exacs`;
    draft.platformIds = [id];
    draft.platformVcnCidrs = { [id]: '10.20.0.0/21' };
    draft.platformNotificationEmails = { [id]: { default: 'fallback@example.com', environment_infra: 'dr-infra@example.com', environment_db: 'dr-db@example.com' } };
    const model = legacyRegionalModel(home, draft);
    expect(model.exadata.exacs.notifications.environmentDbEmails?.[env.id]).toBe('dr-db@example.com');
    expect(buildConfig(model)).toEqual({ ...buildDrFileConfigs(home, draft).dr, security_targets: [] });
  });

  it('refuses legacy EXACC topic settings that require omitted database environments', () => {
    const { home, draft } = design();
    Object.assign(home.exadata.exacc, { enabled: true, shared: true, service: 'vmc', environments: [home.environments[0].id] });
    delete home.exadata.exacc.database;
    home.exadata.exacc.notifications.default = 'exacc@example.com';
    draft.platformIds = ['extension:shared:exacc'];
    expect(() => legacyRegionalModel(home, draft)).toThrow(/EXACC.*notification recipients/);
  });

  it('leaves missing regional inputs empty while keeping the original incomplete draft intact', () => {
    const { home, draft } = design();
    delete draft.hubNetwork;
    draft.region = '';
    const before = structuredClone({ home, draft });
    const model = legacyRegionalModel(home, draft);
    expect(model.network).toEqual({ hubKind: draft.hubKind, hubVcnCidr: '', subnets: [] });
    expect(model.foundation.region).toBe('');
    expect({ home, draft }).toEqual(before);
  });

  it('keeps unconfigured custom VCNs blank and applies legacy blank-name fallback', () => {
    const { home, draft } = design();
    const env = home.environments[0];
    const platform = newPlatform('custom', [], home.environments);
    home.platforms = [platform];
    draft.platformIds = [`platform:${platform.id}:${env.id}`];
    draft.environmentNames = { [env.id]: ' ' };
    draft.projectNames = { [env.id]: { [home.projects[0].id]: '' } };
    const model = legacyRegionalModel(home, draft);
    expect(model.environments[0].name).toBe(env.name);
    expect(model.projects[0].name).toBe(home.projects[0].name);
    expect(buildConfig(model).environments.prod.platforms[platform.key].network?.vcn).toBe('');
  });

  it('ignores stale selections for resources absent from the Home source', () => {
    const { home, draft } = design();
    draft.platformIds = [`extension:environment:${home.environments[0].id}:exacs`, 'shared:removed'];
    const model = legacyRegionalModel(home, draft);
    expect(model.environments).toEqual([]);
    expect(model.exadata.exacs.enabled).toBe(false);
    expect(model.sharedPlatforms).toEqual([]);
  });

  it('removes unselected Exadata project tiers while keeping their environment for another platform', () => {
    const { home, draft } = design();
    const [prod, preprod] = home.environments;
    Object.assign(home.exadata.exacs, { enabled: true, infrastructure: 'per_environment', database: 'per_environment', service: 'both', environments: [prod.id, preprod.id],
      projectDb: { [prod.id]: [home.projects[0].id], [preprod.id]: [home.projects[0].id] } });
    home.exadata.exacs.notifications.default = 'exacs@example.com';
    const platform = newPlatform('custom', [], home.environments);
    home.platforms = [platform];
    const exacsId = `extension:environment:${prod.id}:exacs`;
    const customId = `platform:${platform.id}:${preprod.id}`;
    draft.platformIds = [exacsId, customId];
    draft.platformVcnCidrs = { [exacsId]: '10.20.0.0/21', [customId]: '10.21.0.0/21' };
    draft.platformSubnets = { [customId]: [{ name: 'core', cidr: '10.21.0.0/24' }] };
    const model = legacyRegionalModel(home, draft);
    expect(Object.keys(model.exadata.exacs.projectDb)).toEqual([prod.id]);
    expect(validateExadataModel(model)).toEqual([]);
    expect(buildConfig(model)).toEqual({ ...buildDrFileConfigs(home, draft).dr, security_targets: [] });
  });


  it.each(['subnets', 'publication', 'notifications'])('rejects unrepresentable Exadata %s without changing the source', (setting) => {
    const { home, draft } = design();
    const env = home.environments[0];
    Object.assign(home.exadata.exacs, { enabled: true, database: 'per_environment', service: 'vmc', environments: [env.id] });
    home.exadata.exacs.notifications.default = 'home-exacs@example.com';
    const id = `extension:environment:${env.id}:exacs`;
    draft.platformIds = ['extension:shared:exacs', id];
    draft.platformVcnCidrs = { [id]: '10.20.0.0/21' };
    if (setting === 'subnets') draft.platformSubnets = { [id]: [{ name: 'db', cidr: '10.20.2.0/24' }] };
    if (setting === 'publication') draft.platformIds = [id];
    if (setting === 'notifications') draft.platformNotificationEmails = { [id]: { default: 'different@example.com' } };
    const before = structuredClone({ home, draft });
    expect(() => legacyRegionalModel(home, draft)).toThrow(/EXACS.*(subnet|publication|notification)/i);
    expect({ home, draft }).toEqual(before);
  });
});
