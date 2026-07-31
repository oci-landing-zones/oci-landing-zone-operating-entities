import { describe, expect, it } from 'vitest';
import { getRouterBasename, normalizeBasePath } from './pagesBase';

describe('Pages base path helpers', () => {
  it('keeps root deployments at the root router basename', () => {
    expect(normalizeBasePath('/')).toBe('/');
    expect(getRouterBasename('/')).toBeUndefined();
  });

  it('normalizes GitHub Pages project paths for Vite and React Router', () => {
    expect(normalizeBasePath('landing-zone-next-gen')).toBe('/landing-zone-next-gen/');
    expect(normalizeBasePath('/landing-zone-next-gen/')).toBe('/landing-zone-next-gen/');
    expect(getRouterBasename('/landing-zone-next-gen/')).toBe('/landing-zone-next-gen');
  });
});
