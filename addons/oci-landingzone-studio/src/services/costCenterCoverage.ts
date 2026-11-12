export interface UncoveredCostResource {
  file: string;
  path: string;
  name: string;
  platform: string;
  environment: string;
  project: string;
}

/** Inspect final resource assignments, not LOV, Tag Defaults or bootstrap copies. */
export function costCenterCoverage(files: Record<string, unknown>): UncoveredCostResource[] {
  const uncovered: UncoveredCostResource[] = [];
  const prefix = 'tagns-lz-cost-governance.tag-lz-';
  function visit(value: unknown, file: string, path: string) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, file, `${path}/${index}`));
      return;
    }
    const resource = value as Record<string, unknown>;
    const tags = resource.defined_tags;
    if (tags && typeof tags === 'object' && !Array.isArray(tags)) {
      const values = tags as Record<string, unknown>;
      const center = values[`${prefix}cost-center`];
      if (Object.keys(values).some((key) => key.startsWith(prefix))
        && (typeof center !== 'string' || !center.trim() || center.trim() === 'tobedefined')) {
        const scope = (key: string) => String(values[`${prefix}${key}`] ?? '—');
        uncovered.push({ file, path, name: String(resource.name ?? resource.display_name ?? path.split('/').pop()),
          platform: scope('platform'), environment: scope('environment'), project: scope('project') });
      }
    }
    for (const [key, child] of Object.entries(resource)) {
      if (key !== 'defined_tags' && key !== 'default_defined_tags') visit(child, file, `${path}/${key}`);
    }
  }
  for (const [file, data] of Object.entries(files)) {
    if (!file.endsWith('.json') || file.endsWith('_pre.json')) continue;
    visit(typeof data === 'string' ? JSON.parse(data) : data, file, '');
  }
  return uncovered;
}

function recommendations(resources: readonly UncoveredCostResource[], model: LzModel): string[] {
  const cfg = model.foundation.costGovernance ?? defaultCostGovernance();
  const options = businessUnitScopeOptions(model);
  const dimensions = ['platform', 'environment', 'project'] as const;
  const rules = budgetTagValues(model, 'tag-lz-cost-center').filter((center) => center !== 'tobedefined').map((center) => {
    const scope = costCenterFilter(cfg, center);
    const resolve = (dimension: keyof BusinessUnitScope) => scope[dimension]?.map((value) =>
      options[dimension].find((option) => option.value === value)?.label ?? value) ?? null;
    return { center, scope: { platform: resolve('platform'), environment: resolve('environment'), project: resolve('project') } };
  });
  const changes = new Map<string, { center: string; dimension: keyof BusinessUnitScope; values: Set<string> }>();
  let needsChoice = false;
  for (const resource of resources) {
    // Prefer a center already covering the platform, then the environment.
    const weight = { platform: 4, environment: 2, project: 1 };
    const candidates = rules.map((rule) => ({ ...rule, missing: dimensions.filter((dimension) =>
      rule.scope[dimension]?.length && !rule.scope[dimension]!.includes(resource[dimension])) }))
      .map((rule) => ({ ...rule, distance: rule.missing.reduce((sum, dimension) => sum + weight[dimension], 0) }));
    const closest = candidates.filter((rule) => rule.distance === Math.min(...candidates.map((candidate) => candidate.distance)));
    if (closest.length !== 1 || closest[0].missing.length !== 1) { needsChoice = true; continue; }
    const { center, missing: [dimension] } = closest[0];
    const key = `${center}:${dimension}`;
    const change = changes.get(key) ?? { center, dimension, values: new Set<string>() };
    change.values.add(resource[dimension]);
    changes.set(key, change);
  }
  return [
    ...[...changes.values()].map(({ center, dimension, values }) =>
      `Edit ${center} → ${dimension[0].toUpperCase() + dimension.slice(1)}: include ${[...values].sort().join(', ')}, or select Not apply to remove this filter.`),
    ...(needsChoice ? ['Choose a cost center for the remaining resources and review its filters, or add a dedicated cost center.'] : []),
  ];
}

export function costCenterCoverageError(resources: readonly UncoveredCostResource[], model?: LzModel): string | null {
  if (!resources.length) return null;
  const advice = model ? recommendations(resources, model).join(' ') : 'Update the Platform, Environment and Project filters in Governance → tag-lz-cost-center before downloading.';
  return `${resources.length} ${resources.length === 1 ? 'resource has' : 'resources have'} no cost center. ${advice} Files with unassigned cost centers cannot be downloaded.`;
}
import type { BusinessUnitScope, LzModel } from '../model/types';
import { budgetTagValues, businessUnitScopeOptions, costCenterFilter, defaultCostGovernance } from './costGovernance';
