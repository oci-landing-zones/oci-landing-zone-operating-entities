import type { ExadataNotifications, LzModel, PlatformConfig, SharedPlatformConfig, Subnet } from '../model/types';
import { formatIp, overlaps, parseCidr } from './cidr';
import { platformEnvInstances } from './platforms';
import { additionalEnvironmentCidr, oneOeEnvironmentCidrs } from './oneOeCidrs';

export interface ExadataPlatformEntry {
  network?: { vcn: string };
  publication_components?: { infrastructure: boolean; database: boolean };
  extension: { type: 'exacc' | 'exacs'; params: Record<string, unknown> };
}

const INFRA_ONLY = { infrastructure: true, database: false };
const DB_ONLY = { infrastructure: false, database: true };
const INFRA_AND_DB = { infrastructure: true, database: true };

function recipients(input: string | undefined): string[] {
  return (input ?? '').split(/[\n,;]/).map((value) => value.trim()).filter(Boolean);
}

type ExadataTopic = 'dbWorkloads' | 'infraWorkloads' | 'projects';

function notificationEmails(input: ExadataNotifications, allowed: ExadataTopic[], projectEnvironments: Array<{ id: string; name: string }>,
  environmentEnvironments: Array<{ id: string; name: string }> = []): Record<string, unknown> {
  const split = environmentEnvironments.length > 0;
  if (input.useSingleRecipient ?? Boolean(input.default)) return {
    default: recipients(input.default), ...(split ? { split_environment_topics: true } : {}),
  };
  const emailMap = (environments: Array<{ id: string; name: string }>, values?: Record<string, string>) =>
    Object.fromEntries(environments.map((env) => [env.name.trim(), recipients(values?.[env.id])])
      .filter(([, emails]) => (emails as string[]).length > 0));
  const projectEmails = emailMap(projectEnvironments, input.projectEmails);
  const infraEmails = emailMap(environmentEnvironments, input.environmentInfraEmails);
  const dbEmails = emailMap(environmentEnvironments, input.environmentDbEmails);
  const firstProjectEmail = Object.values(projectEmails)[0] as string[] | undefined;
  const firstInfraEmail = Object.values(infraEmails)[0] as string[] | undefined;
  const firstDbEmail = Object.values(dbEmails)[0] as string[] | undefined;
  const result: Record<string, unknown> = {
    default: allowed.map((field) => recipients(input[field])).find((values) => values.length > 0)
      ?? firstInfraEmail ?? firstDbEmail ?? firstProjectEmail ?? [],
  };
  for (const [field, key] of [
    ['dbWorkloads', 'db_workloads'], ['infraWorkloads', 'infra_workloads'], ['projects', 'projects'],
  ] as const) {
    if (!allowed.includes(field) || (field === 'projects' && Object.keys(projectEmails).length)) continue;
    const values = recipients(input[field]);
    if (values.length) result[key] = values;
  }
  if (Object.keys(projectEmails).length) result.projects_by_environment = projectEmails;
  if (split) {
    result.split_environment_topics = true;
    if (Object.keys(infraEmails).length) result.environment_infra = infraEmails;
    if (Object.keys(dbEmails).length) result.environment_db = dbEmails;
  }
  return result;
}

export function exadataProjectTopicEnvironments(model: LzModel, type: 'exacc' | 'exacs', useCase: 1 | 2 | 3, autonomous: boolean) {
  const design = model.exadata[type];
  return model.environments.filter((env) => autonomous && (useCase === 1 || design.environments.includes(env.id))
    && selectedProjectNames(model, env.id, type).length > 0);
}

export function defaultExacsEnvCidr(index: number, name = ['prod', 'preprod'][index] ?? '', occupied: string[] = []): string {
  return oneOeEnvironmentCidrs(name)?.exacs ?? additionalEnvironmentCidr(occupied);
}

function selectedProjectNames(model: LzModel, envId: string, type: 'exacc' | 'exacs'): string[] {
  const ids = new Set(model.exadata[type].projectDb[envId] ?? []);
  return model.projects.filter((project) => ids.has(project.id)).map((project) => project.name.trim());
}

/** Turn the guided Exadata choices into the generator's platform placement contract. */
export function exadataEntries(model: LzModel): {
  shared: Record<string, ExadataPlatformEntry>;
  environments: Record<string, Record<string, ExadataPlatformEntry>>;
} {
  const shared: Record<string, ExadataPlatformEntry> = {};
  const environments: Record<string, Record<string, ExadataPlatformEntry>> = {};
  const addEnv = (id: string, key: string, entry: ExadataPlatformEntry) => {
    environments[id] ??= {};
    environments[id][key] = entry;
  };
  const exacc = model.exadata.exacc;
  if (exacc.enabled) {
    const database = exacc.database ?? (!exacc.shared || exacc.environments.length ? 'per_environment' : 'shared');
    const useCase = exacc.shared ? (database === 'shared' ? 1 : 2) : 3;
    const autonomous = exacc.service
      ? exacc.service === 'autonomous' || exacc.service === 'both'
      : exacc.autonomous ?? Object.values(exacc.projectDb).some((ids) => ids.length > 0);
    const projectEnvs = exadataProjectTopicEnvironments(model, 'exacc', useCase, autonomous);
    const emails = notificationEmails(exacc.notifications, [
      ...(useCase === 1 ? ['dbWorkloads' as const] : []),
      ...(useCase !== 3 ? ['infraWorkloads' as const] : []),
      ...(projectEnvs.length ? ['projects' as const] : []),
    ], projectEnvs, useCase === 1 ? [] : model.environments.filter((env) => exacc.environments.includes(env.id)));
    if (useCase !== 3) {
      const projectDb: Record<string, string[]> = {};
      if (useCase === 1 && autonomous) for (const env of model.environments) {
        const selected = selectedProjectNames(model, env.id, 'exacc');
        if (selected.length) projectDb[env.name.trim()] = selected;
      }
      shared.exacc = { ...(useCase === 2 ? { publication_components: INFRA_ONLY } : {}), extension: { type: 'exacc', params: {
        notification_emails: emails,
        ...(Object.keys(projectDb).length ? { project_db_compartments: projectDb } : {}),
      } } };
    }
    for (const envId of useCase === 1 ? [] : exacc.environments) {
      const selected = autonomous ? selectedProjectNames(model, envId, 'exacc') : [];
      addEnv(envId, 'exacc', {
        publication_components: useCase === 2 ? DB_ONLY : INFRA_AND_DB,
        extension: { type: 'exacc', params: {
          notification_emails: emails,
          ...(selected.length ? { project_db_compartments: selected } : {}),
        } },
      });
    }
  }
  const exacs = model.exadata.exacs;
  if (exacs.enabled) {
    const useCase = exacs.infrastructure === 'per_environment' ? 3 : exacs.database === 'per_environment' ? 2 : 1;
    const autonomous = exacs.service === 'autonomous' || exacs.service === 'both';
    const projectEnvs = exadataProjectTopicEnvironments(model, 'exacs', useCase, autonomous);
    const emails = notificationEmails(exacs.notifications, [
      ...(useCase === 1 ? ['dbWorkloads' as const] : []),
      ...(useCase !== 3 ? ['infraWorkloads' as const] : []),
      ...(projectEnvs.length ? ['projects' as const] : []),
    ], projectEnvs, useCase === 1 ? [] : model.environments.filter((env) => exacs.environments.includes(env.id)));
    if (useCase !== 3) {
      const sharedDatabase = useCase === 1;
      const projectDb: Record<string, string[]> = {};
      if (sharedDatabase && (exacs.service === 'autonomous' || exacs.service === 'both')) {
        for (const env of model.environments) {
          const selected = selectedProjectNames(model, env.id, 'exacs');
          if (selected.length) projectDb[env.name.trim()] = selected;
        }
      }
      shared.exacs = {
        publication_components: sharedDatabase ? INFRA_AND_DB : INFRA_ONLY,
        ...(sharedDatabase ? { network: { vcn: exacs.sharedVcnCidr.trim() } } : {}),
        extension: { type: 'exacs', params: {
          notification_emails: emails,
          ...(Object.keys(projectDb).length ? { project_db_compartments: projectDb } : {}),
        } },
      };
    }
    if (useCase !== 1) {
      const occupied = [
        model.network.hubVcnCidr, ...model.environments.map((env) => env.network.vcnCidr),
        ...model.sharedPlatforms.map((platform) => platform.vcnCidr),
        ...model.platforms.flatMap((platform) => platformEnvInstances(platform, model.environments).map((instance) => instance.vcnCidr)),
        ...Object.values(exacs.environmentVcnCidrs),
      ];
      for (const envId of exacs.environments) {
        const index = model.environments.findIndex((env) => env.id === envId);
        const vcn = (exacs.environmentVcnCidrs[envId]
          ?? defaultExacsEnvCidr(index, model.environments[index]?.name ?? '', occupied)).trim();
        if (vcn) occupied.push(vcn);
        const selected = exacs.service === 'autonomous' || exacs.service === 'both'
          ? selectedProjectNames(model, envId, 'exacs') : [];
        addEnv(envId, 'exacs', {
          publication_components: useCase === 2 ? DB_ONLY : INFRA_AND_DB,
          network: { vcn },
          extension: { type: 'exacs', params: {
            notification_emails: emails,
            ...(selected.length ? { project_db_compartments: selected } : {}),
          } },
        });
      }
    }
  }
  return { shared, environments };
}

/** All configured VCNs, including derived Exadata networks, for free-block suggestions. */
export function configuredVcnCidrs(model: LzModel): string[] {
  const entries = exadataEntries(model);
  return [
    model.network.hubVcnCidr,
    ...model.environments.map((env) => env.network.vcnCidr),
    ...model.sharedPlatforms.map((platform) => platform.vcnCidr),
    ...model.platforms.flatMap((platform) => platformEnvInstances(platform, model.environments).map((instance) => instance.vcnCidr)),
    ...Object.values(entries.shared).flatMap((entry) => entry.network ? [entry.network.vcn] : []),
    ...Object.values(entries.environments).flatMap((platforms) => Object.values(platforms).flatMap((entry) => entry.network ? [entry.network.vcn] : [])),
  ];
}

/** The generator auto-allocates ExaCS's db and backup /24s in this order. */
export function exacsPreviewSubnets(vcn: string): Subnet[] {
  const block = parseCidr(vcn);
  if (!block || block.prefix > 23) return [];
  return [
    { name: 'db', cidr: `${formatIp(block.start)}/24`, locked: true },
    { name: 'backup', cidr: `${formatIp((block.start + 256) >>> 0)}/24`, locked: true },
  ];
}

export function exadataDiagramPlatforms(model: LzModel): {
  platforms: PlatformConfig[];
  sharedPlatforms: SharedPlatformConfig[];
  sharedWithoutNetwork: string[];
  environmentsWithoutNetwork: Record<string, string[]>;
  sharedChildren: Record<string, Array<'db' | 'infra'>>;
  environmentChildren: Record<string, Record<string, Array<'db' | 'infra'>>>;
  projectChildren: Record<string, Record<string, Array<'exacc' | 'exacs'>>>;
} {
  const entries = exadataEntries(model);
  const platforms: PlatformConfig[] = [];
  const sharedPlatforms: SharedPlatformConfig[] = [];
  const sharedWithoutNetwork: string[] = [];
  const environmentsWithoutNetwork: Record<string, string[]> = {};
  const sharedChildren: Record<string, Array<'db' | 'infra'>> = {};
  const environmentChildren: Record<string, Record<string, Array<'db' | 'infra'>>> = {};
  const projectChildren: Record<string, Record<string, Array<'exacc' | 'exacs'>>> = {};
  const childrenOf = (entry: ExadataPlatformEntry): Array<'db' | 'infra'> => [
    ...(entry.publication_components?.database !== false ? ['db' as const] : []),
    ...(entry.publication_components?.infrastructure !== false ? ['infra' as const] : []),
  ];
  for (const [key, entry] of Object.entries(entries.shared)) {
    sharedChildren[key] = childrenOf(entry);
    if (entry.network) {
      sharedPlatforms.push({ id: `exadata-shared-${key}`, key, type: 'custom', vcnCidr: entry.network.vcn, subnets: exacsPreviewSubnets(entry.network.vcn) });
    } else sharedWithoutNetwork.push(key);
  }
  for (const env of model.environments) {
    for (const [key, entry] of Object.entries(entries.environments[env.id] ?? {})) {
      environmentChildren[env.id] ??= {};
      environmentChildren[env.id][key] = childrenOf(entry);
      if (entry.network) {
        const subnets = exacsPreviewSubnets(entry.network.vcn);
        platforms.push({
          id: `exadata-${env.id}-${key}`, key, type: 'custom', environments: [env.id],
          vcnCidr: entry.network.vcn, subnets,
          overrides: { [env.id]: { vcnCidr: entry.network.vcn, subnets } },
        });
      } else {
        environmentsWithoutNetwork[env.id] ??= [];
        environmentsWithoutNetwork[env.id].push(key);
      }
    }
  }
  for (const env of model.environments) {
    for (const type of ['exacc', 'exacs'] as const) {
      const sharedSelection = (entries.shared[type]?.extension.params.project_db_compartments as Record<string, string[]> | undefined)?.[env.name.trim()] ?? [];
      const envSelection = (entries.environments[env.id]?.[type]?.extension.params.project_db_compartments as string[] | undefined) ?? [];
      const selected = new Set([...sharedSelection, ...envSelection]);
      for (const project of model.projects) {
        if (!selected.has(project.name.trim())) continue;
        projectChildren[env.id] ??= {};
        projectChildren[env.id][project.id] ??= [];
        projectChildren[env.id][project.id].push(type);
      }
    }
  }
  return { platforms, sharedPlatforms, sharedWithoutNetwork, environmentsWithoutNetwork, sharedChildren, environmentChildren, projectChildren };
}

/** Check placement, references, recipients and CIDR safety before generation. */
export function validateExadataModel(model: LzModel): string[] {
  const errors: string[] = [];
  const { exacc, exacs } = model.exadata;
  const environmentIds = new Set(model.environments.map((env) => env.id));
  const projectById = new Map(model.projects.map((project) => [project.id, project]));
  const checkCommon = (type: 'exacc' | 'exacs') => {
    const design = model.exadata[type];
    if (!design.enabled) return;
    const useCase = type === 'exacc'
      ? (exacc.shared ? ((exacc.database ?? (!exacc.environments.length ? 'shared' : 'per_environment')) === 'shared' ? 1 : 2) : 3)
      : (exacs.infrastructure === 'per_environment' ? 3 : exacs.database === 'per_environment' ? 2 : 1);
    const autonomous = type === 'exacc'
      ? (exacc.service ? exacc.service === 'autonomous' || exacc.service === 'both' : exacc.autonomous ?? Object.values(exacc.projectDb).some((ids) => ids.length > 0))
      : exacs.service === 'autonomous' || exacs.service === 'both';
    const topicFields = [
      ...(useCase === 1 ? ['dbWorkloads' as const] : []),
      ...(useCase !== 3 ? ['infraWorkloads' as const] : []),
      ...(exadataProjectTopicEnvironments(model, type, useCase, autonomous).length ? ['projects' as const] : []),
    ];
    const projectTopicEnvironments = exadataProjectTopicEnvironments(model, type, useCase, autonomous);
    const environmentTopicEnvironments = useCase === 1 ? [] : model.environments.filter((env) => design.environments.includes(env.id));
    if (design.notifications.useSingleRecipient ?? Boolean(design.notifications.default)) {
      if (!recipients(design.notifications.default).length) errors.push(`${type.toUpperCase()} needs a default notification recipient.`);
    } else {
      for (const env of environmentTopicEnvironments) {
        if (!recipients(design.notifications.environmentInfraEmails?.[env.id]).length)
          errors.push(`${type.toUpperCase()} needs ${env.name} infrastructure notification recipients.`);
        if (!recipients(design.notifications.environmentDbEmails?.[env.id]).length)
          errors.push(`${type.toUpperCase()} needs ${env.name} DBA notification recipients.`);
      }
      for (const [field, label] of [
        ['dbWorkloads', 'shared database workload'],
        ['infraWorkloads', 'shared infrastructure'],
        ['projects', 'environment and project'],
      ] as const) {
        if (field === 'projects' && projectTopicEnvironments.length && design.notifications.projectEmails) {
          for (const env of projectTopicEnvironments) {
            if (!recipients(design.notifications.projectEmails[env.id]).length) {
              errors.push(`${type.toUpperCase()} needs ${env.name} project-topic notification recipients.`);
            }
          }
        } else if (topicFields.includes(field) && !(field === 'projects' && !projectTopicEnvironments.length)
          && !recipients(design.notifications[field]).length) {
          errors.push(`${type.toUpperCase()} needs ${label} notification recipients.`);
        }
      }
    }
    for (const [envId, projectIds] of Object.entries(design.projectDb)) {
      if (!environmentIds.has(envId)) errors.push(`${type.toUpperCase()} references a removed environment.`);
      for (const projectId of projectIds) {
        const project = projectById.get(projectId);
        if (!project || (project.environments !== 'all' && !project.environments.includes(envId))) {
          errors.push(`${type.toUpperCase()} references a project missing from its environment.`);
        }
      }
    }
    if (design.environments.some((id) => !environmentIds.has(id))) errors.push(`${type.toUpperCase()} placement references a removed environment.`);
  };
  checkCommon('exacc');
  checkCommon('exacs');
  const exaccDatabase = exacc.database ?? (!exacc.shared || exacc.environments.length ? 'per_environment' : 'shared');
  const exaccCase = exacc.shared ? (exaccDatabase === 'shared' ? 1 : 2) : 3;
  const exaccAutonomous = exacc.service
    ? exacc.service === 'autonomous' || exacc.service === 'both'
    : exacc.autonomous ?? Object.values(exacc.projectDb).some((ids) => ids.length > 0);
  const exacsCase = exacs.infrastructure === 'per_environment' ? 3 : exacs.database === 'per_environment' ? 2 : 1;
  if (exacc.enabled && exacc.service === 'none') errors.push('EXACC needs at least one database service (VMC or AVMC).');
  if (exacs.enabled && exacs.service === 'none') errors.push('EXACS needs at least one database service (VMC or AVMC).');
  if (exacc.enabled && exaccCase !== 1 && !exacc.environments.length) errors.push('EXACC needs at least one environment for dedicated placement.');
  if (exacc.enabled && !exacc.shared && exaccDatabase === 'shared') errors.push('EXACC shared VMC/AVMC placement requires shared infrastructure.');
  if (exacc.enabled && exaccAutonomous && exaccCase !== 1 && Object.keys(exacc.projectDb).some((id) => !exacc.environments.includes(id)
    && exacc.projectDb[id].length > 0)) {
    errors.push('EXACC project DB tiers require an environment-specific EXACC platform.');
  }
  if (exacs.enabled) {
    if (exacsCase !== 1 && !exacs.environments.length) errors.push('EXACS needs at least one environment for AVMC/VMC placement.');
    if (exacs.service !== 'autonomous' && exacs.service !== 'both' && Object.values(exacs.projectDb).some((ids) => ids.length)) errors.push('Autonomous project DB tiers require AVMC selection.');
    if (exacsCase !== 1 && Object.keys(exacs.projectDb).some((id) => !exacs.environments.includes(id) && exacs.projectDb[id].length > 0)) {
      errors.push('EXACS project DB tiers require AVMC/VMC placement in the same environment.');
    }
  }
  const entries = exadataEntries(model);
  for (const key of Object.keys(entries.shared)) {
    if (model.sharedPlatforms.some((platform) => platform.key.trim().toLowerCase() === key)) errors.push(`Shared platform key ${key} is already used.`);
  }
  for (const env of model.environments) {
    for (const key of Object.keys(entries.environments[env.id] ?? {})) {
      if (model.platforms.some((platform) => platform.key.trim().toLowerCase() === key
        && (platform.environments === 'all' || platform.environments.includes(env.id)))) {
        errors.push(`${env.name} platform key ${key} is already used.`);
      }
    }
  }
  const ranges = [
    { name: 'hub', cidr: model.network.hubVcnCidr },
    ...model.environments.map((env) => ({ name: `${env.name} project`, cidr: env.network.vcnCidr })),
    ...model.sharedPlatforms.map((platform) => ({ name: `shared ${platform.key}`, cidr: platform.vcnCidr })),
    ...model.platforms.flatMap((platform) => platformEnvInstances(platform, model.environments).map((instance) => ({ name: `${instance.name} ${platform.key}`, cidr: instance.vcnCidr }))),
  ];
  for (const [key, entry] of Object.entries(entries.shared)) if (entry.network) ranges.push({ name: `shared ${key}`, cidr: entry.network.vcn });
  for (const env of model.environments) {
    for (const [key, entry] of Object.entries(entries.environments[env.id] ?? {})) {
      if (entry.network) ranges.push({ name: `${env.name} ${key}`, cidr: entry.network.vcn });
    }
  }
  for (let i = 0; i < ranges.length; i += 1) {
    const range = ranges[i];
    if (range.name.endsWith('exacs')) {
      const parsed = parseCidr(range.cidr);
      if (!parsed || parsed.prefix > 23) errors.push(`${range.name} needs a valid VCN CIDR large enough for db and backup /24 subnets.`);
    }
    for (let j = i + 1; j < ranges.length; j += 1) {
      if (overlaps(range.cidr, ranges[j].cidr)) errors.push(`${range.name} (${range.cidr}) overlaps ${ranges[j].name} (${ranges[j].cidr}).`);
    }
  }
  return [...new Set(errors)];
}
