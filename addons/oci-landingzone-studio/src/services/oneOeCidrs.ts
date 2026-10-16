import { firstFreeBlock, overlaps } from './cidr';

export const ADDITIONAL_ENVIRONMENT_CIDR = '10.1.192.0/18';
export const SHARED_EXACS_CIDR = '10.0.24.0/21';
export const OPTIONAL_SHARED_CIDR = '10.0.32.0/19';

interface EnvironmentReservations {
  projects: string;
  ebs: string;
  oke: string;
  ocvs: string;
  ai: string;
  exacs: string;
  optional: string[];
}

const ENVIRONMENT_CIDRS: Record<string, EnvironmentReservations> = {
  prod: { projects: '10.0.64.0/21', ebs: '10.0.72.0/21', oke: '10.0.80.0/21', ocvs: '10.0.88.0/21', ai: '10.0.96.0/21', exacs: '10.0.104.0/21', optional: ['10.0.112.0/21', '10.0.120.0/21'] },
  preprod: { projects: '10.0.128.0/21', ebs: '10.0.136.0/21', oke: '10.0.144.0/21', ocvs: '10.0.152.0/21', ai: '10.0.160.0/21', exacs: '10.0.168.0/21', optional: ['10.0.176.0/21', '10.0.184.0/21'] },
  dr: { projects: '10.0.200.0/21', ebs: '10.0.208.0/21', oke: '10.0.216.0/21', ocvs: '10.0.224.0/22', ai: '10.0.232.0/21', exacs: '10.0.240.0/22', optional: ['10.0.248.0/21'] },
  dev: { projects: '10.1.64.0/21', ebs: '10.1.72.0/21', oke: '10.1.80.0/21', ocvs: '10.1.88.0/21', ai: '10.1.96.0/21', exacs: '10.1.104.0/21', optional: ['10.1.112.0/21', '10.1.120.0/21'] },
  uat: { projects: '10.1.128.0/21', ebs: '10.1.136.0/21', oke: '10.1.144.0/21', ocvs: '10.1.152.0/21', ai: '10.1.160.0/21', exacs: '10.1.168.0/21', optional: ['10.1.176.0/21', '10.1.184.0/21'] },
};

export function oneOeEnvironmentCidrs(name: string): EnvironmentReservations | undefined {
  const key = name.trim().toLowerCase();
  return Object.hasOwn(ENVIRONMENT_CIDRS, key) ? ENVIRONMENT_CIDRS[key] : undefined;
}

/** Empty means the reservation is exhausted: require a manual CIDR, never reuse one. */
export function additionalEnvironmentCidr(occupied: string[]): string {
  return firstFreeBlock(ADDITIONAL_ENVIRONMENT_CIDR, occupied, 21) ?? '';
}

export function environmentPlatformCidr(type: 'ocvs' | 'custom', name: string, occupied: string[]): string {
  const reservation = oneOeEnvironmentCidrs(name);
  if (!reservation) return additionalEnvironmentCidr(occupied);
  const candidates = type === 'ocvs' ? [reservation.ocvs, ...reservation.optional] : reservation.optional;
  return candidates.find((cidr) => !occupied.some((used) => overlaps(cidr, used))) ?? '';
}
