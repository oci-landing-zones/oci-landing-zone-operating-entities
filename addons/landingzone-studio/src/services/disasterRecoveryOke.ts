import type { LzModel, PlatformConfig, Subnet } from '../model/types';
import { defaultDrPlatformCidrs, type DrDesignDraft } from './disasterRecoveryDesign';
import { firstFreeBlock, overlaps, parseCidr } from './cidr';
import { configuredVcnCidrs } from './exadata';
import { okeDefaultParams, okeDefaultSubnets, platformVcnForEnv, platformSubnetsForEnv, okeProfileSubnets } from './platforms';
import { drEnvironmentNetworkError, rebaseDrEnvironmentNetwork } from './disasterRecoveryNetwork';
import { validateOkePlatform } from './okeValidation';

export function drOkePlatform(model: LzModel, draft: DrDesignDraft, id: string): PlatformConfig | undefined {
  const source = model.platforms.find((platform) => platform.type === 'oke_simple' && model.environments.some((env) => id === `platform:${platform.id}:${env.id}`));
  if (!source) return undefined;
  const index = model.environments.findIndex((env) => id === `platform:${source.id}:${env.id}`);
  const env = model.environments[index];
  const vcnCidr = draft.platformVcnCidrs?.[id] ?? defaultDrPlatformCidrs(model, draft)[id] ?? '';
  const okeParams = { ...draft.platformOkeParams?.[id] ?? source.okeParams ?? okeDefaultParams() };
  // The DR /21 reservation cannot use a generator-owned /20, /18 or /16 profile.
  if (!draft.platformOkeParams?.[id] && okeParams.clusterSize && parseCidr(vcnCidr)?.prefix !== { small: 20, medium: 18, large: 16 }[okeParams.clusterSize]) delete okeParams.clusterSize;
  let subnets: Subnet[] = [];
  if (!okeParams.clusterSize) {
    subnets = draft.platformSubnets?.[id] ?? (source.okeParams?.clusterSize
      ? okeDefaultSubnets(vcnCidr)
      : rebaseDrEnvironmentNetwork({ vcnCidr: platformVcnForEnv(source, env.id, index), subnets: platformSubnetsForEnv(source, env.id, index) }, vcnCidr).subnets);
    subnets = subnets.filter((subnet) => (okeParams.cniType === 'native' || subnet.name !== 'pods') && (okeParams.createFss || subnet.name !== 'fss'));
    if (okeParams.cniType === 'native' && !subnets.some((subnet) => subnet.name === 'pods')) {
      subnets = [...subnets, { name: 'pods', cidr: firstFreeBlock(vcnCidr, subnets.map((subnet) => subnet.cidr), 23) ?? '', locked: true }];
    }
    if (okeParams.createFss && !subnets.some((subnet) => subnet.name === 'fss')) {
      subnets = [...subnets, { name: 'fss', cidr: firstFreeBlock(vcnCidr, subnets.map((subnet) => subnet.cidr), 24) ?? '', locked: true }];
    }
  }
  return { ...source, vcnCidr, subnets, okeParams, overrides: {}, environments: [env.id] };
}

export function drOkeSubnets(platform: PlatformConfig): Subnet[] {
  const params = platform.okeParams!;
  return params.clusterSize ? okeProfileSubnets(platform.vcnCidr, params.clusterSize, params.cniType, params.createFss) : platform.subnets;
}

export function drOkeErrors(model: LzModel, draft: DrDesignDraft, id: string, platform: PlatformConfig): string[] {
  const networkError = drEnvironmentNetworkError(model, draft, id, { vcnCidr: platform.vcnCidr, subnets: drOkeSubnets(platform) });
  const errors = [...validateOkePlatform(platform), ...(networkError ? [networkError] : [])];
  const source = model.platforms.find((item) => item.id === platform.id);
  for (const [flag, label] of [['publicLoadBalancer', 'public load balancer'], ['createFss', 'File Storage']] as const) {
    if (platform.okeParams?.[flag] && !source?.okeParams?.[flag]) errors.push(`Enable ${label} support in the Home OKE platform and apply its IAM prerequisites before enabling it in DR.`);
  }
  const routed = [...configuredVcnCidrs(model), draft.hubNetwork?.hubVcnCidr ?? '',
    ...Object.entries(draft.projectNetworks ?? {}).filter(([key]) => draft.projectNetworkIds.includes(key)).map(([, network]) => network.vcnCidr),
    ...Object.entries({ ...defaultDrPlatformCidrs(model, draft), ...draft.platformVcnCidrs }).filter(([key]) => draft.platformIds.includes(key)).map(([, cidr]) => cidr)];
  for (const [label, cidr] of [['service', platform.okeParams?.servicesCidr], ['pod', platform.okeParams?.podsCidr]]) {
    if (cidr && routed.some((vcn) => overlaps(cidr, vcn))) errors.push(`OKE ${label} CIDR must not overlap another Home or DR VCN.`);
  }
  return [...new Set(errors)];
}
