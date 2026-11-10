import type { LzModel } from '../model/types';
import { configuredVcnCidrs, reconcileExadata } from './exadata';
import { platformInEnv, platformSubnetsForEnv, platformVcnForEnv, customDefaultSubnets } from './platforms';
import { environmentPlatformCidr } from './oneOeCidrs';
import { overlaps, parseCidr } from './cidr';

/** Home owns environment identities; the regional design owns their networks. */
export function syncDrEnvironments(dr: LzModel, home: LzModel): LzModel {
  const previous = new Map(dr.environments.map((env, index) => [env.id, { env, index }]));
  const ids = new Set(home.environments.map((env) => env.id));
  const environments = home.environments.map((homeEnv) => {
    const existing = previous.get(homeEnv.id)?.env;
    return existing
      ? { ...existing, name: homeEnv.name, securityZone: homeEnv.securityZone }
      : structuredClone(homeEnv);
  });
  const source = reconcileExadata(dr);
  const next: LzModel = {
    ...source,
    foundation: { ...source.foundation, stackScope: 'regional', realm: home.foundation.realm,
      homeRegion: home.foundation.region, drRegion: undefined },
    environments,
    projects: source.projects.map((project) => project.environments === 'all' ? project : {
      ...project, environments: project.environments.filter((id) => ids.has(id)),
    }),
    platforms: source.platforms.map((platform) => {
      const overrides = Object.fromEntries(Object.entries(platform.overrides ?? {}).filter(([id]) => ids.has(id)));
      environments.forEach((env, index) => {
        const old = previous.get(env.id);
        if (!old || old.index === index || !platformInEnv(platform, env.id)) return;
        // Pin implicit networks before Home reordering changes their index-based defaults.
        overrides[env.id] = { ...overrides[env.id], vcnCidr: platformVcnForEnv(platform, env.id, old.index),
          ...(platform.type === 'custom' || (platform.type === 'oke_simple' && !platform.okeParams?.clusterSize)
            ? { subnets: platformSubnetsForEnv(platform, env.id, old.index) } : {}) };
      });
      return { ...platform, environments: platform.environments === 'all' ? 'all' : platform.environments.filter((id) => ids.has(id)),
        ...(platform.overrides || Object.keys(overrides).length ? { overrides } : {}) };
    }),
  };
  const occupied = configuredVcnCidrs(next);
  for (const platform of next.platforms) {
    if (platform.environments !== 'all') continue;
    for (const env of environments) {
      if (previous.has(env.id) || platform.overrides?.[env.id]) continue;
      let vcnCidr = '';
      if (platform.type === 'oke_simple') {
        for (let index = 0; index <= occupied.length; index += 1) {
          const candidate = platformVcnForEnv(platform, env.id, index);
          if (parseCidr(candidate) && !occupied.some((cidr) => overlaps(candidate, cidr))) { vcnCidr = candidate; break; }
        }
      } else vcnCidr = environmentPlatformCidr(env.name, occupied);
      if (vcnCidr) occupied.push(vcnCidr);
      platform.overrides = { ...platform.overrides, [env.id]: { vcnCidr,
        ...(platform.type === 'custom' ? { subnets: customDefaultSubnets(vcnCidr) } : {}) } };
    }
  }
  const synced = reconcileExadata(next);
  return JSON.stringify(synced) === JSON.stringify(dr) ? dr : synced;
}
