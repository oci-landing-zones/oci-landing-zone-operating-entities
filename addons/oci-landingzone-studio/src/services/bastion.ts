import type { BastionConfig, LzModel } from '../model/types';
import { normalizeCidr, parseCidr } from './cidr';

export const BASTION_DOCUMENTATION_URL = 'https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/addons/oci-bastion/README.md';

export function defaultBastion(): BastionConfig {
  return { enabled: false, clientCidrs: '', maxSessionTtlInSeconds: 3600 };
}

export function bastionClientCidrs(bastion: BastionConfig): string[] {
  return typeof bastion.clientCidrs === 'string'
    ? bastion.clientCidrs.split(/[,;\n]/).map((cidr) => cidr.trim()).filter(Boolean) : [];
}

export function bastionAllowlistError(bastion: BastionConfig): string | null {
  const cidrs = bastionClientCidrs(bastion);
  if (cidrs.length < 1 || cidrs.length > 20) return 'Enter 1 to 20 approved public IPv4 ranges in CIDR notation.';
  if (cidrs.some((cidr) => normalizeCidr(cidr) !== cidr || parseCidr(cidr)?.prefix === 0)) {
    return 'Enter IPv4 ranges in CIDR notation, such as 203.0.113.10/32 or 203.0.113.0/24. Access from 0.0.0.0/0 is not allowed.';
  }
  return null;
}

export function bastionDurationError(bastion: BastionConfig): string | null {
  const ttl = bastion.maxSessionTtlInSeconds;
  return Number.isInteger(ttl) && ttl >= 1800 && ttl <= 10800
    ? null : 'Set the maximum session duration from 30 to 180 minutes (1800 to 10800 whole seconds).';
}

export function validateBastion(model: LzModel): string[] {
  const bastion = model.bastion;
  return bastion?.enabled
    ? [bastionAllowlistError(bastion), bastionDurationError(bastion)].filter((error): error is string => error !== null)
    : [];
}
