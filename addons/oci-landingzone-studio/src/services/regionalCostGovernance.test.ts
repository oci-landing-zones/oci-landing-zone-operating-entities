import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { defaultCostGovernance, importCostGovernance, costCenterReferenceErrors, validateCostGovernance } from './costGovernance';
import { inheritRegionalCostGovernance, regionalCostGovernanceConfig } from './regionalCostGovernance';
import { syncDrEnvironments } from './linkedDr';

function design() {
  const home = emptyLzModel();
  const [prod, preprod] = home.environments;
  home.foundation.costGovernance = { ...defaultCostGovernance(), tagsEnabled: true, requireTagValues: true,
    ownerEmail: 'home.owner@example.test', recipients: 'budgets@example.test',
    tagValueLists: { 'tag-lz-cost-center': 'SHARED, PROD, PROJECT, HOME_ONLY', 'tag-lz-business-unit': 'Operations' },
    costCenterBusinessUnits: { SHARED: 'Operations', PROD: 'Operations', PROJECT: 'Operations', HOME_ONLY: 'Operations' },
    costCenterFilters: {
      SHARED: { platform: null, environment: ['shared'], project: ['notapplicable'] },
      PROD: { platform: null, environment: [`environment:${prod.id}`], project: ['notapplicable'] },
      PROJECT: { platform: null, environment: [`environment:${prod.id}`], project: [`project:${home.projects[0].id}`] },
      HOME_ONLY: { platform: null, environment: [`environment:${preprod.id}`], project: null },
    },
  };
  const dr = structuredClone(home);
  Object.assign(dr.foundation, { stackScope: 'regional', homeRegion: home.foundation.region, region: 'eu-amsterdam-1', regionShortName: 'ams' });
  dr.environments = [dr.environments[0]];
  dr.projects = [{ ...dr.projects[0], id: 'regional-project' }];
  return { home, dr };
}

describe('regional FinOps ownership', () => {
  it('inherits enabled Home values and updates them without mutable sharing', () => {
    const { home, dr } = design();
    dr.foundation.costGovernance!.ownerEmail = 'stale@example.test';
    const snapshot = structuredClone({ home, dr });
    const synced = syncDrEnvironments(dr, home);
    expect(synced.foundation.costGovernance).toMatchObject({ tagsEnabled: true, ownerEmail: 'home.owner@example.test', costCenterBusinessUnits: home.foundation.costGovernance!.costCenterBusinessUnits });
    expect(synced.foundation.costGovernance!.costCenterFilters!.PROJECT.project).toEqual(['project:regional-project']);
    expect({ home, dr }).toEqual(snapshot);
    synced.foundation.costGovernance!.costCenterBusinessUnits!.PROJECT = 'Changed';
    expect(home.foundation.costGovernance!.costCenterBusinessUnits!.PROJECT).toBe('Operations');
  });

  it('exports only active regional mappings and excludes Home-owned budget settings', () => {
    const { home, dr } = design();
    const cfg = regionalCostGovernanceConfig(home, dr);
    expect(cfg).toMatchObject({ enable_tags: true, owner_email: 'home.owner@example.test', budgets: {},
      cost_center_assignments: { PROJECT: { project: [dr.projects[0].name] }, PROD: { environment: [dr.environments[0].name] } } });
    expect(cfg.cost_center_assignments).not.toHaveProperty('HOME_ONLY');
    expect(cfg.cost_center_business_units).not.toHaveProperty('HOME_ONLY');
    expect(cfg).not.toHaveProperty('budget_recipients');
    expect(cfg).not.toHaveProperty('exclude_budgets');
    expect(cfg).not.toHaveProperty('additional_budgets');
    expect(() => importCostGovernance(cfg, [], dr)).not.toThrow();
  });

  it('uses explicit project origins for renamed legacy DR projects', () => {
    const { home, dr } = design();
    dr.projects[0].name = 'recovery-payments';
    const origins = { [dr.projects[0].id]: home.projects[0].id };
    expect(regionalCostGovernanceConfig(home, dr, origins).cost_center_assignments!.PROJECT.project).toEqual(['recovery-payments']);
  });

  it('retains environment identities when a legacy regional name changes', () => {
    const { home, dr } = design();
    dr.environments[0].name = 'recovery';
    expect(regionalCostGovernanceConfig(home, dr).cost_center_assignments!.PROD.environment).toEqual(['recovery']);
  });

  it('does not treat import-local project IDs as Home identities', () => {
    const { home, dr } = design();
    const project = home.projects[0];
    dr.projects = [
      { ...project, id: project.id, name: 'other-project' },
      { ...project, id: 'imported-project', name: project.name },
    ];
    const cfg = inheritRegionalCostGovernance(home, dr);
    expect(cfg.costCenterFilters!.PROJECT.project).toEqual(['project:imported-project']);
  });

  it('does not map a homonymous project into another environment', () => {
    const { home, dr } = design();
    home.projects[0].environments = [home.environments[1].id];
    dr.projects[0].environments = [home.environments[0].id];
    const cfg = inheritRegionalCostGovernance(home, dr);
    expect(cfg.costCenterFilters).not.toHaveProperty('PROJECT');
  });

  it('preserves invalid Home references for validation rather than expanding their scope', () => {
    const { home, dr } = design();
    home.foundation.costGovernance!.costCenterFilters!.PROJECT.project = ['project:deleted'];
    dr.foundation.costGovernance = inheritRegionalCostGovernance(home, dr);
    expect(dr.foundation.costGovernance.costCenterFilters!.PROJECT.project).toEqual(['project:deleted']);
    expect(costCenterReferenceErrors(dr)).toEqual([expect.stringContaining('selected project is no longer available')]);
  });

  it('validates regional business labels without requiring Home budget recipients', () => {
    const { home, dr } = design();
    dr.foundation.costGovernance = inheritRegionalCostGovernance(home, dr);
    dr.foundation.costGovernance.recipients = '';
    expect(validateCostGovernance(dr)).toEqual([]);
    dr.foundation.costGovernance.ownerEmail = 'invalid';
    delete dr.foundation.costGovernance.costCenterBusinessUnits!.PROJECT;
    expect(validateCostGovernance(dr)).toEqual(expect.arrayContaining([
      expect.stringContaining('tag-lz-owner'), expect.stringContaining('Cost center PROJECT'),
    ]));
  });

  it('keeps disabled tagging explicit without emitting business or budget metadata', () => {
    const { home, dr } = design();
    home.foundation.costGovernance!.tagsEnabled = false;
    expect(regionalCostGovernanceConfig(home, dr)).toEqual({ enable_tags: false, require_tag_values: false, tag_resource_labels: false, budgets: {} });
  });
});
