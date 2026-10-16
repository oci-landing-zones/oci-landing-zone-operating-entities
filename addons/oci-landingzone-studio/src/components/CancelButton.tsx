import React from 'react';

/** Square icon button with an ✕ — dismisses an inline edit (pairs with SaveButton). */

const style: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  border: '1px solid #b8b4b0',
  borderRadius: 4,
  background: '#ffffff',
  color: '#201f1c',
  cursor: 'pointer',
};

export default function CancelButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" style={style} aria-label={label} title={label} onClick={onClick}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}
