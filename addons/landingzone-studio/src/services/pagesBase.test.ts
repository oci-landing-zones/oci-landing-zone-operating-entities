import { describe, expect, it } from 'vitest';
import { getRouterBasename, normalizeBasePath } from './pagesBase';

describe('Pages base path helpers', () => {
  it('keeps root deployments at the root router basename', () => {
    expect(normalizeBasePath('/')).toBe('/');
    expect(getRouterBasename('/')).toBeUndefined();
  });

  it('normalizes GitHub Pages project paths for Vite and React Router', () => {
    expect(normalizeBasePath('landing-zone-studio')).toBe('/landing-zone-studio/');
    expect(normalizeBasePath('/landing-zone-studio/')).toBe('/landing-zone-studio/');
    expect(getRouterBasename('/landing-zone-studio/')).toBe('/landing-zone-studio');
  });
});
