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

import type { PlatformConfig, PlatformType, OkePlatformParams, Subnet } from '../model/types';
import { formatIp, parseCidr, shiftCidr, totalIps } from './cidr';

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
  { type: 'oke_simple', label: 'OKE Simple', deployable: true },
  { type: 'exacc', label: 'ExaCC', deployable: false, note: 'coming soon' },
  { type: 'exacs', label: 'ExaCS', deployable: false, note: 'coming soon' },
  { type: 'custom', label: 'Custom', deployable: true },
];

export function platformTypeMeta(type: PlatformType): PlatformTypeMeta {
  return PLATFORM_TYPES.find((t) => t.type === type) ?? PLATFORM_TYPES[0];
}

/** Base block the first environment platform lives in (clear of the step-2 spokes). */
export const PLATFORM_BASE_VCN = '10.140.0.0/21';
/** Block the shared platform's VCN defaults to. */
export const SHARED_PLATFORM_VCN = '10.170.0.0/21';

/**
 * The shared platform's starting subnet. It needs at least one: the generator
 * refuses a platform VCN with an empty subnet map.
 */
export function sharedPlatformDefaultSubnets(): Subnet[] {
  return [{ name: 'core', cidr: '10.170.0.0/24' }];
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

/** Default OKE Simple settings. */
export function okeDefaultParams(): OkePlatformParams {
  return {
    kubernetesVersion: 'v1.35.2',
    servicesCidr: '10.96.0.0/16',
    apiAllowedCidrs: ['10.0.1.0/24'],
    workerImage: '8.10',
  };
}

/**
 * Next free "<base>-N" platform name for a type, counting past existing ones.
 *
 * Stems stay short on purpose. The generator folds the platform name into an OCI
 * DNS label (`vcn` + region + `lz` + env + name) capped at 15 chars, which leaves
 * 5 for a `preprod` platform — so `cust`, not `custom`. A longer name (or a `-2`
 * suffix) can still overflow; the generator says so by name in Step 5.
 */
function nextPlatformId(type: PlatformType, existing: PlatformConfig[]): string {
  const stem = type === 'oke_simple' ? 'oke' : type === 'exacc' ? 'exacc' : type === 'exacs' ? 'exacs' : 'cust';
  if (!existing.some((p) => p.id === stem)) return stem;
  let n = 2;
  while (existing.some((p) => p.id === `${stem}-${n}`)) n += 1;
  return `${stem}-${n}`;
}

/**
 * A fresh platform of `type`, with a base VCN that doesn't collide with the
 * existing platforms (each gets its own /18-sized window, room for the per-env
 * shifts inside it).
 */
export function newPlatform(type: PlatformType, existing: PlatformConfig[]): PlatformConfig {
  const id = nextPlatformId(type, existing);
  // Give each platform a generous stride so its per-env /21 shifts never overlap
  // another platform's window (16 384 = a /18, i.e. 8 × /21 blocks).
  const baseVcn = shiftCidr(PLATFORM_BASE_VCN, existing.length * 16384) ?? PLATFORM_BASE_VCN;
  const vcnName = `vcn-${id}`;
  const attachmentName = `${vcnName}-<env>-attach`;
  const common = { id, name: id, type, environments: 'all' as const, vcnName, attachmentName, vcnCidr: baseVcn };
  if (type === 'oke_simple') {
    return { ...common, subnets: okeDefaultSubnets(baseVcn), okeParams: okeDefaultParams() };
  }
  // Custom (and the roadmap types, should they ever be added): no default subnets.
  return { ...common, subnets: [] };
}

/** Does a platform apply to the named environment? */
export function platformInEnv(platform: PlatformConfig, envName: string): boolean {
  return platform.environments === 'all'
    || (Array.isArray(platform.environments) && platform.environments.includes(envName));
}

export interface PlatformEnvInstance {
  name: string;
  /** Global index of this environment (drives the VCN shift). */
  index: number;
  vcnCidr: string;
  subnets: Subnet[];
  /** True when a per-env override pinned the VCN/subnets. */
  overridden: boolean;
}

/** The VCN a platform uses in the environment at `index` — override or index-shift. */
export function platformVcnForEnv(platform: PlatformConfig, envName: string, index: number): string {
  const ov = platform.overrides?.[envName]?.vcnCidr;
  if (ov) return ov;
  const size = totalIps(parseCidr(platform.vcnCidr)?.prefix ?? 21);
  return shiftCidr(platform.vcnCidr, index * size) ?? platform.vcnCidr;
}

/** The subnets a platform uses in an environment — override, or the base set re-based. */
export function platformSubnetsForEnv(platform: PlatformConfig, envName: string, index: number): Subnet[] {
  const ov = platform.overrides?.[envName]?.subnets;
  if (ov) return ov;
  const envVcn = platformVcnForEnv(platform, envName, index);
  const base = parseCidr(platform.vcnCidr);
  const env = parseCidr(envVcn);
  const delta = base && env ? env.start - base.start : 0;
  if (delta === 0) return platform.subnets;
  return platform.subnets.map((sn) => ({ ...sn, cidr: shiftCidr(sn.cidr, delta) ?? sn.cidr }));
}

/** Every environment a platform is deployed to, with its derived (or overridden) network. */
export function platformEnvInstances(
  platform: PlatformConfig,
  environments: { name: string }[],
): PlatformEnvInstance[] {
  const out: PlatformEnvInstance[] = [];
  environments.forEach((e, index) => {
    const name = e.name.trim();
    if (!name || !platformInEnv(platform, name)) return;
    out.push({
      name,
      index,
      vcnCidr: platformVcnForEnv(platform, name, index),
      subnets: platformSubnetsForEnv(platform, name, index),
      overridden: !!platform.overrides?.[name],
    });
  });
  return out;
}
