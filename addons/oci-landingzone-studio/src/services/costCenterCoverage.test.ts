import { describe, expect, it } from 'vitest';
import { costCenterCoverage, costCenterCoverageError } from './costCenterCoverage';
import { emptyLzModel } from '../model/defaults';
import { defaultCostGovernance } from './costGovernance';

const prefix = 'tagns-lz-cost-governance.tag-lz-';
function resource(name: string, center: string, environment = 'prod') {
  return { name, defined_tags: { [`${prefix}cost-center`]: center, [`${prefix}platform`]: 'iam',
    [`${prefix}environment`]: environment, [`${prefix}project`]: 'proj1' } };
}

describe('generated cost center coverage', () => {
  it('recommends the specific cost center and filter that excludes the missing resources', () => {
    const model = emptyLzModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(),
      tagValueLists: { 'tag-lz-cost-center': 'CC12345, CC12346' }, costCenterFilters: {
        CC12345: { platform: ['network', 'security', 'observability'], environment: null, project: null },
        CC12346: { platform: ['iam', 'governance'], environment: ['shared'], project: null },
      } };
    const resources = costCenterCoverage({ 'iam.json': { prod: resource('prod', 'tobedefined'), preprod: resource('preprod', 'tobedefined', 'preprod') } });
    const error = costCenterCoverageError(resources, model);
    expect(error).toContain('Edit CC12346 → Environment: include preprod, prod');
    expect(error).toContain('Not apply');
    expect(error).not.toContain('Edit CC12345');
    model.foundation.costGovernance.costCenterFilters!.CC12346.environment = [`environment:${model.environments[0].id}`];
    expect(costCenterCoverageError(resources.filter((entry) => entry.environment === 'preprod'), model)).toContain('Edit CC12346 → Environment');
  });
  it('avoids choosing a cost center when multiple centers are equally close', () => {
    const model = emptyLzModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), tagValueLists: { 'tag-lz-cost-center': 'CC1, CC2' },
      costCenterFilters: Object.fromEntries(['CC1', 'CC2'].map((center) => [center, { platform: ['network'], environment: null, project: null }])) };
    const error = costCenterCoverageError(costCenterCoverage({ 'iam.json': resource('iam', 'tobedefined') }), model);
    expect(error).not.toContain('Edit CC1');
    expect(error).toContain('Choose a cost center');
  });
  it('reports uncovered nested compartments and policies with their actual filters', () => {
    const missing = resource('cmp-prod', 'tobedefined');
    const report = costCenterCoverage({ 'iam.json': { compartments: { parent: { ...resource('parent', 'CC12346'), children: { missing } } },
      policies: { policy: resource('project-admin', 'tobedefined') } } });
    expect(report).toHaveLength(2);
    expect(report[0]).toMatchObject({ name: 'cmp-prod', platform: 'iam', environment: 'prod', project: 'proj1' });
    expect(costCenterCoverageError(report)).toContain('2 resources have no cost center');
  });
  it('ignores bootstrap duplicates, defaults and tag LOV, and accepts concrete assignments', () => {
    expect(costCenterCoverage({
      'iam.json': { groups: { group: resource('group', 'CC12346') }, default_defined_tags: { [`${prefix}cost-center`]: 'tobedefined' } },
      'governance.json': { tags: { valid_values: ['tobedefined'], tag_defaults: { default_value: 'tobedefined' } } },
      'iam_pre.json': { groups: { group: resource('bootstrap', 'tobedefined') } },
    })).toEqual([]);
    expect(costCenterCoverageError([])).toBeNull();
  });
  it('treats absent or blank cost centers as uncovered on resources with cost tags', () => {
    const absent = resource('absent', '');
    delete (absent.defined_tags as Record<string, string>)[`${prefix}cost-center`];
    expect(costCenterCoverage({ 'extension.json': { absent, blank: resource('blank', ' ') } })).toHaveLength(2);
  });
});
