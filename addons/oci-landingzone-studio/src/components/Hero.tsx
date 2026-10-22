/**
 * Hero — the intro band on the dashboard. Renders full (title + subtitle + CTA +
 * feature cards) as the first-run / empty state, or `compact` (a slim header
 * band, no feature cards) when saved landing zones are listed below it. Page
 * chrome (TopBar, app background) is owned by the Dashboard.
 */

import React from 'react';
import { oracle } from '../theme';

const styles: Record<string, React.CSSProperties> = {
  hero:        { maxWidth: 920, margin: '0 auto', padding: '64px 24px 8px' },
  heroCompact: { maxWidth: 1100, margin: '0 auto', padding: '36px 24px 4px' },
  eyebrow:{ display: 'inline-block', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: oracle.red, marginBottom: 14 },
  title:        { fontSize: 40, fontWeight: 800, lineHeight: 1.1, marginBottom: 14, color: oracle.ink },
  titleCompact: { fontSize: 28, fontWeight: 800, lineHeight: 1.15, marginBottom: 8, color: oracle.ink },
  sub:    { color: oracle.textMuted, fontSize: 16, lineHeight: 1.55, maxWidth: 640, marginBottom: 28 },
  cta:    { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 26px', fontSize: 15, background: oracle.red, color: '#fff', border: `1px solid ${oracle.redDark}`, borderRadius: 6, cursor: 'pointer', fontWeight: 700 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 12 },

  features: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, margin: '48px 0 8px' },
  card:   { background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 10, padding: 20, boxShadow: '0 1px 2px rgba(32,31,28,0.04)' },
  cardAccent: { width: 26, height: 3, background: oracle.red, borderRadius: 2, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6, color: oracle.ink },
  cardBody: { fontSize: 13.5, lineHeight: 1.5, color: oracle.textMuted },
};

const FEATURES = [
  { title: 'Guided setup', body: 'Choose your OCI region, environments, network model, and workload platforms in order.' },
  { title: 'Network view', body: 'Use the live diagram to check the networks and traffic paths your choices create.' },
  { title: 'Deployment package', body: 'Download the generated files and follow the built-in, phased deployment guide.' },
];

export default function Hero({ onNew, onImport, compact = false }: {
  onNew: () => void; onImport: () => void; compact?: boolean;
}) {
  return (
    <div style={compact ? styles.heroCompact : styles.hero}>
      <span style={styles.eyebrow}>OCI Landing Zone</span>
      <div style={compact ? styles.titleCompact : styles.title}>OCI Landing Zone Studio</div>
      {!compact && (
        <div style={styles.sub}>
          Plan an OCI Landing Zone step by step. Check the network as you make decisions, then download the
          generated files and follow the deployment guide.
        </div>
      )}
      <div style={styles.actions}>
        <button type="button" style={styles.cta} onClick={onNew}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6M12 12v6M9 15h6" />
          </svg>
          New Landing Zone
        </button>
        <button type="button" style={styles.cta} onClick={onImport}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
            <path d="M14 2h4l4 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3M14 2H8a2 2 0 0 0-2 2v3M18 2v4h4" />
            <path d="M2 12h12M10 8l4 4-4 4" />
          </svg>
          Import existing Landing Zone
        </button>
      </div>

      {!compact && (
        <div style={styles.features}>
          {FEATURES.map((f) => (
            <div key={f.title} style={styles.card}>
              <div style={styles.cardAccent} />
              <div style={styles.cardTitle}>{f.title}</div>
              <div style={styles.cardBody}>{f.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
