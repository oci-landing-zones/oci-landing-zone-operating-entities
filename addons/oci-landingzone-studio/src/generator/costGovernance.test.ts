import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { defaultCostGovernance, syncCostCenterBudgets } from '../services/costGovernance';
import { hubKindDefaults } from '../services/hubKinds';
import { generateOutputs } from './generate';
import { setAssetLoader } from './jsonnetVm';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')) })));

it('generates user-required tags and edited inherited budgets from Studio with one shared email', async () => {
  const model = emptyLzModel(); model.environments = []; model.projects = [];
  model.network = { hubKind: 'hub_e', ...hubKindDefaults('hub_e') };
  model.foundation.costGovernance = defaultCostGovernance();
  model.foundation.costGovernance.requireTagValues = true;
  model.foundation.costGovernance.recipients = 'finops@example.com';
  Object.assign(model.foundation.costGovernance.budgets['BUDGET-LANDINGZONE-KEY'], { name: 'budget-team', amount: 12500, thresholdValue: 90 });
  const output = await generateOutputs(model);
  const gov = JSON.parse(output.files['governance.json']);
  const tags = Object.values(gov.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags) as Array<{ tag_defaults: Record<string, { is_user_required: boolean }> }>;
  expect(tags).toHaveLength(6);
  expect(tags.every((tag) => Object.values(tag.tag_defaults).every((entry) => entry.is_user_required))).toBe(true);
  const budgets = gov.budgets_configuration.budgets;
  expect(Object.keys(budgets)).toHaveLength(7);
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
  const result = await generateOutputs(model);
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
  const result = await generateOutputs(model);
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
  const output = await generateOutputs(model);
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
