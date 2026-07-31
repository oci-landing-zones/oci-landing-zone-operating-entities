import React from 'react';

/** Square icon button with a pencil — the wizard's row-edit control (pairs with DeleteButton). */

const base: React.CSSProperties = {
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

const activeStyle: React.CSSProperties = { ...base, borderColor: '#C74634', color: '#C74634', background: '#FBE9E7' };

export default function EditButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" style={active ? activeStyle : base} aria-label={label} title={label} aria-pressed={active} onClick={onClick}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </button>
  );
}
