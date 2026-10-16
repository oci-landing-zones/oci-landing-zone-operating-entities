/**
 * DisclaimerNote — compact, always-visible disclaimer footer for the front
 * page. The full version is the first-visit gate (see Disclaimer.tsx).
 */

import React from 'react';
import { oracle } from '../theme';

const s: Record<string, React.CSSProperties> = {
  wrap:  { maxWidth: 760, margin: '48px auto 0', padding: '16px 20px', borderTop: `1px solid ${oracle.border}` },
  title: { fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: oracle.textMuted, marginBottom: 6 },
  text:  { fontSize: 12.5, lineHeight: 1.6, color: oracle.textMuted, margin: 0 },
};

export default function DisclaimerNote() {
  return (
    <div style={s.wrap}>
      <div style={s.title}>Disclaimer</div>
      <p style={s.text}>
        This is not an Oracle product and is not affiliated with or endorsed by Oracle Corporation. Oracle Cloud
        Infrastructure (OCI) and Oracle are registered trademarks of Oracle Corporation. These tools are provided
        as-is and used entirely at your own risk — neither the developer nor Oracle Corporation is liable for any
        outcomes, including data loss or system failures, arising from their use.
      </p>
    </div>
  );
}
