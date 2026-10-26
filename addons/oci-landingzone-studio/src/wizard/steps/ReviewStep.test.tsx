import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import ReviewStep from './ReviewStep';

describe('Resource Manager deployment link', () => {
  it('blocks generation when a custom region short name is invalid', () => {
    const model = emptyLzModel();
    model.foundation.regionShortName = 'long';
    const markup = renderToStaticMarkup(
      <MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Invalid" /></WizardProvider></MemoryRouter>,
    );
    expect(markup).toContain('Use 3 characters or fewer for the region short name.');
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Download files/);
  });

  it('places Home dependencies in the regional deployment steps', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    const markup = renderToStaticMarkup(
      <MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>,
    );
    const guidance = markup.indexOf('Deploy the Home Region stack first with matching compartments, project and platform IAM, and governance.');
    expect(guidance).toBeGreaterThan(markup.indexOf('Create and run the stack'));
    expect(guidance).toBeLessThan(markup.indexOf('Unzip the download.'));
  });

  it('opens stack creation with the pinned orchestrator and private-bucket source', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <WizardProvider initialModel={emptyLzModel()}>
          <ReviewStep designName="Landing Zone" />
        </WizardProvider>
      </MemoryRouter>,
    );
    const link = markup.match(/<a[^>]+href="([^"]+)"[^>]*>Deploy to OCI(?: ↗)?<\/a>/);
    expect(link, 'Review must offer a Deploy to OCI link').not.toBeNull();
    const url = new URL(link![1].replace(/&amp;/g, '&'));

    expect(`${url.origin}${url.pathname}`).toBe('https://cloud.oracle.com/resourcemanager/stacks/create');
    expect(url.searchParams.get('zipUrl')).toBe('https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.2.0.zip');
    expect(JSON.parse(url.searchParams.get('zipUrlVariables')!)).toEqual({ configuration_source: 'ocibucket' });
    expect(markup).not.toContain('Hub routing');
    expect(markup).not.toContain('The Orchestrator resolves OCI Network Firewall route targets');
  });
});
