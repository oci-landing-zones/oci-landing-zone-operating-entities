import { drOkePlatform } from './disasterRecoveryOke';
import type { LzModel, PlatformConfig } from '../model/types';
import { defaultDrPlatformCidrs, type DrDesignDraft } from './disasterRecoveryDesign';
import { exadataDiagramPlatforms, exacsPreviewSubnets } from './exadata';
import { platformEnvInstances, platformSubnetsForEnv } from './platforms';

export function drPlatformProjection(model: LzModel, draft: DrDesignDraft) {
  const selected = new Set(draft.platformIds);
  const cidrs = { ...defaultDrPlatformCidrs(model, draft), ...draft.platformVcnCidrs };
  const environmentIds = new Set(model.environments.map((env) => env.id));
  const source = exadataDiagramPlatforms(model);
  const platforms: PlatformConfig[] = model.platforms.flatMap((platform) => {
    const instances = platformEnvInstances(platform, model.environments).filter((env) => selected.has(`platform:${platform.id}:${env.id}`));
    if (!instances.length) return [];
    if (platform.type === 'oke_simple') return instances.flatMap((env) => {
      const projected = drOkePlatform(model, draft, `platform:${platform.id}:${env.id}`);
      return projected ? [{ ...projected, overrides: { [env.id]: { vcnCidr: projected.vcnCidr, subnets: projected.subnets } } }] : [];
    });
    const overrides = Object.fromEntries(instances.map((env) => {
      const id = `platform:${platform.id}:${env.id}`;
      const index = model.environments.findIndex((item) => item.id === env.id);
      return [env.id, { vcnCidr: cidrs[id] ?? env.vcnCidr, subnets: draft.platformSubnets?.[id] ?? platformSubnetsForEnv(platform, env.id, index) }];
    }));
    return [{ ...platform, environments: instances.map((env) => env.id), overrides }];
  });
  const sharedPlatforms = model.sharedPlatforms.filter((platform) => selected.has(`shared:${platform.id}`)).map((platform) => ({
    ...platform, vcnCidr: cidrs[`shared:${platform.id}`] ?? platform.vcnCidr, subnets: draft.platformSubnets?.[`shared:${platform.id}`] ?? platform.subnets,
  }));
  const exadataPlatforms = source.platforms.flatMap((platform) => {
    const envId = (platform.environments as string[])[0];
    const id = `extension:environment:${envId}:${platform.key}`;
    if (!selected.has(id)) return [];
    const vcnCidr = cidrs[id] ?? platform.vcnCidr;
    const subnets = draft.platformSubnets?.[id] ?? exacsPreviewSubnets(vcnCidr);
    return [{ ...platform, vcnCidr, subnets, overrides: { [envId]: { vcnCidr, subnets } } }];
  });
  const exadataShared = source.sharedPlatforms.filter((platform) => selected.has(`extension:shared:${platform.key}`)).map((platform) => {
    const id = `extension:shared:${platform.key}`;
    const vcnCidr = cidrs[id] ?? platform.vcnCidr;
    return { ...platform, vcnCidr, subnets: draft.platformSubnets?.[id] ?? exacsPreviewSubnets(vcnCidr) };
  });
  // Compartments are common to both regions even when their regional VCN is omitted.
  const environmentsWithoutNetwork = Object.fromEntries(model.environments.map((env) => [env.id, [...new Set([
    ...(source.environmentsWithoutNetwork[env.id] ?? []),
    ...source.platforms.filter((platform) => platform.environments.includes(env.id) && !selected.has(`extension:environment:${env.id}:${platform.key}`)).map((platform) => platform.key),
    ...model.platforms.filter((platform) => (platform.environments === 'all' || platform.environments.includes(env.id)) && !selected.has(`platform:${platform.id}:${env.id}`)).map((platform) => platform.key),
  ])]]));
  const exadata = {
    ...source, platforms: exadataPlatforms, sharedPlatforms: exadataShared, environmentsWithoutNetwork,
    sharedWithoutNetwork: [...new Set([
      ...source.sharedWithoutNetwork,
      ...source.sharedPlatforms.filter((platform) => !selected.has(`extension:shared:${platform.key}`)).map((platform) => platform.key),
      ...model.sharedPlatforms.filter((platform) => !selected.has(`shared:${platform.id}`)).map((platform) => platform.key),
    ])],
    projectChildren: Object.fromEntries(Object.entries(source.projectChildren).map(([envId, entries]) => [envId, Object.fromEntries(Object.entries(entries).map(([projectId, keys]) => [`${projectId}:${envId}`, keys]))])),
  };
  return { platforms, sharedPlatforms, exadata, environmentIds, cidrs };
}
