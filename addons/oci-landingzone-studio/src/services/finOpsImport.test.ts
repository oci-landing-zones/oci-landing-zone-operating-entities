import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { buildConfig } from './lzConfig';
import { importConfig, resolveImportedFinOps } from './importConfig';
import { defaultCostGovernance, importCostGovernance } from './costGovernance';

function input(): Omit<ReturnType<typeof buildConfig>, 'cost_governance'> & { cost_governance?: Record<string, unknown> } {
  const config = buildConfig(emptyLzModel());
  return { ...config, cost_governance: { ...config.cost_governance } };
}
function legacy() {
  const model = emptyLzModel();
  model.foundation.costGovernance = { ...defaultCostGovernance(), tagsEnabled: true,
    ownerEmail: 'owner@customer.test', recipients: 'budget@customer.test',
    tagValueLists: { 'tag-lz-cost-center': 'TEAM', 'tag-lz-business-unit': 'Operations' },
    costCenterBusinessUnits: { TEAM: 'Operations' },
    costCenterFilters: { TEAM: { platform: null, environment: null, project: null } },
  };
  const config = buildConfig(model);
  delete config.cost_governance!.enable_tags;
  return config;
}

describe('FinOps config imports', () => {
  it.each(['missing', 'empty', 'budget-only'])('imports %s settings disabled like a new design', (kind) => {
    const config = input();
    if (kind === 'missing') delete config.cost_governance;
    if (kind === 'empty') config.cost_governance = {};
    if (kind === 'budget-only') config.cost_governance = { budgets: { 'BUDGET-LANDINGZONE-KEY': { amount: 1234 } } };
    const result = importConfig(config);
    expect(result.model.foundation.costGovernance?.tagsEnabled).toBe(false);
    expect(result.requiresFinOpsChoice).not.toBe(true);
    const exported = buildConfig(resolveImportedFinOps(result, null)).cost_governance!;
    expect(exported).toMatchObject({ enable_tags: false, require_tag_values: false, tag_resource_labels: false });
    expect(exported).not.toHaveProperty('owner_email');
    expect(exported).not.toHaveProperty('cost_center_assignments');
    expect(Object.keys(exported.budgets)).toEqual(['BUDGET-LANDINGZONE-KEY']);
    if (kind === 'budget-only') expect(exported.budgets['BUDGET-LANDINGZONE-KEY'].amount).toBe(1234);
  });

  it('normalizes an empty cost-governance block at its import boundary', () => {
    expect(importCostGovernance({}).tagsEnabled).toBe(false);
  });

  it.each([true, false])('exports and restores explicit enable_tags=%s without prompting', (enabled) => {
    const model = emptyLzModel();
    model.foundation.costGovernance!.tagsEnabled = enabled;
    const exported = buildConfig(model);
    expect(exported.cost_governance!.enable_tags).toBe(enabled);
    const result = importConfig(exported);
    expect(result.requiresFinOpsChoice).not.toBe(true);
    expect(result.model.foundation.costGovernance!.tagsEnabled).toBe(enabled);
    expect(buildConfig(resolveImportedFinOps(result, null))).toEqual(exported);
  });

  it('requires an explicit choice for legacy metadata while keeping it disabled provisionally', () => {
    const result = importConfig(legacy());
    expect(result.requiresFinOpsChoice).toBe(true);
    expect(result.model.foundation.costGovernance!.tagsEnabled).toBe(false);
    expect(() => resolveImportedFinOps(result, null)).toThrow(/Choose.*FinOps/i);
  });

  it.each([true, false])('resolves legacy choice %s without mutating or losing business mappings', (choice) => {
    const result = importConfig(legacy());
    const before = structuredClone(result);
    const model = resolveImportedFinOps(result, choice);
    expect(model.foundation.costGovernance).toMatchObject({ tagsEnabled: choice, ownerEmail: 'owner@customer.test',
      recipients: 'budget@customer.test', costCenterBusinessUnits: { TEAM: 'Operations' } });
    expect(result).toEqual(before);
    const exported = buildConfig(model);
    expect(exported.cost_governance!.enable_tags).toBe(choice);
    if (choice) expect(exported.cost_governance!.cost_center_business_units).toEqual({ TEAM: 'Operations' });
    expect(importConfig(exported).requiresFinOpsChoice).not.toBe(true);
  });

  it('recognizes legacy tag-based budget settings even without tag metadata', () => {
    const config = input();
    config.cost_governance = { budgets: { 'BUDGET-COST-CENTER-CC12345-KEY': { amount: 3456 } } };
    const result = importConfig(config);
    expect(result.requiresFinOpsChoice).toBe(true);
    expect(resolveImportedFinOps(result, true).foundation.costGovernance!.budgets['BUDGET-COST-CENTER-CC12345-KEY'].amount).toBe(3456);
  });
});
