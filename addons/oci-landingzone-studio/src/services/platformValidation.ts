import type { LzModel } from '../model/types';
import { overlaps, validateSubnetCidr, validateVcnCidr } from './cidr';
import { placementsOverlap, platformEnvInstances } from './platforms';

interface NamedCidr { name: string; cidr: string; subnets: { name: string; cidr: string }[] }

function duplicateKeys(keys: string[], scope: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const raw of keys) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) duplicates.add(raw.trim());
    seen.add(key);
  }
  return [...duplicates].map((key) => `Duplicate ${scope} config key: ${key}.`);
}

function requiredKeys(keys: string[], scope: string): string[] {
  return keys.some((key) => !key.trim()) ? [`Every ${scope} needs a non-empty config key.`] : [];
}

function duplicatePlacedKeys(entries: { name: string; environments: 'all' | string[] }[], scope: string): string[] {
  return entries.flatMap((entry, index) => entries.slice(0, index).some((other) =>
    entry.name.trim().toLowerCase() === other.name.trim().toLowerCase()
    && placementsOverlap(entry.environments, other.environments))
    ? [`Duplicate ${scope} config key: ${entry.name.trim()}.`] : []);
}

function subnetKeyErrors(subnets: { name: string }[], scope: string): string[] {
  return [
    ...requiredKeys(subnets.map((subnet) => subnet.name), `${scope} subnet`),
    ...duplicateKeys(subnets.map((subnet) => subnet.name), `${scope} subnet`),
  ];
}

/** Studio-level checks that must pass before invoking Jsonnet. */
export function validatePlatformContracts(model: LzModel): string[] {
  const errors = [
    ...requiredKeys(model.environments.map((environment) => environment.name), 'environment'),
    ...duplicateKeys(model.environments.map((environment) => environment.name), 'environment'),
    ...requiredKeys(model.projects.map((project) => project.name), 'project'),
    ...duplicatePlacedKeys(model.projects, 'project'),
    ...duplicatePlacedKeys(model.platforms.map((platform) => ({ name: platform.key, environments: platform.environments })), 'environment platform'),
    ...duplicateKeys(model.sharedPlatforms.map((platform) => platform.key), 'shared platform'),
    ...subnetKeyErrors(model.network.subnets, 'hub'),
  ];
  const environmentIds = new Set(model.environments.map((environment) => environment.id));
  if (environmentIds.size !== model.environments.length) errors.push('Environment identities must be unique.');
  if (new Set(model.projects.map((project) => project.id)).size !== model.projects.length) errors.push('Project identities must be unique.');
  for (const environment of model.environments) {
    if (environment.projectNetworkEnabled === false) continue;
    errors.push(...subnetKeyErrors(environment.network.subnets, `${environment.name.trim() || environment.id} environment`));
  }
  for (const project of model.projects) {
    if (project.environments !== 'all' && project.environments.some((id) => !environmentIds.has(id))) {
      errors.push(`Project ${project.name.trim() || project.id} references a removed environment.`);
    }
  }
  for (const platform of model.platforms) {
    if (!['oke_simple', 'custom'].includes(platform.type)) errors.push(`Unsupported platform type: ${platform.type}.`);
    if (!platform.key.trim()) errors.push('Every environment platform needs a non-empty config key.');
    if (platform.key.trim().length > 3) {
      errors.push(`Environment platform ${platform.key.trim()} config key must be 3 characters or less for OCI Network Firewall names.`);
    }
    if (platform.environments !== 'all' && platform.environments.some((id) => !environmentIds.has(id))) {
      errors.push(`Platform ${platform.key.trim() || platform.id} references a removed environment.`);
    }
    if (Object.keys(platform.overrides ?? {}).some((id) => !environmentIds.has(id))) {
      errors.push(`Platform ${platform.key.trim() || platform.id} has an override for a removed environment.`);
    }
    errors.push(...subnetKeyErrors(platform.subnets, `${platform.key.trim() || platform.id} platform`));
    for (const [id, override] of Object.entries(platform.overrides ?? {})) {
      if (override.subnets) errors.push(...subnetKeyErrors(override.subnets, `${platform.key.trim() || platform.id} override ${id}`));
    }
  }
  for (const platform of model.sharedPlatforms) {
    if (platform.type !== undefined && platform.type !== 'custom') errors.push(`Unsupported shared platform type: ${platform.type}.`);
    if (!platform.key.trim()) errors.push('Every shared platform needs a non-empty config key.');
    errors.push(...subnetKeyErrors(platform.subnets, `${platform.key.trim() || platform.id} shared platform`));
  }

  const ranges: NamedCidr[] = [
    { name: 'Hub VCN', cidr: model.network.hubVcnCidr, subnets: model.network.subnets },
    ...model.environments.filter((env) => env.projectNetworkEnabled !== false).map((env, index) => ({ name: `${env.name.trim() || `environment ${index + 1}`} project VCN`, cidr: env.network.vcnCidr, subnets: env.network.subnets })),
    ...model.sharedPlatforms.map((platform) => ({ name: `shared platform ${platform.key || platform.id}`, cidr: platform.vcnCidr, subnets: platform.subnets })),
    ...model.platforms.flatMap((platform) => platformEnvInstances(platform, model.environments).map((instance) => ({
      name: `${instance.name} platform ${platform.key || platform.id}`,
      cidr: instance.vcnCidr,
      subnets: instance.subnets,
    }))),
  ];
  for (const range of ranges) {
    const vcnError = validateVcnCidr(range.cidr);
    if (vcnError) errors.push(`${range.name}: ${vcnError}.`);
    range.subnets.forEach((subnet, index) => {
      const error = validateSubnetCidr(subnet.cidr, range.cidr, range.subnets.filter((_, other) => index !== other));
      if (error) errors.push(`${range.name} subnet ${subnet.name}: ${error}.`);
    });
  }
  for (let left = 0; left < ranges.length; left += 1) {
    for (let right = left + 1; right < ranges.length; right += 1) {
      const a = ranges[left];
      const b = ranges[right];
      if (overlaps(a.cidr, b.cidr)) errors.push(`${a.name} (${a.cidr}) overlaps ${b.name} (${b.cidr}).`);
    }
  }
  return [...new Set(errors)];
}
