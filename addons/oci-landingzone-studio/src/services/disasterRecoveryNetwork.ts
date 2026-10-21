import type { EnvNetworkConfig, LzModel, Subnet } from '../model/types';
import { defaultDrPlatformCidrs, type DrDesignDraft } from './disasterRecoveryDesign';
import { normalizeCidr, overlaps, parseCidr, shiftCidr, validateSubnetCidr, validateVcnCidr } from './cidr';
import { configuredVcnCidrs, exacsPreviewSubnets } from './exadata';
import { ocvsDefaultSubnets } from './platforms';

export function rebaseDrEnvironmentNetwork(source: EnvNetworkConfig, vcnCidr: string): EnvNetworkConfig {
  const previous = parseCidr(source.vcnCidr);
  const next = parseCidr(vcnCidr);
  const delta = previous && next ? next.start - previous.start : 0;
  return { vcnCidr, subnets: source.subnets.map((subnet) => ({ ...subnet, cidr: shiftCidr(subnet.cidr, delta) ?? subnet.cidr })) };
}

export function drEnvironmentNetworkError(model: LzModel, draft: DrDesignDraft, id: string, network: EnvNetworkConfig): string | null {
  const vcnError = validateVcnCidr(network.vcnCidr);
  if (vcnError) return vcnError;
  for (const [index, subnet] of network.subnets.entries()) {
    const error = validateSubnetCidr(subnet.cidr, network.vcnCidr, network.subnets.filter((_, other) => other !== index));
    if (error) return `${subnet.name}: ${error}`;
  }
  if (configuredVcnCidrs(model).some((cidr) => overlaps(network.vcnCidr, cidr))) return 'Overlaps a Home VCN. Choose a different DR range.';
  if (draft.hubNetwork && overlaps(network.vcnCidr, draft.hubNetwork.hubVcnCidr)) return 'Overlaps the DR hub VCN.';
  if (Object.entries(draft.projectNetworks ?? {}).some(([key, other]) => key !== id && draft.projectNetworkIds.includes(key) && overlaps(network.vcnCidr, other.vcnCidr))) return 'Overlaps another DR environment VCN.';
  if (Object.entries({ ...defaultDrPlatformCidrs(model, draft), ...draft.platformVcnCidrs }).some(([key, cidr]) => key !== id && draft.platformIds.includes(key) && overlaps(network.vcnCidr, cidr))) return 'Overlaps another DR platform VCN.';
  return null;
}

export function drOcvsNetworkError(model: LzModel, draft: DrDesignDraft, id: string, vcnCidr: string): string | null {
  const error = validateVcnCidr(vcnCidr);
  if (error) return error;
  if (![21, 22, 23, 24].includes(parseCidr(vcnCidr)!.prefix)) return 'OCVS platform VCN must use one of: /21, /22, /23, /24.';
  if (normalizeCidr(vcnCidr) !== vcnCidr) return `Use the canonical VCN CIDR ${normalizeCidr(vcnCidr)}.`;
  return drEnvironmentNetworkError(model, draft, id, { vcnCidr, subnets: ocvsDefaultSubnets(vcnCidr) });
}

export function drExacsNetworkError(model: LzModel, draft: DrDesignDraft, id: string, vcnCidr: string, subnets?: Subnet[]): string | null {
  const error = validateVcnCidr(vcnCidr);
  if (error) return error;
  if (!subnets && parseCidr(vcnCidr)!.prefix > 23) return 'EXACS needs a /23 or larger VCN for the database and backup /24 subnets.';
  const resolved = subnets ?? exacsPreviewSubnets(vcnCidr);
  if (resolved.length !== 2 || !resolved.some((subnet) => subnet.name === 'db') || !resolved.some((subnet) => subnet.name === 'backup')) return 'EXACS requires database and backup subnets.';
  return drEnvironmentNetworkError(model, draft, id, { vcnCidr, subnets: resolved });
}
