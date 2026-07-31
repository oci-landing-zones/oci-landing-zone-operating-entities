/**
 * Disclaimer — first-visit gate. Blocks the app until the user agrees that this
 * is an unofficial, use-at-your-own-risk tool. Acceptance is remembered in
 * localStorage (versioned, so the gate can re-appear if the text changes).
 */

import React from 'react';
import { oracle } from '../theme';

export const DISCLAIMER_KEY = 'lzng.disclaimer.accepted';
export const DISCLAIMER_VERSION = '1';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  page:   { minHeight: '100vh', background: oracle.appBg, fontFamily: FONT, color: oracle.text, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '64px 24px' },
  inner:  { width: '100%', maxWidth: 760 },
  title:  { fontSize: 34, fontWeight: 800, lineHeight: 1.15, textAlign: 'center', color: oracle.ink, margin: '0 0 10px' },
  sub:    { fontSize: 16, color: oracle.textMuted, textAlign: 'center', margin: '0 0 32px' },
  card:   { background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 12, padding: '28px 32px', boxShadow: '0 1px 3px rgba(32,31,28,0.05)' },
  para:   { fontSize: 16, lineHeight: 1.65, color: oracle.text, margin: '0 0 18px' },
  lastPara: { fontSize: 16, lineHeight: 1.65, color: oracle.text, margin: 0 },
  actions:{ display: 'flex', justifyContent: 'center', marginTop: 28 },
  agree:  { padding: '14px 40px', fontSize: 16, fontWeight: 700, color: '#fff', background: oracle.red, border: `1px solid ${oracle.redDark}`, borderRadius: 8, cursor: 'pointer' },
};

export default function Disclaimer({ onAccept }: { onAccept: () => void }) {
  return (
    <div style={s.page}>
      <div style={s.inner}>
        <h1 style={s.title}>Oracle Cloud Infrastructure tools and utilities</h1>
        <p style={s.sub}>Please read the disclaimer below before continuing.</p>

        <div style={s.card}>
          <p style={s.para}>
            This website and the tools listed here are not Oracle products, and are not affiliated with or
            endorsed by Oracle Corporation. Oracle Cloud Infrastructure (OCI) and Oracle are registered
            trademarks of Oracle Corporation. All rights to these trademarks are reserved by Oracle.
          </p>
          <p style={s.para}>
            The use of these tools is entirely at your own risk. Neither the developer of these tools nor
            Oracle Corporation shall be held liable for any outcomes, including but not limited to, data loss,
            system failures, or any other issues that may arise from the use of these tools.
          </p>
          <p style={s.lastPara}>
            By clicking “I Agree” below, you acknowledge that you have read and understood this disclaimer,
            and you agree to take full responsibility for any actions and outcomes resulting from the use of
            these tools.
          </p>
        </div>

        <div style={s.actions}>
          <button type="button" style={s.agree} onClick={onAccept}>I Agree</button>
        </div>
      </div>
    </div>
  );
}
