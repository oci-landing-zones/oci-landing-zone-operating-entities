import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import ObservabilityCostStep from './ObservabilityCostStep';
import { addCostCenters, defaultCostGovernance } from '../../services/costGovernance';
import type { LzModel } from '../../model/types';

function render(model: LzModel) {
  return renderToStaticMarkup(<WizardProvider initialModel={model}><ObservabilityCostStep /></WizardProvider>);
}

describe('observability and cost settings', () => {
  it('uses a tag value dropdown and keeps the delete action for custom budgets', () => {
    const model = emptyLzModel(); const cfg = addCostCenters(defaultCostGovernance(), 'CC12346');
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
    const model = emptyLzModel();
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
    const model = emptyLzModel();
    model.foundation.costGovernance = { requireTagValues: false, useSingleRecipient: true, recipients: 'ops@example.com', budgets: {},
      tagValueLists: { 'tag-lz-cost-center': 'CC12345, CC2' }, costCenterBusinessUnits: { CC12345: 'IT' } };
    const html = render(model);
    expect(html).toMatch(/aria-label="CC12345 for business unit IT" checked=""/);
    expect(html).toMatch(/aria-label="CC12345 for business unit Retail" disabled=""/);
    expect(html).toContain('CC12345 · Assigned to IT');
    expect(html).not.toMatch(/aria-label="CC2 for business unit Retail" disabled/);
  });
  it('shows inherited environment and project LOV as readonly despite old manual overrides', () => {
    const model = emptyLzModel();
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
  it('orders Notifications, FinOps/Governance tags and Budgets as separate sections', () => {
    const model = emptyLzModel();
    model.environments[0].name = 'staging-custom';
    model.projects[0].name = 'payments';
    const html = render(model);
    const tags = html.match(/<section[^>]*aria-labelledby="cost-governance-tags-title"[\s\S]*?<\/section>/)?.[0];
    const budgets = html.match(/<section[^>]*aria-labelledby="cost-budgets-title"[\s\S]*?<\/section>/)?.[0];
    expect(tags).toBeDefined();
    expect(budgets).toBeDefined();
    expect(html).toContain('Observability Notifications (Events &amp; alarms)');
    expect(html.indexOf('FinOps/Governance tags')).toBeGreaterThan(html.indexOf('Observability Notifications (Events &amp; alarms)'));
    expect(html.indexOf('id="cost-budgets-title"')).toBeGreaterThan(html.indexOf('FinOps/Governance tags'));
    for (const name of ['cost-center', 'business-unit', 'owner', 'platform', 'environment', 'project']) {
      expect(tags).toContain(`tag-lz-${name}`);
    }
    expect(tags).toContain('staging-custom');
    expect(tags).toContain('payments');
    expect(tags).toContain('Enable default tags');
    expect(tags).toMatch(/type="email" aria-label="Owner email"[^>]*value="email.address@example.com"/);
    expect(tags).not.toContain('LOV for tag-lz-owner');
    expect(tags).toContain('Owner uses one email for all resources.');
    expect(tags).toContain('LOV (List of values)');
    expect(tags).toContain('Configuration');
    const costCenterRow = tags!.match(/<tr><td[^>]*><code>tag-lz-cost-center<\/code>[\s\S]*?<\/tr>/)![0];
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
    expect(costCenterCells[2]).not.toContain('<select');
    expect(costCenterCells[2]).not.toContain('<input');
    expect(costCenterCells[2]).toContain('Show scope of tag-lz-cost-center');
    expect(tags?.match(/aria-label="Show scope of tag-lz-/g)).toHaveLength(6);
    expect(tags).toContain('aria-pressed="false"');
    expect(tags).toContain('<textarea');
    expect(tags).toMatch(/aria-label="Cost center 1"[^>]*value="CC12345"/);
    expect(tags).toContain('Add cost center');
    expect(tags).toContain('Platform for cost center CC12345');
    expect(tags).toMatch(/aria-label="LOV for tag-lz-platform"[^>]*>network, security<\/textarea>/);
    expect(budgets).toContain('Add tag-based budget');
    expect([...tags!.matchAll(/<tr><td[^>]*><code>(tag-lz-[a-z-]+)<\/code>/g)].map((match) => match[1])).toEqual([
      'tag-lz-platform', 'tag-lz-environment', 'tag-lz-project', 'tag-lz-cost-center', 'tag-lz-business-unit', 'tag-lz-owner',
    ]);
    for (const unit of ['IT', 'Retail']) {
      expect(tags).toContain(`Cost centers for ${unit}`);
      expect(tags).toContain(`CC12345 for business unit ${unit}`);
      expect(tags).not.toContain(`Platform for business unit ${unit}`);
    }
    expect(budgets).not.toContain('budget-business-unit-finance');
    expect(budgets).toContain('budget-landingzone');
    expect(budgets).toContain('10,000');
    expect(budgets).toContain('Use one email for all budget alerts');
    expect(budgets).toContain('Budget name');
    expect(budgets).toContain('Monthly amount');
    expect(budgets).toContain('Alert threshold (%)');
  });

  it('explains that DR reuses Home Region governance', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    const section = render(model).match(/<section[^>]*aria-labelledby="cost-budgets-title"[\s\S]*?<\/section>/)?.[0];
    expect(section).toContain('Tags and budgets are managed in the Home Region.');
  });

  it('starts with the shared recipient checked and a required email field', () => {
    const html = render(emptyLzModel());
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
    expect(html).toMatch(/id="lz-observability-default"[^>]*required/);
    expect(html).toContain('Enter at least one notification email address.');
    expect(html).not.toContain('id="lz-observability-cloudguard"');
  });

  it('keeps the switch above topic inputs when separate recipients are selected', () => {
    const model = emptyLzModel();
    model.foundation.notifications!.useSingleRecipient = false;
    const html = render(model);
    const recipientChoice = html.indexOf('Use the same recipients for all topics');
    expect(recipientChoice).toBeGreaterThan(-1);
    expect(recipientChoice).toBeLessThan(html.indexOf('id="lz-observability-cloudguard"'));
    expect(html).not.toContain('id="lz-observability-default"');
    expect(html.match(/<section[^>]*aria-labelledby="foundation-observability-title"[\s\S]*?<\/section>/)?.[0]).not.toMatch(/type="checkbox"[^>]*checked/);
  });

  it('clears the field error for a valid shared recipient', () => {
    const model = emptyLzModel();
    model.foundation.notifications!.default = 'ops@example.com';
    expect(render(model)).not.toContain('role="alert"');
  });
  it('keeps only regional notification topics and locks Home-owned cost governance in DR', () => {
    const model = emptyLzModel(); model.foundation.stackScope = 'regional';
    model.foundation.notifications!.useSingleRecipient = false;
    const html = render(model);
    expect(html).toContain('id="lz-observability-network"');
    expect(html).toContain('id="lz-observability-security"');
    expect(html).not.toContain('id="lz-observability-cloudguard"');
    expect(html).not.toContain('id="lz-observability-iam"');
    expect(html).toMatch(/<fieldset[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Remove cost center CC12345"/);
  });

});
