/** Generator-owned OCI display naming mirrored from gen/naming.libsonnet. */

const lower = (parts: string[]) => parts.map((part) => part.trim().toLowerCase()).filter(Boolean);

export function displayName(type: string, region: string, segments: string[]): string {
  return lower([type, region, 'lz', ...segments]).join('-');
}

export const generatorNames = {
  landingZone: 'cmp-landingzone',
  networkCompartment: 'cmp-lz-network',
  platformCompartment: 'cmp-lz-platform',
  securityCompartment: 'cmp-lz-security',

  environmentCompartment: (env: string) => `cmp-lz-${env.toLowerCase()}`,
  environmentChildCompartment: (env: string, child: string) => `cmp-lz-${env.toLowerCase()}-${child.toLowerCase()}`,
  environmentProjectCompartment: (env: string, project: string) => `cmp-lz-${env.toLowerCase()}-${project.toLowerCase()}`,
  environmentPlatformCompartment: (env: string, platform: string) => `cmp-lz-${env.toLowerCase()}-${platform.toLowerCase()}`,
  sharedPlatformCompartment: (platform: string) => `cmp-lz-shared-${platform.toLowerCase()}`,

  hubVcn: (region: string) => displayName('vcn', region, ['hub']),
  hubSubnet: (region: string, key: string) => displayName('sn', region, ['hub', ...key.split('-')]),
  hubGateway: (region: string, type: 'igw' | 'ngw' | 'sgw') => displayName(type, region, ['hub']),
  hubDrg: (region: string) => displayName('drg', region, ['hub']),
  hubAttachment: (region: string) => displayName('drgatt', region, ['hub']),

  environmentVcn: (region: string, env: string) => displayName('vcn', region, [env, 'projects']),
  environmentSubnet: (region: string, env: string, key: string) => displayName('sn', region, [env, ...key.split('-')]),
  environmentGateway: (region: string, env: string, type: 'ngw' | 'sgw') => displayName(type, region, [env, 'proj']),
  environmentAttachment: (region: string, env: string) => displayName('drgatt', region, [env, 'proj']),

  environmentPlatformVcn: (region: string, env: string, platform: string) => displayName('vcn', region, [env, platform]),
  environmentPlatformGateway: (region: string, env: string, platform: string, type: 'ngw' | 'sgw') => displayName(type, region, [env, platform]),
  environmentPlatformAttachment: (region: string, env: string, platform: string) => displayName('drgatt', region, [env, platform]),
  environmentPlatformSubnet: (region: string, env: string, platform: string, subnet: string, extension?: string) => {
    const suffix = extension === 'oke_simple'
      ? ({ 'control-plane': 'cp', 'int-lb': 'lb' }[subnet] ?? subnet)
      : subnet;
    return displayName('sn', region, [env, platform, suffix]);
  },
  sharedPlatformVcn: (region: string, platform: string) => displayName('vcn', region, ['shared', platform]),
  sharedPlatformGateway: (region: string, platform: string, type: 'ngw' | 'sgw') => displayName(type, region, ['shared', platform]),
  sharedPlatformAttachment: (region: string, platform: string) => displayName('drgatt', region, ['shared', platform]),
};
