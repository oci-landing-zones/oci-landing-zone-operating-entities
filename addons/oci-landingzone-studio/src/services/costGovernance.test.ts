import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { buildConfig } from './lzConfig';
import { importConfig } from './importConfig';
import { setFinOpsTagsEnabled, budgetFieldError, budgetTagValues, customBudgetError, budgetKeys, budgetRecipientError, costGovernanceConfig, parseTagValues, tagValueLists, defaultCostGovernance, ownerEmail, ownerEmailError, syncCostCenterBudgets, addCostCenters, businessUnitScopeOptions, defaultBusinessUnitScope, businessUnitAssignments, assignCostCenterBusinessUnit, syncBusinessUnitAssignments, costCenterFilter, removeCostCenter, costCenterScopeOptions, validateCostGovernance } from './costGovernance';
function taggedModel() {
  const model = emptyLzModel();
  model.foundation.costGovernance = defaultCostGovernance();
  return model;
}


describe('cost governance', () => {
  it('requires notification emails instead of accepting the inherited example address', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
    expect(cfg.recipients).toBe('');
    expect(validateCostGovernance(model)).toContain('Budget alerts: Enter at least one notification email address.');
    expect(budgetRecipientError('email.address@example.com')).toBe('Enter at least one notification email address.');
    cfg.recipients = 'finops@example.com';
    expect(validateCostGovernance(model).filter((error) => error.startsWith('Budget alerts:'))).toEqual([]);
    cfg.useSingleRecipient = false;
    expect(validateCostGovernance(model)).toContain('budget-landingzone (recipients): Enter at least one notification email address.');
    for (const budget of Object.values(cfg.budgets)) budget.recipients = 'finops@example.com';
    expect(validateCostGovernance(model)).toEqual([]);
    cfg.budgets['BUDGET-LANDINGZONE-KEY'].recipients = '';
    cfg.removedBudgets = [...(cfg.removedBudgets ?? []), 'BUDGET-LANDINGZONE-KEY'];
    expect(validateCostGovernance(model)).toEqual([]);
    expect(buildConfig(model).cost_governance?.budgets['BUDGET-LANDINGZONE-KEY'].alert_rule.recipients).toBeUndefined();
  });
  it('assigns CC12345 to IT by default and preserves it in exported configuration', () => {
    const model = taggedModel();
    expect(businessUnitAssignments(defaultCostGovernance())).toEqual({ CC12345: 'IT' });
    const config = buildConfig(model);
    expect(config.cost_governance?.cost_center_business_units).toEqual({ CC12345: 'IT' });
    expect(buildConfig(importConfig(config).model)).toEqual(config);
    expect(validateCostGovernance(model).filter((error) => /Business unit|Assign.*business unit/.test(error))).toEqual([]);
  });
  it('blocks missing business unit assignments without restoring an explicitly removed default', () => {
    const model = taggedModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), costCenterBusinessUnits: {} };
    expect(businessUnitAssignments(model.foundation.costGovernance)).toEqual({});
    expect(validateCostGovernance(model)).toContain('Business unit IT: Assign at least one cost center.');
    expect(validateCostGovernance(model)).toContain('Cost center CC12345: Assign a business unit before downloading.');
    model.foundation.costGovernance = addCostCenters(defaultCostGovernance(), 'CC2');
    expect(validateCostGovernance(model)).toContain('Cost center CC2: Assign a business unit before downloading.');
    model.foundation.costGovernance = assignCostCenterBusinessUnit(model.foundation.costGovernance, 'CC2', 'IT');
    expect(validateCostGovernance(model)).not.toContain('Cost center CC2: Assign a business unit before downloading.');
  });
  it('exports cost center filters using inherited names and restores the editor selections', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
    cfg.costCenterFilters = { CC12345: { platform: ['network'], environment: [`environment:${model.environments[0].id}`], project: [`project:${model.projects[0].id}`] } };
    const config = buildConfig(model);
    expect(config.cost_governance).toHaveProperty('cost_center_assignments', {
      CC12345: { platform: ['network'], environment: ['prod'], project: ['proj1'] },
    });
    const restored = importConfig(config).model;
    expect(restored.foundation.costGovernance?.costCenterFilters?.CC12345).toEqual({
      platform: ['network'], environment: [`environment:${restored.environments[0].id}`], project: [`project:${restored.projects[0].id}`],
    });
    expect(buildConfig(restored)).toEqual(config);
  });
  it('exports the default cost center as All LZ and keeps Not apply filters inactive', () => {
    const model = taggedModel();
    expect(buildConfig(model).cost_governance).toHaveProperty('cost_center_assignments', {
      CC12345: { platform: null, environment: null, project: null },
    });
  });
  it('keeps the placeholder in the LOV without exporting an assignment rule for it', () => {
    const model = taggedModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), tagValueLists: { 'tag-lz-cost-center': 'tobedefined, CC900' } };
    const config = buildConfig(model);
    expect(config.cost_governance?.cost_center_assignments).toEqual({ CC900: { platform: null, environment: null, project: null } });
    expect(config.cost_governance?.tag_value_lists?.['tag-lz-cost-center']).toEqual(['CC900', 'tobedefined']);
  });
  it('excludes inherited budgets for business units removed from the LOV', () => {
    const model = taggedModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), tagValueLists: { 'tag-lz-business-unit': 'IT' } };
    expect(buildConfig(model).cost_governance?.exclude_budgets).toContain('BUDGET-BUSINESS-UNIT-RETAIL-KEY');
    model.foundation.costGovernance.tagValueLists!['tag-lz-business-unit'] = 'IT, Retail';
    expect(buildConfig(model).cost_governance?.exclude_budgets).not.toContain('BUDGET-BUSINESS-UNIT-RETAIL-KEY');
  });
  it('exports Business Unit assignments and rejects units without a cost center', () => {
    const model = taggedModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), tagValueLists: { 'tag-lz-business-unit': 'IT' }, costCenterBusinessUnits: {} };
    expect(validateCostGovernance(model)).toContain('Business unit IT: Assign at least one cost center.');
    model.foundation.costGovernance.costCenterBusinessUnits = { CC12345: 'IT' };
    expect(validateCostGovernance(model)).not.toContain('Business unit IT: Assign at least one cost center.');
    const config = buildConfig(model);
    expect(config.cost_governance).toHaveProperty('cost_center_business_units', { CC12345: 'IT' });
    expect(buildConfig(importConfig(config).model)).toEqual(config);
  });
  it('offers only values defined for the selected budget tag', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
    cfg.tagValueLists = { 'tag-lz-cost-center': 'CC1, CC2', 'tag-lz-business-unit': 'Sales, IT', 'tag-lz-project': 'obsolete' };
    cfg.ownerEmail = 'owner@example.com';
    expect(budgetTagValues(model, 'tag-lz-cost-center')).toEqual(['CC1', 'CC2']);
    expect(budgetTagValues(model, 'tag-lz-business-unit')).toEqual(['IT', 'Sales']);
    expect(budgetTagValues(model, 'tag-lz-project')).toEqual(['notapplicable', 'proj1']);
    expect(budgetTagValues(model, 'tag-lz-platform')).toEqual(expect.arrayContaining(['network', 'security', 'iam', 'governance', 'observability']));
    expect(budgetTagValues(model, 'tag-lz-owner')).toEqual(['owner@example.com']);
    const budget = { name: 'budget-team', amount: 500, thresholdValue: 80, recipients: '', tagName: 'tag-lz-cost-center', tagValue: 'missing' };
    expect(customBudgetError(budget, budgetTagValues(model, budget.tagName))).toBe('Choose a value defined for this tag.');
    expect(customBudgetError({ ...budget, tagValue: 'CC1' }, budgetTagValues(model, budget.tagName))).toBeNull();
  });
  it('uses a single global owner email and retains it on export and import', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
    expect(ownerEmail(cfg)).toBe('email.address@example.com');
    cfg.ownerEmail = 'owner@example.com';
    const config = buildConfig(model);
    expect(config.cost_governance?.owner_email).toBe('owner@example.com');
    expect(buildConfig(importConfig(config).model)).toEqual(config);
    for (const invalid of ['', 'owner', 'one@example.com,two@example.com', 'one@example.com;two@example.com', ' owner@example.com']) expect(ownerEmailError(invalid)).not.toBeNull();
    expect(ownerEmailError('owner@example.com')).toBeNull();
    const invalid = { ...config, cost_governance: { ...config.cost_governance, owner_email: 'one@example.com,two@example.com' } };
    expect(() => importConfig(invalid)).toThrow();
  });
  it('allows many cost centers per business unit and prevents assigning one center twice', () => {
    const cfg = addCostCenters(defaultCostGovernance(), 'CC2');
    cfg.tagValueLists = { ...cfg.tagValueLists, 'tag-lz-business-unit': 'IT, Retail' };
    const first = assignCostCenterBusinessUnit(cfg, 'CC12345', 'IT');
    const both = assignCostCenterBusinessUnit(first, 'CC2', 'IT');
    expect(businessUnitAssignments(both)).toEqual({ CC12345: 'IT', CC2: 'IT' });
    expect(assignCostCenterBusinessUnit(both, 'CC2', 'Retail')).toBe(both);
    const moved = assignCostCenterBusinessUnit(assignCostCenterBusinessUnit(both, 'CC2', null), 'CC2', 'Retail');
    expect(businessUnitAssignments(moved)).toEqual({ CC12345: 'IT', CC2: 'Retail' });
    expect(assignCostCenterBusinessUnit(moved, 'missing', 'Retail')).toBe(moved);
    expect(assignCostCenterBusinessUnit(moved, 'CC2', 'missing')).toBe(moved);
    expect(costGovernanceConfig(moved)).not.toHaveProperty('costCenterBusinessUnits');
    const renamed = syncBusinessUnitAssignments({ ...moved, tagValueLists: { ...moved.tagValueLists, 'tag-lz-business-unit': 'IT, Sales' } }, 'IT, Retail');
    expect(renamed.costCenterBusinessUnits).toEqual({ CC12345: 'IT', CC2: 'Sales' });
    const removed = syncBusinessUnitAssignments({ ...renamed, tagValueLists: { ...renamed.tagValueLists, 'tag-lz-business-unit': 'IT' } }, 'IT, Sales');
    expect(removed.costCenterBusinessUnits).toEqual({ CC12345: 'IT' });
    expect(businessUnitAssignments({ ...moved, tagValueLists: { ...moved.tagValueLists, 'tag-lz-business-unit': 'IT' } })).toEqual({ CC12345: 'IT' });
  });
  it('inherits business unit filter choices from the configured platforms, environments and projects', () => {
    const model = taggedModel(); model.environments[0].name = 'staging-custom'; model.projects[0].name = 'payments';
    model.platforms.push({ id: 'cluster', key: 'cluster', type: 'oke_simple', environments: 'all', vcnCidr: '', subnets: [] });
    const choices = businessUnitScopeOptions(model);
    expect(choices.platform.map((entry) => entry.label)).toEqual(expect.arrayContaining(['network', 'security', 'iam', 'governance', 'observability', 'oke']));
    expect(choices.environment.map((entry) => entry.label)).toEqual(['shared', 'staging-custom', 'preprod']);
    expect(choices.project.map((entry) => entry.label)).toEqual(['notapplicable', 'payments']);
    expect(defaultBusinessUnitScope('IT', [])).toEqual({ platform: null, environment: ['shared'], project: ['notapplicable'] });
    expect(defaultBusinessUnitScope('Retail', ['project:one']).project).toEqual(['project:one']);
    const cfg = defaultCostGovernance(); cfg.businessUnitScopes = { IT: defaultBusinessUnitScope('IT', []) };
    expect(costGovernanceConfig(cfg)).not.toHaveProperty('businessUnitScopes');
  });
  it('preserves existing cost center scopes in the three-filter editor', () => {
    expect(costCenterFilter({}, 'CC12345')).toEqual({ platform: null, environment: null, project: null });
    expect(costCenterFilter({ costCenterScopes: { CC1: 'shared' } }, 'CC1').environment).toEqual(['shared']);
    expect(costCenterFilter({ costCenterScopes: { CC1: 'project:app' } }, 'CC1').project).toEqual(['project:app']);
    expect(costCenterFilter({ costCenterScopes: { CC1: 'custom:team' }, costCenterCustomScopes: [{ id: 'team', name: 'Team', target: 'environment:prod' }] }, 'CC1').environment).toEqual(['environment:prod']);
  });
  it('adds a cost center with its chosen LZ scope and preserves the first center scope', () => {
    const cfg = defaultCostGovernance();
    const updated = addCostCenters(cfg, 'CC2345', 'environment:production');
    expect(updated.tagValueLists?.['tag-lz-cost-center']).toBe('CC12345, CC2345');
    expect(updated.costCenterScopes).toMatchObject({ CC12345: 'landingzone', CC2345: 'environment:production' });
    expect(updated.additionalBudgets?.[updated.costCenterBudgetKeys!.CC2345].tagValue).toBe('CC2345');
    const defaultScope = addCostCenters(cfg, 'CC2345');
    expect(defaultScope.costCenterScopes?.CC2345).toBe('landingzone');
    expect(addCostCenters(updated, 'CC2345', 'shared')).toBe(updated);
  });
  it('reactivates the inherited budget when CC12345 is added again after deletion', () => {
    const removed = removeCostCenter(defaultCostGovernance(), 'CC12345');
    const restored = syncCostCenterBudgets({ ...removed, tagValueLists: { 'tag-lz-cost-center': 'CC12345' } }, '');
    expect(restored.removedBudgets).not.toContain('BUDGET-COST-CENTER-CC12345-KEY');
    expect(restored.costCenterBudgetKeys?.CC12345).toBe('BUDGET-COST-CENTER-CC12345-KEY');
  });
  it('adds custom scope labels to the choices without exporting visual scope metadata', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
    cfg.costCenterCustomScopes = [{ id: 'team', name: 'Team scope', target: 'shared' }];
    expect(costCenterScopeOptions(model)).toContainEqual({ value: 'custom:team', label: 'Team scope' });
    expect(costGovernanceConfig(cfg)).not.toHaveProperty('costCenterCustomScopes');
  });
  it('removes a cost center, its scope and its associated budget without affecting the others', () => {
    const cfg = defaultCostGovernance(); cfg.tagValueLists = { 'tag-lz-cost-center': 'CC12345, CC2345' };
    const added = syncCostCenterBudgets(cfg, 'CC12345');
    added.costCenterScopes = { CC12345: 'landingzone', CC2345: 'shared' };
    const key = added.costCenterBudgetKeys!.CC2345;
    const updated = removeCostCenter(added, 'CC2345');
    expect(updated.tagValueLists?.['tag-lz-cost-center']).toBe('CC12345');
    expect(updated.costCenterScopes).not.toHaveProperty('CC2345');
    expect(updated.additionalBudgets).not.toHaveProperty(key);
    expect(updated.costCenterBudgetKeys).not.toHaveProperty('CC2345');
    expect(updated.removedBudgets).not.toContain('BUDGET-COST-CENTER-CC12345-KEY');
    expect(removeCostCenter(updated, 'CC12345').removedBudgets).toContain('BUDGET-COST-CENTER-CC12345-KEY');
  });
  it('does not rename another budget after a deleted cost-center budget key is reused', () => {
    const cfg = defaultCostGovernance(); cfg.tagValueLists = { 'tag-lz-cost-center': 'CC12345, CC2345' };
    const first = syncCostCenterBudgets(cfg, 'CC12345');
    const removedKey = first.costCenterBudgetKeys!.CC2345;
    delete first.additionalBudgets![removedKey];
    const second = syncCostCenterBudgets({ ...first, tagValueLists: { 'tag-lz-cost-center': 'CC12345, CC2345, CC4567' } }, 'CC12345, CC2345');
    const updated = syncCostCenterBudgets({ ...second, tagValueLists: { 'tag-lz-cost-center': 'CC12345, CC3456, CC4567' } }, 'CC12345, CC2345, CC4567');
    expect(updated.additionalBudgets![updated.costCenterBudgetKeys!.CC4567].tagValue).toBe('CC4567');
    expect(updated.additionalBudgets![updated.costCenterBudgetKeys!.CC3456].tagValue).toBe('CC3456');
    expect(updated.costCenterBudgetKeys!.CC3456).not.toBe(updated.costCenterBudgetKeys!.CC4567);
  });
  it('renames a cost center budget and its target while retaining alerts and the selected area', () => {
    const cfg = defaultCostGovernance();
    cfg.costCenterScopes = { CC12345: 'environment:prod' };
    cfg.costCenterBusinessUnits = { CC12345: 'Retail' };
    cfg.costCenterFilters = { CC12345: { platform: ['network'], environment: ['environment:prod'], project: null } };
    Object.assign(cfg.budgets['BUDGET-COST-CENTER-CC12345-KEY'], { amount: 7777, thresholdValue: 95, recipients: 'team@example.com' });
    cfg.tagValueLists = { 'tag-lz-cost-center': 'CC2345' };
    const updated = syncCostCenterBudgets(cfg, 'CC12345');
    const key = updated.costCenterBudgetKeys!.CC2345;
    expect(updated.additionalBudgets![key]).toMatchObject({ name: 'budget-cost-center-cc2345', tagName: 'tag-lz-cost-center', tagValue: 'CC2345', amount: 7777, thresholdValue: 95, recipients: 'team@example.com' });
    expect(updated.removedBudgets).toContain('BUDGET-COST-CENTER-CC12345-KEY');
    expect(updated.costCenterScopes).toHaveProperty('CC2345', 'environment:prod');
    expect(updated.costCenterFilters?.CC2345).toEqual(cfg.costCenterFilters.CC12345);
    expect(updated.costCenterFilters).not.toHaveProperty('CC12345');
    expect(updated.costCenterBusinessUnits).toEqual({ CC2345: 'Retail' });
    expect(removeCostCenter(updated, 'CC2345').costCenterBusinessUnits).toEqual({});
    expect(removeCostCenter(updated, 'CC2345').costCenterFilters).not.toHaveProperty('CC2345');
    expect(costGovernanceConfig(updated)).not.toHaveProperty('costCenterFilters');
    const next = syncCostCenterBudgets({ ...updated, tagValueLists: { 'tag-lz-cost-center': 'CC9999' } }, 'CC2345');
    expect(next.costCenterBudgetKeys!.CC9999).toBe(key);
    expect(next.additionalBudgets![key].name).toBe('budget-cost-center-cc9999');
    expect(next.additionalBudgets![key].tagValue).toBe('CC9999');
    expect(cfg.budgets['BUDGET-COST-CENTER-CC12345-KEY'].name).toBe('budget-cost-center-cc12345');
  });
  it('offers current scope names and creates a budget for an extra cost center', () => {
    const model = taggedModel();
    expect(costCenterScopeOptions(model).map((option) => option.label)).toEqual(['All LZ', 'shared', 'prod', 'preprod', 'proj1']);
    const cfg = defaultCostGovernance(); cfg.tagValueLists = { 'tag-lz-cost-center': 'CC12345, CC2345' };
    const updated = syncCostCenterBudgets(cfg, 'CC12345');
    expect(updated.additionalBudgets![updated.costCenterBudgetKeys!.CC2345]).toMatchObject({ name: 'budget-cost-center-cc2345', tagValue: 'CC2345', amount: 5000 });
    expect(updated.removedBudgets).not.toContain('BUDGET-COST-CENTER-CC12345-KEY');
  });
  it('ignores old manual LOV overrides for inherited environment, project and platform values', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
    cfg.tagValueLists = { 'tag-lz-environment': '', 'tag-lz-project': 'obsolete', 'tag-lz-platform': '', 'tag-lz-owner': 'team@example.com' };
    expect(costGovernanceConfig(cfg).tag_value_lists).toEqual({ 'tag-lz-business-unit': ['IT'] });
    expect(costGovernanceConfig(cfg).owner_email).toBe('team@example.com');
    cfg.recipients = 'finops@example.com';
    expect(validateCostGovernance(model).filter((error) => !error.startsWith('Business unit '))).toEqual([]);
  });
  it('always excludes Finance when loading an older Studio design without removals', () => {
    const cfg = defaultCostGovernance(); cfg.removedBudgets = [];
    expect(costGovernanceConfig(cfg).exclude_budgets).toContain('BUDGET-BUSINESS-UNIT-FINANCE-KEY');
  });
  it('offers only IT by default and excludes the inherited Retail budget from exports', () => {
    const model = taggedModel();
    expect(tagValueLists(model)['tag-lz-business-unit']).toEqual(['IT']);
    expect(budgetTagValues(model, 'tag-lz-business-unit')).toEqual(['IT']);
    expect(buildConfig(model).cost_governance?.tag_value_lists?.['tag-lz-business-unit']).toEqual(['IT']);
    expect(buildConfig(model).cost_governance?.exclude_budgets).toContain('BUDGET-BUSINESS-UNIT-RETAIL-KEY');
    expect(costGovernanceConfig(defaultCostGovernance())).not.toHaveProperty('business_unit_assignments');
  });
  it('offers notapplicable plus the projects actually assigned to environments', () => {
    const model = taggedModel();
    expect(tagValueLists(model)['tag-lz-project']).toEqual(['notapplicable', 'proj1']);
    model.projects.push({ id: 'project-two', name: 'proj2', environments: 'all' });
    expect(tagValueLists(model)['tag-lz-project']).toEqual(['notapplicable', 'proj1', 'proj2']);
    model.projects = [];
    expect(tagValueLists(model)['tag-lz-project']).toEqual(['notapplicable']);
  });
  it('shows only shared and the configured environment names in the default environment LOV', () => {
    const model = taggedModel();
    expect(tagValueLists(model)['tag-lz-environment']).toEqual(['shared', 'prod', 'preprod']);
    model.environments[0].name = 'development';
    model.environments.pop();
    expect(tagValueLists(model)['tag-lz-environment']).toEqual(['shared', 'development']);
  });
  it('shows base Platform classifications followed by configured platforms', () => {
    const model = taggedModel();
    expect(tagValueLists(model)['tag-lz-platform']).toEqual(['network', 'security', 'observability', 'iam', 'governance']);
    model.platforms.push({ id: 'cluster', key: 'cluster', type: 'oke_simple', environments: 'all', vcnCidr: '', subnets: [] });
    model.sharedPlatforms.push({ id: 'apps', key: 'apps', type: 'custom', vcnCidr: '', subnets: [] });
    model.exadata.exacs.enabled = true;
    expect(tagValueLists(model)['tag-lz-platform']).toEqual(['network', 'security', 'observability', 'iam', 'governance', 'oke', 'apps', 'exacs']);
    expect(tagValueLists(model)['tag-lz-platform'].filter((value) => value === 'oke')).toHaveLength(1);
    model.platforms = []; model.sharedPlatforms = []; model.exadata.exacs.enabled = false;
    expect(tagValueLists(model)['tag-lz-platform']).toEqual(['network', 'security', 'observability', 'iam', 'governance']);
  });
  it('accepts comma-separated LOV, trimming and deduplicating values', () => {
    expect(parseTagValues('IT, Finance, Retail, IT\nOperations')).toEqual(['Finance', 'IT', 'Operations', 'Retail']);
  });
  it('preserves excluded inherited edits when reimporting and restoring a budget', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
    Object.assign(cfg.budgets['BUDGET-LANDINGZONE-KEY'], { name: 'budget-team', amount: 1234, thresholdValue: 95 });
    cfg.removedBudgets = ['BUDGET-LANDINGZONE-KEY'];
    const restored = importConfig(buildConfig(model)).model.foundation.costGovernance!;
    restored.removedBudgets = [];
    expect(costGovernanceConfig(restored).budgets['BUDGET-LANDINGZONE-KEY']).toMatchObject({ name: 'budget-team', amount: 1234, alert_rule: { threshold_value: 95 } });
  });
  it('round-trips editable LOV and an additional tag budget, including its removal', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance();
    cfg.tagValueLists = { 'tag-lz-cost-center': 'tobedefined, CC900' };
    cfg.additionalBudgets = { 'BUDGET-CUSTOM-TEAM-KEY': { name: 'budget-team', amount: 900, thresholdValue: 95, recipients: 'team@example.com', tagName: 'tag-lz-cost-center', tagValue: 'CC900' } };
    cfg.useSingleRecipient = false; model.foundation.costGovernance = cfg;
    const config = buildConfig(model);
    expect(config.cost_governance?.tag_value_lists).toEqual({ 'tag-lz-cost-center': ['CC900', 'tobedefined'], 'tag-lz-business-unit': ['IT'] });
    expect(config.cost_governance?.additional_budgets?.['BUDGET-CUSTOM-TEAM-KEY']).toMatchObject({ tag_name: 'tag-lz-cost-center', tag_value: 'CC900', alert_rule: { recipients: 'team@example.com' } });
    expect(buildConfig(importConfig(config).model)).toEqual(config);
    cfg.removedBudgets = ['BUDGET-CUSTOM-TEAM-KEY'];
    expect(buildConfig(importConfig(buildConfig(model)).model)).toEqual(buildConfig(model));
  });
  it('requires a custom budget target and at least one LOV value before generation', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
    cfg.tagValueLists = { 'tag-lz-owner': '' };
    cfg.additionalBudgets = { 'BUDGET-CUSTOM-TEAM-KEY': { name: 'budget-team', amount: 900, thresholdValue: 95, recipients: 'team@example.com', tagName: 'tag-lz-owner', tagValue: '' } };
    expect(validateCostGovernance(model)).toEqual(expect.arrayContaining(['tag-lz-owner: Enter one valid owner email address.', 'budget-team: Enter a tag value for this budget.']));
  });
  it('adds a budget for a new project in multiple environments without duplicates', () => {
    const model = taggedModel(); model.projects.push({ id: 'payments', name: 'payments', environments: 'all' });
    const config = buildConfig(model);
    expect(Object.keys(config.cost_governance!.budgets)).toHaveLength(9);
    expect(config).toHaveProperty('cost_governance.budgets.BUDGET-PROJECT-PAYMENTS-KEY.amount', 500);
    expect(buildConfig(importConfig(config).model)).toEqual(config);
  });
  it('excludes a removed budget from generated configuration and preserves the choice on import', () => {
    const cfg = defaultCostGovernance(); Object.assign(cfg, { removedBudgets: ['BUDGET-LANDINGZONE-KEY'] });
    const result = costGovernanceConfig(cfg);
    expect(result).toHaveProperty('exclude_budgets', ['BUDGET-BUSINESS-UNIT-FINANCE-KEY', 'BUDGET-BUSINESS-UNIT-RETAIL-KEY', 'BUDGET-LANDINGZONE-KEY']);
    expect(result.budgets).toHaveProperty('BUDGET-LANDINGZONE-KEY');
    const model = taggedModel(); model.foundation.costGovernance = cfg;
    expect(buildConfig(importConfig(buildConfig(model)).model)).toEqual(buildConfig(model));
  });
  it('applies the single recipient without changing inherited budget identities', () => {
    const cfg = defaultCostGovernance(); cfg.requireTagValues = true; cfg.recipients = 'finops@example.com';
    cfg.budgets['BUDGET-LANDINGZONE-KEY'].name = 'budget-team';
    cfg.budgets['BUDGET-LANDINGZONE-KEY'].amount = 12500;
    cfg.budgets['BUDGET-LANDINGZONE-KEY'].thresholdValue = 125.5;
    const result = costGovernanceConfig(cfg);
    expect(result.require_tag_values).toBe(true);
    expect(result.budget_recipients).toBe('finops@example.com');
    expect(Object.keys(result.budgets)).toEqual(budgetKeys);
    expect(result.budgets['BUDGET-LANDINGZONE-KEY']).toEqual({ name: 'budget-team', amount: 12500, alert_rule: { threshold_value: 125.5 } });
    expect(Object.values(result.budgets).every((budget) => budget.alert_rule.recipients === undefined)).toBe(true);
  });
  it('preserves independent recipients and edited values through import and export', () => {
    const model = taggedModel(); const cfg = defaultCostGovernance();
    cfg.useSingleRecipient = false; cfg.requireTagValues = true;
    cfg.budgets['BUDGET-LANDINGZONE-KEY'] = { name: 'budget-team', amount: 12500, thresholdValue: 90, recipients: 'a@example.com;b@example.com' };
    model.foundation.costGovernance = cfg;
    const config = buildConfig(model);
    expect(config.cost_governance?.budget_recipients).toBeUndefined();
    expect(config.cost_governance?.budgets['BUDGET-LANDINGZONE-KEY'].alert_rule.recipients).toBe('a@example.com,b@example.com');
    expect(buildConfig(importConfig(config).model)).toEqual(config);
  });
  it('preserves the shared email mode through import and export', () => {
    const model = taggedModel(); model.foundation.costGovernance = defaultCostGovernance();
    model.foundation.costGovernance.recipients = 'finops@example.com';
    const restored = importConfig(buildConfig(model)).model;
    expect(restored.foundation.costGovernance?.useSingleRecipient).toBe(true);
    expect(restored.foundation.costGovernance?.recipients).toBe('finops@example.com');
  });
  it('migrates old exports and rejects unsupported governance fields', () => {
    const config = buildConfig(taggedModel()); delete config.cost_governance;
    expect(importConfig(config).model.foundation.costGovernance).toBeUndefined();
    expect(() => importConfig({ ...config, cost_governance: { unsupported: true } })).toThrow('cost_governance');
  });
  it('validates OCI ranges without incorrectly capping percentages at 100', () => {
    expect(budgetFieldError('amount', 1.5)).toBeTruthy();
    expect(budgetFieldError('amount', 0)).toBeTruthy();
    expect(budgetFieldError('thresholdValue', 125.5)).toBeNull();
    expect(budgetFieldError('thresholdValue', 10001)).toBeTruthy();
    expect(budgetFieldError('thresholdValue', 1.234)).toBeTruthy();
    expect(budgetRecipientError('a@example.com,b@example.com', true)).toBeTruthy();
    expect(budgetRecipientError('')).toBe('Enter at least one notification email address.');
    const model = taggedModel(); model.foundation.costGovernance = defaultCostGovernance();
    model.foundation.costGovernance.budgets['BUDGET-LANDINGZONE-KEY'].amount = 0;
    expect(validateCostGovernance(model)).not.toEqual([]);
    model.foundation.stackScope = 'regional';
    expect(validateCostGovernance(model).filter((error) => !error.startsWith('Business unit '))).toEqual([]);
  });
  it.each([{ budgets: null }, { budgets: { 'BUDGET-LANDINGZONE-KEY': { alert_rule: null } } }])('rejects explicit null objects accepted by neither contract: %j', (settings) => {
    expect(() => importConfig({ ...buildConfig(taggedModel()), cost_governance: settings })).toThrow('cost_governance');
  });
});

it('exports and imports disabled FinOps tags without validating hidden tag settings', () => {
  const model = taggedModel();
  model.foundation.costGovernance = Object.assign(defaultCostGovernance(), { tagsEnabled: false, ownerEmail: 'invalid', recipients: 'ops@example.com', costCenterBusinessUnits: {}, tagValueLists: { 'tag-lz-cost-center': '' } });
  expect(validateCostGovernance(model)).toEqual([]);
  const config = buildConfig(model);
  expect(config.cost_governance).toMatchObject({ enable_tags: false, tag_resource_labels: false });
  expect(Object.keys(config.cost_governance!.budgets)).toEqual(['BUDGET-LANDINGZONE-KEY']);
  expect(importConfig(config).model.foundation.costGovernance).toMatchObject({ tagsEnabled: false });
});

it('starts new Studio designs without FinOps tags and enables required values in one action', () => {
  const model = emptyLzModel();
  expect(model.foundation.costGovernance?.tagsEnabled).toBe(false);
  expect(buildConfig(model).cost_governance?.enable_tags).toBe(false);
  const enabled = setFinOpsTagsEnabled(model.foundation.costGovernance!, true);
  expect(enabled).toMatchObject({ tagsEnabled: true, requireTagValues: true });
  expect(costGovernanceConfig(enabled).require_tag_values).toBe(true);
  const disabled = setFinOpsTagsEnabled(enabled, false);
  expect(costGovernanceConfig(disabled).enable_tags).toBe(false);
  expect(setFinOpsTagsEnabled(disabled, true)).toMatchObject({ tagsEnabled: true, requireTagValues: true });
});
