import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import ObservabilityCostStep from './ObservabilityCostStep';
import { addCostCenters, defaultCostGovernance } from '../../services/costGovernance';
import type { LzModel } from '../../model/types';

function taggedModel() {
  const model = emptyLzModel();
  model.foundation.costGovernance = defaultCostGovernance();
  return model;
}

function render(model: LzModel) {
  return renderToStaticMarkup(<WizardProvider initialModel={model}><ObservabilityCostStep /></WizardProvider>);
}

describe('observability and cost settings', () => {
  it('preselects CC12345 for IT and shows an inline error for cost centers without a business unit', () => {
    const model = taggedModel();
    expect(render(model)).toMatch(/aria-label="CC12345 for business unit IT" checked=""/);
    model.foundation.costGovernance = addCostCenters(defaultCostGovernance(), 'CC2');
    expect(render(model)).toContain('Cost center CC2: Assign a business unit before downloading.');
    model.foundation.costGovernance.costCenterBusinessUnits = {};
    const html = render(model);
    expect(html).not.toMatch(/aria-label="CC12345 for business unit IT" checked/);
    expect(html).toContain('Assign at least one cost center to this business unit.');
    expect(html).toContain('Cost center CC12345: Assign a business unit before downloading.');
  });
  it('hides inherited budgets for business units absent from the configured LOV', () => {
    const model = taggedModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), tagValueLists: { 'tag-lz-business-unit': 'IT' } };
    const html = render(model);
    expect(html).not.toContain('budget-business-unit-retail');
    expect(html).toContain('budget-business-unit-it');
  });
  it('uses a tag value dropdown and keeps the delete action for custom budgets', () => {
    const model = taggedModel(); const cfg = addCostCenters(defaultCostGovernance(), 'CC12346');
    cfg.additionalBudgets!['BUDGET-CUSTOM-DRAFT-KEY'] = { name: 'budget-custom-3', amount: 500, thresholdValue: 80, recipients: '', tagName: 'tag-lz-cost-center', tagValue: '' };
    model.foundation.costGovernance = cfg;
    const html = render(model);
    const picker = html.match(/<select id="budget-tag-value-BUDGET-CUSTOM-DRAFT-KEY"[\s\S]*?<\/select>/)?.[0];
    expect(picker).toContain('Choose a defined tag value');
    expect(picker).toContain('value="CC12345"');
    expect(picker).toContain('value="CC12346"');
    expect(picker).not.toContain('value="IT"');
    expect(html).toContain('aria-label="Remove budget budget-custom-3"');
  });
  it('keeps budgets for all configured cost centers together without duplicates', () => {
    const model = taggedModel();
    model.foundation.costGovernance = addCostCenters(defaultCostGovernance(), 'CC12346');
    model.foundation.costGovernance.additionalBudgets!['BUDGET-CUSTOM-DRAFT-KEY'] = { name: 'budget-draft', amount: 500, thresholdValue: 80, recipients: '', tagName: 'tag-lz-cost-center', tagValue: '' };
    model.foundation.costGovernance.additionalBudgets!['BUDGET-CUSTOM-MANUAL-KEY'] = { name: 'budget-manual', amount: 500, thresholdValue: 80, recipients: '', tagName: 'tag-lz-cost-center', tagValue: 'CC12346' };
    const html = render(model);
    const first = html.indexOf('Remove budget budget-cost-center-cc12345');
    const second = html.indexOf('Remove budget budget-cost-center-cc12346');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(second).toBeLessThan(html.indexOf('Remove budget budget-business-unit-it'));
    expect(second).toBeLessThan(html.indexOf('Remove budget budget-draft'));
    expect(html.indexOf('Remove budget budget-manual')).toBeGreaterThan(html.indexOf('Remove budget budget-draft'));
    expect(html.indexOf('Remove budget budget-manual')).toBeGreaterThan(html.indexOf('Remove budget budget-proj1'));
    expect(html.match(/aria-label="Remove budget budget-cost-center-cc12346"/g)).toHaveLength(1);
  });
  it('disables cost centers already assigned to another business unit', () => {
    const model = taggedModel();
    model.foundation.costGovernance = { requireTagValues: false, useSingleRecipient: true, recipients: 'ops@example.com', budgets: {},
      tagValueLists: { 'tag-lz-cost-center': 'CC12345, CC2', 'tag-lz-business-unit': 'IT, Retail' }, costCenterBusinessUnits: { CC12345: 'IT' } };
    const html = render(model);
    expect(html).toMatch(/aria-label="CC12345 for business unit IT" checked=""/);
    expect(html).toMatch(/aria-label="CC12345 for business unit Retail" disabled=""/);
    expect(html).toContain('CC12345 · Assigned to IT');
    expect(html).not.toMatch(/aria-label="CC2 for business unit Retail" disabled/);
  });
  it('shows inherited environment and project LOV as readonly despite old manual overrides', () => {
    const model = taggedModel();
    model.environments[0].name = 'staging-custom';
    model.projects[0].name = 'payments';
    model.foundation.costGovernance = { requireTagValues: false, useSingleRecipient: true, recipients: 'ops@example.com', budgets: {}, tagValueLists: { 'tag-lz-environment': 'obsolete', 'tag-lz-project': 'obsolete', 'tag-lz-platform': 'obsolete' } };
    const html = render(model);
    const environment = html.match(/<textarea[^>]*aria-label="LOV for tag-lz-environment"[^>]*>[\s\S]*?<\/textarea>/)?.[0];
    const platform = html.match(/<textarea[^>]*aria-label="LOV for tag-lz-platform"[^>]*>[\s\S]*?<\/textarea>/)?.[0];
    expect(platform).toMatch(/readonly/i);
    expect(platform).toContain('network, security');
    expect(platform).not.toContain('obsolete');
    const project = html.match(/<textarea[^>]*aria-label="LOV for tag-lz-project"[^>]*>[\s\S]*?<\/textarea>/)?.[0];
    expect(environment).toMatch(/readonly/i);
    expect(environment).toContain('shared, staging-custom, preprod');
    expect(project).toMatch(/readonly/i);
    expect(project).toContain('notapplicable, payments');
    expect(environment).not.toContain('obsolete');
    expect(project).not.toContain('obsolete');
    model.environments[0].name = 'production'; model.projects = [];
    const updated = render(model);
    expect(updated).toContain('shared, production, preprod');
    expect(updated).toMatch(/aria-label="LOV for tag-lz-project"[^>]*>notapplicable<\/textarea>/);
  });
  it('orders FinOps/Governance tags before Budgets without Notifications', () => {
    const model = taggedModel();
    model.environments[0].name = 'staging-custom';
    model.projects[0].name = 'payments';
    const html = render(model);
    const tags = html.match(/<section[^>]*aria-labelledby="cost-governance-tags-title"[\s\S]*?<\/section>/)?.[0];
    const budgets = html.match(/<section[^>]*aria-labelledby="cost-budgets-title"[\s\S]*?<\/section>/)?.[0];
    expect(tags).toBeDefined();
    expect(budgets).toBeDefined();
    expect(html).not.toContain('Observability Notifications (Events &amp; alarms)');
    expect(html.indexOf('id="cost-budgets-title"')).toBeGreaterThan(html.indexOf('FinOps/Governance tags'));
    for (const name of ['cost-center', 'business-unit', 'owner', 'platform', 'environment', 'project']) {
      expect(tags).toContain(`tag-lz-${name}`);
    }
    expect(tags).toContain('staging-custom');
    expect(tags).toContain('payments');
    expect(tags).toContain('with required values and their associated tag-based budgets in generated JSON.');
    expect(tags).toMatch(/type="email" aria-label="Owner email"[^>]*value="email.address@example.com"/);
    expect(tags).not.toContain('LOV for tag-lz-owner');
    expect(tags).toContain('Owner uses one email for all resources.');
    expect(tags).toContain('LOV (List of values)');
    expect(tags).not.toContain('>Configuration</th>');
    const costCenterRow = tags!.match(/<tr><td[^>]*><button[^>]*><code>tag-lz-cost-center<\/code>[\s\S]*?<\/tr>/)![0];
    const costCenterCells = costCenterRow.match(/<td[^>]*>[\s\S]*?<\/td>/g)!;
    expect(costCenterCells[1]).toContain('Platform for cost center CC12345');
    expect(costCenterCells[1]).toContain('Add cost center');
    expect(costCenterCells[1]).toContain('Environment for cost center CC12345');
    expect(costCenterCells[1]).toContain('Project for cost center CC12345');
    expect(costCenterCells[1]).toContain('N:1 relationship');
    expect(costCenterCells[1]).toContain('Remove cost center CC12345');
    expect(costCenterCells[1]).toMatch(/aria-label="Edit cost center CC12345" aria-expanded="false" aria-controls="cost-center-advanced-0"/);
    expect(costCenterCells[1]).toContain('id="cost-center-advanced-0" hidden=""');
    expect(costCenterCells[1]).toContain('Advanced cost configuration');
    expect(costCenterCells[1].indexOf('Edit cost center CC12345')).toBeLessThan(costCenterCells[1].indexOf('Remove cost center CC12345'));
    expect(costCenterCells[1]).not.toContain('aria-label="New cost center"');
    for (const field of ['Platform', 'Environment', 'Project']) expect(costCenterCells[1]).toMatch(new RegExp(`aria-label="${field} for cost center CC12345"[^>]*>All</summary>`));
    expect(costCenterCells).toHaveLength(2);
    expect(tags).not.toContain('aria-label="Show scope of tag-lz-');
    expect(tags).toMatch(/<input[^>]*id="cost-finops-enabled"[^>]*checked=""/);
    expect(tags).toContain('<textarea');
    expect(tags).toMatch(/aria-label="Cost center 1"[^>]*value="CC12345"/);
    expect(tags).toContain('Add cost center');
    expect(tags).toContain('Platform for cost center CC12345');
    expect(tags).toMatch(/aria-label="LOV for tag-lz-platform"[^>]*>[\s\S]*?iam, governance[\s\S]*?<\/textarea>/);
    expect(budgets).toContain('Add tag-based budget');
    expect([...tags!.matchAll(/<tr><td[^>]*><button[^>]*><code>(tag-lz-[a-z-]+)<\/code>/g)].map((match) => match[1])).toEqual([
      'tag-lz-platform', 'tag-lz-environment', 'tag-lz-project', 'tag-lz-cost-center', 'tag-lz-business-unit', 'tag-lz-owner',
    ]);
    for (const unit of ['IT']) {
      expect(tags).toContain(`Cost centers for ${unit}`);
      expect(tags).toContain(`CC12345 for business unit ${unit}`);
      expect(tags).not.toContain(`Platform for business unit ${unit}`);
    }
    expect(tags).not.toContain('Cost centers for Retail');
    expect(budgets).not.toContain('budget-business-unit-retail');
    expect(budgets).not.toContain('budget-business-unit-finance');
    expect(budgets).toContain('budget-landingzone');
    expect(budgets).toContain('10,000');
    expect(budgets).toContain('Use one email for all budget alerts');
    expect(budgets).toContain('Budget name');
    expect(budgets).toContain('Monthly amount');
    expect(budgets).toContain('Alert threshold (%)');
  });

  it('explains that DR reuses Home Region governance', () => {
    const model = taggedModel();
    model.foundation.stackScope = 'regional';
    const section = render(model).match(/<section[^>]*aria-labelledby="cost-budgets-title"[\s\S]*?<\/section>/)?.[0];
    expect(section).toContain('Tags and budgets are managed in the Home Region.');
  });

  it('locks Home-owned cost governance in DR without notification settings', () => {
    const model = taggedModel(); model.foundation.stackScope = 'regional';
    model.foundation.notifications!.useSingleRecipient = false;
    const html = render(model);
    expect(html).not.toContain('id="lz-observability-network"');
    expect(html).not.toContain('id="lz-observability-security"');
    expect(html).not.toContain('id="lz-observability-cloudguard"');
    expect(html).not.toContain('id="lz-observability-iam"');
    expect(html).toMatch(/<fieldset[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Remove cost center CC12345"/);
  });

});

it('keeps IAM role tags and compartment budgets explained when FinOps tags are disabled', () => {
  const model = taggedModel();
  model.foundation.costGovernance = Object.assign(defaultCostGovernance(), { tagsEnabled: false });
  const html = render(model);
  expect(html).toContain('Enable FinOps tags');
  expect(html).toContain('The blueprint includes IAM role tags for tag-based access control (TBAC) in IAM policies and compartment-based budgets by default. Both remain available with or without FinOps tags.');
  expect(html).not.toContain('aria-label="Cost governance tags"');
  expect(html).not.toContain('Add tag-based budget');
  expect(html).toContain('budget-landingzone');
  expect(html).not.toContain('budget-cost-center-cc12345');
});

it('starts with FinOps tags unchecked and shared budget alerts checked', () => {
  const html = render(emptyLzModel());
  const checkbox = html.match(/<input[^>]*id="cost-finops-enabled"[^>]*>/)?.[0];
  expect(checkbox).toContain('type="checkbox"');
  expect(checkbox).not.toContain('checked=""');
  expect(html).toMatch(/<label[^>]*><input[^>]*checked=""[^>]*\/>Use one email for all budget alerts<\/label>/);
  expect(html).not.toContain('id="cost-budget-BUDGET-LANDINGZONE-KEY-recipients"');
  expect(html).toMatch(/<label[^>]*>[\s\S]*?id="cost-finops-enabled"[^>]*\/>Enable FinOps tags<\/label>/);
  expect(html).not.toContain('aria-label="Cost governance tags"');
  expect(html).not.toContain('Add tag-based budget');
});

it('clears the Owner email error state after entering a valid address', () => {
  const model = taggedModel();
  model.foundation.costGovernance!.ownerEmail = 'invalid';
  const invalid = render(model).match(/<input[^>]*aria-label="Owner email"[^>]*>/)?.[0];
  expect(invalid).toContain('aria-invalid="true"');
  expect(invalid).toContain('aria-describedby="cost-owner-email-error"');
  model.foundation.costGovernance!.ownerEmail = 'owner@example.com';
  const valid = render(model).match(/<input[^>]*aria-label="Owner email"[^>]*>/)?.[0];
  expect(valid).toContain('aria-invalid="false"');
  expect(valid).not.toContain('aria-describedby="cost-owner-email-error"');
});

it.each([true, false])('clears budget email errors after entering valid recipients (shared=%s)', (shared) => {
  const model = emptyLzModel();
  const cfg = model.foundation.costGovernance!;
  cfg.useSingleRecipient = shared;
  const id = shared ? 'cost-budget-shared-email' : 'cost-budget-BUDGET-LANDINGZONE-KEY-recipients';
  const input = (html: string) => html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0];
  cfg.recipients = 'invalid';
  cfg.budgets['BUDGET-LANDINGZONE-KEY'].recipients = 'invalid';
  expect(input(render(model))).toContain('aria-invalid="true"');
  cfg.recipients = 'finops@example.com';
  cfg.budgets['BUDGET-LANDINGZONE-KEY'].recipients = 'finops@example.com';
  const valid = render(model);
  expect(input(valid)).toContain('aria-invalid="false"');
  expect(input(valid)).not.toContain('border-color:');
  expect(valid).not.toContain('class="field-error">Enter at least one notification email address.');
});

it('provides the existing tag editor and six eye controls without budgets in tags-only mode', () => {
  const model = taggedModel();
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><ObservabilityCostStep tagsOnly selectedTag="tag-lz-owner" onTagSelect={() => {}} /></WizardProvider>);
  expect(html).toContain('aria-label="Cost governance tags"');
  expect(html).toContain('>Configuration</th>');
  expect(html.match(/class="cost-tag-locator"/g)).toHaveLength(6);
  expect(html).toMatch(/aria-label="Show scope of tag-lz-owner"[^>]*aria-pressed="true"/);
  expect(html).toContain('aria-label="Owner email"');
  expect(html).not.toContain('id="cost-budgets-title"');
  expect(html).not.toContain('cost-tags-enabled-help');
});

it('keeps Home-owned tags read-only in the regional tags-only editor', () => {
  const model = taggedModel(); model.foundation.stackScope = 'regional';
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><ObservabilityCostStep tagsOnly onTagSelect={() => {}} /></WizardProvider>);
  expect(html).toMatch(/aria-label="Owner email"[^>]*disabled=""/);
  expect(html).toContain('aria-label="Show scope of tag-lz-owner"');
  expect(html).not.toContain('id="cost-budgets-title"');
});

it.each([false, true])('shows the tag configuration action only alongside enabled FinOps tags (enabled=%s)', (enabled) => {
  const model = taggedModel(); model.foundation.costGovernance!.tagsEnabled = enabled;
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><ObservabilityCostStep tagConfigurationAction={<button type="button">Show tag configuration</button>} /></WizardProvider>);
  expect(html.includes('Show tag configuration')).toBe(enabled);
  if (enabled) expect(html.indexOf('Show tag configuration')).toBeGreaterThan(html.indexOf('Enable FinOps tags'));
});

it('keeps budget errors visible while the editor is collapsed and separates the remove action', () => {
  const model = emptyLzModel();
  const cfg = model.foundation.costGovernance!;
  cfg.recipients = 'finops@example.com';
  cfg.budgets['BUDGET-LANDINGZONE-KEY'].amount = 0;
  const html = render(model);
  const summary = html.match(/<summary class="cost-budget-summary"[\s\S]*?<\/summary>/)?.[0];
  expect(summary).toBeDefined();
  expect(summary).toContain('1 field needs attention');
  expect(summary).not.toContain('<button');
  expect(html).toContain('aria-label="Remove budget budget-landingzone"');
  cfg.budgets['BUDGET-LANDINGZONE-KEY'].amount = 10000;
  expect(render(model)).not.toContain('field needs attention');
});

it('associates missing business-unit assignments with their cost-center selector', () => {
  const model = taggedModel();
  model.foundation.costGovernance!.costCenterBusinessUnits = {};
  const html = render(model);
  const selector = html.match(/<summary[^>]*aria-label="Cost centers for IT"[^>]*>/)?.[0];
  expect(selector).toContain('aria-invalid="true"');
  expect(selector).toContain('aria-describedby="cost-business-unit-IT-error"');
  expect(html).toContain('id="cost-business-unit-IT-error"');
});
