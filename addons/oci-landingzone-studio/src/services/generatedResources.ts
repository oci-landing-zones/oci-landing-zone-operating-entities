export type ResourceKind = 'events' | 'vault' | 'scanning' | 'notifications' | 'flowlogs' | 'securityrecipes';

export const GENERATED_RESOURCE_COLLECTIONS = [
  { kind: 'events', configuration: 'events_configuration', collection: 'event_rules' },
  { kind: 'events', configuration: 'home_region_events_configuration', collection: 'event_rules' },
  { kind: 'vault', configuration: 'vaults_configuration', collection: 'vaults' },
  { kind: 'scanning', configuration: 'scanning_configuration', collection: 'host_recipes' },
  { kind: 'scanning', configuration: 'scanning_configuration', collection: 'container_recipes' },
  { kind: 'notifications', configuration: 'notifications_configuration', collection: 'topics' },
  { kind: 'securityrecipes', configuration: 'security_zones_configuration', collection: 'recipes' },
  { kind: 'flowlogs', configuration: 'logging_configuration', collection: 'log_groups' },
] as const satisfies readonly { kind: ResourceKind; configuration: string; collection: string }[];

export interface GeneratedResourceInventory {
  compartments: { key: string; name: string; parentKey?: string }[];
  groups: { id: string; kind: ResourceKind; compartmentKey: string; items: { key: string; name: string }[] }[];
}

type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {};
const text = (value: unknown): string => typeof value === 'string' ? value : '';

/** Extract deployed resource names and owning compartments, without deriving naming conventions. */
export function extractGeneratedResources(artifacts: Record<string, unknown>, compartmentsConfiguration: unknown): GeneratedResourceInventory {
  const compartmentConfig = object(compartmentsConfiguration);
  if (!compartmentConfig.compartments || typeof compartmentConfig.compartments !== 'object' || Array.isArray(compartmentConfig.compartments)) {
    throw new Error('The generated compartment inventory is unavailable.');
  }
  // TENANCY-ROOT is the module's reserved parent reference, already represented by the diagram.
  const compartments: GeneratedResourceInventory['compartments'] = [{ key: 'TENANCY-ROOT', name: 'OCI Tenancy' }];
  const addCompartments = (entries: unknown, parentKey: string) => {
    for (const [key, value] of Object.entries(object(entries))) {
      const compartment = object(value);
      const name = text(compartment.name);
      if (!name) throw new Error(`Generated compartment ${key} has no name.`);
      compartments.push({ key, name, parentKey: text(compartment.parent_id) || parentKey });
      addCompartments(compartment.children, key);
    }
  };
  addCompartments(compartmentConfig.compartments, text(compartmentConfig.default_parent_id) || 'TENANCY-ROOT');

  const groups = new Map<string, GeneratedResourceInventory['groups'][number]>();
  const collect = (kind: ResourceKind, configuration: unknown, collection: string, keep?: Set<string>) => {
    const config = object(configuration);
    for (const [key, value] of Object.entries(object(config[collection]))) {
      if (keep && !keep.has(key)) continue;
      const resource = object(value);
      const name = text(resource.event_display_name) || text(resource.display_name) || text(resource.name);
      if (!name) continue;
      const compartmentKey = text(resource.compartment_id) || text(config.default_compartment_id);
      if (!compartmentKey) throw new Error(`Generated resource ${key} has no owning compartment reference.`);
      const id = `${kind}:${compartmentKey}`;
      let group = groups.get(id);
      if (!group) { group = { id, kind, compartmentKey, items: [] }; groups.set(id, group); }
      const existing = group.items.find((item) => item.key === key);
      if (existing && existing.name !== name) throw new Error(`Generated resource ${key} has conflicting names.`);
      if (!existing) group.items.push({ key, name });
    }
  };
  for (const [filename, artifact] of Object.entries(artifacts)) {
    if (filename.endsWith('_pre.json')) continue;
    const output = object(artifact);
    for (const { kind, configuration, collection } of GENERATED_RESOURCE_COLLECTIONS) {
      const config = object(output[configuration]);
      const flowGroups = kind === 'flowlogs' ? new Set(Object.values(object(config.flow_logs)).flatMap((value) => {
        const flow = object(value);
        return ['vcn', 'subnet'].includes(text(flow.target_resource_type)) && text(flow.log_group_id) ? [text(flow.log_group_id)] : [];
      })) : undefined;
      collect(kind, config, collection, flowGroups);
    }
  }
  const byKey = new Map<string, GeneratedResourceInventory['compartments'][number]>();
  for (const compartment of compartments) {
    if (byKey.has(compartment.key)) throw new Error(`Generated compartment ${compartment.key} is defined more than once.`);
    byKey.set(compartment.key, compartment);
  }
  for (const group of groups.values()) {
    const seen = new Set<string>();
    let key: string | undefined = group.compartmentKey;
    while (key) {
      if (seen.has(key)) throw new Error(`Generated compartment ancestry contains a cycle at ${key}.`);
      seen.add(key);
      const compartment = byKey.get(key);
      if (!compartment) throw new Error(`Generated compartment ${key} is unavailable for resource placement.`);
      key = compartment.parentKey;
    }
  }
  return { compartments, groups: [...groups.values()].sort((a, b) => a.id.localeCompare(b.id)).map((group) => ({
    ...group, items: group.items.sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key)),
  })) };
}
