import published from '../../../../blueprints/one-oe/runtime/one-stack/oneoe_governance.json';
import type { BusinessUnitScope, CostBudget, CostGovernance, LzModel, TagCostBudget } from '../model/types';
import { notificationEmailError } from './notificationEmails';

export const inheritedCostTagNames = ['tag-lz-environment', 'tag-lz-project', 'tag-lz-platform'];
export const costTagDefinitions = Object.values(published.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags);
export const publishedBudgetDefinitions = published.budgets_configuration.budgets;
export const studioExcludedBudgetKeys = ['BUDGET-BUSINESS-UNIT-FINANCE-KEY'];
export const budgetKeys = Object.keys(publishedBudgetDefinitions);
type BudgetDefinition = (typeof publishedBudgetDefinitions)[keyof typeof publishedBudgetDefinitions];

export function activeProjectNames(model: LzModel): string[] {
  const envIds = new Set(model.environments.map((env) => env.id));
  return [...new Set(model.projects.filter((project) => project.environments === 'all'
    ? envIds.size > 0 : project.environments.some((id) => envIds.has(id)))
    .map((project) => project.name.trim()).filter(Boolean))].sort();
}

export function budgetDefinitions(projectNames: string[] = []): Record<string, BudgetDefinition> {
  const result: Record<string, BudgetDefinition> = { ...publishedBudgetDefinitions };
  const template = publishedBudgetDefinitions['BUDGET-PROJ1-KEY'];
  for (const project of [...new Set(projectNames)].sort()) {
    if (project === 'proj1') continue;
    const safe = project.replace(/[^A-Za-z0-9_-]/g, '-');
    const name = `budget-${safe}`;
    result[`BUDGET-PROJECT-${safe.toUpperCase()}-KEY`] = {
      ...template, name, description: `Monthly budget for tag-lz-project=${project}.`,
      target: { ...template.target, values: [`tagns-lz-cost-governance.tag-lz-project.${project}`] },
      defined_tags: { ...template.defined_tags, 'tagns-lz-cost-governance.tag-lz-project': project },
      alert_rule: { ...template.alert_rule, name: `${name}-${template.alert_rule.threshold_value}` },
    };
  }
  return result;
}
export function tagValueLists(model: LzModel): Record<string, string[]> {
  const envIds = new Set(model.environments.map((env) => env.id));
  const platforms = [
    'network', 'security', 'observability', 'iam', 'governance',
    ...model.platforms.filter((platform) => platform.environments === 'all' ? envIds.size > 0 : platform.environments.some((id) => envIds.has(id)))
      .map((platform) => platform.type === 'oke_simple' ? 'oke' : platform.key.trim()).filter(Boolean),
    ...model.sharedPlatforms.map((platform) => platform.key.trim()).filter(Boolean),
    ...(model.exadata.exacc.enabled ? ['exacc'] : []),
    ...(model.exadata.exacs.enabled ? ['exacs'] : []),
  ];
  return Object.fromEntries(costTagDefinitions.map((tag) => [tag.name, [...new Set([
    ...(tag.name === 'tag-lz-business-unit' ? ['IT'] : tag.name === 'tag-lz-environment' ? ['shared'] : tag.name === 'tag-lz-project' ? ['notapplicable'] : tag.name === 'tag-lz-platform' ? platforms : tag.valid_values.filter((value) => tag.name !== 'tag-lz-cost-center' || value !== 'tobedefined')),
    ...(tag.name === 'tag-lz-environment' ? model.environments.map((env) => env.name.trim()).filter(Boolean) : []),
    ...(tag.name === 'tag-lz-project' ? activeProjectNames(model) : []),
  ])]]));
}

const inheritedCostCenterBudget = 'BUDGET-COST-CENTER-CC12345-KEY';
const costCenterBudgetName = (value: string) => `budget-cost-center-${value.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

/** Reuse the edited budget and migrate its tag target when a cost-center value changes. */
export function syncCostCenterBudgets(cfg: CostGovernance, previousRaw: string): CostGovernance {
  let previous = parseTagValues(previousRaw);
  const current = parseTagValues(cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345');
  const links = { ...cfg.costCenterBudgetKeys };
  for (const [value, key] of Object.entries(links)) {
    const budget = cfg.additionalBudgets?.[key];
    if (key === inheritedCostCenterBudget ? value !== 'CC12345' : !budget || budget.tagName !== 'tag-lz-cost-center' || budget.tagValue !== value) delete links[value];
  }
  if (!previous.length && current.length === 1 && Object.keys(links).length === 1) previous = Object.keys(links);
  const added = current.filter((value) => !previous.includes(value));
  const deleted = previous.filter((value) => !current.includes(value));
  const scopes = { ...cfg.costCenterScopes };
  const filters = { ...cfg.costCenterFilters };
  const assignments = { ...(cfg.costCenterBusinessUnits ?? { CC12345: 'IT' }) };
  if (previous.length === 1 && scopes[previous[0]] === undefined) scopes[previous[0]] = 'landingzone';
  const additional = { ...cfg.additionalBudgets };
  const removed = new Set(cfg.removedBudgets ?? []);
  const template = defaultCostGovernance().budgets[inheritedCostCenterBudget];
  for (const value of previous) {
    if (links[value]) continue;
    const custom = Object.entries(additional).find(([, budget]) => budget.tagName === 'tag-lz-cost-center' && budget.tagValue === value);
    if (custom) links[value] = custom[0];
    else if (value === 'CC12345') links[value] = inheritedCostCenterBudget;
  }
  const create = (value: string, source: CostBudget) => {
    let number = 1;
    while (additional[`BUDGET-CUSTOM-COST-CENTER-${number}-KEY`]) number++;
    const key = `BUDGET-CUSTOM-COST-CENTER-${number}-KEY`;
    additional[key] = { ...source, name: costCenterBudgetName(value), tagName: 'tag-lz-cost-center', tagValue: value };
    return key;
  };
  if (deleted.length === 1 && added.length === 1) {
    const oldValue = deleted[0], newValue = added[0];
    const key = links[oldValue];
    if (key === inheritedCostCenterBudget) {
      const source = cfg.budgets[key] ?? template;
      links[newValue] = create(newValue, source);
      if (source.name !== costCenterBudgetName(oldValue)) additional[links[newValue]].name = source.name;
      if (removed.has(key)) removed.add(links[newValue]);
      removed.add(key);
    } else if (key) {
      links[newValue] = key;
      if (additional[key]) additional[key] = { ...additional[key], tagValue: newValue,
        name: additional[key].name === costCenterBudgetName(oldValue) ? costCenterBudgetName(newValue) : additional[key].name };
    } else links[newValue] = create(newValue, template);
    if (scopes[oldValue] !== undefined) scopes[newValue] = scopes[oldValue];
    if (filters[oldValue]) filters[newValue] = filters[oldValue];
    if (assignments[oldValue]) assignments[newValue] = assignments[oldValue];
    delete assignments[oldValue];
    delete filters[oldValue];
    delete links[oldValue]; delete scopes[oldValue];
  } else {
    for (const value of added) {
      const existing = Object.entries(additional).find(([, budget]) => budget.tagName === 'tag-lz-cost-center' && budget.tagValue === value);
      links[value] = existing?.[0] ?? (value === 'CC12345' ? inheritedCostCenterBudget : create(value, template));
      removed.delete(links[value]);
    }
  }
  if (current.length && !current.includes('CC12345')) removed.add(inheritedCostCenterBudget);
  return { ...cfg, additionalBudgets: additional, removedBudgets: [...removed], costCenterBudgetKeys: links, costCenterScopes: scopes, costCenterFilters: filters, costCenterBusinessUnits: assignments };
}

export function addCostCenters(cfg: CostGovernance, raw: string, scope = 'landingzone'): CostGovernance {
  const previousRaw = cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345';
  const previous = parseTagValues(previousRaw);
  const added = parseTagValues(raw).filter((value) => !previous.includes(value));
  if (!added.length) return cfg;
  const next = syncCostCenterBudgets({ ...cfg, tagValueLists: { ...cfg.tagValueLists, 'tag-lz-cost-center': [...previous, ...added].join(', ') } }, previousRaw);
  return { ...next, costCenterScopes: { ...next.costCenterScopes, ...Object.fromEntries(added.map((value) => [value, scope])) } };
}

export function removeCostCenter(cfg: CostGovernance, value: string): CostGovernance {
  const remaining = parseTagValues(cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345').filter((entry) => entry !== value);
  const deleted = new Set(Object.entries(cfg.additionalBudgets ?? {}).filter(([, budget]) =>
    budget.tagName === 'tag-lz-cost-center' && budget.tagValue === value).map(([key]) => key));
  const removed = new Set((cfg.removedBudgets ?? []).filter((key) => !deleted.has(key)));
  if (value === 'CC12345') removed.add(inheritedCostCenterBudget);
  return { ...cfg,
    tagValueLists: { ...cfg.tagValueLists, 'tag-lz-cost-center': remaining.join(', ') },
    additionalBudgets: Object.fromEntries(Object.entries(cfg.additionalBudgets ?? {}).filter(([key]) => !deleted.has(key))),
    removedBudgets: [...removed],
    costCenterBusinessUnits: Object.fromEntries(Object.entries(cfg.costCenterBusinessUnits ?? { CC12345: 'IT' }).filter(([entry]) => entry !== value)),
    costCenterFilters: Object.fromEntries(Object.entries(cfg.costCenterFilters ?? {}).filter(([entry]) => entry !== value)),
    costCenterScopes: Object.fromEntries(Object.entries(cfg.costCenterScopes ?? {}).filter(([entry]) => entry !== value)),
    costCenterBudgetKeys: Object.fromEntries(Object.entries(cfg.costCenterBudgetKeys ?? {}).filter(([entry, key]) => entry !== value && !deleted.has(key))),
  };
}

export function businessUnitAssignments(cfg: Pick<CostGovernance, 'tagValueLists' | 'costCenterBusinessUnits'>): Record<string, string> {
  const centers = parseTagValues(cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345');
  const units = parseTagValues(cfg.tagValueLists?.['tag-lz-business-unit'] ?? 'IT');
  return Object.fromEntries(Object.entries(cfg.costCenterBusinessUnits ?? { CC12345: 'IT' }).filter(([center, unit]) => centers.includes(center) && units.includes(unit)));
}

export function unassignedCostCenterErrors(cfg: CostGovernance): string[] {
  const assignments = businessUnitAssignments(cfg);
  return parseTagValues(cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345')
    .filter((center) => center !== 'tobedefined' && !assignments[center])
    .map((center) => `Cost center ${center}: Assign a business unit before downloading.`);
}

export function syncBusinessUnitAssignments(cfg: CostGovernance, previousRaw: string): CostGovernance {
  const current = parseTagValues(cfg.tagValueLists?.['tag-lz-business-unit'] ?? 'IT');
  const previous = parseTagValues(previousRaw);
  const deleted = previous.filter((unit) => !current.includes(unit));
  const added = current.filter((unit) => !previous.includes(unit));
  const renamed = deleted.length === 1 && added.length === 1;
  return { ...cfg, costCenterBusinessUnits: Object.fromEntries(Object.entries(cfg.costCenterBusinessUnits ?? { CC12345: 'IT' })
    .map(([center, unit]) => [center, renamed && unit === deleted[0] ? added[0] : unit])
    .filter(([, unit]) => current.includes(unit))) };
}

export function assignCostCenterBusinessUnit(cfg: CostGovernance, center: string, unit: string | null): CostGovernance {
  const assignments = businessUnitAssignments(cfg);
  const centers = parseTagValues(cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345');
  const units = parseTagValues(cfg.tagValueLists?.['tag-lz-business-unit'] ?? 'IT');
  if (!centers.includes(center) || (unit !== null && (!units.includes(unit) || (assignments[center] && assignments[center] !== unit)))) return cfg;
  if (unit === null) delete assignments[center];
  else assignments[center] = unit;
  return { ...cfg, costCenterBusinessUnits: assignments };
}

/** Preserve saved single scopes when opening the three-filter editor. */
export function costCenterFilter(cfg: Pick<CostGovernance, 'costCenterFilters' | 'costCenterScopes' | 'costCenterCustomScopes'>, value: string): BusinessUnitScope {
  if (cfg.costCenterFilters?.[value]) return cfg.costCenterFilters[value];
  let scope = cfg.costCenterScopes?.[value] ?? 'landingzone';
  if (scope.startsWith('custom:')) scope = cfg.costCenterCustomScopes?.find((entry) => `custom:${entry.id}` === scope)?.target ?? scope;
  return { platform: null,
    environment: scope === 'shared' || scope.startsWith('environment:') ? [scope] : null,
    project: scope.startsWith('project:') ? [scope] : null };
}

export function defaultBusinessUnitScope(value: string, projectValues: string[]): BusinessUnitScope {
  if (value === 'IT') return { platform: null, environment: ['shared'], project: ['notapplicable'] };
  if (value === 'Retail') return { platform: null, environment: null, project: projectValues };
  return { platform: null, environment: null, project: null };
}

export function businessUnitScopeOptions(model: LzModel): Record<keyof BusinessUnitScope, { value: string; label: string }[]> {
  const projects = activeProjectNames(model);
  return {
    platform: tagValueLists(model)['tag-lz-platform'].map((value) => ({ value, label: value })),
    environment: [{ value: 'shared', label: 'shared' }, ...model.environments.filter((env) => env.name.trim()).map((env) => ({ value: `environment:${env.id}`, label: env.name.trim() }))],
    project: [{ value: 'notapplicable', label: 'notapplicable' }, ...model.projects.filter((project) => projects.includes(project.name.trim())).map((project) => ({ value: `project:${project.id}`, label: project.name.trim() }))],
  };
}

export function costCenterScopeOptions(model: LzModel): { value: string; label: string }[] {
  const projects = activeProjectNames(model);
  return [
    { value: 'landingzone', label: 'All LZ' }, { value: 'shared', label: 'shared' },
    ...model.environments.filter((env) => env.name.trim()).map((env) => ({ value: `environment:${env.id}`, label: env.name.trim() })),
    ...model.projects.filter((project) => projects.includes(project.name.trim())).map((project) => ({ value: `project:${project.id}`, label: project.name.trim() })),
    ...(model.foundation.costGovernance?.costCenterCustomScopes ?? []).map((scope) => ({ value: `custom:${scope.id}`, label: scope.name })),
  ];
}

export function parseTagValues(value: string): string[] {
  return [...new Set(value.split(/[,\r\n]+/).map((item) => item.trim()).filter(Boolean))].sort();
}

export function budgetTagValues(model: LzModel, tagName: string): string[] {
  const cfg = model.foundation.costGovernance ?? defaultCostGovernance(activeProjectNames(model));
  if (tagName === 'tag-lz-owner') return ownerEmailError(ownerEmail(cfg)) ? [] : [ownerEmail(cfg)];
  const inherited = tagValueLists(model)[tagName] ?? [];
  return inheritedCostTagNames.includes(tagName) ? inherited : parseTagValues(cfg.tagValueLists?.[tagName] ?? inherited.join(', '));
}

export function customBudgetError(budget: TagCostBudget, allowedValues?: string[]): string | null {
  if (!costTagDefinitions.some((tag) => tag.name === budget.tagName)) return 'Choose a FinOps/Governance tag.';
  if (!budget.tagValue.trim()) return 'Enter a tag value for this budget.';
  if (allowedValues && !allowedValues.includes(budget.tagValue)) return 'Choose a value defined for this tag.';
  return null;
}

export function ownerEmail(cfg: CostGovernance): string {
  return cfg.ownerEmail ?? cfg.tagValueLists?.['tag-lz-owner'] ?? 'email.address@example.com';
}

export function ownerEmailError(value: string): string | null {
  return /[,;\s]/.test(value) || notificationEmailError(value) ? 'Enter one valid owner email address.' : null;
}

type BudgetOverride = { name: string; amount: number; alert_rule: { threshold_value: number; recipients?: string } };
export interface CostGovernanceConfig {
  enable_tags?: boolean;
  tag_resource_labels?: boolean;
  cost_center_business_units?: Record<string, string>;
  cost_center_assignments?: Record<string, BusinessUnitScope>;
  owner_email?: string;
  tag_value_lists?: Record<string, string[]>;
  additional_budgets?: Record<string, BudgetOverride & { tag_name: string; tag_value: string }>;
  exclude_budgets?: string[];
  require_tag_values: boolean;
  budget_recipients?: string;
  budgets: Record<string, BudgetOverride>;
}

export function defaultCostGovernance(projectNames: string[] = []): CostGovernance {
  const recipients = '';
  return {
    tagValueLists: { 'tag-lz-business-unit': 'IT' },
    costCenterBusinessUnits: { CC12345: 'IT' },
    requireTagValues: false, useSingleRecipient: true, recipients, removedBudgets: [...studioExcludedBudgetKeys],
    budgets: Object.fromEntries(Object.entries(budgetDefinitions(projectNames)).map(([key, budget]) => [key, {
      name: budget.name, amount: budget.amount, thresholdValue: budget.alert_rule.threshold_value, recipients,
    }])),
  };
}

export function setFinOpsTagsEnabled(cfg: CostGovernance, enabled: boolean): CostGovernance {
  return { ...cfg, tagsEnabled: enabled, requireTagValues: enabled };
}

export function normalizeBudgetRecipients(value: string): string {
  return value.trim().split(/[,;\s]+/).filter(Boolean).join(',');
}

export function budgetRecipientError(value: string, single = false): string | null {
  const emails = normalizeBudgetRecipients(value);
  if (!emails || emails.split(',').some((email) => email.toLowerCase() === 'email.address@example.com')) return notificationEmailError('');
  if (single && emails.includes(',')) return 'Enter a single email address.';
  return notificationEmailError(emails);
}

export function budgetFieldError(field: keyof CostBudget, value: string | number): string | null {
  if (field === 'name') return typeof value === 'string' && /^[A-Za-z_-][A-Za-z0-9_-]*$/.test(value) ? null : 'Use letters, numbers, hyphens or underscores; do not start with a number.';
  if (field === 'amount') return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 999999999999 ? null : 'Enter a whole amount between 1 and 999,999,999,999.';
  if (field === 'thresholdValue') return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 10000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001 ? null : 'Enter a percentage greater than 0 and at most 10,000, with up to two decimals.';
  return typeof value === 'string' ? budgetRecipientError(value) : 'Enter valid email addresses.';
}

type CostCenterContext = Pick<LzModel, 'environments' | 'projects'>;

function exportCostCenterAssignments(cfg: CostGovernance, model: CostCenterContext): Record<string, BusinessUnitScope> {
  const resolve = (values: string[] | null, dimension: keyof BusinessUnitScope) => {
    if (!values?.length) return null;
    return values.map((value) => {
      if (dimension === 'platform') return value;
      const entries = dimension === 'environment' ? model.environments : model.projects;
      const entry = entries.find((item) => `${dimension}:${item.id}` === value || item.name.trim() === value);
      if (entry) return entry.name.trim();
      if (value === 'shared' && dimension === 'environment' || value === 'notapplicable' && dimension === 'project') return value;
      throw new Error(`Unknown cost center ${dimension} filter: ${value}`);
    });
  };
  return Object.fromEntries(parseTagValues(cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345').filter((center) => center !== 'tobedefined').map((center) => {
    const filter = costCenterFilter(cfg, center);
    return [center, { platform: resolve(filter.platform, 'platform'), environment: resolve(filter.environment, 'environment'), project: resolve(filter.project, 'project') }];
  }));
}

/** Inherited Business Unit budgets must not reintroduce values removed from the LOV. */
export function inactiveBusinessUnitBudgetKeys(cfg: CostGovernance, projectNames: string[] = []): string[] {
  const raw = cfg.tagValueLists?.['tag-lz-business-unit'] ?? 'IT';
  const units = parseTagValues(raw);
  const field = 'tagns-lz-cost-governance.tag-lz-business-unit';
  return Object.entries(budgetDefinitions(projectNames)).filter(([, budget]) =>
    budget.target.type === 'TAG' && budget.target.values.some((value) => value.startsWith(`${field}.`))
    && !units.includes(budget.defined_tags[field])).map(([key]) => key);
}

export function costGovernanceConfig(value: CostGovernance | undefined, projectNames: string[] = [], model?: CostCenterContext): CostGovernanceConfig {
  const cfg = value ?? defaultCostGovernance(projectNames);
  const defaults = defaultCostGovernance(projectNames);
  const tagsEnabled = cfg.tagsEnabled !== false;
  const keys = tagsEnabled ? [...Object.keys(defaults.budgets), ...Object.keys(cfg.additionalBudgets ?? {})]
    : Object.keys(budgetDefinitions(projectNames)).filter((key) => budgetDefinitions(projectNames)[key].target.type === 'COMPARTMENT');
  const removed = [...new Set([...studioExcludedBudgetKeys, ...inactiveBusinessUnitBudgetKeys(cfg, projectNames), ...(cfg.removedBudgets ?? [])])].filter((key) => keys.includes(key));
  const activeKeys = keys.filter((key) => !removed.includes(key));
  const editableTagLists = Object.entries({ ...cfg.tagValueLists, ...(cfg.tagValueLists?.['tag-lz-business-unit'] === undefined ? { 'tag-lz-business-unit': 'IT' } : {}) }).filter(([name]) => !inheritedCostTagNames.includes(name) && name !== 'tag-lz-owner');
  return {
    ...(tagsEnabled ? {
      require_tag_values: cfg.requireTagValues,
      tag_resource_labels: cfg.tagResourceLabels ?? true,
      cost_center_business_units: businessUnitAssignments(cfg),
      ...(model ? { cost_center_assignments: exportCostCenterAssignments(cfg, model) } : {}),
      owner_email: ownerEmail(cfg),
      ...(editableTagLists.length ? { tag_value_lists: Object.fromEntries(editableTagLists.map(([tag, values]) => [tag, parseTagValues(values)])) } : {}),
      ...(cfg.additionalBudgets && Object.keys(cfg.additionalBudgets).length ? { additional_budgets: Object.fromEntries(Object.entries(cfg.additionalBudgets).map(([key, budget]) => [key, {
        tag_name: budget.tagName, tag_value: budget.tagValue.trim(), name: budget.name, amount: budget.amount,
        alert_rule: { threshold_value: budget.thresholdValue, ...(!cfg.useSingleRecipient && (!removed.includes(key) || !budgetRecipientError(budget.recipients)) ? { recipients: normalizeBudgetRecipients(budget.recipients) } : {}) },
      }])) } : {}),
    } : { enable_tags: false, require_tag_values: false, tag_resource_labels: false }),
    ...(removed.length ? { exclude_budgets: removed } : {}),
    ...(cfg.useSingleRecipient && activeKeys.length ? { budget_recipients: normalizeBudgetRecipients(cfg.recipients) } : {}),
    budgets: Object.fromEntries(keys.filter((key) => !cfg.additionalBudgets?.[key]).map((key) => {
      const current = cfg.budgets[key] ?? defaults.budgets[key];
      const budget = removed.includes(key) ? Object.fromEntries(Object.entries(current).map(([field, value]) =>
        [field, budgetFieldError(field as keyof CostBudget, value) ? defaults.budgets[key][field as keyof CostBudget] : value])) as unknown as CostBudget : current;
      return [key, { name: budget.name, amount: budget.amount, alert_rule: {
        threshold_value: budget.thresholdValue,
        ...(!cfg.useSingleRecipient && (!removed.includes(key) || !budgetRecipientError(budget.recipients)) ? { recipients: normalizeBudgetRecipients(budget.recipients) } : {}),
      } }];
    })),
  };
}

export function validateCostGovernance(model: LzModel): string[] {
  if (model.foundation.stackScope === 'regional') return [];
  const projects = activeProjectNames(model);
  const defaults = defaultCostGovernance(projects);
  const cfg = model.foundation.costGovernance ?? defaults;
  const tagsEnabled = cfg.tagsEnabled !== false;
  const keys = tagsEnabled ? [...Object.keys(defaults.budgets).filter((key) => ![...studioExcludedBudgetKeys, ...inactiveBusinessUnitBudgetKeys(cfg, projects)].includes(key)), ...Object.keys(cfg.additionalBudgets ?? {})]
    : Object.keys(budgetDefinitions(projects)).filter((key) => budgetDefinitions(projects)[key].target.type === 'COMPARTMENT');
  const sharedError = cfg.useSingleRecipient && keys.some((key) => !cfg.removedBudgets?.includes(key)) ? budgetRecipientError(cfg.recipients, true) : null;
  const fields: Array<keyof CostBudget> = ['name', 'amount', 'thresholdValue', ...(!cfg.useSingleRecipient ? ['recipients'] as const : [])];
  const tagErrors = !tagsEnabled ? [] : Object.entries(cfg.tagValueLists ?? {}).filter(([name]) => !inheritedCostTagNames.includes(name) && name !== 'tag-lz-owner').flatMap(([name, raw]) =>
    !costTagDefinitions.some((tag) => tag.name === name) || !parseTagValues(raw).length ? [`${name}: Enter at least one tag value.`] : []);
  const customErrors = !tagsEnabled ? [] : Object.entries(cfg.additionalBudgets ?? {}).filter(([key]) => !cfg.removedBudgets?.includes(key)).flatMap(([, budget]) => {
    const error = customBudgetError(budget, budgetTagValues(model, budget.tagName)); return error ? [`${budget.name}: ${error}`] : [];
  });
  const ownerError = tagsEnabled ? ownerEmailError(ownerEmail(cfg)) : null;
  const assignments = businessUnitAssignments(cfg);
  const unitErrors = !tagsEnabled ? [] : budgetTagValues(model, 'tag-lz-business-unit').filter((unit) => !Object.values(assignments).includes(unit)).map((unit) => `Business unit ${unit}: Assign at least one cost center.`);
  const centerErrors = tagsEnabled ? unassignedCostCenterErrors(cfg) : [];
  return [...unitErrors, ...centerErrors, ...(ownerError ? [`tag-lz-owner: ${ownerError}`] : []), ...tagErrors, ...customErrors, ...(sharedError ? [`Budget alerts: ${sharedError}`] : []), ...keys.filter((key) => !cfg.removedBudgets?.includes(key)).flatMap((key) => {
    const budget = cfg.additionalBudgets?.[key] ?? cfg.budgets[key] ?? defaults.budgets[key];
    return fields.flatMap((field) => {
      const error = budgetFieldError(field, budget[field]);
      return error ? [`${budget.name || key} (${field}): ${error}`] : [];
    });
  })];
}

export function importCostGovernance(value: unknown, projectNames: string[] = [], model?: CostCenterContext): CostGovernance {
  const fail = (): never => { throw new Error('Cannot import cost_governance: invalid or unsupported configuration.'); };
  const obj = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail();
  const cfg = obj(value);
  if (Object.keys(cfg).some((key) => !['enable_tags', 'require_tag_values', 'owner_email', 'budget_recipients', 'budgets', 'exclude_budgets', 'tag_value_lists', 'additional_budgets', 'cost_center_assignments', 'tag_resource_labels', 'cost_center_business_units'].includes(key))) fail();
  const result = defaultCostGovernance(projectNames);
  if (cfg.enable_tags !== undefined) {
    if (typeof cfg.enable_tags !== 'boolean') fail();
    result.tagsEnabled = cfg.enable_tags as boolean;
  }
  if (cfg.tag_resource_labels !== undefined) {
    if (typeof cfg.tag_resource_labels !== 'boolean') fail();
    result.tagResourceLabels = cfg.tag_resource_labels as boolean;
  }
  if (cfg.owner_email !== undefined) {
    if (typeof cfg.owner_email !== 'string' || ownerEmailError(cfg.owner_email)) fail();
    result.ownerEmail = cfg.owner_email as string;
  }
  if (cfg.tag_value_lists !== undefined) {
    result.tagValueLists = {};
    for (const [name, values] of Object.entries(obj(cfg.tag_value_lists))) {
      if (!costTagDefinitions.some((tag) => tag.name === name) || !Array.isArray(values) || !values.length || values.some((item) => typeof item !== 'string' || !item.trim() || item !== item.trim() || item.includes('\n') || item.includes('\r') || item.includes(','))) fail();
      result.tagValueLists[name] = (values as string[]).join(', ');
    }
  }
  if (cfg.cost_center_assignments !== undefined) {
    result.costCenterFilters = {};
    const centers = Object.keys(obj(cfg.cost_center_assignments));
    if (result.tagValueLists?.['tag-lz-cost-center'] !== undefined || centers.length !== 1 || centers[0] !== 'CC12345') {
      result.tagValueLists = { ...result.tagValueLists, 'tag-lz-cost-center': [...new Set([...parseTagValues(result.tagValueLists?.['tag-lz-cost-center'] ?? ''), ...centers])].join(', ') };
    }
    for (const [center, raw] of Object.entries(obj(cfg.cost_center_assignments))) {
      if (!center.trim() || center !== center.trim()) fail();
      const rule = obj(raw);
      if (Object.keys(rule).some((key) => !['platform', 'environment', 'project'].includes(key))) fail();
      const restore = (dimension: keyof BusinessUnitScope): string[] | null => {
        const values = rule[dimension];
        if (values === undefined || values === null) return null;
        if (!Array.isArray(values) || values.some((v) => typeof v !== 'string' || !v.trim() || v !== v.trim())) return fail();
        if (!values.length) return null;
        return values.map((value: string) => {
          if (dimension === 'platform') return value;
          const entries = dimension === 'environment' ? model?.environments : model?.projects;
          const entry = entries?.find((item) => item.name.trim() === value);
          if (entry) return `${dimension}:${entry.id}`;
          if (dimension === 'environment' && value === 'shared' || dimension === 'project' && value === 'notapplicable') return value;
          return model ? fail() : value;
        });
      };
      result.costCenterFilters[center] = { platform: restore('platform'), environment: restore('environment'), project: restore('project') };
    }
  }
  if (cfg.cost_center_business_units !== undefined) {
    const associations = obj(cfg.cost_center_business_units);
    const centers = parseTagValues(result.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345');
    const units = parseTagValues(result.tagValueLists?.['tag-lz-business-unit'] ?? 'IT');
    if (Object.entries(associations).some(([center, unit]) => !centers.includes(center) || typeof unit !== 'string' || !units.includes(unit))) fail();
    result.costCenterBusinessUnits = associations as Record<string, string>;
  }
  const additional = cfg.additional_budgets === undefined ? {} : obj(cfg.additional_budgets);
  result.additionalBudgets = {};
  for (const [key, raw] of Object.entries(additional)) {
    if (!/^BUDGET-CUSTOM-[A-Z0-9_-]+-KEY$/.test(key) || key in result.budgets) fail();
    const entry = obj(raw);
    if (Object.keys(entry).some((field) => !['tag_name', 'tag_value', 'name', 'amount', 'alert_rule'].includes(field))) fail();
    const budget: TagCostBudget = { tagName: entry.tag_name as string, tagValue: entry.tag_value as string, name: entry.name as string, amount: entry.amount as number, thresholdValue: 80, recipients: result.recipients };
    if (typeof budget.tagName !== 'string' || typeof budget.tagValue !== 'string' || customBudgetError(budget) || budgetFieldError('name', budget.name) || budgetFieldError('amount', budget.amount)) fail();
    result.additionalBudgets[key] = budget;
  }
  const keys = [...Object.keys(result.budgets), ...Object.keys(result.additionalBudgets)];
  if (cfg.exclude_budgets !== undefined) {
    if (!Array.isArray(cfg.exclude_budgets) || cfg.exclude_budgets.some((key) => typeof key !== 'string' || !keys.includes(key))) fail();
    result.removedBudgets = [...new Set(cfg.exclude_budgets as string[])];
  }
  if (cfg.require_tag_values !== undefined) {
    if (typeof cfg.require_tag_values !== 'boolean') fail();
    result.requireTagValues = cfg.require_tag_values as boolean;
  }
  result.useSingleRecipient = cfg.budget_recipients !== undefined;
  if (cfg.budget_recipients !== undefined) {
    if (typeof cfg.budget_recipients !== 'string' || (cfg.budget_recipients.trim() && budgetRecipientError(cfg.budget_recipients))) fail();
    result.recipients = normalizeBudgetRecipients(cfg.budget_recipients as string);
    if (result.recipients.includes(',')) result.useSingleRecipient = false;
  }
  const inherited = obj(cfg.budgets === undefined ? {} : cfg.budgets);
  if (Object.keys(inherited).some((key) => !Object.hasOwn(result.budgets, key))) fail();
  const entries = { ...inherited, ...Object.fromEntries(Object.entries(additional).map(([key, raw]) => {
    const entry = obj(raw); return [key, Object.fromEntries(Object.entries(entry).filter(([field]) => !['tag_name', 'tag_value'].includes(field)))];
  })) };
  for (const [key, raw] of Object.entries(entries)) {
    if (!keys.includes(key)) fail();
    const budget = result.additionalBudgets[key] ?? result.budgets[key];
    const override = obj(raw);
    if (Object.keys(override).some((field) => !['name', 'amount', 'alert_rule'].includes(field))) fail();
    for (const field of ['name', 'amount'] as const) {
      if (override[field] !== undefined) {
        if (budgetFieldError(field, override[field] as string | number)) fail();
        Object.assign(budget, { [field]: override[field] });
      }
    }
    const alert = obj(override.alert_rule === undefined ? {} : override.alert_rule);
    if (Object.keys(alert).some((field) => !['threshold_value', 'recipients'].includes(field))) fail();
    if (alert.threshold_value !== undefined) {
      if (budgetFieldError('thresholdValue', alert.threshold_value as number)) fail();
      budget.thresholdValue = alert.threshold_value as number;
    }
    if (alert.recipients !== undefined) {
      if (typeof alert.recipients !== 'string' || (alert.recipients.trim() && budgetRecipientError(alert.recipients))) fail();
      budget.recipients = normalizeBudgetRecipients(alert.recipients as string);
    }
  }
  if (cfg.budget_recipients !== undefined) for (const budget of [...Object.values(result.budgets), ...Object.values(result.additionalBudgets)]) budget.recipients = result.recipients;
  return result;
}
