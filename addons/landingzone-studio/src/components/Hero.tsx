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
  cta:    { display: 'inline-block', padding: '13px 26px', fontSize: 15, background: oracle.red, color: '#fff', border: `1px solid ${oracle.redDark}`, borderRadius: 6, cursor: 'pointer', fontWeight: 700 },

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

export default function Hero({ onNew, compact = false }: { onNew: () => void; compact?: boolean }) {
  return (
    <div style={compact ? styles.heroCompact : styles.hero}>
      <span style={styles.eyebrow}>OCI Landing Zone</span>
      <div style={compact ? styles.titleCompact : styles.title}>Landing Zone Studio</div>
      {!compact && (
        <div style={styles.sub}>
          Plan an OCI Landing Zone step by step. Check the network as you make decisions, then download the
          generated files and follow the deployment guide.
        </div>
      )}
      <button type="button" style={styles.cta} onClick={onNew}>New Landing Zone →</button>

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
