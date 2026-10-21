import type { EnvNetworkConfig, HubKind, LzModel, OkePlatformParams, OcvsPlatformParams, NetworkConfig, OneOeNotifications, Subnet } from '../model/types';
import { hubKindDefaults } from './hubKinds';
import { firstFreeBlock, overlaps, parseCidr, shiftCidr } from './cidr';
import { configuredVcnCidrs, exadataEntries } from './exadata';
import { platformEnvInstances } from './platforms';
import { getRegionsForRealm } from './regions';
import { ADDITIONAL_ENVIRONMENT_CIDR, oneOeEnvironmentCidrs } from './oneOeCidrs';

export interface DrDesignDraft {
  region: string;
  regionConfirmed?: boolean;
  hubKind: HubKind;
  projectNetworkIds: string[];
  platformIds: string[];
  hubNetwork?: Pick<NetworkConfig, 'hubVcnCidr' | 'subnets'>;
  hubAdded?: boolean;
  projectNetworks?: Record<string, EnvNetworkConfig>;
  environmentSecurityZones?: Record<string, boolean>;
  projectNames?: Record<string, Record<string, string>>;
  environmentNames?: Record<string, string>;
  environmentAdded?: Record<string, boolean>;
  rpcEnabled?: boolean;
  notifications?: OneOeNotifications;
  platformVcnCidrs?: Record<string, string>;
  platformOkeParams?: Record<string, OkePlatformParams>;
  platformOcvsParams?: Record<string, OcvsPlatformParams>;
  platformSubnets?: Record<string, Subnet[]>;
  platformNotificationEmails?: Record<string, Record<string, string>>;
}

export function defaultDrPlatformCidrs(model: LzModel, draft?: DrDesignDraft): Record<string, string> {
  const exadata = exadataEntries(model);
  const result: Record<string, string> = Object.fromEntries(model.environments.flatMap((env) => {
    if (!exadata.environments[env.id]?.exacs?.network) return [];
    const name = env.name.trim().toLowerCase();
    const cidr = ['prod', 'pro', 'production'].includes(name) ? '10.0.240.0/21' : ['preprod', 'preproduction'].includes(name) ? '10.0.248.0/21' : null;
    return cidr ? [[`extension:environment:${env.id}:exacs`, cidr]] : [];
  }));
  const occupied = [...configuredVcnCidrs(model), ...Object.values(result), ...Object.values(draft?.platformVcnCidrs ?? {}),
    draft?.hubNetwork?.hubVcnCidr ?? '10.0.192.0/21', '10.0.200.0/21',
    ...Object.values(draft?.projectNetworks ?? {}).map((network) => network.vcnCidr)];
  const allocate = (id: string, preferred?: string, prefix = 22) => {
    const cidr = draft?.platformVcnCidrs?.[id]
      ?? (preferred && !occupied.some((used) => overlaps(preferred, used)) ? preferred : firstFreeBlock(ADDITIONAL_ENVIRONMENT_CIDR, occupied, prefix) ?? '');
    result[id] = cidr;
    if (cidr) occupied.push(cidr);
  };
  for (const platform of model.platforms.filter((platform) => platform.type === 'ocvs')) {
    for (const env of platformEnvInstances(platform, model.environments)) {
      allocate(`platform:${platform.id}:${env.id}`, ['prod', 'pro', 'production'].includes(env.name.trim().toLowerCase()) ? oneOeEnvironmentCidrs('dr')!.ocvs : ['preprod', 'preproduction'].includes(env.name.trim().toLowerCase()) ? '10.0.248.0/21' : undefined);
    }
  }
  for (const platform of model.platforms.filter((platform) => platform.type === 'oke_simple')) {
    for (const env of platformEnvInstances(platform, model.environments)) {
      const name = env.name.trim().toLowerCase();
      allocate(`platform:${platform.id}:${env.id}`, ['prod', 'pro', 'production'].includes(name) ? oneOeEnvironmentCidrs('dr')!.oke : ['preprod', 'preproduction'].includes(name) ? '10.0.248.0/21' : undefined, 21);
    }
  }
  for (const platform of model.sharedPlatforms.filter((platform) => platform.type === 'ocvs')) allocate(`shared:${platform.id}`);
  return result;
}

export function createDrHubNetwork(kind: HubKind, previous?: DrDesignDraft['hubNetwork']): NonNullable<DrDesignDraft['hubNetwork']> {
  const defaults = hubKindDefaults(kind);
  const hubVcnCidr = previous?.hubVcnCidr ?? '10.0.192.0/21';
  const delta = (parseCidr(hubVcnCidr)?.start ?? parseCidr('10.0.192.0/21')!.start) - parseCidr(defaults.hubVcnCidr)!.start;
  return {
    hubVcnCidr,
    subnets: defaults.subnets.map((subnet) => ({ name: subnet.name, cidr: previous?.subnets.find((item) => item.name === subnet.name)?.cidr ?? shiftCidr(subnet.cidr, delta) ?? '' })),
  };
}

export interface DrNetworkOption {
  id: string;
  name: string;
  scope: string;
  type: string;
  vcnCidr?: string;
  note?: string;
  available: boolean;
  inheritedInfrastructure?: boolean;
  environmentId?: string;
}

/** Inventory the source scopes without creating or allocating DR networks. */
export function drNetworkOptions(model: LzModel): { projects: DrNetworkOption[]; platforms: DrNetworkOption[] } {
  const projects = model.environments.filter((env) => env.network.vcnCidr.trim()).map((env) => ({
    id: `projects:${env.id}`, name: 'Projects VCN', scope: env.name, type: 'One-OE',
    vcnCidr: env.network.vcnCidr, available: true,
  }));
  const platforms: DrNetworkOption[] = model.sharedPlatforms.map((platform) => ({
    id: `shared:${platform.id}`, name: platform.key || 'Unnamed platform', scope: 'Shared',
    type: platform.type === 'ocvs' ? 'OCVS' : 'Custom', vcnCidr: platform.vcnCidr,
    available: Boolean(platform.key.trim() && platform.vcnCidr.trim()),
  }));
  for (const platform of model.platforms) {
    for (const env of platformEnvInstances(platform, model.environments)) platforms.push({
      id: `platform:${platform.id}:${env.id}`, name: platform.key || 'Unnamed platform', scope: env.name,
      type: platform.type === 'oke_simple' ? 'OKE' : platform.type === 'ocvs' ? 'OCVS' : 'Custom',
      environmentId: env.id,
      vcnCidr: env.vcnCidr, available: Boolean(platform.key.trim() && env.vcnCidr.trim()),
    });
  }
  const exadata = exadataEntries(model);
  const addExadata = (entries: typeof exadata.shared, scope: string, id: string, environmentId?: string) => {
    for (const [key, entry] of Object.entries(entries)) platforms.push({
      id: `extension:${id}:${key}`, name: key.toUpperCase(), scope, type: key.toUpperCase(),
      ...(entry.network ? { vcnCidr: entry.network.vcn } : {}),
      note: entry.publication_components?.database === false ? 'Infrastructure only · No OCI VCN'
        : !entry.network ? 'No OCI VCN' : undefined,
      available: !entry.network || Boolean(entry.network.vcn.trim()),
      inheritedInfrastructure: id === 'shared' && entry.publication_components?.database === false,
      environmentId,
    });
  };
  addExadata(exadata.shared, 'Shared', 'shared');
  for (const env of model.environments) addExadata(exadata.environments[env.id] ?? {}, env.name, `environment:${env.id}`, env.id);
  platforms.sort((a, b) => Number(b.scope === 'Shared') - Number(a.scope === 'Shared'));
  return { projects, platforms };
}

export function drRegionOptions(model: LzModel) {
  return getRegionsForRealm(model.foundation.realm).filter((region) => region.id !== model.foundation.region);
}

export function createDrDraft(model: LzModel): DrDesignDraft {
  const prod = model.environments.find((env) => /^(prod|pro|production)$/i.test(env.name.trim()) && env.network.vcnCidr.trim());
  const id = prod ? `projects:${prod.id}` : null;
  const sourceRange = prod && parseCidr(prod.network.vcnCidr);
  const vcnCidr = '10.0.200.0/21';
  const delta = sourceRange ? parseCidr(vcnCidr)!.start - sourceRange.start : 0;
  return {
    region: '', hubKind: model.network.hubKind, projectNetworkIds: id ? [id] : [], platformIds: [], rpcEnabled: false,
    notifications: { default: '', cloudguard: '', iam: '', network: '', security: '', ...model.foundation.notifications },
    platformVcnCidrs: defaultDrPlatformCidrs(model),
    projectNetworks: prod && id ? { [id]: { vcnCidr, subnets: prod.network.subnets.map((subnet) => ({ ...subnet, cidr: sourceRange ? shiftCidr(subnet.cidr, delta) ?? '' : '' })) } } : {},
  };
}
