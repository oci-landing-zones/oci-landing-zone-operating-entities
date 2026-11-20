import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CHANGELOG, CURRENT_VERSION, formatReleaseDate } from './changelog';
import Changelog from './pages/Changelog';
import TopBar from './components/TopBar';

const SEMVER = /^\d+\.\d+\.\d+$/;

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

describe('changelog data', () => {
  it('keeps package.json on the latest changelog version', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.version).toBe(CURRENT_VERSION);
  });

  it('lists unique semver versions with valid dates, newest first', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
    for (const entry of CHANGELOG) {
      expect(entry.version).toMatch(SEMVER);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
      expect(entry.changes.length).toBeGreaterThan(0);
    }
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(compareSemver(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBeGreaterThan(0);
      expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date).toBe(true);
    }
  });

  it('formats release dates without timezone drift', () => {
    expect(formatReleaseDate('2026-10-28')).toBe('28 Oct 2026');
    expect(formatReleaseDate('2026-01-01')).toBe('1 Jan 2026');
  });
});

describe('changelog page', () => {
  it('renders every release with its version and date', () => {
    const html = renderToStaticMarkup(<MemoryRouter><Changelog /></MemoryRouter>);
    for (const entry of CHANGELOG) {
      expect(html).toContain(`v${entry.version}`);
      expect(html).toContain(`dateTime="${entry.date}"`);
    }
    expect(html.match(/>Latest</g)).toHaveLength(1);
  });

  it('links the current version from the top bar', () => {
    const html = renderToStaticMarkup(<MemoryRouter><TopBar /></MemoryRouter>);
    expect(html).toContain('href="/changelog"');
    expect(html).toContain(`v${CURRENT_VERSION}`);
  });
});
