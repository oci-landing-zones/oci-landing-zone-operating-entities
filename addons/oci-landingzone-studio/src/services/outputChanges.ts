/** Compare Studio's serialized source sections without evaluating Jsonnet or exposing values. */
export function outputChangeReasons(previous: string, current: string): string[] {
  if (previous === current) return ['The saved files use an older or incomplete output format.'];
  try {
    const before = JSON.parse(previous);
    const after = JSON.parse(current);
    if (typeof before?.home === 'string' && typeof after?.home === 'string' && before.draft && after.draft) {
      return [
        ...(before.home !== after.home ? outputChangeReasons(before.home, after.home) : []),
        ...(JSON.stringify(before.draft) !== JSON.stringify(after.draft) ? ['Secondary (DR) settings changed.'] : []),
      ];
    }
  } catch { /* Normal Studio sources are Jsonnet, not JSON fingerprints. */ }
  function sections(source: string): Map<string, string> {
    const entries = [...source.matchAll(/^ {2}([a-z_]+): /gm)];
    return new Map(entries.map((entry, index) => [entry[1], source.slice(entry.index, entries[index + 1]?.index ?? source.length).trim()]));
  }
  const before = sections(previous);
  const after = sections(current);
  const fallback = 'The design has changed; section details are unavailable for this saved version.';
  if (!before.size || !after.size) return [fallback];
  const changed = new Set([...new Set([...before.keys(), ...after.keys()])].filter((key) => before.get(key) !== after.get(key)));
  const groups: Array<[string, string[]]> = [
    ['Foundation / region settings changed.', ['realm', 'region', 'region_short_name', 'tenancy_home_region', 'primary_region', 'primary_region_short_name', 'stack_scope', 'dr_region']],
    ['IAM / identity domain settings changed.', ['identity_domain_name']],
    ['Security settings changed.', ['cis_level', 'security_targets', 'security_zone_environment_recipe_number', 'enable_shared_network_security_zone', 'enable_landing_zone_security_zone', 'enable_vulnerability_scanning', 'enable_cloud_guard', 'bastion']],
    ['Network / RPC settings changed.', ['hub', 'remote_peering_connections', 'hybrid_connectivity']],
    ['Environment / project / platform settings changed.', ['environments', 'shared_platforms']],
    ['Governance / budget settings changed.', ['cost_governance']],
    ['Observability / notification settings changed.', ['notification_emails']],
  ];
  const reasons = groups.filter(([, keys]) => keys.some((key) => changed.has(key))).map(([message]) => message);
  const known = new Set(groups.flatMap(([, keys]) => keys));
  if ([...changed].some((key) => !known.has(key))) reasons.push('Other configuration settings changed.');
  return reasons.length ? reasons : [fallback];
}
