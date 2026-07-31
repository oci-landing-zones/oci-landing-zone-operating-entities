/**
 * TopBar — the OCI-console-style brand bar shared across pages.
 * Sticky to the top; the logo (red mark + wordmark) links to home.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { oracle } from '../theme';

const css = {
  bar: { position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 14, height: 52, padding: '0 24px', background: oracle.nav, color: '#fff', boxShadow: '0 1px 4px rgba(32,31,28,0.18)' } as React.CSSProperties,
  link: { display: 'inline-flex', alignItems: 'center', gap: 14, color: '#fff', textDecoration: 'none', cursor: 'pointer' } as React.CSSProperties,
  mark: { width: 22, height: 22, borderRadius: 3, background: oracle.red, display: 'inline-block', flexShrink: 0 } as React.CSSProperties,
  word: { fontSize: 15, fontWeight: 700, letterSpacing: 0.2 } as React.CSSProperties,
  divider: { width: 1, height: 22, background: 'rgba(255,255,255,0.25)' } as React.CSSProperties,
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.78)' } as React.CSSProperties,
  center: { position: 'absolute', left: '50%', top: 0, bottom: 0, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' } as React.CSSProperties,
  right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
};

export default function TopBar({ center, right }: { center?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={css.bar}>
      <Link to="/" style={css.link} aria-label="Go to home" title="Home">
        <span style={css.mark} />
        <span style={css.word}>Oracle Cloud Infrastructure</span>
      </Link>
      <span style={css.divider} />
      <span style={css.sub}>Landing Zone Next Gen</span>
      {center && <div style={css.center}>{center}</div>}
      {right && <div style={css.right}>{right}</div>}
    </div>
  );
}
