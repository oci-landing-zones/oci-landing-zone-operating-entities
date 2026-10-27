import { useEffect, useId, useRef } from 'react';
import { oracle } from '../../theme';
import { FONT } from './networkEditorStyles';
import './FieldHelp.css';

export interface FieldHelpContent {
  description: string;
  example: string;
  docs?: string;
}

function positionHelp(content: HTMLDivElement, trigger: HTMLButtonElement) {
  const rect = trigger.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) return content.hidePopover();
  content.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - content.offsetWidth - 12))}px`;
  const below = rect.bottom + 8;
  content.style.top = `${Math.max(12, below + content.offsetHeight <= window.innerHeight - 12 ? below : rect.top - content.offsetHeight - 8)}px`;
}

export default function FieldHelp({ id, label, help }: { id?: string; label: string; help: FieldHelpContent }) {
  const generatedId = useId();
  const helpId = id ?? generatedId;
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const reposition = () => {
      if (panel.current?.matches(':popover-open') && button.current) positionHelp(panel.current, button.current);
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, []);

  function show() {
    clearTimeout(timer.current);
    const content = panel.current;
    const trigger = button.current;
    if (!content || !trigger) return;
    if (!content.matches(':popover-open')) content.showPopover();
    positionHelp(content, trigger);
  }

  return <span ref={root} style={{ display: 'inline-flex', flexShrink: 0 }} onMouseEnter={show} onMouseLeave={() => {
    timer.current = setTimeout(() => {
      if (!root.current?.contains(document.activeElement)) panel.current?.hidePopover();
    }, 180);
  }} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) panel.current?.hidePopover();
  }}>
    <button ref={button} type="button" className="field-help-trigger" style={{ color: oracle.textMuted }} aria-label={`Help for ${label}`} aria-haspopup="dialog" popoverTarget={helpId} popoverTargetAction="show" onClick={show}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </svg>
    </button>
    <div ref={panel} id={helpId} popover="auto" role="dialog" aria-label={`Help for ${label}`} style={{
      position: 'fixed', inset: 'auto', margin: 0, padding: 14,
      width: 'min(320px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
      border: `1px solid ${oracle.borderStrong}`, borderRadius: 6, background: oracle.surface,
      boxShadow: '0 3px 12px rgba(32,31,28,0.16)', color: oracle.text,
      fontFamily: FONT, fontSize: 12.5, fontWeight: 400, lineHeight: 1.5, textTransform: 'none', letterSpacing: 0, overflowWrap: 'anywhere',
    }}>
      <p>{help.description}</p>
      <p style={{ marginTop: 8 }}><strong>Example:</strong> {help.example}</p>
      {help.docs && <p style={{ marginTop: 8 }}><a className="guide-link" href={help.docs} target="_blank" rel="noreferrer">Oracle documentation</a></p>}
    </div>
  </span>;
}
