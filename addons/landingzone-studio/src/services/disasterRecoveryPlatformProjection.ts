import { drOkePlatform } from './disasterRecoveryOke';
import type { LzModel, PlatformConfig } from '../model/types';
import { defaultDrPlatformCidrs, type DrDesignDraft } from './disasterRecoveryDesign';
import { platformEnvInstances, platformSubnetsForEnv } from './platforms';

export function drPlatformProjection(model: LzModel, draft: DrDesignDraft) {
  const selected = new Set(draft.platformIds);
  const cidrs = { ...defaultDrPlatformCidrs(model, draft), ...draft.platformVcnCidrs };
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
  return { platforms, sharedPlatforms, cidrs };
}
