import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import FoundationStep from './FoundationStep';
import type { LzModel } from '../../model/types';
import { MemoryRouter } from 'react-router-dom';

function render(model: LzModel) {
  return renderToStaticMarkup(<WizardProvider initialModel={model}>
    <FoundationStep name="Test design" onNameChange={() => {}} onNameBlur={() => {}} />
  </WizardProvider>);
}

describe('observability fields', () => {
  it('keeps a custom region short name editable', () => {
    const model = emptyLzModel();
    model.foundation.regionShortName = 'fr2';
    const input = render(model).match(/<input\b[^>]*id="lz-region-short-name"[^>]*>/)?.[0];
    expect(input).toContain('value="fr2"');
    expect(input).toContain('maxLength="3"');
    expect(input).not.toContain('required');
    expect(input).not.toMatch(/readOnly|disabled|aria-invalid="true"/i);
  });

  it('associates an invalid short name with its inline error', () => {
    const model = emptyLzModel();
    model.foundation.regionShortName = ' fr2';
    const html = render(model);
    expect(html).toMatch(/id="lz-region-short-name"[^>]*aria-invalid="true"/);
    expect(html).toMatch(/id="lz-region-short-name"[^>]*aria-describedby="lz-region-short-name-error"/);
    expect(html).toContain('id="lz-region-short-name-error"');
    expect(html).toContain('Use 3 characters or fewer for the region short name.');
  });

  it.each(['', 'a-b', ' a '])('adds no required or format rule to region short names: %j', (value) => {
    const model = emptyLzModel();
    model.foundation.regionShortName = value;
    const input = render(model).match(/<input\b[^>]*id="lz-region-short-name"[^>]*>/)?.[0];
    expect(input).not.toMatch(/required|pattern=|aria-invalid="true"/);
  });

  it('locks linked DR environments and opens their Home Region design in a new tab', () => {
    const home = emptyLzModel();
    const dr = structuredClone(home);
    dr.foundation.stackScope = 'regional';
    const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={dr} homeSource={{ id: 'saved-home', name: 'Primary design', model: home }}>
      <FoundationStep name="Recovery" onNameChange={() => {}} onNameBlur={() => {}} />
    </WizardProvider></MemoryRouter>);
    expect(html).toContain('Environments sync automatically from');
    expect(html).toContain('Primary design');
    expect(html).toContain('Environments synced from Home Region');
    expect(html).not.toContain('New environment name');
    expect(html).not.toContain('Remove prod from DR');
    expect(html).not.toContain('Environment 1 name');
    const homeLink = html.match(/<a\b[^>]*>Open Home Region<\/a>/)?.[0];
    expect(homeLink).toContain('href="/lz/saved-home"');
    expect(homeLink).toContain('target="_blank"');
    expect(homeLink).toContain('rel="noopener noreferrer"');
    expect(html).toMatch(/id="lz-deployment-type"[^>]+disabled/);
    expect(html).toMatch(/id="lz-realm"[^>]+disabled/);
    expect(html).toMatch(/id="lz-home-region"[^>]+disabled/);
    expect(html).not.toMatch(/id="lz-region"[^>]+disabled/);
  });

  it('preserves the locked environment snapshot when the Home Region design is unavailable', () => {
    const dr = emptyLzModel();
    dr.foundation.stackScope = 'regional';
    const html = renderToStaticMarkup(<WizardProvider initialModel={dr} homeSource={{ id: 'missing-home' }}>
      <FoundationStep name="Recovery" onNameChange={() => {}} onNameBlur={() => {}} />
    </WizardProvider>);
    expect(html).toContain('Home Region design is unavailable');
    expect(html).toContain('prod');
    expect(html).not.toContain('href="/lz/missing-home"');
    expect(html).not.toContain('New environment name');
  });
  it('offers deployment type without a description or DR starting-point field', () => {
    const complete = render(emptyLzModel());
    expect(complete).toContain('id="lz-deployment-type"');
    expect(complete).toContain('Complete creates tenancy foundations');
    expect(complete).not.toContain('id="lz-dr-source"');
    expect(complete).not.toContain('Description');
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    const regional = render(model);
    expect(regional).toContain('Home Region');
    expect(regional).not.toContain('id="lz-dr-source"');
    expect(regional).not.toContain('Apply starting point');
    expect(regional).not.toContain('Description');
  });
  it('explains DR environment matching and leaves deployment prerequisites to Review', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    model.foundation.notifications!.useSingleRecipient = false;
    const html = render(model);
    expect(html).toContain('Environments to recover');
    expect(html).toContain('Use the same environment names as your Home Region deployment.');
    expect(html).toMatch(/<details[^>]*><summary[^>]*>How DR uses these environments<\/summary>/);
    expect(html).not.toMatch(/<details[^>]*\bopen/);
    expect(html).toContain('compartments from your Home Region.');
    expect(html).toContain('Changes here affect only this DR design.');
    expect(html).not.toContain('Home-owned');
    expect(html).not.toContain('Home controls');
    expect(html).not.toContain('role="switch"');
    expect(render(emptyLzModel())).toContain('role="switch"');
    expect(html).toContain('Home Region');
    expect(html).not.toContain('Home stack owns matching compartments');
    model.environments = [];
    expect(render(model)).toContain('No recovery environments. Hub and shared services only.');
    expect(html).not.toContain('id="lz-observability-cloudguard"');
    expect(html).not.toContain('id="lz-observability-iam"');
    expect(html).toContain('id="lz-observability-network"');
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
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
  });
  it('clears the field error for a valid shared recipient', () => {
    const model = emptyLzModel();
    model.foundation.notifications!.default = 'ops@example.com';
    expect(render(model)).not.toContain('role="alert"');
  });
});
