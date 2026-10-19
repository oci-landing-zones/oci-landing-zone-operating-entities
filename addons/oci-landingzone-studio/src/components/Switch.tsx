/**
 * Switch — an accessible on/off toggle. Green when on (matches the OCI
 * Security Zone styling), neutral when off.
 */

import React from 'react';
import { oracle } from '../theme';

export default function Switch({
  checked,
  onChange,
  label,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  ariaLabel?: string;
}) {
  const track: React.CSSProperties = {
    position: 'relative',
    width: 44,
    height: 24,
    flexShrink: 0,
    borderRadius: 999,
    border: `1px solid ${checked ? oracle.greenDark : oracle.borderStrong}`,
    background: checked ? oracle.green : '#e9e7e4',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 120ms ease, border-color 120ms ease',
  };
  const thumb: React.CSSProperties = {
    position: 'absolute',
    top: 2,
    left: checked ? 22 : 2,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
    transition: 'left 120ms ease',
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        style={track}
        onClick={() => onChange(!checked)}
      >
        <span style={thumb} />
      </button>
      {label !== undefined && (
        <span style={{ fontSize: 13, color: oracle.textMuted, fontWeight: 600, minWidth: 26 }}>{label}</span>
      )}
    </span>
  );
}
