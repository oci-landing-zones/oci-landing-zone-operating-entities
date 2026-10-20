import React from 'react';
import licenseUrl from '../../../../LICENSE.txt?url&no-inline';
import { oracle } from '../theme';

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1100, margin: '48px auto 0', padding: '0 24px 40px', color: oracle.text },
  title: { fontSize: 16, fontWeight: 700, paddingBottom: 6, marginBottom: 12, borderBottom: `1px solid ${oracle.border}` },
  text: { fontSize: 12, lineHeight: 1.6, margin: 0 },
  link: { color: oracle.redDark, textDecoration: 'underline', textUnderlineOffset: 2 },
};

export default function LicenseNotice() {
  return (
    <footer style={s.wrap}>
      <h2 style={s.title}>License</h2>
      <p style={s.text}>Copyright (c) 2026 Oracle and/or its affiliates.</p>
      <p style={s.text}>Licensed under the Universal Permissive License (UPL), Version 1.0.</p>
      <p style={s.text}>See <a href={licenseUrl} style={s.link}>LICENSE</a> for more details.</p>
    </footer>
  );
}
