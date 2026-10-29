import type { LzModel, PlatformConfig } from '../model/types';
import { OKE_VERSION_SUGGESTIONS } from './okeVersions';
import { normalizeCidr, overlaps, parseCidr, validateSubnetCidr } from './cidr';
import { okeProfileCidrError, platformInEnv, platformVcnForEnv } from './platforms';

const SIZE_PREFIX = { small: 20, medium: 18, large: 16 } as const;

/** Returns generator-aligned, actionable OKE input errors before WASM evaluation. */
export function okePlatformIssues(platform: PlatformConfig): { field: string; message: string }[] {
  if (platform.type !== 'oke_simple') return [];
  const p = platform.okeParams;
  if (!p) return [{ field: 'settings', message: 'OKE settings are required.' }];
  const errors: { field: string; message: string }[] = [];
  const add = (field: string, message: string) => errors.push({ field, message });
  if (!OKE_VERSION_SUGGESTIONS.some((version) => version === p.kubernetesVersion)) add('kubernetesVersion', 'Select a Kubernetes version from the list.');
  for (const cidr of p.peerVcnCidrs ?? []) {
    if (!parseCidr(cidr) || normalizeCidr(cidr) !== cidr || cidr === '0.0.0.0/0') add('peerVcnCidrs', 'Peer CIDRs must be IPv4 network addresses; 0.0.0.0/0 is not allowed.');
  }
  if (!parseCidr(p.servicesCidr)) add('servicesCidr', 'OKE service CIDR must be a valid IPv4 CIDR.');
  if (!p.apiAllowedCidrs.length || p.apiAllowedCidrs.some((cidr) => !parseCidr(cidr))) add('apiAllowedCidrs', 'OKE API allowed CIDRs must contain one or more valid IPv4 CIDRs.');
  const prefix = parseCidr(platform.vcnCidr)?.prefix;
  if (p.clusterSize) {
    if (platform.subnets.length > 0) add('clusterSize', 'A Blueprint Factory cluster-size profile cannot be combined with manual OKE subnets.');
    if (prefix !== SIZE_PREFIX[p.clusterSize]) add('clusterSize', `OKE ${p.clusterSize} profile requires a /${SIZE_PREFIX[p.clusterSize]} platform VCN.`);
  } else {
    const expected = new Set(['control-plane', 'int-lb', 'workers', ...(p.cniType === 'native' ? ['pods'] : []), ...(p.createFss ? ['fss'] : [])]);
    const actual = new Set(platform.subnets.map((sn) => sn.name));
    if (expected.size !== actual.size || [...expected].some((role) => !actual.has(role))) {
      add('clusterSize', `Manual ${p.cniType} OKE networking requires exactly: ${[...expected].join(', ')}.`);
    }
    platform.subnets.forEach((sn, i) => {
      const issue = validateSubnetCidr(sn.cidr, platform.vcnCidr, platform.subnets.filter((_, j) => j !== i));
      if (issue) add('subnets', `OKE ${sn.name} subnet: ${issue}.`);
    });
  }
  if (p.cniType === 'overlay' && !p.podsCidr) add('podsCidr', 'Overlay OKE networking requires a pod CIDR.');
  if (p.cniType === 'overlay' && p.podsCidr && !parseCidr(p.podsCidr)) add('podsCidr', 'OKE pod CIDR must be a valid IPv4 CIDR.');
  if (p.cniType === 'overlay' && p.podsCidr && overlaps(p.podsCidr, p.servicesCidr)) add('podsCidr', 'OKE pod CIDR must not overlap the service CIDR.');
  if (overlaps(p.servicesCidr, platform.vcnCidr)) add('servicesCidr', 'OKE service CIDR must not overlap the platform VCN.');
  if (p.cniType === 'overlay' && p.podsCidr && overlaps(p.podsCidr, platform.vcnCidr)) add('podsCidr', 'OKE pod CIDR must not overlap the platform VCN.');
  if (p.createNodePools !== false && (!Number.isInteger(p.workerBootVolumeSize) || p.workerBootVolumeSize < 50 || p.workerBootVolumeSize > 32768)) {
    add('workerBootVolumeSize', 'OKE worker boot volume must be an integer from 50 to 32768 GB.');
  }
  return errors;
}

export function validateOkePlatform(platform: PlatformConfig): string[] {
  return okePlatformIssues(platform).map((issue) => issue.message);
}

/** Cross-platform CIDR validation that needs the full canonical model. */
export function okeModelIssues(model: LzModel): { platformId: string; field: string; message: string }[] {
  const errors = model.platforms.flatMap((platform) => okePlatformIssues(platform).map((issue) => ({ ...issue, platformId: platform.id })));
  const routedVcns = [
    model.network.hubVcnCidr,
    ...model.environments.filter((env) => env.projectNetworkEnabled !== false).map((env) => env.network.vcnCidr),
    ...model.platforms.flatMap((platform) => model.environments.flatMap((env, index) =>
      platformInEnv(platform, env.id) ? [platformVcnForEnv(platform, env.id, index)] : [],
    )),
  ];
  for (const platform of model.platforms) {
    if (platform.type !== 'oke_simple' || !platform.okeParams) continue;
    const p = platform.okeParams;
    const add = (field: string, message: string) => errors.push({ platformId: platform.id, field, message });
    model.environments.forEach((env, index) => {
      if (platformInEnv(platform, env.id) && (p.peerVcnCidrs ?? []).some((cidr) => overlaps(cidr, platformVcnForEnv(platform, env.id, index)))) {
        add('peerVcnCidrs', `Peer CIDRs must not overlap the OKE VCN for ${env.name}.`);
      }
    });
    if (p.clusterSize) {
      const expectedPrefix = SIZE_PREFIX[p.clusterSize];
      model.environments.forEach((env, index) => {
        if (!platformInEnv(platform, env.id)) return;
        const instance = platformVcnForEnv(platform, env.id, index);
        if (parseCidr(instance)?.prefix !== expectedPrefix) add('clusterSize', `OKE ${p.clusterSize} profile requires every environment VCN to use /${expectedPrefix}.`);
        else {
          const error = okeProfileCidrError(instance, p.clusterSize!);
          if (error) add('clusterSize', error);
        }
      });
    }
    for (const [label, cidr] of [['service', p.servicesCidr], ['pod', p.cniType === 'overlay' ? p.podsCidr : undefined]] as const) {
      if (!cidr || !parseCidr(cidr)) continue;
      // Its own platform VCN is already diagnosed above; this detects every
      // other configured OCI routed VCN, including per-environment instances.
      if (routedVcns.some((vcn) => vcn !== platform.vcnCidr && overlaps(cidr, vcn))) {
        add(label === 'service' ? 'servicesCidr' : 'podsCidr', `OKE ${label} CIDR must not overlap another configured OCI VCN.`);
      }
    }
  }
  return errors;
}

export function validateOkeModel(model: LzModel): string[] {
  return [...new Set(okeModelIssues(model).map((issue) => issue.message))];
}
