import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import ReviewStep from './ReviewStep';

describe('Resource Manager deployment link', () => {
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
  });
});
