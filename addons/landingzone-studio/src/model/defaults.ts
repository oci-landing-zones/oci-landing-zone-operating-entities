import type { EnvNetworkConfig, LzModel, ProjectConfig } from './types';
import { getDefaultRegionForRealm } from '../services/regions';
import { hubKindDefaults } from '../services/hubKinds';

export const LZ_MODEL_VERSION = '0.18.0';

export function defaultProjects(): ProjectConfig[] {
  return [{ id: 'project-1', name: 'proj1', environments: 'all' }];
}

export const ENV_SUBNET_ROLES = ['web', 'app', 'db', 'infra'] as const;

export function envNetworkDefaults(index: number): EnvNetworkConfig {
  // Mirrors gen/defaults.libsonnet for prod/preprod and continues the same
  // non-overlapping /18 stride for environments added in Studio.
  const block = 64 * (index + 1);
  const secondOctet = Math.floor(block / 256);
  const thirdOctet = block % 256;
  return {
    vcnCidr: `10.${secondOctet}.${thirdOctet}.0/21`,
    subnets: ENV_SUBNET_ROLES.map((role, subnetIndex) => ({
      name: role,
      cidr: `10.${secondOctet}.${thirdOctet + subnetIndex}.0/24`,
    })),
  };
}

/** Initial canonical model. Shared platforms are opt-in. */
export function emptyLzModel(): LzModel {
  const region = getDefaultRegionForRealm('oc1');
  return {
    version: LZ_MODEL_VERSION,
    foundation: {
      realm: 'oc1',
      region: region?.id ?? 'eu-frankfurt-1',
      regionShortName: region?.shortName ?? 'fra',
      cisLevel: 2,
    },
    environments: [
      { id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) },
      { id: 'environment-2', name: 'preprod', securityZone: false, network: envNetworkDefaults(1) },
    ],
    network: { hubKind: 'hub_a', ...hubKindDefaults('hub_a') },
    projects: defaultProjects(),
    platforms: [],
    sharedPlatforms: [],
  };
}

/**
 * Studio has not been released, so only the current model contract is accepted.
 * Older or malformed browser records are intentionally reset instead of carrying
 * a migration surface that could mask contract mistakes during development.
 */
function uniqueId(prefix: string, used: Set<string>): string {
  let index = 1;
  while (used.has(`${prefix}-${index}`)) index += 1;
  const id = `${prefix}-${index}`;
  used.add(id);
  return id;
}

/** Create an opaque-enough browser identity for a newly added model entity. */
export function createModelId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Upgrade the last name-referenced pre-release model to stable environment IDs. */
function migrate016(candidate: Partial<LzModel>): LzModel | null {
  if (!candidate.foundation || !candidate.network || !Array.isArray(candidate.environments)
    || !Array.isArray(candidate.projects) || !Array.isArray(candidate.platforms)
    || !Array.isArray(candidate.sharedPlatforms)) return null;

  const normalizedNames = candidate.environments.map((env) => env.name.trim().toLowerCase());
  if (normalizedNames.some((name) => !name) || new Set(normalizedNames).size !== normalizedNames.length) return null;

  const envIds = new Set<string>();
  const environments = candidate.environments.map((env) => ({ ...env, id: uniqueId('environment', envIds) }));
  const idByName = new Map(environments.map((env) => [env.name.trim(), env.id]));
  const resolvePlacement = (placement: 'all' | string[]): 'all' | string[] => placement === 'all'
    ? 'all'
    : placement.map((name) => idByName.get(name)).filter((id): id is string => !!id);

  const projectIds = new Set<string>();
  const projects = candidate.projects.map((project) => ({
    ...project,
    id: uniqueId('project', projectIds),
    environments: resolvePlacement(project.environments),
  }));
  const platforms = candidate.platforms.map((platform) => ({
    ...platform,
    environments: resolvePlacement(platform.environments),
    overrides: platform.overrides
      ? Object.fromEntries(Object.entries(platform.overrides).flatMap(([name, value]) => {
          const id = idByName.get(name);
          return id ? [[id, value]] : [];
        }))
      : undefined,
  }));
  return { ...candidate, version: LZ_MODEL_VERSION, environments, projects, platforms } as LzModel;
}

export function normalizeModel(stored: unknown): LzModel {
  if (!stored || typeof stored !== 'object') return emptyLzModel();
  const candidate = stored as Partial<LzModel>;
  if (candidate.version === '0.16.0') return migrate016(candidate) ?? emptyLzModel();
  if (
    candidate.version !== LZ_MODEL_VERSION
    || !candidate.foundation
    || (candidate.foundation.cisLevel !== 1 && candidate.foundation.cisLevel !== 2)
    || !candidate.network
    || !Array.isArray(candidate.environments)
    || !Array.isArray(candidate.projects)
    || !Array.isArray(candidate.platforms)
    || !Array.isArray(candidate.sharedPlatforms)
    || candidate.environments.some((env) => !env.id)
    || candidate.projects.some((project) => !project.id)
  ) return emptyLzModel();
  return candidate as LzModel;
}
