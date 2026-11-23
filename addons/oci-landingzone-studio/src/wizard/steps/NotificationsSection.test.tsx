import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import type { LzModel } from '../../model/types';
import NotificationsSection from './NotificationsSection';

function render(model: LzModel) {
  return renderToStaticMarkup(<WizardProvider initialModel={model}><NotificationsSection /></WizardProvider>);
}

describe('Observability notifications', () => {
  it('hides excluded Cloud Guard notifications while retaining their saved recipients', () => {
    const model = emptyLzModel();
    model.foundation.cloudGuardEnabled = false;
    model.foundation.notifications!.useSingleRecipient = false;
    model.foundation.notifications!.cloudguard = 'cg@customer.test';
    expect(render(model)).not.toContain('id="lz-observability-cloudguard"');
    expect(model.foundation.notifications!.cloudguard).toBe('cg@customer.test');
    model.foundation.cloudGuardEnabled = true;
    expect(render(model)).toContain('value="cg@customer.test"');
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
  it('limits secondary deployment topics to network and security', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    model.foundation.notifications!.useSingleRecipient = false;
    const html = render(model);
    expect(html).not.toContain('id="lz-observability-cloudguard"');
    expect(html).not.toContain('id="lz-observability-iam"');
    expect(html).toContain('id="lz-observability-network"');
    expect(html).toContain('id="lz-observability-security"');
  });
});
