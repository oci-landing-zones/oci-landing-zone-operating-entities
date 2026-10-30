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
    platform.okeParams = { ...platform.okeParams!, createNodePools: true, servicesCidr: model.network.hubVcnCidr, apiAllowedCidrs: ['invalid'], workerBootVolumeSize: 1 };
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

it('orders OKE networking controls, hides native Pod CIDR and offers named Oracle Linux images', () => {
  const model = emptyLzModel();
  const platform = newPlatform('oke_simple', []);
  const render = () => renderToStaticMarkup(<WizardProvider initialModel={{ ...model, platforms: [platform] }}><OkeSettingsFields platform={platform} onPlatform={() => {}} /></WizardProvider>);
  platform.okeParams!.createNodePools = true;
  const native = render();
  const labels = ['Kubernetes CNI', 'Network profile', 'Service CIDR'];
  expect(native.indexOf(labels[0])).toBeLessThan(native.indexOf(labels[1]));
  expect(native.indexOf(labels[1])).toBeLessThan(native.indexOf(labels[2]));
  expect(native).toContain('VCN Native');
  expect(native).not.toContain('>Pod CIDR</label>');
  expect(native).toContain('Worker node image');
  expect(native).toContain('Oracle Linux 8');
  expect(native).toContain('Oracle Linux 9');
  platform.okeParams = { ...platform.okeParams!, cniType: 'overlay', podsCidr: '10.244.0.0/16' };
  expect(render()).toContain('>Pod CIDR</label>');
});

it('renders API endpoint CIDRs as individually validated list entries', () => {
  const model = emptyLzModel();
  const platform = newPlatform('oke_simple', []);
  platform.okeParams!.apiAllowedCidrs = ['10.0.1.0/24', 'invalid'];
  const html = renderToStaticMarkup(<WizardProvider initialModel={{ ...model, platforms: [platform] }}><OkeSettingsFields platform={platform} onPlatform={() => {}} /></WizardProvider>);
  expect(html).toContain('API Server allowed CIDR 1');
  expect(html).toContain('API Server allowed CIDR 2');
  expect(html).toContain('Remove API Server CIDR 2');
  expect(html).toContain('Add CIDR block');
  expectLinkedError(html, `${platform.id}-api-1`);
});

it('hides worker settings when creating a cluster without node pools', () => {
  const model = emptyLzModel();
  const platform = newPlatform('oke_simple', []);
  platform.okeParams!.createNodePools = false;
  const html = renderToStaticMarkup(<WizardProvider initialModel={{ ...model, platforms: [platform] }}><OkeSettingsFields platform={platform} onPlatform={() => {}} /></WizardProvider>);
  expect(html).toContain('Create sample node pool');
  expect(html).not.toContain('Worker node image');
  expect(html).not.toContain('Worker boot volume');
  expect(html).toContain('Kubernetes version');
});

it('shows default-on worker and pod internet switches, with pods only for native CNI', () => {
  const model = emptyLzModel();
  const platform = newPlatform('oke_simple', []);
  const render = () => renderToStaticMarkup(<WizardProvider initialModel={{ ...model, platforms: [platform] }}><OkeSettingsFields platform={platform} onPlatform={() => {}} /></WizardProvider>);
  expect(render()).toMatch(/aria-label="Allow worker internet access"[^>]*aria-checked="true"|aria-checked="true"[^>]*aria-label="Allow worker internet access"/);
  expect(render()).toContain('Allow pod internet access');
  platform.okeParams = { ...platform.okeParams!, cniType: 'overlay', podsCidr: '10.244.0.0/16' };
  expect(render()).not.toContain('Allow pod internet access');
});

it('shows default-off peering attachment controls only for supported components', () => {
  const model = emptyLzModel();
  const platform = newPlatform('oke_simple', []);
  const render = () => renderToStaticMarkup(<WizardProvider initialModel={{ ...model, platforms: [platform] }}><OkeSettingsFields platform={platform} onPlatform={() => {}} /></WizardProvider>);
  expect(render()).toMatch(/aria-checked="false"[^>]*aria-label="Allow worker spoke connectivity"|aria-label="Allow worker spoke connectivity"[^>]*aria-checked="false"/);
  expect(render()).toContain('Allow pod spoke connectivity');
  platform.okeParams = { ...platform.okeParams!, cniType: 'overlay', podsCidr: '10.244.0.0/16' };
  expect(render()).not.toContain('Allow pod spoke connectivity');
});
