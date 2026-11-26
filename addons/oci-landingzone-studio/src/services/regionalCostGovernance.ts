import type { BusinessUnitScope, CostGovernance, LzModel, ProjectConfig } from '../model/types';
import { activeProjectNames, costCenterFilter, costGovernanceConfig, defaultCostGovernance, parseTagValues, type CostGovernanceConfig } from './costGovernance';

type RegionalScopes = Pick<LzModel, 'environments' | 'projects'>;

/** Project Home's business rules onto regional identities, without expanding an absent scope. */
export function inheritRegionalCostGovernance(home: LzModel, regional: RegionalScopes, projectOrigins: Record<string, string> = {}): CostGovernance {
  const cfg = structuredClone(home.foundation.costGovernance ?? defaultCostGovernance(activeProjectNames(home)));
  if (cfg.tagsEnabled === false) return cfg;
  const filters: Record<string, BusinessUnitScope> = {};
  for (const center of parseTagValues(cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345').filter((value) => value !== 'tobedefined')) {
    const filter = costCenterFilter(cfg, center);
    const next = { ...filter };
    let absent = false;
    for (const dimension of ['environment', 'project'] as const) {
      const values = filter[dimension];
      if (!values?.length) continue;
      const source = dimension === 'environment' ? home.environments : home.projects;
      const target = dimension === 'environment' ? regional.environments : regional.projects;
      const mapped = values.flatMap((value) => {
        if (dimension === 'environment' && value === 'shared' || dimension === 'project' && value === 'notapplicable') return [value];
        const entry = source.find((item) => `${dimension}:${item.id}` === value || item.name.trim() === value);
        // Keep invalid Home references actionable; serialization must not turn them into All.
        if (!entry) return [value.startsWith(`${dimension}:`) ? value : `${dimension}:unresolved:${value}`];
        const candidates = dimension === 'environment' ? target : target.filter((item) => {
          const origin = entry as ProjectConfig;
          const project = item as ProjectConfig;
          return regional.environments.some((env) => (origin.environments === 'all' || origin.environments.includes(env.id))
            && (project.environments === 'all' || project.environments.includes(env.id)));
        });
        // Import-local IDs can coincide with a different Home project; explicit origins retain legacy renames.
        const identities = candidates.filter((item) => dimension === 'project' && projectOrigins[item.id] === entry.id
          || item.id === entry.id && (dimension === 'environment' || item.name.trim() === entry.name.trim()));
        const matches = identities.length ? identities : candidates.filter((item) => item.name.trim() === entry.name.trim());
        return matches.map((item) => `${dimension}:${item.id}`);
      });
      if (!mapped.length) absent = true;
      next[dimension] = [...new Set(mapped)];
    }
    if (!absent) filters[center] = next;
  }
  return { ...cfg, costCenterFilters: filters,
    tagValueLists: { ...cfg.tagValueLists, 'tag-lz-cost-center': Object.keys(filters).join(', ') } };
}

/** Regional resources consume labels; namespace definitions, defaults and budgets stay in Home. */
export function regionalCostGovernanceConfig(home: LzModel, regional: RegionalScopes = home, projectOrigins: Record<string, string> = {}): CostGovernanceConfig {
  const cfg = inheritRegionalCostGovernance(home, regional, projectOrigins);
  if (cfg.tagsEnabled === false) return { enable_tags: false, require_tag_values: false, tag_resource_labels: false, budgets: {} };
  const source = costGovernanceConfig(cfg, activeProjectNames(home), regional);
  const centers = Object.keys(source.cost_center_assignments ?? {});
  const units = [...new Set(Object.values(source.cost_center_business_units ?? {}))];
  return {
    enable_tags: true,
    require_tag_values: source.require_tag_values,
    tag_resource_labels: source.tag_resource_labels,
    owner_email: source.owner_email,
    cost_center_assignments: source.cost_center_assignments,
    cost_center_business_units: source.cost_center_business_units,
    ...(centers.length ? { tag_value_lists: { 'tag-lz-cost-center': centers, 'tag-lz-business-unit': units } } : {}),
    budgets: {},
  };
}
