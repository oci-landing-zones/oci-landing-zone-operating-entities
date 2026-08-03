import type { LzModel, OcvsPlatformParams, PlatformConfig, SharedPlatformConfig } from '../model/types';
import { overlaps, parseCidr } from './cidr';
import { platformInEnv, platformVcnForEnv } from './platforms';

const OCVS_PREFIXES = new Set([21, 22, 23, 24]);
const NAME_RE = /^[A-Za-z][A-Za-z0-9-]*$/;

function validateName(label: string, value: string, maxLength: number, errors: string[]) {
  if (!value || !NAME_RE.test(value) || value.includes('--')) {
    errors.push(`${label} must start with a letter and use only letters, numbers, and single hyphens.`);
  } else if (value.length > maxLength) {
    errors.push(`${label} must be ${maxLength} characters or less.`);
  }
}

function validateParams(params: OcvsPlatformParams | undefined, errors: string[]) {
  if (!params) {
    errors.push('OCVS management-cluster settings are required.');
    return;
  }
  if (!params.sshAuthorizedKeys.trim()) errors.push('OCVS requires a non-empty SSH public key.');
  validateName('OCVS SDDC name', params.sddcDisplayName.trim(), 16, errors);
  validateName('OCVS cluster name', params.clusterDisplayName.trim(), 22, errors);
  if (!params.vmwareSoftwareVersion.trim()) errors.push('OCVS VMware software version is required.');
  if (!params.computeAvailabilityDomain.trim()) errors.push('OCVS compute availability domain is required.');
  if (!params.vsphereType.trim()) errors.push('OCVS vSphere type is required.');
  if (!params.initialHostShapeName.trim()) errors.push('OCVS initial host shape is required.');
  if (!Number.isInteger(params.esxiHostsCount) || params.esxiHostsCount < 1) errors.push('OCVS ESXi host count must be a positive integer.');
  if (!Number.isInteger(params.initialHostOcpuCount) || params.initialHostOcpuCount < 1) errors.push('OCVS initial host OCPUs must be a positive integer.');
  if (params.workloadNetworkCidr && !parseCidr(params.workloadNetworkCidr)) errors.push('OCVS workload network CIDR must be a valid IPv4 CIDR.');
}

function validateNetwork(vcnCidr: string, subnets: { name: string }[], errors: string[]) {
  const cidr = parseCidr(vcnCidr);
  if (!cidr || !OCVS_PREFIXES.has(cidr.prefix)) {
    errors.push('OCVS platform VCN must use one of: /21, /22, /23, /24.');
  }
  if (subnets.length > 0) errors.push('The OCVS provisioning subnet is managed by Blueprint Factory; remove manual OCVS subnets.');
}

/** Validates one environment-scoped OCVS platform. */
export function validateOcvsPlatform(platform: PlatformConfig): string[] {
  if (platform.type !== 'ocvs') return [];
  const errors: string[] = [];
  validateNetwork(platform.vcnCidr, platform.subnets, errors);
  validateParams(platform.ocvsParams, errors);
  return errors;
}

/** Validates the optional OCVS extension on Studio's shared platform. */
export function validateSharedOcvsPlatform(platform: SharedPlatformConfig): string[] {
  if (platform.type !== 'ocvs') return [];
  const errors: string[] = [];
  if (platform.key.trim().length > 3) errors.push('Shared OCVS platform key must be 3 characters or less for OCI DNS labels.');
  validateNetwork(platform.vcnCidr, platform.subnets, errors);
  validateParams(platform.ocvsParams, errors);
  return errors;
}

/** Cross-scope OCVS validation using the actual environment placement instances. */
export function validateOcvsModel(model: LzModel): string[] {
  const errors = [
    ...model.platforms.flatMap(validateOcvsPlatform),
    ...model.sharedPlatforms.flatMap(validateSharedOcvsPlatform),
  ];
  const vcns = [
    { id: 'hub', cidr: model.network.hubVcnCidr },
    ...model.environments.map((env, index) => ({ id: `env:${index}`, cidr: env.network.vcnCidr })),
    ...model.platforms.flatMap((platform, platformIndex) => model.environments.flatMap((env, envIndex) =>
      platformInEnv(platform, env.id) ? [{ id: `platform:${platformIndex}:${envIndex}`, cidr: platformVcnForEnv(platform, env.id, envIndex) }] : [],
    )),
    ...model.sharedPlatforms.flatMap((platform, index) => platform.type === 'ocvs' ? [{ id: `shared-ocvs:${index}`, cidr: platform.vcnCidr }] : []),
  ];
  model.platforms.forEach((platform, platformIndex) => {
    if (platform.type !== 'ocvs') return;
    model.environments.forEach((env, envIndex) => {
      if (!platformInEnv(platform, env.id)) return;
      const ownId = `platform:${platformIndex}:${envIndex}`;
      const cidr = platformVcnForEnv(platform, env.id, envIndex);
      if (vcns.some((entry) => entry.id !== ownId && overlaps(cidr, entry.cidr))) {
        errors.push('OCVS platform VCN must not overlap another configured OCI VCN.');
      }
    });
  });
  model.sharedPlatforms.forEach((platform, index) => {
    const ownId = `shared-ocvs:${index}`;
    if (platform.type === 'ocvs' && vcns.some((entry) => entry.id !== ownId && overlaps(platform.vcnCidr, entry.cidr))) {
      errors.push('OCVS platform VCN must not overlap another configured OCI VCN.');
    }
  });
  return [...new Set(errors)];
}
