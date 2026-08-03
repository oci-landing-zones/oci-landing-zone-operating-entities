import type { LzModel, PlatformConfig } from '../model/types';
import { overlaps, parseCidr, validateSubnetCidr } from './cidr';
import { platformInEnv, platformVcnForEnv } from './platforms';

const SIZE_PREFIX = { small: 20, medium: 18, large: 16 } as const;

/** Returns generator-aligned, actionable OKE input errors before WASM evaluation. */
export function validateOkePlatform(platform: PlatformConfig): string[] {
  if (platform.type !== 'oke_simple') return [];
  const p = platform.okeParams;
  if (!p) return ['OKE settings are required.'];
  const errors: string[] = [];
  if (!parseCidr(p.servicesCidr)) errors.push('OKE service CIDR must be a valid IPv4 CIDR.');
  if (!p.apiAllowedCidrs.length || p.apiAllowedCidrs.some((cidr) => !parseCidr(cidr))) errors.push('OKE API allowed CIDRs must contain one or more valid IPv4 CIDRs.');
  const prefix = parseCidr(platform.vcnCidr)?.prefix;
  if (p.clusterSize) {
    if (platform.subnets.length > 0) errors.push('A generator-owned cluster-size profile cannot be combined with manual OKE subnets.');
    if (prefix !== SIZE_PREFIX[p.clusterSize]) errors.push(`OKE ${p.clusterSize} profile requires a /${SIZE_PREFIX[p.clusterSize]} platform VCN.`);
  } else {
    const expected = new Set(['control-plane', 'int-lb', 'workers', ...(p.cniType === 'native' ? ['pods'] : []), ...(p.createFss ? ['fss'] : [])]);
    const actual = new Set(platform.subnets.map((sn) => sn.name));
    if (expected.size !== actual.size || [...expected].some((role) => !actual.has(role))) {
      errors.push(`Manual ${p.cniType} OKE networking requires exactly: ${[...expected].join(', ')}.`);
    }
    platform.subnets.forEach((sn, i) => {
      const issue = validateSubnetCidr(sn.cidr, platform.vcnCidr, platform.subnets.filter((_, j) => j !== i));
      if (issue) errors.push(`OKE ${sn.name} subnet: ${issue}.`);
    });
  }
  if (p.cniType === 'overlay' && !p.podsCidr) errors.push('Overlay OKE networking requires a pod CIDR.');
  if (p.podsCidr && !parseCidr(p.podsCidr)) errors.push('OKE pod CIDR must be a valid IPv4 CIDR.');
  if (p.podsCidr && overlaps(p.podsCidr, p.servicesCidr)) errors.push('OKE pod CIDR must not overlap the service CIDR.');
  if (overlaps(p.servicesCidr, platform.vcnCidr)) errors.push('OKE service CIDR must not overlap the platform VCN.');
  if (p.podsCidr && overlaps(p.podsCidr, platform.vcnCidr)) errors.push('OKE pod CIDR must not overlap the platform VCN.');
  if (!Number.isInteger(p.workerBootVolumeSize) || p.workerBootVolumeSize < 50 || p.workerBootVolumeSize > 32768) {
    errors.push('OKE worker boot volume must be an integer from 50 to 32768 GB.');
  }
  return errors;
}

/** Cross-platform CIDR validation that needs the full canonical model. */
export function validateOkeModel(model: LzModel): string[] {
  const errors = model.platforms.flatMap(validateOkePlatform);
  const routedVcns = [
    model.network.hubVcnCidr,
    ...model.environments.map((env) => env.network.vcnCidr),
    ...model.platforms.flatMap((platform) => model.environments.flatMap((env, index) =>
      platformInEnv(platform, env.id) ? [platformVcnForEnv(platform, env.id, index)] : [],
    )),
  ];
  for (const platform of model.platforms) {
    if (platform.type !== 'oke_simple' || !platform.okeParams) continue;
    const p = platform.okeParams;
    if (p.clusterSize) {
      const expectedPrefix = SIZE_PREFIX[p.clusterSize];
      model.environments.forEach((env, index) => {
        if (!platformInEnv(platform, env.id)) return;
        const instance = platformVcnForEnv(platform, env.id, index);
        if (parseCidr(instance)?.prefix !== expectedPrefix) errors.push(`OKE ${p.clusterSize} profile requires every environment VCN to use /${expectedPrefix}.`);
      });
    }
    for (const [label, cidr] of [['service', p.servicesCidr], ['pod', p.podsCidr]] as const) {
      if (!cidr || !parseCidr(cidr)) continue;
      // Its own platform VCN is already diagnosed above; this detects every
      // other configured OCI routed VCN, including per-environment instances.
      if (routedVcns.some((vcn) => vcn !== platform.vcnCidr && overlaps(cidr, vcn))) {
        errors.push(`OKE ${label} CIDR must not overlap another configured OCI VCN.`);
      }
    }
  }
  return [...new Set(errors)];
}
