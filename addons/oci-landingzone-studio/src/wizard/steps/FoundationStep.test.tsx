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
