export const DEFAULT_IDENTITY_DOMAIN_NAME = 'id_lz_common';

export function identityDomainNameError(name: string): string | null {
  if (!name) return 'Enter an identity domain name.';
  if (name.length > 100) return 'Use 100 characters or fewer.';
  return /^[a-zA-Z0-9_.-]+$/.test(name) ? null : 'Use only letters, numbers, hyphens, periods, and underscores.';
}
