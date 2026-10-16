import { describe, expect, it } from 'vitest';
import { getRouterBasename, normalizeBasePath } from './pagesBase';

describe('Pages base path helpers', () => {
  it('keeps root deployments at the root router basename', () => {
    expect(normalizeBasePath('/')).toBe('/');
    expect(getRouterBasename('/')).toBeUndefined();
  });

  it('normalizes GitHub Pages project paths for Vite and React Router', () => {
    expect(normalizeBasePath()).toBe('/oci-landing-zone-operating-entities/');
    expect(normalizeBasePath('/oci-landing-zone-operating-entities/')).toBe('/oci-landing-zone-operating-entities/');
    expect(getRouterBasename('/oci-landing-zone-operating-entities/')).toBe('/oci-landing-zone-operating-entities');
  });
});
