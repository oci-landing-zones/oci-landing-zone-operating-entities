/**
 * ViewModeToggle — segmented control to switch the wizard's working area
 * between Split (form + diagram), Form only, Diagram only, and JSON only.
 */

import React from 'react';
import { oracle } from '../theme';

export type ViewMode = 'split' | 'form' | 'diagram' | 'json';

const OPTIONS: { mode: ViewMode; title: string; icon: React.ReactNode }[] = [
  {
    mode: 'split', title: 'Form + Diagram',
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5" /><line x1="8" y1="3" x2="8" y2="13" /></svg>),
  },
  {
    mode: 'form', title: 'Form only',
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="5" x2="13" y2="5" /><line x1="3" y1="8" x2="13" y2="8" /><line x1="3" y1="11" x2="9" y2="11" /></svg>),
  },
  {
    mode: 'diagram', title: 'Diagram only',
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2.5" width="12" height="11" rx="1.5" /><rect x="4.5" y="5" width="4" height="3" rx="0.5" /><rect x="8.5" y="9" width="3" height="2.2" rx="0.5" /></svg>),
  },
  {
    mode: 'json', title: 'JSON only',
    icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3.5 L2.5 8 L6 12.5" /><path d="M10 3.5 L13.5 8 L10 12.5" /></svg>),
  },
];

// Tuned for the dark top bar: translucent group, light icons, red active chip.
const css = {
  group: { display: 'inline-flex', gap: 3, padding: 3, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8 } as React.CSSProperties,
  btn: { width: 32, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid transparent', borderRadius: 6, background: 'transparent', color: 'rgba(255,255,255,0.72)', cursor: 'pointer' } as React.CSSProperties,
  btnActive: { background: oracle.red, color: '#fff', border: `1px solid ${oracle.red}` } as React.CSSProperties,
};

export default function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div style={css.group} role="group" aria-label="View mode">
      {OPTIONS.map((o) => {
        const active = o.mode === mode;
        return (
          <button
            key={o.mode}
            type="button"
            title={o.title}
            aria-label={o.title}
            aria-pressed={active}
            style={active ? { ...css.btn, ...css.btnActive } : css.btn}
            onClick={() => onChange(o.mode)}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}
