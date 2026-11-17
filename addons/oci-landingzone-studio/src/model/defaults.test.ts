import { describe, expect, it } from 'vitest';
import { emptyLzModel, normalizeModel } from './defaults';
import { buildConfig } from '../services/lzConfig';
import { defaultCostGovernance } from '../services/costGovernance';

describe('saved FinOps model normalization', () => {
  it.each(['0.16.0', '0.18.0', '0.19.0', '0.20.0'])('keeps FinOps disabled for a saved %s design without settings', (version) => {
    const stored = { ...emptyLzModel(), version };
    delete stored.foundation.costGovernance;
    if (version === '0.16.0') {
      stored.projects = stored.projects.map((project) => ({ ...project, environments: stored.environments.map((env) => env.name) }));
    }
    const before = structuredClone(stored);
    const model = normalizeModel(stored);
    expect(model.foundation.costGovernance).toMatchObject({ tagsEnabled: false });
    const cfg = buildConfig(model).cost_governance!;
    expect(cfg).toMatchObject({ enable_tags: false, require_tag_values: false, tag_resource_labels: false });
    expect(cfg).not.toHaveProperty('owner_email');
    expect(cfg).not.toHaveProperty('cost_center_assignments');
    expect(Object.keys(cfg.budgets)).toEqual(['BUDGET-LANDINGZONE-KEY']);
    expect(model.environments.map((env) => env.name)).toEqual(stored.environments.map((env) => env.name));
    expect(stored).toEqual(before);
    expect(normalizeModel(model)).toEqual(model);
  });

  it.each([true, false, undefined])('preserves an existing selection %s and customer mappings', (tagsEnabled) => {
    const stored = emptyLzModel();
    stored.foundation.costGovernance = { ...defaultCostGovernance(), tagsEnabled,
      ownerEmail: 'owner@customer.test', recipients: 'budgets@customer.test',
      tagValueLists: { 'tag-lz-cost-center': 'CUSTOMER', 'tag-lz-business-unit': 'Operations' },
      costCenterBusinessUnits: { CUSTOMER: 'Operations' },
      costCenterFilters: { CUSTOMER: { platform: null, environment: ['shared'], project: ['notapplicable'] } },
    };
    const before = structuredClone(stored);
    const normalized = normalizeModel(stored);
    expect(normalized.foundation.costGovernance).toEqual(before.foundation.costGovernance);
    expect(stored).toEqual(before);
    expect(buildConfig(normalized).cost_governance!.enable_tags).toBe(tagsEnabled !== false);
  });

  it('creates independent settings for separate legacy designs', () => {
    const stored = emptyLzModel();
    delete stored.foundation.costGovernance;
    const first = normalizeModel(stored);
    const second = normalizeModel(stored);
    expect(first.foundation.costGovernance).not.toBe(second.foundation.costGovernance);
    first.foundation.costGovernance!.tagsEnabled = true;
    expect(second.foundation.costGovernance!.tagsEnabled).toBe(false);
  });
});

describe('Studio CIS defaults', () => {
  it('starts a new design at CIS 1 and exports that choice', () => {
    const model = emptyLzModel();
    expect(model.foundation.cisLevel).toBe(1);
    expect(buildConfig(model).cis_level).toBe(1);
  });

  it.each([1, 2] as const)('preserves CIS %s in saved designs', (cisLevel) => {
    const model = emptyLzModel();
    model.foundation.cisLevel = cisLevel;
    expect(normalizeModel(model).foundation.cisLevel).toBe(cisLevel);
  });
});
