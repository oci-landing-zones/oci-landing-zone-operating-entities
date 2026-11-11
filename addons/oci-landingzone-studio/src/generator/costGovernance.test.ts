import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { defaultCostGovernance, syncCostCenterBudgets, parseTagValues, businessUnitAssignments } from '../services/costGovernance';
import { hubKindDefaults } from '../services/hubKinds';
import { generateOutputs, generateFromConfigCode } from './generate';
import { serializeConfig } from '../services/lzConfig';
import { generatePreview } from './preview';
import { setAssetLoader } from './jsonnetVm';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')) })));

function ready(model: ReturnType<typeof emptyLzModel>) {
  const cfg = model.foundation.costGovernance ?? defaultCostGovernance();
  if (!cfg.recipients) cfg.recipients = 'finops@example.com';
  if (!cfg.useSingleRecipient) for (const budget of [...Object.values(cfg.budgets), ...Object.values(cfg.additionalBudgets ?? {})]) {
    if (!budget.recipients) budget.recipients = 'finops@example.com';
  }
  if (!Object.keys(businessUnitAssignments(cfg)).length) {
    const center = parseTagValues(cfg.tagValueLists?.['tag-lz-cost-center'] ?? 'CC12345').find((value) => value !== 'tobedefined')!;
    cfg.tagValueLists = { ...cfg.tagValueLists, 'tag-lz-business-unit': 'IT' };
    cfg.costCenterBusinessUnits = { [center]: 'IT' };
  }
  model.foundation.costGovernance = cfg;
  return model;
}

it('generates user-required tags and edited inherited budgets from Studio with one shared email', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  model.foundation.costGovernance = defaultCostGovernance();
  model.foundation.costGovernance.requireTagValues = true;
  model.foundation.costGovernance.recipients = 'finops@example.com';
  Object.assign(model.foundation.costGovernance.budgets['BUDGET-LANDINGZONE-KEY'], { name: 'budget-team', amount: 12500, thresholdValue: 90 });
  const output = await generateOutputs(ready(model));
  const gov = JSON.parse(output.files['governance.json']);
  const tags = Object.values(gov.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags) as Array<{ tag_defaults: Record<string, { is_user_required: boolean }> }>;
  expect(tags).toHaveLength(6);
  expect(tags.every((tag) => Object.values(tag.tag_defaults).every((entry) => entry.is_user_required))).toBe(true);
  const platformField = 'tagns-lz-cost-governance.tag-lz-platform';
  expect(gov.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags['TAG-LZ-PLATFORM-KEY'].valid_values).toEqual(expect.arrayContaining(['iam', 'governance']));
  expect(Object.values(gov.budgets_configuration.budgets).every((budget) => (budget as { defined_tags: Record<string, string> }).defined_tags[platformField] === 'governance')).toBe(true);
  const iam = JSON.parse(output.files['iam.json']);
  expect(iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].defined_tags[platformField]).toBe('iam');
  const budgets = gov.budgets_configuration.budgets;
  expect(Object.keys(budgets)).toHaveLength(6);
  expect(budgets['BUDGET-BUSINESS-UNIT-FINANCE-KEY']).toBeUndefined();
  expect(gov.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags['TAG-LZ-BUSINESS-UNIT-KEY'].tag_defaults['TAG-LZ-BUSINESS-UNIT-KEY-REQUIRED'].default_value).toBe('tobedefined');
  expect(budgets['BUDGET-LANDINGZONE-KEY']).toMatchObject({ name: 'budget-team', amount: 12500, alert_rule: { threshold_value: 90, recipients: 'finops@example.com' } });
  expect(Object.values(budgets).every((budget) => (budget as { alert_rule: { recipients: string } }).alert_rule.recipients === 'finops@example.com')).toBe(true);
}, 60_000);

it('generates and restores tag-based custom budgets and edited LOV from Studio exports', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  const cfg = defaultCostGovernance(); model.foundation.costGovernance = cfg;
  cfg.tagValueLists = { 'tag-lz-cost-center': 'tobedefined\nCC900' };
  cfg.removedBudgets = ['BUDGET-COST-CENTER-CC12345-KEY'];
  cfg.additionalBudgets = { 'BUDGET-CUSTOM-TEAM-KEY': { name: 'budget-team', amount: 900, thresholdValue: 95, recipients: 'team@example.com', tagName: 'tag-lz-cost-center', tagValue: 'CC900' } };
  cfg.useSingleRecipient = false;
  const result = await generateOutputs(ready(model));
  const gov = JSON.parse(result.files['governance.json']);
  expect(gov.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags['TAG-LZ-COST-CENTER-KEY'].valid_values).toEqual(['CC900', 'tobedefined']);
  expect(gov.budgets_configuration.budgets['BUDGET-COST-CENTER-CC12345-KEY']).toBeUndefined();
  expect(gov.budgets_configuration.budgets['BUDGET-CUSTOM-TEAM-KEY']).toMatchObject({ name: 'budget-team', amount: 900, target: { type: 'TAG', values: ['tagns-lz-cost-governance.tag-lz-cost-center.CC900'] }, alert_rule: { threshold_value: 95, recipients: 'team@example.com' } });
}, 60_000);

it('generates a renamed cost-center budget with the new target and original alert settings', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  const cfg = defaultCostGovernance(); cfg.useSingleRecipient = false;
  Object.assign(cfg.budgets['BUDGET-COST-CENTER-CC12345-KEY'], { amount: 7777, thresholdValue: 95, recipients: 'team@example.com' });
  cfg.tagValueLists = { 'tag-lz-cost-center': 'CC2345' };
  model.foundation.costGovernance = syncCostCenterBudgets(cfg, 'CC12345');
  const result = await generateOutputs(ready(model));
  const gov = JSON.parse(result.files['governance.json']);
  const key = model.foundation.costGovernance.costCenterBudgetKeys!.CC2345;
  expect(gov.budgets_configuration.budgets['BUDGET-COST-CENTER-CC12345-KEY']).toBeUndefined();
  expect(gov.budgets_configuration.budgets[key]).toMatchObject({ name: 'budget-cost-center-cc2345', amount: 7777,
    target: { type: 'TAG', values: ['tagns-lz-cost-governance.tag-lz-cost-center.CC2345'] },
    alert_rule: { threshold_value: 95, recipients: 'team@example.com' } });
}, 60_000);

it('uses the configured owner email on every generated resource tag map and Owner Tag Default', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  model.foundation.costGovernance = { ...defaultCostGovernance(), ownerEmail: 'owner@example.com' };
  const output = await generateOutputs(ready(model));
  let checked = 0;
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['defined_tags', 'default_defined_tags', 'node_defined_tags'].includes(key) && child && typeof child === 'object') {
        expect((child as Record<string, string>)['tagns-lz-cost-governance.tag-lz-owner']).toBe('owner@example.com'); checked++;
      } else walk(child);
    }
  };
  Object.values(output.files).forEach((file) => walk(JSON.parse(file)));
  expect(checked).toBeGreaterThan(20);
  const gov = JSON.parse(output.files['governance.json']);
  const owner = gov.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags['TAG-LZ-OWNER-KEY'];
  expect(owner.valid_values).toContain('owner@example.com');
  expect(Object.values(owner.tag_defaults)).toEqual([expect.objectContaining({ default_value: 'owner@example.com' })]);
}, 60_000);

it('applies Studio cost center filters to generated resources and leaves unmatched resources unchanged', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  model.foundation.costGovernance = {
    ...defaultCostGovernance(),
    costCenterFilters: { CC12345: { platform: ['network'], environment: ['shared'], project: ['notapplicable'] } },
  };
  const output = { files: await generateFromConfigCode(serializeConfig(ready(model))) };
  const field = 'tagns-lz-cost-governance.tag-lz-cost-center';
  let matching = 0, unmatched = 0;
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'defined_tags' && child && typeof child === 'object') {
        const tags = child as Record<string, string>;
        if (tags['tagns-lz-cost-governance.tag-lz-platform'] === 'network') {
          expect(tags[field]).toBe('CC12345'); matching++;
        } else {
          expect(tags[field]).toBe('tobedefined'); unmatched++;
        }
      } else walk(child);
    }
  };
  walk(JSON.parse(output.files['network.json']));
  walk(JSON.parse(output.files['iam.json']));
  expect(matching).toBeGreaterThan(5);
  expect(unmatched).toBeGreaterThan(5);
}, 60_000);

it('intersects Platform, Environment and Project on actual generated project resources', async () => {
  const model = emptyLzModel(); model.environments = [model.environments[0]];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  model.foundation.costGovernance = {
    ...defaultCostGovernance(),
    costCenterFilters: { CC12345: { platform: ['network'], environment: [`environment:${model.environments[0].id}`], project: [`project:${model.projects[0].id}`] } },
  };
  const output = { files: await generateFromConfigCode(serializeConfig(ready(model))) };
  const network = JSON.parse(output.files['network.json']);
  const vcn = network.network_configuration.network_configuration_categories['1-prod'].vcns['VCN-FRA-LZ-PROD-PROJECTS-KEY'];
  const field = 'tagns-lz-cost-governance.tag-lz-cost-center';
  expect(vcn.network_security_groups['NSG-FRA-LZ-PROD-PROJ1-APP-KEY'].defined_tags[field]).toBe('CC12345');
  expect(vcn.defined_tags[field]).toBe('tobedefined');
  const iam = JSON.parse(output.files['iam.json']);
  expect(iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].defined_tags[field]).toBe('tobedefined');
}, 60_000);

it('does not reintroduce Retail through inherited budgets when Studio only defines IT', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  model.foundation.costGovernance = { ...defaultCostGovernance(), tagValueLists: { 'tag-lz-business-unit': 'IT' } };
  const output = await generateOutputs(ready(model));
  const governance = JSON.parse(output.files['governance.json']);
  expect(governance.budgets_configuration.budgets['BUDGET-BUSINESS-UNIT-RETAIL-KEY']).toBeUndefined();
  expect(governance.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags['TAG-LZ-BUSINESS-UNIT-KEY'].valid_values).toEqual(['IT', 'tobedefined']);
  expect(output.files['governance.json']).not.toContain('Retail');
}, 60_000);


it('labels tag definitions in the final phase and assigns Business Unit through Cost Center', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  model.foundation.costGovernance = { ...defaultCostGovernance(), requireTagValues: true,
    tagValueLists: { 'tag-lz-business-unit': 'IT' }, costCenterBusinessUnits: { CC12345: 'IT' },
  };
  const output = await generateOutputs(ready(model));
  const final = JSON.parse(output.files['governance.json']);
  const pre = JSON.parse(output.files['governance_pre.json']);
  expect(final.budgets_configuration).toEqual(pre.budgets_configuration);
  const platform = 'tagns-lz-cost-governance.tag-lz-platform';
  const unit = 'tagns-lz-cost-governance.tag-lz-business-unit';
  for (const [key, namespace] of Object.entries(final.tags_configuration.namespaces) as [string, { defined_tags: Record<string, string>; tags: Record<string, { defined_tags: Record<string, string> }> }][]) {
    expect(namespace.defined_tags).toMatchObject({ [platform]: 'governance', [unit]: 'IT', 'tagns-lz-cost-governance.tag-lz-environment': 'shared' });
    expect(pre.tags_configuration.namespaces[key].defined_tags).toBeUndefined();
    expect(Object.values(namespace.tags).every((tag) => tag.defined_tags[unit] === 'IT')).toBe(true);
  }
  const iam = JSON.parse(output.files['iam.json']);
  expect(iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].defined_tags[unit]).toBe('IT');
}, 60_000);


it('reports uncovered IAM resources in the preview and blocks downloading until all environments are covered', async () => {
  const model = emptyLzModel();
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  model.foundation.costGovernance = { ...defaultCostGovernance(),
    tagValueLists: { 'tag-lz-cost-center': 'CC12345, CC12346', 'tag-lz-business-unit': 'IT, GOV' },
    costCenterBusinessUnits: { CC12345: 'IT', CC12346: 'GOV' },
    costCenterFilters: {
      CC12345: { platform: ['network', 'security', 'observability'], environment: null, project: null },
      CC12346: { platform: ['iam', 'governance'], environment: ['shared'], project: null },
    },
  };
  model.foundation.costGovernance.recipients = 'finops@example.com';
  const preview = await generatePreview(model);
  expect(preview.uncoveredCostResources).toHaveLength(14);
  expect(preview.uncoveredCostResources.every((resource) => resource.platform === 'iam' && ['prod', 'preprod'].includes(resource.environment))).toBe(true);
  await expect(generateOutputs(model)).rejects.toThrow('14 resources have no cost center');
  model.foundation.costGovernance.costCenterFilters!.CC12346.environment = [];
  await expect(generateOutputs(model)).resolves.toHaveProperty('files');
}, 120_000);


it('uses the default IT cost center association and blocks an explicitly removed association', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  const output = await generateOutputs(ready(model));
  const iam = JSON.parse(output.files['iam.json']);
  expect(iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].defined_tags).toMatchObject({
    'tagns-lz-cost-governance.tag-lz-cost-center': 'CC12345',
    'tagns-lz-cost-governance.tag-lz-business-unit': 'IT',
  });
  model.foundation.costGovernance = { ...defaultCostGovernance(), costCenterBusinessUnits: {} };
  await expect(generateOutputs(model)).rejects.toThrow('Cost center CC12345: Assign a business unit before downloading.');
}, 60_000);


it('blocks JSON generation when notification emails are missing or still contain the sample address', async () => {
  const model = emptyLzModel();
  await expect(generateOutputs(model)).rejects.toThrow('Budget alerts: Enter at least one notification email address.');
  model.foundation.costGovernance = { ...defaultCostGovernance(), recipients: 'email.address@example.com' };
  await expect(generateOutputs(model)).rejects.toThrow('Budget alerts: Enter at least one notification email address.');
  model.foundation.costGovernance.useSingleRecipient = false;
  await expect(generateOutputs(model)).rejects.toThrow('budget-landingzone (recipients): Enter at least one notification email address.');
});
