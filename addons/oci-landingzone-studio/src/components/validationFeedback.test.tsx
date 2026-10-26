import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform } from '../services/platforms';
import { WizardProvider } from '../wizard/wizardContext';
import FoundationStep from '../wizard/steps/FoundationStep';
import ExadataStep from '../wizard/steps/ExadataStep';
import OkeSettingsFields from './OkeSettingsFields';
import ValidatedInput from './ValidatedInput';
import { ErrorNotice } from './FieldError';

function expectLinkedError(html: string, inputId: string) {
  const input = html.match(new RegExp(`<input[^>]*id="${inputId}"[^>]*>`))?.[0];
  expect(input).toContain('aria-invalid="true"');
  const ids = input?.match(/aria-describedby="([^"]+)"/)?.[1].split(' ');
  expect(ids?.length).toBeGreaterThan(0);
  for (const id of ids ?? []) expect(html).toContain(`id="${id}"`);
}

describe('consistent field feedback', () => {
  it('retains diagnostic line breaks without blank padding from parser errors', () => {
    const html = renderToStaticMarkup(<ErrorNotice title="Could not import this file">{'\nUnexpected end of file\nLine 2\n\n\n'}</ErrorNotice>);
    expect(html).toContain('Unexpected end of file\nLine 2</div>');
    expect(html).not.toContain('\n\n');
  });
  it('preserves help associations and removes feedback when corrected', () => {
    const invalid = renderToStaticMarkup(<ValidatedInput id="sample" helpId="sample-help" error="Enter a CIDR." value="bad" readOnly />);
    expect(invalid).toContain('aria-describedby="sample-help sample-error"');
    expect(invalid).toContain('class="field-error"');
    const valid = renderToStaticMarkup(<ValidatedInput id="sample" helpId="sample-help" value="10.0.0.0/24" readOnly />);
    expect(valid).toContain('aria-describedby="sample-help"');
    expect(valid).not.toContain('aria-invalid');
    expect(valid).not.toContain('id="sample-error"');
  });

  it('links OKE input errors, including cross-VCN conflicts, to their fields', () => {
    const model = emptyLzModel();
    const platform = newPlatform('oke_simple', [], model.environments);
    platform.okeParams = { ...platform.okeParams!, servicesCidr: model.network.hubVcnCidr, apiAllowedCidrs: ['invalid'], workerBootVolumeSize: 1 };
    model.platforms = [platform];
    const html = renderToStaticMarkup(<WizardProvider initialModel={model}><OkeSettingsFields platform={platform} onPlatform={() => {}} /></WizardProvider>);
    for (const field of ['svc', 'api', 'boot']) expectLinkedError(html, `${platform.id}-${field}`);
    expect(html).toContain('must not overlap another configured OCI VCN');
  });

  it('links Exadata notification and VCN errors beside the relevant inputs', () => {
    const model = emptyLzModel();
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, infrastructure: 'shared', database: 'shared', sharedVcnCidr: 'bad', notifications: { ...model.exadata.exacs.notifications, useSingleRecipient: true, default: 'invalid' } };
    const html = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type="exacs" placement="shared" /></WizardProvider>);
    expectLinkedError(html, 'exacs-shared-vcn');
    expectLinkedError(html, 'exacs-default');
  });

  it('marks duplicate environment names individually and leaves empty designs valid', () => {
    const model = emptyLzModel();
    model.environments[1].name = model.environments[0].name;
    const render = () => renderToStaticMarkup(<WizardProvider initialModel={model}><FoundationStep name="Test" onNameChange={() => {}} onNameBlur={() => {}} /></WizardProvider>);
    const html = render();
    for (const env of model.environments) expect(html).toContain(`aria-describedby="environment-${env.id}-error"`);
    model.environments = [];
    expect(render()).not.toContain('This name is already used.');
  });
});
