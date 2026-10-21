const globalConfigurations = new Set([
  'compartments_configuration', 'groups_configuration', 'identity_domain_groups_configuration',
  'identity_domains_configuration', 'policies_configuration', 'tags_configuration',
  'cloud_guard_configuration', 'security_zones_configuration',
]);
const regionalConfigurations = new Set([
  'network_configuration', 'scanning_configuration', 'vaults_configuration',
  'alarms_configuration', 'events_configuration', 'home_region_events_configuration',
  'notifications_configuration', 'service_connectors_configuration', 'logging_configuration',
  'ocvs_configuration', 'oke_clusters_configuration', 'oke_workers_configuration',
]);

function hasIamGrants(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    ['service_grantees', 'group_grantees', 'existing_key_grants'].includes(key)
      ? !!child && typeof child === 'object' && Object.keys(child).length > 0
      : hasIamGrants(child));
}

/** Classify emitted resource blocks, rather than assuming a file has one domain. */
export function generatedFileScope(filename: string, contents: string, region: 'HR' | 'DR'): string {
  const regionLabel = region === 'HR' ? 'Home region' : region;
  if (filename === 'config.jsonnet') return `Source · ${regionLabel}`;
  try {
    const resource = JSON.parse(contents) as unknown;
    if (!resource || typeof resource !== 'object' || Array.isArray(resource)) return 'Scope not identified';
    const keys = Object.keys(resource);
    const global = keys.some((key) => globalConfigurations.has(key)) || hasIamGrants(resource);
    const regional = keys.some((key) => regionalConfigurations.has(key));
    if (global && regional) return `Global + ${regionLabel}`;
    if (global) return 'Global';
    if (regional) return `Regional · ${regionLabel}`;
  } catch { /* Unrecognized artifacts should not receive an inferred scope. */ }
  return 'Scope not identified';
}
