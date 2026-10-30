import type { LzModel, PlatformConfig } from '../model/types';
import { newPlatform, platformInEnv, platformSubnetsForEnv, platformVcnForEnv } from './platforms';
import { BASE_RANGES, baseRangeOf, firstFreeBlock, overlaps, parseCidr } from './cidr';

/** Freeze each saved OKE placement's effective network before removing shared editing. */
export function splitOkePlacements(model: LzModel): LzModel {
  if (!model.platforms.some((p) => p.type === 'oke_simple' && !p.environmentScoped)) return model;
  const ids = new Set(model.platforms.map((p) => p.id));
  const platforms = model.platforms.flatMap((platform): PlatformConfig[] => {
    if (platform.type !== 'oke_simple' || platform.environmentScoped) return [platform];
    const placements = model.environments.flatMap((env, index) => platformInEnv(platform, env.id) ? [{ env, index }] : []);
    if (!placements.length) return [{ ...platform, environmentScoped: true, environments: [] }];
    return placements.map(({ env, index }, placementIndex) => {
      let id = platform.id;
      if (placementIndex) {
        const stem = `${platform.id}-${env.id}`;
        id = stem;
        let suffix = 2;
        while (ids.has(id)) id = `${stem}-${suffix++}`;
        ids.add(id);
      }
      return { ...structuredClone(platform), id, environmentScoped: true, environments: [env.id],
        vcnCidr: platformVcnForEnv(platform, env.id, index),
        subnets: platform.okeParams?.clusterSize ? [] : structuredClone(platformSubnetsForEnv(platform, env.id, index)), overrides: undefined };
    });
  });
  return { ...model, platforms };
}

/** One new, independent cluster card per currently active environment. */
export function createOkeEntries(model: LzModel, occupied: string[], key?: string): PlatformConfig[] {
  if (!model.environments.length) return [];
  const template = newPlatform('oke_simple', model.platforms, model.environments, occupied, model.network);
  if (key?.trim()) template.key = key.trim();
  const entries = splitOkePlacements({ ...model, platforms: [template] }).platforms;
  const used = [...occupied];
  const ids = new Set(model.platforms.map((p) => p.id));
  return entries.map((entry) => {
    let id = entry.id;
    let suffix = 2;
    while (ids.has(id)) id = `${entry.id}-${suffix++}`;
    ids.add(id);
    const range = BASE_RANGES.find((r) => r.id === baseRangeOf(entry.vcnCidr));
    const prefix = parseCidr(entry.vcnCidr)?.prefix ?? 20;
    const vcnCidr = !used.some((cidr) => overlaps(entry.vcnCidr, cidr)) ? entry.vcnCidr
      : range ? firstFreeBlock(range.cidr, used, prefix) ?? '' : '';
    if (vcnCidr) used.push(vcnCidr);
    return { ...entry, id, vcnCidr };
  });
}
