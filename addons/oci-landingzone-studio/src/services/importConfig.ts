/** Reconstruct only configurations that Studio can edit without losing values. */
import { emptyLzModel } from '../model/defaults';
import type { ExadataNotifications, HubKind, LzModel, OcvsPlatformParams, OkePlatformParams, PlatformConfig, Subnet } from '../model/types';
import { buildConfig } from './lzConfig';
import { ocvsDefaultSubnets } from './platforms';
import { exadataNotificationSource } from './exadata';

type ObjectValue = Record<string, unknown>;
export interface ImportedConfig { model: LzModel; warnings: string[] }

function invalid(path: string): never {
  throw new Error(`Cannot import ${path}: invalid or unsupported configuration. Use a config.jsonnet exported by Studio.`);
}
function object(value: unknown, path: string): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path);
  return value as ObjectValue;
}
function text(value: unknown, path: string): string {
  if (typeof value !== 'string') invalid(path);
  return value;
}
function strings(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) invalid(path);
  return value;
}
function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') invalid(path);
  return value;
}
function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(path);
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  if (!choices.includes(value as T)) invalid(path);
  return value as T;
}
function subnets(value: unknown, path: string): Subnet[] {
  return Object.entries(object(value, path)).map(([name, cidr]) => ({ name, cidr: text(cidr, `${path}.${name}`) }));
}
function network(value: unknown, path: string) {
  const net = object(value, path);
  return { vcnCidr: text(net.vcn, `${path}.vcn`), subnets: net.subnets === undefined ? [] : subnets(net.subnets, `${path}.subnets`) };
}

function isExadata(entry: ObjectValue, key: string): boolean {
  const extension = entry.extension;
  return (key === 'exacc' || key === 'exacs') && extension !== null && typeof extension === 'object'
    && !Array.isArray(extension) && (extension as ObjectValue).type === key;
}

function okeParams(params: ObjectValue, path: string): OkePlatformParams {
  return {
    kubernetesVersion: text(params.kubernetes_version, `${path}.kubernetes_version`),
    servicesCidr: text(params.services_cidr, `${path}.services_cidr`),
    apiAllowedCidrs: strings(params.api_endpoint_allowed_cidrs, `${path}.api_endpoint_allowed_cidrs`),
    workerImage: text(params.worker_image, `${path}.worker_image`),
    workerBootVolumeSize: number(params.worker_boot_volume_size, `${path}.worker_boot_volume_size`),
    cniType: choice(params.cni_type, ['native', 'overlay'], `${path}.cni_type`),
    createFss: bool(params.create_fss, `${path}.create_fss`),
    publicLoadBalancer: bool(params.public_load_balancer, `${path}.public_load_balancer`),
    ...(params.cluster_size === undefined ? {} : { clusterSize: choice(params.cluster_size, ['small', 'medium', 'large'] as const, `${path}.cluster_size`) }),
    ...(params.pods_cidr === undefined ? {} : { podsCidr: text(params.pods_cidr, `${path}.pods_cidr`) }),
  };
}
function ocvsParams(params: ObjectValue, path: string): OcvsPlatformParams {
  const cluster = object(params.cluster, `${path}.cluster`);
  return {
    sshAuthorizedKeys: text(params.ssh_authorized_keys, `${path}.ssh_authorized_keys`),
    sddcDisplayName: text(cluster.sddc_display_name, `${path}.cluster.sddc_display_name`),
    clusterDisplayName: text(cluster.cluster_display_name, `${path}.cluster.cluster_display_name`),
    vmwareSoftwareVersion: text(cluster.vmware_software_version, `${path}.cluster.vmware_software_version`),
    computeAvailabilityDomain: text(cluster.compute_availability_domain, `${path}.cluster.compute_availability_domain`),
    esxiHostsCount: number(cluster.esxi_hosts_count, `${path}.cluster.esxi_hosts_count`),
    vsphereType: text(cluster.vsphere_type, `${path}.cluster.vsphere_type`),
    initialHostOcpuCount: number(cluster.initial_host_ocpu_count, `${path}.cluster.initial_host_ocpu_count`),
    initialHostShapeName: text(cluster.initial_host_shape_name, `${path}.cluster.initial_host_shape_name`),
    workloadNetworkCidr: text(cluster.workload_network_cidr, `${path}.cluster.workload_network_cidr`),
  };
}
function platform(value: ObjectValue, key: string, path: string, id: string): Omit<PlatformConfig, 'environments'> {
  const ext = value.extension === undefined ? undefined : object(value.extension, `${path}.extension`);
  const type = ext ? choice(ext.type, ['oke_simple', 'ocvs'] as const, `${path}.extension.type`) : 'custom';
  const net = network(value.network, `${path}.network`);
  const params = ext ? object(ext.params, `${path}.extension.params`) : {};
  return {
    id, key, type, ...net,
    ...(type === 'oke_simple' ? { okeParams: okeParams(params, `${path}.extension.params`), subnets: net.subnets.map((sn) => ({ ...sn, locked: ['int-lb', 'control-plane', 'workers', 'pods', 'fss'].includes(sn.name) })) } : {}),
    ...(type === 'ocvs' ? { ocvsParams: ocvsParams(params, `${path}.extension.params`), subnets: ocvsDefaultSubnets(net.vcnCidr) } : {}),
  };
}

/** Return the first unrepresentable path; keys and set-like selectors may reorder. */
function difference(left: unknown, right: unknown, path = 'config'): string | undefined {
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return path;
    const setLike = path === 'config.security_targets' || path.includes('.project_db_compartments');
    const a = setLike ? [...left].sort() : left;
    const b = setLike ? [...right].sort() : right;
    for (let i = 0; i < a.length; i += 1) {
      const diff = difference(a[i], b[i], `${path}[${i}]`);
      if (diff) return diff;
    }
    return undefined;
  }
  if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const a = left as ObjectValue;
    const b = right as ObjectValue;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!Object.hasOwn(a, key) || !Object.hasOwn(b, key)) return `${path}.${key}`;
      const diff = difference(a[key], b[key], `${path}.${key}`);
      if (diff) return diff;
    }
    return undefined;
  }
  return left === right ? undefined : path;
}

function restoreExadata(model: LzModel, type: 'exacc' | 'exacs', shared: ObjectValue, envs: ObjectValue, warnings: string[]) {
  const candidate = shared[type] === undefined ? undefined : object(shared[type], `shared_platforms.${type}`);
  const sharedEntry = candidate && isExadata(candidate, type) ? candidate : undefined;
  const entries = model.environments.flatMap((env) => {
    const platforms = object(object(envs[env.name], `environments.${env.name}`).platforms, `environments.${env.name}.platforms`);
    if (platforms[type] === undefined) return [];
    const entry = object(platforms[type], `environments.${env.name}.platforms.${type}`);
    return isExadata(entry, type) ? [{ env, entry }] : [];
  });
  if (!sharedEntry && !entries.length) return;
  const design = model.exadata[type];
  design.enabled = true;
  const components = sharedEntry?.publication_components === undefined ? undefined : object(sharedEntry.publication_components, `shared_platforms.${type}.publication_components`);
  const sharedDatabase = !!sharedEntry && components?.database !== false;
  design.database = sharedDatabase ? 'shared' : 'per_environment';
  if (type === 'exacc') model.exadata.exacc.shared = !!sharedEntry;
  else {
    model.exadata.exacs.infrastructure = sharedEntry ? 'shared' : 'per_environment';
    if (sharedDatabase) model.exadata.exacs.sharedVcnCidr = network(sharedEntry!.network, `shared_platforms.${type}.network`).vcnCidr;
  }
  design.environments = entries.map(({ env }) => env.id);
  if (type === 'exacs') for (const { env, entry } of entries) {
    model.exadata.exacs.environmentVcnCidrs[env.id] = network(entry.network, `environments.${env.name}.platforms.${type}.network`).vcnCidr;
  }
  const paramsOf = (entry: ObjectValue, path: string) => {
    const ext = object(entry.extension, `${path}.extension`);
    if (ext.type !== type) invalid(`${path}.extension.type`);
    return object(ext.params, `${path}.extension.params`);
  };
  const params = sharedEntry ? paramsOf(sharedEntry, `shared_platforms.${type}`) : paramsOf(entries[0].entry, `environments.${entries[0].env.name}.platforms.${type}`);
  const emails = object(params.notification_emails, `${type}.notification_emails`);
  const recipients = (value: unknown, path: string) => strings(value, path).join(', ');
  const mappedEmails = (value: unknown, path: string) => Object.fromEntries(Object.entries(object(value, path)).map(([name, values]) => {
    const env = model.environments.find((item) => item.name === name);
    if (!env) invalid(`${path}.${name}`);
    return [env.id, recipients(values, `${path}.${name}`)];
  }));
  const notifications: ExadataNotifications = {
    useSingleRecipient: Object.keys(emails).every((key) => key === 'default' || key === 'split_environment_topics'),
    default: recipients(emails.default, `${type}.notification_emails.default`),
    ...(emails.db_workloads === undefined ? {} : { dbWorkloads: recipients(emails.db_workloads, `${type}.notification_emails.db_workloads`) }),
    ...(emails.infra_workloads === undefined ? {} : { infraWorkloads: recipients(emails.infra_workloads, `${type}.notification_emails.infra_workloads`) }),
    ...(emails.projects === undefined ? {} : { projects: recipients(emails.projects, `${type}.notification_emails.projects`) }),
    ...(emails.projects_by_environment === undefined ? {} : { projectEmails: mappedEmails(emails.projects_by_environment, `${type}.notification_emails.projects_by_environment`) }),
    ...(emails.environment_infra === undefined ? {} : { environmentInfraEmails: mappedEmails(emails.environment_infra, `${type}.notification_emails.environment_infra`) }),
    ...(emails.environment_db === undefined ? {} : { environmentDbEmails: mappedEmails(emails.environment_db, `${type}.notification_emails.environment_db`) }),
  };
  // Split-topic mode can emit only a fallback default when no recipients were entered.
  if (!notifications.useSingleRecipient) {
    notifications.default = '';
    notifications.fallbackDefault = { recipients: strings(emails.default, `${type}.notification_emails.default`), source: exadataNotificationSource(notifications) };
  }
  design.notifications = notifications;
  const tiers = (envId: string, names: unknown, path: string) => {
    design.projectDb[envId] = strings(names, path).map((name) => {
      const project = model.projects.find((p) => p.name === name && (p.environments === 'all' || p.environments.includes(envId)));
      if (!project) invalid(`${path}.${name}`);
      return project.id;
    });
  };
  if (sharedDatabase && params.project_db_compartments !== undefined) {
    for (const [name, names] of Object.entries(object(params.project_db_compartments, `${type}.project_db_compartments`))) {
      const env = model.environments.find((item) => item.name === name);
      if (!env) invalid(`${type}.project_db_compartments.${name}`);
      tiers(env.id, names, `${type}.project_db_compartments.${name}`);
    }
  }
  for (const { env, entry } of entries) {
    const envParams = paramsOf(entry, `environments.${env.name}.platforms.${type}`);
    if (envParams.project_db_compartments !== undefined) tiers(env.id, envParams.project_db_compartments, `${type}.project_db_compartments.${env.name}`);
  }
  // Service toggles are absent from exported configs. Preserve known Autonomous
  // tiers, and require a choice when neither database service can be inferred.
  design.service = Object.values(design.projectDb).some((ids) => ids.length) ? 'autonomous' : 'none';
  warnings.push(`${type.toUpperCase()}: config.jsonnet does not record the VMC/AVMC service selection. Review the database services in Platforms before generating a new package${design.service === 'autonomous' ? '; AVMC is selected because Autonomous project tiers are present' : ''}.`);
}

export function importConfig(value: unknown): ImportedConfig {
  const config = object(value, 'config');
  const model = emptyLzModel();
  const cisLevel = number(config.cis_level, 'cis_level');
  if (cisLevel !== 1 && cisLevel !== 2) invalid('cis_level');
  model.foundation = {
    realm: text(config.realm, 'realm'), region: text(config.region, 'region'),
    regionShortName: text(config.region_short_name, 'region_short_name'), cisLevel,
  };
  if (config.notification_emails !== undefined) {
    const emails = object(config.notification_emails, 'notification_emails');
    const recipients = (topic: string) => emails[topic] === undefined ? '' : strings(emails[topic], `notification_emails.${topic}`).join(', ');
    model.foundation.notifications = {
      useSingleRecipient: Object.hasOwn(emails, 'default'), default: recipients('default'),
      cloudguard: recipients('cloudguard'), iam: recipients('iam'), network: recipients('network'), security: recipients('security'),
    };
  }
  const hub = object(config.hub, 'hub');
  const hubKind = choice<HubKind>(hub.kind, ['hub_a', 'hub_b', 'hub_c', 'hub_e'], 'hub.kind');
  const hubNetwork = network(hub.network, 'hub.network');
  model.network = { hubKind, hubVcnCidr: hubNetwork.vcnCidr, subnets: hubNetwork.subnets };
  const envs = object(config.environments, 'environments');
  const securityTargets = strings(config.security_targets, 'security_targets');
  model.environments = Object.entries(envs).map(([name, value], index) => {
    const env = object(value, `environments.${name}`);
    const projectNetwork = object(env.project_network, `environments.${name}.project_network`);
    return { id: `environment-${index + 1}`, name, securityZone: securityTargets.includes(name), network: network(projectNetwork.network, `environments.${name}.project_network.network`) };
  });
  model.projects = [];
  model.platforms = [];
  model.sharedPlatforms = [];
  for (const env of model.environments) {
    const entry = object(envs[env.name], `environments.${env.name}`);
    for (const name of Object.keys(object(entry.projects, `environments.${env.name}.projects`))) {
      let project = model.projects.find((p) => p.name === name);
      if (!project) {
        project = { id: `project-${model.projects.length + 1}`, name, environments: [] };
        model.projects.push(project);
      }
      (project.environments as string[]).push(env.id);
    }
    for (const [key, value] of Object.entries(object(entry.platforms, `environments.${env.name}.platforms`))) {
      const path = `environments.${env.name}.platforms.${key}`;
      const data = object(value, path);
      if (isExadata(data, key)) continue;
      const restored = platform(data, key, path, `platform-${model.platforms.length + 1}`);
      const existing = model.platforms.find((p) => p.key === key && p.type === restored.type
        && !difference(p.okeParams, restored.okeParams) && !difference(p.ocvsParams, restored.ocvsParams));
      if (existing) {
        (existing.environments as string[]).push(env.id);
        existing.overrides![env.id] = { vcnCidr: restored.vcnCidr, subnets: restored.subnets };
      } else model.platforms.push({ ...restored, environments: [env.id], overrides: { [env.id]: { vcnCidr: restored.vcnCidr, subnets: restored.subnets } } });
    }
  }
  const shared = object(config.shared_platforms ?? {}, 'shared_platforms');
  for (const [key, value] of Object.entries(shared)) {
    const path = `shared_platforms.${key}`;
    const data = object(value, path);
    if (isExadata(data, key)) continue;
    const restored = platform(data, key, path, `shared-${model.sharedPlatforms.length + 1}`);
    if (restored.type === 'oke_simple') invalid(`${path}.extension.type`);
    model.sharedPlatforms.push({ ...restored, type: restored.type });
  }
  const warnings: string[] = [];
  restoreExadata(model, 'exacc', shared, envs, warnings);
  restoreExadata(model, 'exacs', shared, envs, warnings);
  const expected = { ...config, shared_platforms: config.shared_platforms ?? {} };
  const diff = difference(expected, buildConfig(model));
  if (diff) invalid(diff);
  return { model, warnings };
}
