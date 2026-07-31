import React from 'react';

/** Square icon button with a checkmark — confirms an inline edit (pairs with CancelButton). */

const style: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  border: '1px solid #C74634',
  borderRadius: 4,
  background: '#FBE9E7',
  color: '#C74634',
  cursor: 'pointer',
};

export default function SaveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" style={style} aria-label={label} title={label} onClick={onClick}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
  );
}
