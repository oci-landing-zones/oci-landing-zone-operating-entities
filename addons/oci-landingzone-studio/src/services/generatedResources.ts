export type ResourceKind = 'bastion' | 'events' | 'vault' | 'scanning' | 'notifications' | 'flowlogs' | 'securityrecipes' | 'identitydomain' | 'budgets' | 'requiredtags';

export const GENERATED_RESOURCE_COLLECTIONS = [
  { kind: 'bastion', configuration: 'bastions_configuration', collection: 'bastions' },
  { kind: 'budgets', configuration: 'budgets_configuration', collection: 'budgets' },
  { kind: 'requiredtags', configuration: 'tags_configuration', collection: 'namespaces' },
  { kind: 'identitydomain', configuration: 'identity_domains_configuration', collection: 'identity_domains' },
  { kind: 'identitydomain', configuration: 'identity_domain_groups_configuration', collection: 'groups' },
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
  groups: { id: string; kind: ResourceKind; compartmentKey: string; items: { key: string; name: string; subnetKey?: string; scope?: { platform: string; environment: string; project: string } }[] }[];
}

type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {};
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const scopeOf = (resource: Obj) => {
  const tags = object(resource.defined_tags);
  const prefix = 'tagns-lz-cost-governance.tag-lz-';
  return text(tags[prefix + 'platform']) ? { scope: { platform: text(tags[prefix + 'platform']), environment: text(tags[prefix + 'environment']), project: text(tags[prefix + 'project']) } } : {};
};


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
  const outputs = Object.entries(artifacts).filter(([filename]) => !filename.endsWith('_pre.json')).map(([, artifact]) => object(artifact));
  // Resolve domain definitions first: extension artifacts can contribute groups separately.
  for (const output of outputs) {
    const config = object(output.identity_domains_configuration);
    for (const [key, value] of Object.entries(object(config.identity_domains))) {
      const domain = object(value);
      const name = text(domain.display_name) || text(domain.name);
      if (!name) throw new Error(`Generated identity domain ${key} has no name.`);
      const compartmentKey = text(domain.compartment_id) || text(config.default_compartment_id) || 'TENANCY-ROOT';
      const id = `identitydomain:${key}`;
      const previous = groups.get(id);
      if (previous && (previous.items[0].name !== name || previous.compartmentKey !== compartmentKey)) throw new Error(`Generated identity domain ${key} has conflicting definitions.`);
      if (!previous) groups.set(id, { id, kind: 'identitydomain', compartmentKey, items: [{ key, name, ...scopeOf(domain) }] });
    }
  }
  for (const output of outputs) {
    const config = object(output.identity_domain_groups_configuration);
    for (const [key, value] of Object.entries(object(config.groups))) {
      const resource = object(value);
      const domainKey = text(resource.identity_domain_id) || text(config.default_identity_domain_id);
      const domain = groups.get(`identitydomain:${domainKey}`);
      // Existing Home/Default domains are not deployment-created resources in this snapshot.
      if (!domain) continue;
      const name = text(resource.name) || text(resource.display_name);
      if (!name) throw new Error(`Generated identity domain group ${key} has no name.`);
      const previous = domain.items.slice(1).find((item) => item.key === key);
      if (previous && previous.name !== name) throw new Error(`Generated identity domain group ${key} has conflicting names.`);
      if (!previous) domain.items.push({ key, name, ...scopeOf(resource) });
    }
  }
  for (const output of outputs) {
    const config = object(output.tags_configuration);
    const compartmentKey = text(config.default_compartment_id) || 'TENANCY-ROOT';
    for (const [namespaceKey, raw] of Object.entries(object(config.namespaces))) {
      const namespace = object(raw);
      for (const [tagKey, value] of Object.entries(object(namespace.tags))) {
        const tag = object(value);
        if (!Object.values(object(tag.tag_defaults)).some((entry) => object(entry).is_user_required === true)) continue;
        const id = `requiredtags:${compartmentKey}`;
        const group = groups.get(id) ?? { id, kind: 'requiredtags' as const, compartmentKey, items: [] };
        const key = `${namespaceKey}.${tagKey}`;
        if (!group.items.some((item) => item.key === key)) group.items.push({ key, name: `${text(namespace.name)}.${text(tag.name)}`, ...scopeOf(tag) });
        groups.set(id, group);
      }
    }
  }
  const collect = (kind: ResourceKind, configuration: unknown, collection: string, keep?: Set<string>) => {
    const config = object(configuration);
    for (const [key, value] of Object.entries(object(config[collection]))) {
      if (keep && !keep.has(key)) continue;
      const resource = object(value);
      const name = text(resource.event_display_name) || text(resource.display_name) || text(resource.name);
      if (!name) continue;
      const compartmentKey = text(resource.compartment_id) || text(config.default_compartment_id) || (kind === 'budgets' ? 'TENANCY-ROOT' : '');
      if (!compartmentKey) throw new Error(`Generated resource ${key} has no owning compartment reference.`);
      const id = `${kind}:${compartmentKey}`;
      let group = groups.get(id);
      if (!group) { group = { id, kind, compartmentKey, items: [] }; groups.set(id, group); }
      const existing = group.items.find((item) => item.key === key);
      if (existing && existing.name !== name) throw new Error(`Generated resource ${key} has conflicting names.`);
      if (!existing) group.items.push({ key, name, ...scopeOf(resource),
        ...(kind === 'bastion' && text(resource.subnet_id ?? config.default_subnet_id)
          ? { subnetKey: text(resource.subnet_id ?? config.default_subnet_id) } : {}),
      });
    }
  };
  for (const [filename, artifact] of Object.entries(artifacts)) {
    if (filename.endsWith('_pre.json')) continue;
    const output = object(artifact);
    for (const { kind, configuration, collection } of GENERATED_RESOURCE_COLLECTIONS) {
      if (kind === 'identitydomain' || kind === 'requiredtags') continue;
      const config = object(output[configuration]);
      const flowGroups = kind === 'flowlogs' ? new Set([
        ...Object.values(object(config.flow_logs)).flatMap((value) => {
          const flow = object(value);
          return ['vcn', 'subnet'].includes(text(flow.target_resource_type)) && text(flow.log_group_id) ? [text(flow.log_group_id)] : [];
        }),
        ...Object.values(object(config.service_logs)).flatMap((value) => {
          const log = object(value);
          return log.service === 'flowlogs' && ['vcn', 'subnet'].includes(text(log.category)) && text(log.log_group_id) ? [text(log.log_group_id)] : [];
        }),
      ]) : undefined;
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
    ...group, items: group.kind === 'identitydomain'
      ? [group.items[0], ...group.items.slice(1).sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key))]
      : group.items.sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key)),
  })) };
}
