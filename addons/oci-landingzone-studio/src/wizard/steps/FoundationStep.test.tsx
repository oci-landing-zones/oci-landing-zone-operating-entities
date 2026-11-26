import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChangeEvent } from 'react';
import * as context from '../wizardContext';
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

const fields = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock('react/jsx-dev-runtime', async (original) => {
  const actual = await original<typeof import('react/jsx-dev-runtime')>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    const props = args[1] as Record<string, unknown>;
    if (typeof props.id === 'string') fields.set(props.id, props);
    return actual.jsxDEV(...args);
  } };
});
vi.mock('react/jsx-runtime', async (original) => {
  const actual = await original<typeof import('react/jsx-runtime')>();
  const capture = (render: typeof actual.jsx) => (...args: Parameters<typeof actual.jsx>) => {
    const props = args[1] as Record<string, unknown>;
    if (typeof props.id === 'string') fields.set(props.id, props);
    return render(...args);
  };
  return { ...actual, jsx: capture(actual.jsx), jsxs: capture(actual.jsxs) };
});
afterEach(() => { vi.restoreAllMocks(); fields.clear(); });

describe('foundation fields', () => {
  it.each([
    ['eu-frankfurt-1', undefined, 1, 1],
    ['eu-madrid-1', undefined, 1, 2],
    ['eu-frankfurt-1', 'eu-amsterdam-1', 2, 2],
    ['eu-madrid-1', 'eu-amsterdam-1', 2, 3],
  ] as const)('summarizes Home=%s and Secondary=%s as %i configurations and %i stacks', (home, secondary, configurations, stacks) => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { tenancyHomeRegion: home, drRegion: secondary,
      deploymentMode: secondary ? 'primary-secondary' : 'primary-only' });
    const html = render(model);
    expect(html).toContain(`${configurations} Studio configuration${configurations === 1 ? '' : 's'} · ${stacks} deployment stack${stacks === 1 ? '' : 's'}`);
    expect(html.indexOf('aria-label="Deployment summary"')).toBeGreaterThan(html.indexOf('id="lz-region"'));
    expect(html.indexOf('aria-label="Deployment summary"')).toBeLessThan(html.indexOf('id="lz-region-help"'));
  });

  it('waits for all required regions before showing deployment counts', () => {
    const model = emptyLzModel();
    model.foundation.tenancyHomeRegion = 'eu-frankfurt-1';
    model.foundation.deploymentMode = 'primary-secondary';
    expect(render(model)).not.toContain('aria-label="Deployment summary"');
    model.foundation.drRegion = model.foundation.region;
    expect(render(model)).not.toContain('aria-label="Deployment summary"');
  });

  it('marks Secondary region as required and invalid until a different valid region is selected', () => {
    const model = emptyLzModel();
    model.foundation.deploymentMode = 'primary-secondary';
    const html = render(model);
    expect(fields.get('lz-dr-region')).toMatchObject({ required: true, 'aria-invalid': true });
    expect(html).toContain('<option value="" selected="">Select secondary region</option>');
    expect(html).toContain('Select a secondary region.');
    model.foundation.drRegion = model.foundation.region;
    render(model);
    expect(fields.get('lz-dr-region')?.['aria-invalid']).toBe(true);
    model.foundation.drRegion = 'eu-amsterdam-1';
    render(model);
    expect(fields.get('lz-dr-region')?.['aria-invalid']).toBeUndefined();
  });

  it('marks missing Home and Primary regions as required and invalid', () => {
    const model = emptyLzModel();
    model.foundation.tenancyHomeRegion = undefined;
    model.foundation.region = '';
    const html = render(model);
    for (const id of ['lz-tenancy-home-region', 'lz-region']) {
      expect(fields.get(id)).toMatchObject({ required: true, 'aria-invalid': true });
    }
    expect(html).toContain('<option value="" selected="">Select tenancy home region</option>');
    expect(html).toContain('<option value="" selected="">Select primary region</option>');
    expect(html).toContain('Select a tenancy home region.');
    expect(html).toContain('Select a primary region.');
  });

  it('clears region errors when valid Home and Primary regions are selected', () => {
    const model = emptyLzModel();
    model.foundation.tenancyHomeRegion = 'eu-madrid-1';
    model.foundation.region = 'eu-frankfurt-1';
    render(model);
    for (const id of ['lz-tenancy-home-region', 'lz-region']) {
      expect(fields.get(id)?.['aria-invalid']).toBeUndefined();
    }
  });

  it('links the region reference from Home and Primary labels and retains shared help', () => {
    const model = emptyLzModel();
    model.foundation.tenancyHomeRegion = 'eu-madrid-1';
    model.foundation.region = 'eu-frankfurt-1';
    model.foundation.drRegion = 'eu-amsterdam-1';
    model.foundation.deploymentMode = 'primary-secondary';
    const html = render(model);
    const referenceLinks = [...html.matchAll(/<a\b[^>]*aria-label="View region reference for [^"]*"[^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]);
    expect(referenceLinks).toHaveLength(2);
    for (const [index, link] of referenceLinks.entries()) {
      expect(link).toContain(`aria-label="View region reference for ${index === 0 ? 'Home' : 'Primary'} region (opens in a new tab)"`);
      expect(link).toContain('href="/reference/regions"');
      expect(link).toContain('target="_blank"');
      expect(link).toContain('rel="noopener noreferrer"');
      expect(link).toContain('<svg');
    }
    expect(html).not.toContain('Reference guide');
    expect(html).not.toContain('<img');
    expect(html).toMatch(/<select[^>]*id="lz-tenancy-home-region"[\s\S]*?<option value="eu-madrid-1" selected="">/);
    expect(html).toContain('Home region (input 1)');
    expect(html).toContain('Primary region (input 2)');
    expect(html).toContain('Secondary region (input 3)');
    expect(html).toContain('<strong>Secondary region:</strong> The region where disaster recovery resources are deployed. It must be different from the Primary region.');
    expect(html).toContain("<strong>Primary region:</strong> The region where this landing zone&#x27;s regional resources are deployed. Home and Primary may be the same region.");
    expect(html.indexOf('Home and Primary may be the same region.')).toBeLessThan(html.indexOf('<strong>Secondary region:</strong>'));
    expect(html.indexOf('id="lz-region-help"')).toBeGreaterThan(html.indexOf('id="lz-dr-region"'));
    expect(html.indexOf('aria-label="View region reference for Home')).toBeLessThan(html.indexOf('id="lz-tenancy-home-region"'));
    expect(html.indexOf('aria-label="View region reference for Primary')).toBeLessThan(html.indexOf('id="lz-region"'));
    expect(html.indexOf('id="lz-tenancy-home-region"')).toBeLessThan(html.indexOf('id="lz-region"'));
    expect(html.indexOf('id="lz-region"')).toBeLessThan(html.indexOf('id="lz-dr-region"'));
  });

  it('offers only Primary and Primary + Secondary flows and hides Secondary region for Only Primary', () => {
    const html = render(emptyLzModel());
    expect(html).toMatch(/<select[^>]*id="lz-deployment-type"/);
    expect(html).toContain('Only Primary</option>');
    expect(html).toContain('Primary + Secondary</option>');
    expect(html).not.toContain('Secondary from an existing primary');
    expect(html).not.toContain('value="secondary-existing"');
    expect(html).not.toContain('id="lz-dr-region"');
    expect(html).not.toContain('Secondary region (input 3)');
  });

  it('automatically updates the short name when selecting a Primary region', () => {
    const model = emptyLzModel();
    const setField = vi.fn();
    vi.spyOn(context, 'useWizard').mockReturnValue({ model, setField, reset: vi.fn(), vcnErrors: {} });
    render(model);
    const select = fields.get('lz-region');
    (select!.onChange as (event: ChangeEvent<HTMLSelectElement>) => void)({ target: { value: 'eu-amsterdam-1' } } as ChangeEvent<HTMLSelectElement>);
    expect(setField).toHaveBeenCalledWith('foundation', expect.objectContaining({ region: 'eu-amsterdam-1', regionShortName: 'ams' }));
  });

  it('stores Primary + Secondary intent while retaining complete generator scope', () => {
    const model = emptyLzModel();
    const setField = vi.fn();
    vi.spyOn(context, 'useWizard').mockReturnValue({ model, setField, reset: vi.fn(), vcnErrors: {} });
    render(model);
    const select = fields.get('lz-deployment-type');
    (select!.onChange as (event: ChangeEvent<HTMLSelectElement>) => void)({ target: { value: 'primary-secondary' } } as ChangeEvent<HTMLSelectElement>);
    expect(setField).toHaveBeenCalledWith('foundation', expect.objectContaining({ stackScope: 'complete', deploymentMode: 'primary-secondary' }));
  });

  it('leaves CIS, Bastion and Security Zone controls to Security', () => {
    const html = render(emptyLzModel());
    expect(html).not.toContain('id="lz-cis-level"');
    expect(html).not.toContain('Observability Notifications');
    expect(html).not.toContain('aria-label="Enable OCI Bastion"');
    expect(html).not.toContain('aria-label="Security zone for');
  });

  it('does not expose a manual region short name setting', () => {
    const html = render(emptyLzModel());
    expect(html).not.toContain('id="lz-region-short-name"');
    expect(html).not.toContain('Region short name');
  });

  it('shows deployment type without a description or DR starting-point field', () => {
    const complete = render(emptyLzModel());
    expect(complete).toContain('id="lz-deployment-type"');
    expect(complete).toContain('Only Primary</option>');
    expect(complete).toMatch(/<select[^>]*id="lz-deployment-type"/);
    expect(complete).toContain('Configure Home and Primary in this Studio configuration.');
    expect(complete).not.toContain('id="lz-dr-source"');
    expect(complete).not.toContain('Description');
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    const regional = render(model);
    expect(regional).toContain('Home and Primary Studio configuration');
    expect(regional).not.toContain('id="lz-dr-source"');
    expect(regional).not.toContain('Apply starting point');
    expect(regional).not.toContain('Description');
  });

});
