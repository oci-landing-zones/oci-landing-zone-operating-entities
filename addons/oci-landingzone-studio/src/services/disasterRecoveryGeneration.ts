import { drOkeErrors, drOkePlatform } from './disasterRecoveryOke';
import type { LzModel } from '../model/types';
import { buildConfig, okeExtension, type EnvConfigEntry, type LzConfig, type PlatformConfigEntry } from './lzConfig';
import { defaultDrPlatformCidrs, drRegionOptions, type DrDesignDraft } from './disasterRecoveryDesign';
import { normalizeCidr, overlaps, validateSubnetCidr, validateVcnCidr } from './cidr';
import { notificationEmailError, validateNotificationEmails } from './notificationEmails';
import { drPlatformNotificationScopes } from './disasterRecoveryNotifications';

type EnvironmentConfig = Omit<EnvConfigEntry, 'project_network'> & { project_network?: EnvConfigEntry['project_network'] };
interface RpcConfig { remote_cidrs: string[]; peer_region_name: string; peer_id?: string }
export interface RegionalFileConfig extends Omit<LzConfig, 'environments'> {
  stack_scope: 'complete' | 'regional';
  dr_region?: string;
  environments: Record<string, EnvironmentConfig>;
  remote_peering_connections?: Record<string, RpcConfig>;
}

function recipients(value: string): string[] {
  return value.split(/[,;\n]/).map((email) => email.trim()).filter(Boolean);
}

function vcnRanges(config: RegionalFileConfig): string[] {
  return [config.hub.network.vcn, ...Object.values(config.environments).flatMap((env) => [
    ...(env.project_network ? [env.project_network.network.vcn] : []),
    ...Object.values(env.platforms).flatMap((platform) => platform.network ? [platform.network.vcn] : []),
  ]), ...Object.values(config.shared_platforms).flatMap((platform) => platform.network ? [platform.network.vcn] : [])];
}

function validateNetworks(config: RegionalFileConfig, homeRanges: string[] = []) {
  const networks = [config.hub.network, ...Object.values(config.environments).flatMap((env) => [
    ...(env.project_network ? [env.project_network.network] : []),
    ...Object.values(env.platforms).flatMap((platform) => platform.network ? [platform.network] : []),
  ]), ...Object.values(config.shared_platforms).flatMap((platform) => platform.network ? [platform.network] : [])];
  for (const [index, network] of networks.entries()) {
    const error = validateVcnCidr(network.vcn);
    if (error) throw new Error(`${config.region}: ${error}`);
    if (normalizeCidr(network.vcn) !== network.vcn) throw new Error(`Use the canonical VCN CIDR ${normalizeCidr(network.vcn)} instead of ${network.vcn}.`);
    if ([...homeRanges, ...networks.slice(0, index).map((item) => item.vcn)].some((cidr) => overlaps(network.vcn, cidr))) {
      throw new Error(`${config.region}: VCN ${network.vcn} overlaps another Home or DR VCN. Edit its CIDR before generating.`);
    }
    const subnets = Object.entries(network.subnets ?? {}).map(([name, cidr]) => ({ name, cidr }));
    for (const [index, subnet] of subnets.entries()) {
      const error = validateSubnetCidr(subnet.cidr, network.vcn, subnets.filter((_, other) => other !== index));
      if (error) throw new Error(`${config.region} · ${subnet.name}: ${error}`);
    }
  }
}

/** Build independent generator inputs; tenancy-level prerequisites remain Home-owned. */
export function buildDrFileConfigs(model: LzModel, draft: DrDesignDraft): { home: RegionalFileConfig; dr: RegionalFileConfig } {
  const region = drRegionOptions(model).find((item) => item.id === draft.region);
  if (!region || !draft.regionConfirmed) throw new Error('Select and confirm a different DR region before generating.');
  if (!draft.hubNetwork) throw new Error('Configure the DR hub VCN and subnets before generating.');
  const emails = [...validateNotificationEmails(model.foundation.notifications), ...validateNotificationEmails(draft.notifications ?? model.foundation.notifications)];
  if (emails.length) throw new Error(emails.join('\n'));
  const home: RegionalFileConfig = { ...structuredClone(buildConfig(model)), stack_scope: 'complete', dr_region: region.id };
  const dr: RegionalFileConfig = {
    ...structuredClone(buildConfig({ ...model, foundation: { ...model.foundation, notifications: draft.notifications ?? model.foundation.notifications } })),
    stack_scope: 'regional', region: region.id, region_short_name: region.shortName,
    hub: { kind: draft.hubKind, network: { vcn: draft.hubNetwork.hubVcnCidr.trim(), subnets: Object.fromEntries(draft.hubNetwork.subnets.map((subnet) => [subnet.name, subnet.cidr.trim()])) } },
    environments: {}, shared_platforms: {}, security_targets: [],
  };
  const cidrs = { ...defaultDrPlatformCidrs(model, draft), ...draft.platformVcnCidrs };
  const selected = new Set(draft.platformIds);
  const notificationScopes = new Map(drPlatformNotificationScopes(model, draft).map((scope) => [scope.id, scope]));
  const envNames = new Map(model.environments.map((env) => [env.name.trim(), draft.environmentNames?.[env.id]?.trim() || env.name.trim()]));

  function platformEntry(source: PlatformConfigEntry, id: string): PlatformConfigEntry {
    const entry = structuredClone(source);
    if (entry.network) {
      if (!cidrs[id]?.trim()) throw new Error(`Set a DR VCN CIDR for ${id} before generating.`);
      entry.network.vcn = cidrs[id].trim();
      if (draft.platformSubnets?.[id]) entry.network.subnets = Object.fromEntries(draft.platformSubnets[id].map((subnet) => [subnet.name, subnet.cidr.trim()]));
      else if (entry.extension?.type === 'exacs') delete entry.network.subnets;
    }
    if (entry.extension?.type === 'oke_simple') {
      const platform = drOkePlatform(model, draft, id);
      if (!platform) throw new Error(`OKE source platform not found: ${id}`);
      const errors = drOkeErrors(model, draft, id, platform);
      if (errors.length) throw new Error(`${id}: ${errors.join(' ')}`);
      entry.network = { vcn: platform.vcnCidr, ...(platform.okeParams?.clusterSize ? {} : { subnets: Object.fromEntries(platform.subnets.map((subnet) => [subnet.name, subnet.cidr])) }) };
      entry.extension = okeExtension(platform.okeParams!);
    }
    const params = entry.extension?.params;
    if (params) {
      // Environment topic maps in extension parameters use names, not Studio IDs.
      const emails = params.notification_emails as Record<string, unknown> | undefined;
      if (emails) {
        for (const key of ['environment_infra', 'environment_db', 'projects_by_environment']) {
          const map = emails[key] as Record<string, unknown> | undefined;
          if (map) emails[key] = Object.fromEntries(Object.entries(map).map(([name, value]) => [envNames.get(name) ?? name, value]));
        }
        for (const field of notificationScopes.get(id)?.fields ?? []) {
          const error = notificationEmailError(field.value);
          if (error) throw new Error(`${notificationScopes.get(id)!.title}: ${error}`);
          if (['environment_infra', 'environment_db', 'projects_by_environment'].includes(field.key)) {
            const env = model.environments.find((env) => id.startsWith(`extension:environment:${env.id}:`));
            if (env) emails[field.key] = { [envNames.get(env.name.trim())!]: recipients(field.value) };
          } else emails[field.key] = recipients(field.value);
        }
      }
    }
    return entry;
  }

  for (const env of model.environments) {
    const name = envNames.get(env.name.trim())!;
    const source = home.environments[env.name.trim()];
    const platforms = Object.fromEntries(Object.entries(source.platforms).flatMap(([key, entry]) => {
      const generic = model.platforms.find((platform) => platform.key.trim() === key);
      const id = generic ? `platform:${generic.id}:${env.id}` : `extension:environment:${env.id}:${key}`;
      return selected.has(id) ? [[key, platformEntry(entry, id)]] : [];
    }));
    const projectSelected = draft.projectNetworkIds.includes(`projects:${env.id}`);
    if (!projectSelected && !Object.keys(platforms).length) continue;
    if (dr.environments[name]) throw new Error(`DR environment name ${name} is duplicated.`);
    const projects = Object.fromEntries(Object.keys(source.projects).map((projectName) => {
      const project = model.projects.find((project) => project.name.trim() === projectName);
      return [project && draft.projectNames?.[env.id]?.[project.id]?.trim() || projectName, {}];
    }));
    const prerequisites = home.environments[name];
    if (!prerequisites || Object.keys(projects).some((project) => !Object.hasOwn(prerequisites.projects, project)) || Object.keys(platforms).some((platform) => !Object.hasOwn(prerequisites.platforms, platform))) {
      throw new Error(`DR environment ${name} needs matching Home-owned compartments and platform IAM. Add the renamed environment/projects to Home before generating this regional stack.`);
    }
    const network = draft.projectNetworks?.[`projects:${env.id}`];
    if (projectSelected && !network) throw new Error(`Configure the DR Projects VCN for ${name}.`);
    dr.environments[name] = {
      ...(projectSelected ? { project_network: { network: { vcn: network!.vcnCidr.trim(), subnets: Object.fromEntries(network!.subnets.map((subnet) => [subnet.name, subnet.cidr.trim()])) } } } : {}),
      projects, platforms,
    };
    if (draft.environmentSecurityZones?.[env.id] ?? env.securityZone) dr.security_targets.push(name);
  }
  for (const [key, entry] of Object.entries(home.shared_platforms)) {
    const generic = model.sharedPlatforms.find((platform) => platform.key.trim() === key);
    const id = generic ? `shared:${generic.id}` : `extension:shared:${key}`;
    if (selected.has(id)) dr.shared_platforms[key] = platformEntry(entry, id);
  }
  validateNetworks(home);
  validateNetworks(dr, vcnRanges(home));
  if (draft.rpcEnabled) {
    home.remote_peering_connections = { dr: { remote_cidrs: vcnRanges(dr), peer_region_name: dr.region } };
    dr.remote_peering_connections = { home: { remote_cidrs: vcnRanges(home), peer_region_name: home.region } };
  }
  return { home, dr };
}

function findRpcKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  return Object.entries(object).flatMap(([key, child]) => key === 'remote_peering_connections' && child && typeof child === 'object' ? Object.keys(child) : findRpcKeys(child));
}

export async function generateDrFileBundle(model: LzModel, draft: DrDesignDraft, onProgress?: (message: string) => void): Promise<Record<string, string>> {
  const { home, dr } = buildDrFileConfigs(model, draft);
  const { generateFromConfigCode } = await import('../generator/generate');
  const serialize = (config: RegionalFileConfig) => `${JSON.stringify(config, null, 2)}\n`;
  onProgress?.('Generating Stack 1 · Home…');
  const homeConfig = serialize(home);
  const homeFiles = await generateFromConfigCode(homeConfig);
  if (dr.remote_peering_connections) {
    const keys = findRpcKeys(JSON.parse(homeFiles['network.json']));
    if (keys.length !== 1) throw new Error('Could not identify the generated Home RPC dependency key.');
    dr.remote_peering_connections.home.peer_id = keys[0];
  }
  onProgress?.('Generating Stack 2 · DR…');
  const drConfig = serialize(dr);
  const drFiles = await generateFromConfigCode(drConfig);
  return {
    ...Object.fromEntries(Object.entries({ 'config.jsonnet': homeConfig, ...homeFiles }).map(([name, body]) => [`Home/${name}`, body])),
    ...Object.fromEntries(Object.entries({ 'config.jsonnet': drConfig, ...drFiles }).map(([name, body]) => [`DR/${name}`, body])),
    'README.txt': `Stack 1 · Home (${home.region})\nDeploy/update Home first, using its complete generated file set.\nSave compartments_output.json${draft.rpcEnabled ? ' and network_output.json (including the RPC acceptor)' : ''} from that execution. These runtime outputs are not configuration files and are not included in this ZIP.\n\nStack 2 · DR (${dr.region})\nUse a separate regional stack/state. Copy the Home dependency outputs to the DR dependency bucket and configure the Orchestrator to read them before deploying DR.\n${draft.rpcEnabled ? 'The DR RPC requester references the Home acceptor key in that network dependency. Both canonical network.json files include RPC resources and routes.\n' : ''}\nDeploy the selected CIS security and observability _pre prerequisites before their final counterparts and dependent workloads. Review the generated file sets before deployment. Use a customer-controlled private source with Orchestrator v2.2.0, rms-facade.\n`,
  };
}
