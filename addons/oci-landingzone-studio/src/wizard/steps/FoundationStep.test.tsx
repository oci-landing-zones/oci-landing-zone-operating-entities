import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import FoundationStep from './FoundationStep';
import type { LzModel } from '../../model/types';

function render(model: LzModel) {
  return renderToStaticMarkup(<WizardProvider initialModel={model}>
    <FoundationStep name="Test design" onNameChange={() => {}} onNameBlur={() => {}} />
  </WizardProvider>);
}

describe('observability fields', () => {
  it('offers deployment type without a description or DR starting-point field', () => {
    const complete = render(emptyLzModel());
    expect(complete).toContain('id="lz-deployment-type"');
    expect(complete).toContain('Complete deployment');
    expect(complete).not.toContain('id="lz-dr-source"');
    expect(complete).not.toContain('Description');
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    const regional = render(model);
    expect(regional).toContain('Home region');
    expect(regional).not.toContain('id="lz-dr-source"');
    expect(regional).not.toContain('Apply starting point');
    expect(regional).not.toContain('Description');
  });
  it('shows DR prerequisites and hides Home-owned controls', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    model.foundation.notifications!.useSingleRecipient = false;
    model.environments = [];
    const html = render(model);
    expect(html).toContain('Home region');
    expect(html).toContain('Home stack owns matching compartments');
    expect(html).toContain('Environments are optional');
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
    expect(html.indexOf('Use one email for all notifications')).toBeLessThan(html.indexOf('id="lz-observability-cloudguard"'));
    expect(html).not.toContain('id="lz-observability-default"');
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
  });
  it('clears the field error for a valid shared recipient', () => {
    const model = emptyLzModel();
    model.foundation.notifications!.default = 'ops@example.com';
    expect(render(model)).not.toContain('role="alert"');
  });
});
