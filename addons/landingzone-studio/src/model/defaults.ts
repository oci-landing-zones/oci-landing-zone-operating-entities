import type { Environment, EnvNetworkConfig, LzModel, PlatformConfig, ProjectConfig, SharedPlatformConfig, VcnRouting } from './types';
import { getDefaultRegionForRealm } from '../services/regions';
import { hubKindDefaults } from '../services/hubKinds';
import { SHARED_PLATFORM_VCN, sharedPlatformDefaultSubnets } from '../services/platforms';

export const LZ_MODEL_VERSION = '0.14.0';

/** The default project every new Landing Zone starts with — applied to all environments. */
export function defaultProjects(): ProjectConfig[] {
  return [{ name: 'project-1', environments: 'all' }];
}

/**
 * The shared platform every Landing Zone always has (empty compartment + VCN, step 4).
 * `core` rather than `shared`: the generator packs the name into a 15-char OCI DNS
 * label, and `shared` overflows it by one character.
 */
export function defaultSharedPlatform(): SharedPlatformConfig {
  return { name: 'core', vcnCidr: SHARED_PLATFORM_VCN, subnets: sharedPlatformDefaultSubnets() };
}

/** The fixed default subnet roles every environment starts with. */
export const ENV_SUBNET_ROLES = ['web', 'app', 'db', 'infra'] as const;

/** Default DRG name shown in the network compartment. */
export const DEFAULT_DRG_NAME = 'DRG';

/** Default routing names for the hub VCN (attachment + all three gateways). */
export function hubRoutingDefaults(): VcnRouting {
  return { attachmentName: 'vcn-hub-attach', igwName: 'Internet Gateway', natName: 'NAT Gateway', sgwName: 'Service Gateway' };
}

/** Default routing names for an environment spoke VCN (attachment + Service Gateway). */
export function envRoutingDefaults(): VcnRouting {
  return { attachmentName: 'vcn-<env>-attach', sgwName: 'Service Gateway' };
}

/**
 * Default spoke network for the environment at `index`: VCN 10.0.<8·(i+1)>.0/21
 * with the first four /24s as web/app/db/infra subnets. Names are templates —
 * <region> / <env> resolve live from the wizard fields.
 */
export function envNetworkDefaults(index: number): EnvNetworkConfig {
  const cidrBase = 8 * (index + 1); // prod 10.0.8.0/21, preprod 10.0.16.0/21, ...
  return {
    vcnCidr: `10.0.${cidrBase}.0/21`,
    subnets: ENV_SUBNET_ROLES.map((role, j) => ({
      name: `sn-<region>-<env>-${role}`,
      cidr: `10.0.${cidrBase + j}.0/24`,
    })),
    routing: envRoutingDefaults(),
  };
}

/** Initial empty canonical model — what a brand-new Landing Zone starts as. */
export function emptyLzModel(): LzModel {
  const def = getDefaultRegionForRealm('oc1');
  return {
    version: LZ_MODEL_VERSION,
    foundation: {
      realm: 'oc1',
      region: def?.id ?? 'eu-frankfurt-1',
      regionShortName: def?.shortName ?? 'fra',
    },
    environments: [
      { name: 'prod', securityZone: true, network: envNetworkDefaults(0) },
      { name: 'preprod', securityZone: false, network: envNetworkDefaults(1) },
      { name: 'dev', securityZone: false, network: envNetworkDefaults(2) },
    ],
    network: {
      hubKind: 'hub_a',
      ...hubKindDefaults('hub_a'),
      fwDmzIp: '',
      fwIntIp: '',
      drgName: DEFAULT_DRG_NAME,
      routing: hubRoutingDefaults(),
    },
    projects: defaultProjects(),
    platforms: [],
    sharedPlatform: defaultSharedPlatform(),
    presentation: {
      customer: '',
      landingZone: 'landingzone',
    },
  };
}

/**
 * Subnet name sets shipped as defaults by older model versions. A stored set
 * that still matches one of these untouched is upgraded to the current
 * hub-kind defaults; anything the user customized is kept as-is.
 */
const LEGACY_DEFAULT_SUBNET_SETS: string[][] = [
  ['fw-dmz', 'web', 'fw-int', 'mgmt'], // <= 0.4.0 hub_a defaults
];

function isLegacyDefaultSubnetSet(subnets: { name: string }[]): boolean {
  return LEGACY_DEFAULT_SUBNET_SETS.some(
    (set) => set.length === subnets.length && set.every((name, i) => subnets[i]?.name === name),
  );
}

/**
 * 0.5.0–0.7.0 shipped the hub on 10.100.0.0/21. A stored hub network that
 * still matches that untouched default (names AND CIDRs) is upgraded to the
 * current 10.0.0.0/21 defaults; any customisation keeps the stored values.
 */
function isOld10100HubDefaults(net: { hubVcnCidr?: string; subnets?: { name: string; cidr: string }[] }): boolean {
  if (net.hubVcnCidr !== '10.100.0.0/21' || !Array.isArray(net.subnets)) return false;
  const oldDefaults = hubKindDefaults('hub_a').subnets.map((sn, i) => ({ name: sn.name, cidr: `10.100.${i}.0/24` }));
  return oldDefaults.length === net.subnets.length
    && oldDefaults.every((d, i) => net.subnets![i]?.name === d.name && net.subnets![i]?.cidr === d.cidr);
}

/**
 * Coerce a stored (possibly older-shape or partial) model into a complete,
 * current LzModel — fills missing sections from defaults so the wizard never
 * reads undefined off a legacy record.
 */
export function normalizeModel(stored: unknown): LzModel {
  const base = emptyLzModel();
  const m = (stored ?? {}) as Partial<LzModel>;

  const hubKind = m.network?.hubKind ?? base.network.hubKind;
  const kindDefaults = hubKindDefaults(hubKind);
  const storedSubnets = Array.isArray(m.network?.subnets) ? m.network.subnets : undefined;

  const presentation = { ...base.presentation, ...(m.presentation ?? {}) };
  if (presentation.landingZone === 'cmp-landingzone') presentation.landingZone = 'landingzone'; // <= 0.5.0 default

  // <= 0.6.0 environments had no stored network — seed each with its defaults.
  // <= 0.8.0 stored networks had no routing block — fill it from defaults.
  const environments: Environment[] = (Array.isArray(m.environments) ? m.environments : base.environments)
    .map((env, i) => {
      const net = env.network ?? envNetworkDefaults(i);
      return {
        name: env.name ?? '',
        securityZone: env.securityZone ?? false,
        network: { ...net, routing: { ...envRoutingDefaults(), ...(net.routing ?? {}) } },
      };
    });

  // <= 0.10.0 had no projects — seed the default; a stored (even empty) list wins,
  // so clearing every project sticks.
  const projects: ProjectConfig[] = (Array.isArray(m.projects) ? m.projects : base.projects).map((p) => ({
    name: p.name ?? 'project',
    environments: p.environments === 'all' || Array.isArray(p.environments) ? p.environments : 'all',
  }));

  // <= 0.11.0 had no platforms / shared platform — seed an empty platform list and
  // the default shared platform; stored (even empty) lists win.
  const platforms: PlatformConfig[] = (Array.isArray(m.platforms) ? m.platforms : base.platforms).map((p) => {
    const id = p.id ?? p.name ?? 'platform';
    return {
      id,
      name: p.name ?? p.id ?? 'platform',
      type: p.type ?? 'custom',
      environments: p.environments === 'all' || Array.isArray(p.environments) ? p.environments : 'all',
      // <= 0.12.0 platforms had no VCN / attachment name — derive from the id.
      vcnName: p.vcnName ?? `vcn-${id}`,
      attachmentName: p.attachmentName ?? `vcn-${id}-<env>-attach`,
      vcnCidr: p.vcnCidr ?? '',
      subnets: Array.isArray(p.subnets) ? p.subnets : [],
      ...(p.okeParams ? { okeParams: p.okeParams } : {}),
      ...(p.overrides ? { overrides: p.overrides } : {}),
    };
  });
  const sharedPlatform: SharedPlatformConfig = {
    name: m.sharedPlatform?.name?.trim() || base.sharedPlatform.name,
    vcnCidr: m.sharedPlatform?.vcnCidr ?? base.sharedPlatform.vcnCidr,
    subnets: Array.isArray(m.sharedPlatform?.subnets) && m.sharedPlatform.subnets.length > 0
      ? m.sharedPlatform.subnets
      : base.sharedPlatform.subnets,
  };

  return {
    version: LZ_MODEL_VERSION,
    foundation: { ...base.foundation, ...(m.foundation ?? {}) },
    environments,
    projects,
    platforms,
    sharedPlatform,
    network: {
      hubKind,
      hubVcnName: m.network?.hubVcnName ?? kindDefaults.hubVcnName,
      ...(isOld10100HubDefaults(m.network ?? {})
        ? { hubVcnCidr: kindDefaults.hubVcnCidr, subnets: kindDefaults.subnets }
        : {
            hubVcnCidr: m.network?.hubVcnCidr ?? kindDefaults.hubVcnCidr,
            subnets: storedSubnets && !isLegacyDefaultSubnetSet(storedSubnets) ? storedSubnets : kindDefaults.subnets,
          }),
      // <= 0.9.0 had no firewall IPs — empty means "derive from the subnet range".
      fwDmzIp: m.network?.fwDmzIp ?? '',
      fwIntIp: m.network?.fwIntIp ?? '',
      // <= 0.8.0 had no DRG / routing block — fill it from defaults.
      drgName: m.network?.drgName ?? DEFAULT_DRG_NAME,
      routing: { ...hubRoutingDefaults(), ...(m.network?.routing ?? {}) },
    },
    presentation,
  };
}
