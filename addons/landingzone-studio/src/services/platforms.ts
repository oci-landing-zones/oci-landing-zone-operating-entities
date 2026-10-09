/**
 * platforms — the platform-type catalog and the pure helpers that derive a
 * platform's per-environment network (step 4).
 *
 * A platform is a VCN-bearing compartment dropped into one or more environments.
 * Its stored `vcnCidr`/`subnets` describe the FIRST environment; every other
 * environment derives its VCN by shifting the base by the env's index (so a
 * platform deployed to prod/preprod/dev lands in three consecutive blocks),
 * unless a per-env override pins explicit values. The same re-basing keeps the
 * subnets aligned inside each environment's VCN.
 *
 * Everything here is pure — buildGraph, lzConfig and the wizard UI all consume
 * these helpers so the diagram, the JSON, and the form never disagree.
 */

import type { PlatformConfig, PlatformType, OkePlatformParams, OcvsPlatformParams, SharedPlatformConfig, Subnet } from '../model/types';
import { firstFreeBlock, formatIp, parseCidr, shiftCidr, totalIps } from './cidr';
import { environmentPlatformCidr, OPTIONAL_SHARED_CIDR } from './oneOeCidrs';

export interface PlatformTypeMeta {
  type: PlatformType;
  label: string;
  /** MVP can deploy this type; non-deployable types show greyed in the picker. */
  deployable: boolean;
  /** Short hint shown under a disabled (roadmap) type. */
  note?: string;
}

/** The selectable platform engines, in picker order. */
export const PLATFORM_TYPES: PlatformTypeMeta[] = [
  { type: 'oke_simple', label: 'OKE', deployable: true },
  { type: 'ocvs', label: 'OCVS', deployable: true },
  { type: 'custom', label: 'Custom', deployable: true },
];

export function platformTypeMeta(type: PlatformType): PlatformTypeMeta {
  return PLATFORM_TYPES.find((t) => t.type === type) ?? PLATFORM_TYPES[0];
}

/** Base block the first environment platform lives in (clear of the step-2 spokes). */
export const PLATFORM_BASE_VCN = '10.0.80.0/21';
/** Block the shared platform's VCN defaults to. */
export const SHARED_PLATFORM_VCN = '10.0.32.0/21';
export const SHARED_PLATFORM_ALLOCATION = OPTIONAL_SHARED_CIDR;

/**
 * The shared platform's starting subnet. It needs at least one: the generator
 * refuses a platform VCN with an empty subnet map.
 */
export function sharedPlatformDefaultSubnets(): Subnet[] {
  return [{ name: 'core', cidr: '10.0.32.0/24' }];
}

/** A network-only platform must explicitly declare at least one subnet. */
export function customDefaultSubnets(baseVcn: string): Subnet[] {
  const start = parseCidr(baseVcn)?.start;
  return start === undefined ? [] : [{ name: 'core', cidr: `${formatIp(start)}/24` }];
}

/** OKE's four mandatory subnets, placed inside `baseVcn` (locked = undeletable). */
export function okeDefaultSubnets(baseVcn: string): Subnet[] {
  const p = parseCidr(baseVcn);
  const start = p ? p.start : parseCidr(PLATFORM_BASE_VCN)!.start;
  const at = (offset: number, prefix: number, name: string): Subnet => ({
    name,
    cidr: `${formatIp((start + offset) >>> 0)}/${prefix}`,
    locked: true,
  });
  // int-lb /25, control-plane /25 (first /24), workers /23, pods /23.
  return [
    at(0, 25, 'int-lb'),
    at(128, 25, 'control-plane'),
    at(512, 23, 'workers'),
    at(1024, 23, 'pods'),
  ];
}

const OKE_PROFILE_PREFIX = { small: 20, medium: 18, large: 16 } as const;
const OKE_PROFILE_SUBNETS = {
  small: { 'control-plane': 29, 'int-lb': 26, workers: 23, pods: 21, fss: 26 },
  medium: { 'control-plane': 29, 'int-lb': 25, workers: 22, pods: 19, fss: 25 },
  large: { 'control-plane': 29, 'int-lb': 24, workers: 19, pods: 17, fss: 24 },
} as const;

/**
 * Generator-owned OKE profile layout. The order mirrors oke_builder.libsonnet's
 * subnet_order, so the diagram previews the same non-overlapping allocation the
 * Jsonnet auto-subnet helper receives.
 */
export function okeProfileSubnets(
  vcnCidr: string,
  size: NonNullable<OkePlatformParams['clusterSize']>,
  cniType: OkePlatformParams['cniType'],
  createFss: boolean,
): Subnet[] {
  const prefix = OKE_PROFILE_PREFIX[size];
  const parsed = parseCidr(vcnCidr);
  if (!parsed || parsed.prefix !== prefix) return [];
  const profile = OKE_PROFILE_SUBNETS[size];
  const order = [
    ...(cniType === 'native' ? ['pods'] : []),
    'workers', 'int-lb',
    ...(createFss ? ['fss'] : []),
    'control-plane',
  ] as Array<keyof typeof profile>;
  const allocated: Subnet[] = [];
  for (const name of order) {
    const cidr = firstFreeBlock(vcnCidr, allocated.map((sn) => sn.cidr), profile[name]);
    if (!cidr) return [];
    allocated.push({ name, cidr, locked: true });
  }
  return allocated;
}

/** Default OKE settings. */
export function okeDefaultParams(): OkePlatformParams {
  return {
    kubernetesVersion: 'v1.35.2',
    servicesCidr: '10.96.0.0/16',
    apiAllowedCidrs: ['10.0.1.0/24'],
    // Generator contract: this is an image-name selector for the OL9 family,
    // not a display version.
    workerImage: '9\\.[0-9]+',
    workerBootVolumeSize: 60,
    cniType: 'native',
    createFss: false,
    publicLoadBalancer: false,
  };
}

/** OCVS requires a public key; keep it blank until the operator provides one. */
export function ocvsDefaultParams(): OcvsPlatformParams {
  return {
    sshAuthorizedKeys: '', sddcDisplayName: 'ocvs', clusterDisplayName: 'ocvs-cluster',
    vmwareSoftwareVersion: '7.0 update 3', computeAvailabilityDomain: '1', esxiHostsCount: 3,
    vsphereType: 'MANAGEMENT', initialHostOcpuCount: 52, initialHostShapeName: 'BM.DenseIO2.52',
    workloadNetworkCidr: '172.16.0.0/24',
  };
}

/** The extension owns one provisioning subnet: the first block at VCN prefix + 4. */
export function ocvsDefaultSubnets(baseVcn: string): Subnet[] {
  const parsed = parseCidr(baseVcn);
  if (!parsed || ![21, 22, 23, 24].includes(parsed.prefix)) return [];
  const prefix = parsed.prefix;
  const start = parsed.start;
  return [{ name: 'provisioning', cidr: `${formatIp(start)}/${prefix + 4}`, locked: true }];
}

/**
 * Next free compact platform name for a type, counting past existing ones.
 *
 * Environment-platform keys stay at three characters so their derived OCI
 * Network Firewall address-list names remain within the 28-character limit.
 */
function nextPlatformId(type: PlatformType, existing: PlatformConfig[]): string {
  const stem = type === 'oke_simple' ? 'oke' : type === 'ocvs' ? 'ocv' : 'cus';
  if (!existing.some((p) => p.id === stem || p.key === stem)) return stem;
  let n = 2;
  const candidate = () => `${stem.slice(0, Math.max(1, 3 - String(n).length))}${n}`;
  while (existing.some((p) => p.id === candidate() || p.key === candidate())) n += 1;
  return candidate();
}

/**
 * New Custom/OCVS platforms use One-OE reservations pinned to environment IDs.
 * OKE keeps its existing profile and index-based allocation.
 */
export function newPlatform(type: PlatformType, existing: PlatformConfig[],
  environments: Array<{ id: string; name: string }> = [{ id: 'environment-1', name: 'prod' }, { id: 'environment-2', name: 'preprod' }],
  occupiedCidrs: string[] = [],
): PlatformConfig {
  const id = nextPlatformId(type, existing);
  // Give each platform a generous stride so its per-env /21 shifts never overlap
  // another platform's window (16 384 = a /18, i.e. 8 × /21 blocks).
  const baseVcn = shiftCidr(PLATFORM_BASE_VCN, existing.length * 16384) ?? PLATFORM_BASE_VCN;
  const common = { id, key: id, type, environments: 'all' as const, vcnCidr: baseVcn };
  if (type === 'oke_simple') {
    // The canonical extension default is the generator-owned small profile, not
    // a Studio-maintained manual subnet map. Keep `subnets` absent so Jsonnet
    // owns allocation, while `platformSubnetsForEnv` previews it for the diagram.
    const vcnCidr = `${baseVcn.split('/')[0]}/20`;
    return { ...common, vcnCidr, subnets: [], okeParams: { ...okeDefaultParams(), clusterSize: 'small' } };
  }
  const occupied = [...occupiedCidrs, ...existing.flatMap((platform) => platformEnvInstances(platform, environments).map((instance) => instance.vcnCidr))];
  const overrides: NonNullable<PlatformConfig['overrides']> = {};
  for (const env of environments) {
    const vcnCidr = environmentPlatformCidr(type, env.name, occupied);
    overrides[env.id] = { vcnCidr, ...(type === 'custom' ? { subnets: customDefaultSubnets(vcnCidr) } : {}) };
    if (vcnCidr) occupied.push(vcnCidr);
  }
  const vcnCidr = overrides[environments[0]?.id]?.vcnCidr ?? '';
  return type === 'ocvs'
    ? { ...common, vcnCidr, overrides, subnets: [], ocvsParams: ocvsDefaultParams() }
    : { ...common, vcnCidr, overrides, subnets: customDefaultSubnets(vcnCidr) };
}

/** Keep the base editor and pinned One-OE networks aligned; allocate new placements once. */
export function applyPlatformPatch(platform: PlatformConfig, patch: Partial<PlatformConfig>,
  environments: Array<{ id: string; name: string }>, occupied: string[],
): PlatformConfig {
  const next = { ...platform, ...patch };
  if (next.type === 'oke_simple') return next;
  const overrides = { ...next.overrides };
  const firstId = environments[0]?.id;
  if (firstId && overrides[firstId] && (patch.vcnCidr !== undefined || patch.subnets !== undefined)) {
    overrides[firstId] = { ...overrides[firstId],
      ...(patch.vcnCidr !== undefined ? { vcnCidr: patch.vcnCidr } : {}),
      ...(patch.subnets !== undefined ? { subnets: patch.subnets } : {}),
    };
  }
  if (patch.environments !== undefined) {
    const used = [...occupied];
    for (const env of environments) {
      if (!platformInEnv(next, env.id) || overrides[env.id]) continue;
      const vcnCidr = environmentPlatformCidr(next.type, env.name, used);
      overrides[env.id] = { vcnCidr, ...(next.type === 'custom' ? { subnets: customDefaultSubnets(vcnCidr) } : {}) };
      if (vcnCidr) used.push(vcnCidr);
    }
  }
  return { ...next, overrides };
}

/** Reset one network without releasing any other configured VCN from the allocator. */
export function resetPlatformEnvironment(platform: PlatformConfig, id: string,
  environments: Array<{ id: string; name: string }>, occupiedCidrs: string[],
): PlatformConfig {
  const overrides = { ...platform.overrides };
  const index = environments.findIndex((env) => env.id === id);
  if (platform.type === 'oke_simple' || index < 0) {
    delete overrides[id];
    return { ...platform, overrides };
  }
  const occupied = [...occupiedCidrs];
  const current = occupied.indexOf(platformVcnForEnv(platform, id, index));
  if (current >= 0) occupied.splice(current, 1);
  const vcnCidr = environmentPlatformCidr(platform.type, environments[index].name, occupied);
  overrides[id] = { vcnCidr, ...(platform.type === 'custom' ? { subnets: customDefaultSubnets(vcnCidr) } : {}) };
  return { ...platform, overrides };
}

function nextSharedKey(type: SharedPlatformConfig['type'], existing: SharedPlatformConfig[]): string {
  const stem = type === 'ocvs' ? 'ocv' : 'core';
  if (!existing.some((p) => p.key === stem)) return stem;
  let n = 2;
  while (existing.some((p) => p.key === `${stem.slice(0, 3)}${n}`)) n += 1;
  return `${stem.slice(0, 3)}${n}`;
}

/** Create an optional shared platform in the first free generator allocation block. */
export function newSharedPlatform(
  type: NonNullable<SharedPlatformConfig['type']>,
  existing: SharedPlatformConfig[],
  occupiedCidrs: string[] = [],
): SharedPlatformConfig {
  const key = nextSharedKey(type, existing);
  const vcnCidr = firstFreeBlock(
    SHARED_PLATFORM_ALLOCATION,
    [...occupiedCidrs, ...existing.map((platform) => platform.vcnCidr)],
    21,
  ) ?? '';
  const idStem = `shared-${key}`;
  let id = idStem;
  let n = 2;
  while (existing.some((platform) => platform.id === id)) id = `${idStem}-${n++}`;
  return type === 'ocvs'
    ? { id, key, type, vcnCidr, subnets: [], ocvsParams: ocvsDefaultParams() }
    : { id, key, type, vcnCidr, subnets: customDefaultSubnets(vcnCidr) };
}

/** Does a platform apply to the stable environment identity? */
export function platformInEnv(platform: PlatformConfig, envId: string): boolean {
  return platform.environments === 'all'
    || (Array.isArray(platform.environments) && platform.environments.includes(envId));
}

export interface PlatformEnvInstance {
  id: string;
  name: string;
  /** Global index of this environment (drives the VCN shift). */
  index: number;
  vcnCidr: string;
  subnets: Subnet[];
  /** True when a per-env override pinned the VCN/subnets. */
  overridden: boolean;
}

/** The VCN a platform uses in the environment at `index` — override or index-shift. */
export function platformVcnForEnv(platform: PlatformConfig, envId: string, index: number): string {
  const ov = platform.overrides?.[envId]?.vcnCidr;
  if (ov !== undefined) return ov;
  const size = totalIps(parseCidr(platform.vcnCidr)?.prefix ?? 21);
  return shiftCidr(platform.vcnCidr, index * size) ?? platform.vcnCidr;
}

/** The subnets a platform uses in an environment — override, or the base set re-based. */
export function platformSubnetsForEnv(platform: PlatformConfig, envId: string, index: number): Subnet[] {
  const envVcn = platformVcnForEnv(platform, envId, index);
  if (platform.type === 'oke_simple' && platform.okeParams?.clusterSize) {
    // A selected profile owns its complete subnet map. Ignore any stale manual
    // per-environment override so the diagram remains identical to serialized
    // config (which deliberately omits profile-owned subnets).
    return okeProfileSubnets(envVcn, platform.okeParams.clusterSize, platform.okeParams.cniType, platform.okeParams.createFss);
  }
  if (platform.type === 'ocvs') {
    return ocvsDefaultSubnets(envVcn);
  }
  const ov = platform.overrides?.[envId]?.subnets;
  if (ov !== undefined) return ov;
  const base = parseCidr(platform.vcnCidr);
  const env = parseCidr(envVcn);
  const delta = base && env ? env.start - base.start : 0;
  if (delta === 0) return platform.subnets;
  return platform.subnets.map((sn) => ({ ...sn, cidr: shiftCidr(sn.cidr, delta) ?? sn.cidr }));
}

/** Every environment a platform is deployed to, with its derived (or overridden) network. */
export function platformEnvInstances(
  platform: PlatformConfig,
  environments: { id: string; name: string }[],
): PlatformEnvInstance[] {
  const out: PlatformEnvInstance[] = [];
  environments.forEach((e, index) => {
    const name = e.name.trim();
    if (!name || !platformInEnv(platform, e.id)) return;
    out.push({
      id: e.id,
      name,
      index,
      vcnCidr: platformVcnForEnv(platform, e.id, index),
      subnets: platformSubnetsForEnv(platform, e.id, index),
      overridden: !!platform.overrides?.[e.id],
    });
  });
  return out;
}
