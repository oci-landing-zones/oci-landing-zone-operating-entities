/**
 * Changelog ("/changelog") — release history, newest first, rendered from
 * src/changelog.ts.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import LicenseNotice from '../components/LicenseNotice';
import { oracle } from '../theme';
import { CHANGELOG, CHANGE_KIND_LABEL, REPO_URL, formatReleaseDate, type ChangeKind } from '../changelog';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

const KIND_STYLE: Record<ChangeKind, React.CSSProperties> = {
  added:    { background: oracle.greenFill, color: oracle.greenDark },
  changed:  { background: '#E6ECF7', color: oracle.cidrBlue },
  fixed:    { background: oracle.redTint, color: oracle.redDark },
  security: { background: '#FFF1D6', color: '#8A5A00' },
  docs:     { background: oracle.surfaceAlt, color: oracle.textMuted },
};

const s: Record<string, React.CSSProperties> = {
  app:     { minHeight: '100vh', background: oracle.appBg, fontFamily: FONT, color: oracle.text },
  page:    { maxWidth: 820, margin: '0 auto', padding: '40px 24px 0' },
  back:    { display: 'inline-block', fontSize: 13, color: oracle.redDark, textDecoration: 'none', marginBottom: 18 },
  eyebrow: { display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: oracle.red, marginBottom: 10 },
  title:   { fontSize: 32, fontWeight: 800, lineHeight: 1.15, margin: '0 0 8px', color: oracle.ink },
  sub:     { fontSize: 15, lineHeight: 1.55, color: oracle.textMuted, margin: '0 0 36px' },
  list:    { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 16 },
  card:    { background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 2px rgba(32,31,28,0.04)' },
  head:    { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 12px', marginBottom: 4 },
  version: { fontSize: 20, fontWeight: 800, color: oracle.ink, margin: 0 },
  latest:  { fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#fff', background: oracle.red, borderRadius: 4, padding: '2px 7px', alignSelf: 'center' },
  date:    { fontSize: 13, color: oracle.textMuted, marginLeft: 'auto' },
  headline:{ fontSize: 15, fontWeight: 600, color: oracle.text, margin: '0 0 12px' },
  changes: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 },
  change:  { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, lineHeight: 1.5 },
  kind:    { flexShrink: 0, width: 66, textAlign: 'center', fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 0', marginTop: 1 },
  prs:     { fontSize: 12, color: oracle.textMuted, marginTop: 14 },
  prLink:  { color: oracle.redDark, textDecoration: 'underline', textUnderlineOffset: 2 },
};

export default function Changelog() {
  return (
    <div style={s.app}>
      <TopBar />
      <main style={s.page}>
        <Link to="/" style={s.back}>← Back to dashboard</Link>
        <span style={s.eyebrow}>Release notes</span>
        <h1 style={s.title}>Changelog</h1>
        <p style={s.sub}>What changed in OCI Landing Zone Studio, newest release first.</p>

        <ol style={s.list} aria-label="Releases">
          {CHANGELOG.map((entry, index) => (
            <li key={entry.version} style={s.card} id={`v${entry.version}`}>
              <div style={s.head}>
                <h2 style={s.version}>v{entry.version}</h2>
                {index === 0 && <span style={s.latest}>Latest</span>}
                <time style={s.date} dateTime={entry.date}>{formatReleaseDate(entry.date)}</time>
              </div>
              <p style={s.headline}>{entry.title}</p>
              <ul style={s.changes}>
                {entry.changes.map((change, i) => (
                  <li key={i} style={s.change}>
                    <span style={{ ...s.kind, ...KIND_STYLE[change.kind] }}>{CHANGE_KIND_LABEL[change.kind]}</span>
                    <span>{change.text}</span>
                  </li>
                ))}
              </ul>
              {entry.prs && entry.prs.length > 0 && (
                <div style={s.prs}>
                  {entry.prs.length === 1 ? 'Pull request ' : 'Pull requests '}
                  {entry.prs.map((pr, i) => (
                    <React.Fragment key={pr}>
                      {i > 0 && ', '}
                      <a href={`${REPO_URL}/pull/${pr}`} style={s.prLink} target="_blank" rel="noreferrer">#{pr}</a>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </main>
      <LicenseNotice />
    </div>
  );
}
