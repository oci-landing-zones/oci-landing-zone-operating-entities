import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { defaultCostGovernance } from '../services/costGovernance';
import { createDrDraft } from '../services/disasterRecoveryDesign';
import { buildDrFileConfigs } from '../services/disasterRecoveryGeneration';
import { generateOutputs } from './generate';
import { generateNetwork } from './network';
import { generatePreview } from './preview';
import { evaluate } from './jsonnetVm';

vi.mock('./jsonnetVm', () => ({ evaluate: vi.fn(), jsonnetVm: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

function missingReference(dimension: 'environment' | 'project') {
  const model = emptyLzModel();
  model.foundation.costGovernance = { ...defaultCostGovernance(), costCenterFilters: {
    CC12345: { platform: null, environment: null, project: null, [dimension]: [`${dimension}:deleted`] },
  } };
  return model;
}

describe.each([
  ['download', generateOutputs], ['network', generateNetwork], ['preview', generatePreview],
] as const)('%s generation with deleted cost-center references', (_, generate) => {
  it.each(['environment', 'project'] as const)('rejects a missing %s before evaluating Jsonnet', async (dimension) => {
    await expect(generate(missingReference(dimension))).rejects.toThrow(`selected ${dimension} is no longer available`);
    expect(evaluate).not.toHaveBeenCalled();
  });
});

it.each(['environment', 'project'] as const)('blocks Home/DR generation with a missing %s reference', (dimension) => {
  const model = missingReference(dimension);
  expect(() => buildDrFileConfigs(model, createDrDraft(model))).toThrow(`selected ${dimension} is no longer available`);
});
