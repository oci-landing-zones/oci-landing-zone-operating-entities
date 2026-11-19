import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { costCenterReferenceErrors, defaultCostGovernance, reconcileCostCenterFilters, validateCostGovernance } from './costGovernance';
import { buildConfig, serializeConfig } from './lzConfig';

describe('cost-center references after deletion', () => {
  it.each(['environment', 'project'] as const)('keeps a deleted %s recoverable without widening its final filter', (dimension) => {
    const model = emptyLzModel();
    const cfg = defaultCostGovernance();
    const entry = dimension === 'environment' ? model.environments[0] : model.projects[0];
    const reference = `${dimension}:${entry.id}`;
    cfg.costCenterFilters = { CC12345: { platform: null, environment: null, project: null, [dimension]: [reference] } };
    model.foundation.costGovernance = cfg;
    if (dimension === 'environment') model.environments = model.environments.filter((item) => item.id !== entry.id);
    else model.projects = model.projects.filter((item) => item.id !== entry.id);
    const next = reconcileCostCenterFilters(model);
    expect(next.foundation.costGovernance?.costCenterFilters?.CC12345[dimension]).toEqual([reference]);
    expect(() => serializeConfig(next)).not.toThrow();
    expect(buildConfig(next).cost_governance?.cost_center_assignments?.CC12345[dimension]).toEqual([reference]);
    expect(costCenterReferenceErrors(next)).toEqual([expect.stringContaining(`selected ${dimension} is no longer available`)]);
    expect(validateCostGovernance(next)).toEqual(expect.arrayContaining(costCenterReferenceErrors(next)));
    next.foundation.costGovernance = { ...cfg, costCenterFilters: { CC12345: { ...cfg.costCenterFilters.CC12345, [dimension]: null } } };
    expect(costCenterReferenceErrors(next)).toEqual([]);
  });

  it.each(['environment', 'project'] as const)('removes a deleted %s when another selected value survives', (dimension) => {
    const model = emptyLzModel();
    const cfg = defaultCostGovernance();
    const reference = dimension === 'environment' ? `environment:${model.environments[0].id}` : `project:${model.projects[0].id}`;
    const reserved = dimension === 'environment' ? 'shared' : 'notapplicable';
    cfg.costCenterFilters = { CC12345: { platform: null, environment: null, project: null, [dimension]: [reference, reserved] } };
    model.foundation.costGovernance = cfg;
    if (dimension === 'environment') model.environments = [];
    else model.projects = [];
    const next = reconcileCostCenterFilters(model);
    expect(next.foundation.costGovernance?.costCenterFilters?.CC12345[dimension]).toEqual([reserved]);
    expect(cfg.costCenterFilters.CC12345[dimension]).toEqual([reference, reserved]);
    expect(costCenterReferenceErrors(next)).toEqual([]);
  });

  it('stabilizes legacy name filters before an environment is renamed', () => {
    const model = emptyLzModel();
    const cfg = defaultCostGovernance();
    cfg.costCenterFilters = { CC12345: { platform: null, environment: [model.environments[0].name], project: null } };
    model.foundation.costGovernance = cfg;
    const next = reconcileCostCenterFilters(model);
    next.environments = next.environments.map((entry, i) => i ? entry : { ...entry, name: 'qa' });
    expect(buildConfig(next).cost_governance?.cost_center_assignments?.CC12345.environment).toEqual(['qa']);
  });

  it('ignores retained invalid filters while FinOps is disabled', () => {
    const model = emptyLzModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), tagsEnabled: false,
      costCenterFilters: { CC12345: { platform: null, environment: ['environment:deleted'], project: null } } };
    expect(costCenterReferenceErrors(model)).toEqual([]);
    expect(() => serializeConfig(model)).not.toThrow();
  });
});
