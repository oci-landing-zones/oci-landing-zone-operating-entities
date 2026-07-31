/**
 * JsonViewer — a bottom-docked, full-width "console" for the Landing Zone JSON.
 *
 * Modes:
 *   - docked     : pinned full-width to the bottom of the viewport. Collapsed by
 *                  default (just the bar); expands UPWARD from the bottom.
 *   - undocked   : floating panel, drag by its header, resize from the corner.
 *   - fullscreen : overlay covering the viewport (Esc to exit).
 *
 * Lightweight JSON syntax highlighting (no dependency) via a small tokenizer.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { night } from '../theme';

type Mode = 'docked' | 'undocked' | 'fullscreen';

// Handles both JSON and the jsonnet config style: line comments, single- and
// double-quoted strings, bare object keys, numbers, and keywords.
const TOKEN_RE = /(\/\/[^\n]*)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")(\s*:)?|([A-Za-z_$][\w$]*)(?=\s*:)|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function highlight(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<span key={key++} style={{ color: night.textMuted, fontStyle: 'italic' }}>{m[1]}</span>);
    } else if (m[2] !== undefined) {
      out.push(<span key={key++} style={{ color: m[3] ? night.key : night.string }}>{m[2]}</span>);
      if (m[3]) out.push(<span key={key++} style={{ color: night.punct }}>{m[3]}</span>);
    } else if (m[4] !== undefined) {
      out.push(<span key={key++} style={{ color: night.key }}>{m[4]}</span>);
    } else if (m[5] !== undefined) {
      out.push(<span key={key++} style={{ color: night.keyword }}>{m[5]}</span>);
    } else if (m[6] !== undefined) {
      out.push(<span key={key++} style={{ color: night.number }}>{m[6]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const css = {
  bar: { display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 16px', background: night.bgBar, color: night.text, flexShrink: 0 } as React.CSSProperties,
  barDrag: { cursor: 'move' } as React.CSSProperties,
  title: { fontSize: 13, fontWeight: 700, color: night.text, flex: 1, userSelect: 'none' } as React.CSSProperties,
  dot: { width: 9, height: 9, borderRadius: '50%', background: night.accent, flexShrink: 0 } as React.CSSProperties,
  btn: { padding: '4px 10px', fontSize: 12, fontWeight: 600, color: night.text, background: 'transparent', border: `1px solid ${night.border}`, borderRadius: 4, cursor: 'pointer' } as React.CSSProperties,
  body: { margin: 0, background: night.bg, color: night.punct, fontSize: 12.5, lineHeight: 1.55, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', whiteSpace: 'pre', tabSize: 2 } as React.CSSProperties,

  // Bottom-docked, full-bleed console.
  drawer: { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 80, display: 'flex', flexDirection: 'column', background: night.bg, borderTop: `1px solid ${night.border}`, boxShadow: '0 -8px 24px rgba(0,0,0,0.28)' } as React.CSSProperties,

  // Inline (JSON view mode) — fills the working area instead of docking.
  inlinePanel: { display: 'flex', flexDirection: 'column', height: '70vh', border: `1px solid ${night.border}`, borderRadius: 8, overflow: 'hidden', background: night.bg } as React.CSSProperties,

  overlay: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(1,4,9,0.55)' } as React.CSSProperties,
  fullPanel: { position: 'fixed', inset: 0, zIndex: 101, display: 'flex', flexDirection: 'column', background: night.bg } as React.CSSProperties,
  floatPanel: { position: 'fixed', zIndex: 90, display: 'flex', flexDirection: 'column', minWidth: 360, minHeight: 200, width: 760, height: 460, border: `1px solid ${night.border}`, borderRadius: 8, overflow: 'hidden', resize: 'both', boxShadow: '0 18px 50px rgba(0,0,0,0.5)', background: night.bg } as React.CSSProperties,
};

export default function JsonViewer({
  title, value, inline = false, inlineHeight = '70vh',
}: { title: string; value: string; inline?: boolean; inlineHeight?: number | string }) {
  const [mode, setMode] = useState<Mode>('docked');
  const [collapsed, setCollapsed] = useState(true); // collapsed by default
  const [pos, setPos] = useState({ x: 120, y: 90 });
  const [copied, setCopied] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const content = useMemo(() => highlight(value), [value]);

  useEffect(() => {
    if (mode === 'docked') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode('docked'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard unavailable */ }
  }

  function onDragStart(e: React.PointerEvent) {
    // Don't hijack clicks on the header controls (Dock / Copy / Fullscreen) —
    // capturing the pointer here would swallow their click events.
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onDragMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  }
  function onDragEnd() { drag.current = null; }

  function Controls({ context }: { context: Mode }) {
    return (
      <>
        <button type="button" style={css.btn} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        {context === 'docked' && (
          <>
            <button type="button" style={css.btn} onClick={() => setCollapsed((c) => !c)}>
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
            <button type="button" style={css.btn} onClick={() => setMode('undocked')}>Undock</button>
          </>
        )}
        {context === 'undocked' && (
          <button type="button" style={css.btn} onClick={() => setMode('docked')}>Dock</button>
        )}
        {context === 'fullscreen'
          ? <button type="button" style={css.btn} onClick={() => setMode('docked')}>Exit ⤢</button>
          : <button type="button" style={css.btn} onClick={() => setMode('fullscreen')}>Fullscreen ⤢</button>}
      </>
    );
  }

  if (mode === 'undocked') {
    return (
      <div style={{ ...css.floatPanel, left: pos.x, top: pos.y }}>
        <div
          style={{ ...css.bar, ...css.barDrag, borderBottom: `1px solid ${night.border}` }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
        >
          <span style={css.dot} />
          <span style={css.title}>{title}</span>
          <Controls context="undocked" />
        </div>
        <pre style={{ ...css.body, flex: 1, padding: 16, overflow: 'auto' }}>{content}</pre>
      </div>
    );
  }

  if (mode === 'fullscreen') {
    return (
      <>
        <div style={css.overlay} onClick={() => setMode('docked')} />
        <div style={css.fullPanel}>
          <div style={{ ...css.bar, borderBottom: `1px solid ${night.border}` }}>
            <span style={css.dot} />
            <span style={css.title}>{title}</span>
            <Controls context="fullscreen" />
          </div>
          <pre style={{ ...css.body, flex: 1, padding: 16, overflow: 'auto' }}>{content}</pre>
        </div>
      </>
    );
  }

  // Inline: in-flow panel (JSON view mode, or below the form/diagram).
  if (inline) {
    return (
      <div style={{ ...css.inlinePanel, height: inlineHeight }}>
        <div style={{ ...css.bar, borderBottom: `1px solid ${night.border}` }}>
          <span style={css.dot} />
          <span style={css.title}>{title}</span>
          <button type="button" style={css.btn} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" style={css.btn} onClick={() => setMode('undocked')}>Undock</button>
          <button type="button" style={css.btn} onClick={() => setMode('fullscreen')}>Fullscreen ⤢</button>
        </div>
        <pre style={{ ...css.body, flex: 1, padding: 16, overflow: 'auto' }}>{content}</pre>
      </div>
    );
  }

  // Docked: full-width console pinned to the bottom, expanding upward.
  return (
    <div style={css.drawer}>
      <div style={{ ...css.bar, borderBottom: collapsed ? 'none' : `1px solid ${night.border}` }}>
        <span style={css.dot} />
        <span style={css.title}>{title}</span>
        <Controls context="docked" />
      </div>
      <pre
        style={{
          ...css.body,
          maxHeight: collapsed ? 0 : '60vh',
          padding: collapsed ? '0 16px' : '14px 16px',
          overflow: collapsed ? 'hidden' : 'auto',
          transition: 'max-height 200ms ease, padding 200ms ease',
        }}
      >
        {content}
      </pre>
    </div>
  );
}
