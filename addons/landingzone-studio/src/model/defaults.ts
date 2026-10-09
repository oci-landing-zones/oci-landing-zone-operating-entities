import type { EnvNetworkConfig, ExadataDesign, LzModel, ProjectConfig } from './types';
import { getDefaultRegionForRealm } from '../services/regions';
import { hubKindDefaults } from '../services/hubKinds';
import { additionalEnvironmentCidr, oneOeEnvironmentCidrs, SHARED_EXACS_CIDR } from '../services/oneOeCidrs';
import { formatIp, parseCidr } from '../services/cidr';

export const LZ_MODEL_VERSION = '0.20.0';

export function defaultExadata(): ExadataDesign {
  return {
    exacc: { enabled: false, shared: true, database: 'shared', service: 'none', environments: [], projectDb: {}, notifications: { default: '', projectEmails: {} } },
    exacs: {
      enabled: false, infrastructure: 'shared', database: 'shared', service: 'none',
      environments: [], sharedVcnCidr: SHARED_EXACS_CIDR, environmentVcnCidrs: {},
      projectDb: {}, notifications: { default: '', projectEmails: {} },
    },
  };
}

export function defaultProjects(): ProjectConfig[] {
  return [{ id: 'project-1', name: 'proj1', environments: 'all' }];
}

export const ENV_SUBNET_ROLES = ['web', 'app', 'db', 'infra'] as const;

export function envNetworkDefaults(index: number, name = ['prod', 'preprod'][index] ?? '', occupied: string[] = []): EnvNetworkConfig {
  const vcnCidr = oneOeEnvironmentCidrs(name)?.projects ?? additionalEnvironmentCidr(occupied);
  const start = parseCidr(vcnCidr)?.start;
  return {
    vcnCidr,
    subnets: start === undefined ? [] : ENV_SUBNET_ROLES.map((role, subnetIndex) => ({
      name: role,
      cidr: `${formatIp(start + subnetIndex * 256)}/24`,
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
      notifications: { useSingleRecipient: false, default: '', cloudguard: '', iam: '', network: '', security: '' },
    },
    environments: [
      { id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) },
      { id: 'environment-2', name: 'preprod', securityZone: false, network: envNetworkDefaults(1) },
    ],
    network: { hubKind: 'hub_a', ...hubKindDefaults('hub_a') },
    projects: defaultProjects(),
    platforms: [],
    sharedPlatforms: [],
    exadata: defaultExadata(),
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
  return { ...candidate, version: LZ_MODEL_VERSION, environments, projects, platforms, exadata: defaultExadata() } as LzModel;
}

export function normalizeModel(stored: unknown): LzModel {
  if (!stored || typeof stored !== 'object') return emptyLzModel();
  const candidate = stored as Partial<LzModel>;
  if (candidate.version === '0.16.0') return migrate016(candidate) ?? emptyLzModel();
  if (candidate.version === '0.18.0' && candidate.foundation && candidate.network
    && Array.isArray(candidate.environments) && Array.isArray(candidate.projects)
    && Array.isArray(candidate.platforms) && Array.isArray(candidate.sharedPlatforms)) {
    return { ...candidate, version: LZ_MODEL_VERSION, exadata: defaultExadata() } as LzModel;
  }
  if (candidate.version === '0.19.0' && candidate.foundation && candidate.network
    && Array.isArray(candidate.environments) && Array.isArray(candidate.projects)
    && Array.isArray(candidate.platforms) && Array.isArray(candidate.sharedPlatforms)
    && candidate.exadata?.exacc && candidate.exadata?.exacs) {
    const exacs = candidate.exadata.exacs;
    const environmentVcnCidrs = { ...exacs.environmentVcnCidrs };
    // Pin previously implicit ExaCS networks so new defaults do not move saved designs.
    if (exacs.database === 'per_environment' || exacs.infrastructure === 'per_environment') {
      for (const id of exacs.environments) {
        const index = candidate.environments.findIndex((env) => env.id === id);
        if (index >= 0 && environmentVcnCidrs[id] === undefined) {
          environmentVcnCidrs[id] = `${formatIp(parseCidr('10.172.8.0/21')!.start + index * 2048)}/21`;
        }
      }
    }
    return normalizeModel({ ...candidate, version: LZ_MODEL_VERSION,
      exadata: { ...candidate.exadata, exacs: { ...exacs, environmentVcnCidrs } } });
  }
  if (
    candidate.version !== LZ_MODEL_VERSION
    || !candidate.foundation
    || (candidate.foundation.cisLevel !== 1 && candidate.foundation.cisLevel !== 2)
    || !candidate.network
    || !Array.isArray(candidate.environments)
    || !Array.isArray(candidate.projects)
    || !Array.isArray(candidate.platforms)
    || !Array.isArray(candidate.sharedPlatforms)
    || !candidate.exadata?.exacc || !candidate.exadata?.exacs
    || candidate.environments.some((env) => !env.id)
    || candidate.projects.some((project) => !project.id)
  ) return emptyLzModel();
  return candidate as LzModel;
}
