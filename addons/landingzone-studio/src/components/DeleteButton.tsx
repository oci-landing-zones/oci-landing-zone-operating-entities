import React from 'react';

/** Square red-tinted icon button with a bin icon — the wizard's row-delete control. */

const style: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  border: '1px solid #d0a2a2',
  borderRadius: 4,
  background: '#fffafa',
  color: '#9f1d1d',
  cursor: 'pointer',
};

export default function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" style={style} aria-label={label} title={label} onClick={onClick}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </button>
  );
}
