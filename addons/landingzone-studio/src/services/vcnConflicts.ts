import type { LzModel } from '../model/types';
import { overlaps } from './cidr';
import { exadataEntries } from './exadata';
import { platformEnvInstances } from './platforms';

export function vcnConflicts(model: LzModel): Record<string, string[]> {
  const exadata = exadataEntries(model);
  const ranges = [
    { id: 'hub', name: 'Hub', cidr: model.network.hubVcnCidr },
    ...model.environments.filter((env) => env.projectNetworkEnabled !== false).map((env) => ({ id: `environment:${env.id}`, name: `${env.name} Projects`, cidr: env.network.vcnCidr })),
    ...model.sharedPlatforms.map((platform) => ({ id: `shared:${platform.id}`, name: `Shared ${platform.key}`, cidr: platform.vcnCidr })),
    ...model.platforms.flatMap((platform) => platformEnvInstances(platform, model.environments).map((instance) => ({ id: `platform:${platform.id}:${instance.id}`, name: `${instance.name} ${platform.key}`, cidr: instance.vcnCidr }))),
    ...Object.entries(exadata.shared).flatMap(([key, entry]) => entry.network ? [{ id: `exadata:${key}:shared`, name: `Shared ${key}`, cidr: entry.network.vcn }] : []),
    ...Object.entries(exadata.environments).flatMap(([envId, entries]) => Object.entries(entries).flatMap(([key, entry]) => entry.network ? [{ id: `exadata:${key}:${envId}`, name: `${model.environments.find((env) => env.id === envId)?.name} ${key}`, cidr: entry.network.vcn }] : [])),
  ];
  const errors: Record<string, string[]> = {};
  for (let index = 0; index < ranges.length; index++) {
    const range = ranges[index];
    for (const other of ranges.slice(index + 1)) {
      if (!overlaps(range.cidr, other.cidr)) continue;
      (errors[range.id] ??= []).push(`Overlaps ${other.name} (${other.cidr}). Use a separate VCN range.`);
      (errors[other.id] ??= []).push(`Overlaps ${range.name} (${range.cidr}). Use a separate VCN range.`);
    }
  }
  return errors;
}
