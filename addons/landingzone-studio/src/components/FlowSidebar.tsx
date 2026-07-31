/**
 * FlowSidebar — docked, collapsible right-side flow picker (diagram-only, step 3).
 *
 * Increment 1 of the flow engine: pure UI. It lists the four canonical traffic
 * flows per environment as checkboxes; selecting writes composite ids
 * (`<env>:<kind>`) into DiagramOptions.activeFlows. Tracing/animation and
 * route-table highlighting plug in here in later increments.
 */

import React from 'react';
import { oracle } from '../theme';
import type { FlowTrace } from '../services/flowTrace';

/** The four canonical flows traced through the landing zone. */
export const FLOW_KINDS = [
  { id: 'egress',    label: 'Spoke → Internet',     sub: 'egress' },
  { id: 'ingress',   label: 'Internet → Spoke',     sub: 'ingress' },
  { id: 'east-west', label: 'Spoke ↔ Spoke',        sub: 'east-west' },
  { id: 'services',  label: 'Spoke → OCI Services',  sub: 'SGW' },
] as const;

/** Composite id for one flow in one environment. */
export const flowId = (env: string, kind: string) => `${env}:${kind}`;

const styles = {
  panel: {
    display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    border: `1px solid ${oracle.border}`, borderTop: `3px solid ${oracle.red}`, borderRadius: 8,
    background: oracle.surface, boxShadow: '0 1px 2px rgba(32,31,28,0.04)',
  } as React.CSSProperties,
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', borderBottom: `1px solid ${oracle.border}`,
  } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 700, color: oracle.ink } as React.CSSProperties,
  collapseBtn: {
    padding: '4px 9px', fontSize: 12, fontWeight: 700, color: oracle.text,
    background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 5, cursor: 'pointer',
  } as React.CSSProperties,
  body: { flex: 1, overflowY: 'auto', padding: '10px 12px 16px' } as React.CSSProperties,
  envGroup: { marginBottom: 14 } as React.CSSProperties,
  envHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    margin: '4px 2px 6px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
    textTransform: 'uppercase', color: oracle.textMuted,
  } as React.CSSProperties,
  envLink: { fontSize: 10.5, fontWeight: 700, color: oracle.red, background: 'none', border: 'none', cursor: 'pointer', padding: 0 } as React.CSSProperties,
  row: {
    display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
  } as React.CSSProperties,
  rowOn: { background: oracle.redTint } as React.CSSProperties,
  flowLabel: { fontSize: 12.5, fontWeight: 600, color: oracle.ink, lineHeight: 1.2 } as React.CSSProperties,
  flowSub: { fontSize: 10.5, fontWeight: 600, color: oracle.textMuted } as React.CSSProperties,
  empty: { fontSize: 12, color: oracle.textMuted, lineHeight: 1.5, padding: '8px 4px' } as React.CSSProperties,
  swatch: { width: 10, height: 10, borderRadius: 2, flexShrink: 0, border: '1px solid rgba(0,0,0,0.15)' } as React.CSSProperties,
  // Step-by-step hop list shown under a selected flow.
  hops: { listStyle: 'none', margin: '2px 0 8px 26px', padding: 0, borderLeft: `2px solid ${oracle.border}` } as React.CSSProperties,
  hop: { display: 'flex', gap: 6, padding: '3px 0 3px 8px', fontSize: 11, lineHeight: 1.3, color: oracle.text, borderRadius: 4 } as React.CSSProperties,
  hopActive: { background: oracle.redTint, fontWeight: 700 } as React.CSSProperties,
  hopSeq: { fontWeight: 800, fontVariantNumeric: 'tabular-nums' } as React.CSSProperties,
  hopWarn: { padding: '3px 0 3px 8px', fontSize: 10.5, fontWeight: 700, color: oracle.red } as React.CSSProperties,
  stepBar: { display: 'flex', alignItems: 'center', gap: 4, margin: '4px 0 2px 26px' } as React.CSSProperties,
  stepBtn: { minWidth: 26, padding: '3px 6px', fontSize: 11, fontWeight: 800, color: oracle.text, background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 5, cursor: 'pointer', lineHeight: 1 } as React.CSSProperties,
  stepBtnOn: { background: oracle.red, borderColor: oracle.redDark, color: '#fff' } as React.CSSProperties,
  stepInfo: { fontSize: 10.5, fontWeight: 700, color: oracle.textMuted, marginLeft: 4 } as React.CSSProperties,
  chipsRow: { display: 'flex', flexWrap: 'wrap', gap: 5, margin: '1px 0 7px 30px' } as React.CSSProperties,
  chip: { padding: '2px 9px', fontSize: 10.5, fontWeight: 700, borderRadius: 11, cursor: 'pointer', border: `1px solid ${oracle.border}`, lineHeight: 1.35, userSelect: 'none' } as React.CSSProperties,
  chipOff: { background: oracle.surfaceAlt, color: oracle.textMuted } as React.CSSProperties,

  /* Collapsed rail — mirrors the diagram collapse rail. */
  rail: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%', padding: '14px 0',
    border: `1px solid ${oracle.border}`, borderTop: `3px solid ${oracle.red}`, borderRadius: 8,
    background: oracle.surface, cursor: 'pointer', boxShadow: '0 1px 2px rgba(32,31,28,0.04)',
  } as React.CSSProperties,
  railChevron: { fontSize: 20, fontWeight: 800, color: oracle.red, lineHeight: 1 } as React.CSSProperties,
  railLabel: { writingMode: 'vertical-rl', fontSize: 13, fontWeight: 700, color: oracle.ink, letterSpacing: 0.4 } as React.CSSProperties,
};

export default function FlowSidebar({
  environments, active, traces, steps, onStep, onChange, collapsed, onToggleCollapse,
}: {
  environments: { name: string; roles: string[] }[];
  active: string[];
  traces: FlowTrace[];
  steps: Record<string, number | null | undefined>;
  onStep: (id: string, action: 'prev' | 'next' | 'play') => void;
  onChange: (next: string[]) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const set = new Set(active);
  const selectedCount = active.length;
  // Traces carry `<scope>:<kind>[:<role>]#<idx>` ids; show one step list per
  // `<scope>:<kind>` group (covers both all-endpoint and single-endpoint picks).
  const traceByGroup = new Map<string, FlowTrace>();
  for (const t of traces) {
    const np = t.id.split('#')[0].split(':');
    const g = `${np[0]}:${np[1]}`;
    if (!traceByGroup.has(g)) traceByGroup.set(g, t);
  }

  if (collapsed) {
    return (
      <button type="button" style={styles.rail} onClick={onToggleCollapse} title="Show flows" aria-label="Show flows">
        <span style={styles.railChevron}>‹</span>
        <span style={styles.railLabel}>Flows{selectedCount ? ` (${selectedCount})` : ''}</span>
      </button>
    );
  }

  // Toggle the whole flow (all endpoints) — clears any single-endpoint picks for it.
  const toggleAll = (allId: string, roleIds: string[]) => {
    const next = new Set(set);
    if (next.has(allId)) next.delete(allId);
    else { next.add(allId); roleIds.forEach((r) => next.delete(r)); }
    onChange([...next]);
  };

  // Toggle one endpoint. Unchecking from an "all" pick expands it to the other
  // endpoints; checking every endpoint collapses back to the "all" pick.
  const toggleRole = (allId: string, rid: string, roleIds: string[]) => {
    const next = new Set(set);
    if (next.has(allId)) { next.delete(allId); roleIds.forEach((r) => next.add(r)); next.delete(rid); }
    else if (next.has(rid)) next.delete(rid);
    else next.add(rid);
    if (roleIds.length > 0 && roleIds.every((r) => next.has(r))) { roleIds.forEach((r) => next.delete(r)); next.add(allId); }
    onChange([...next]);
  };

  const setEnvAll = (env: { name: string; roles: string[] }, on: boolean) => {
    const next = new Set(set);
    FLOW_KINDS.forEach((f) => {
      const allId = flowId(env.name, f.id);
      next.delete(allId);
      env.roles.forEach((r) => next.delete(`${allId}:${r}`));
      if (on) next.add(allId);
    });
    onChange([...next]);
  };

  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Flows{selectedCount ? ` · ${selectedCount}` : ''}</span>
        <button type="button" style={styles.collapseBtn} onClick={onToggleCollapse} title="Collapse to the side">
          Collapse ›
        </button>
      </div>
      <div style={styles.body}>
        {environments.length === 0 ? (
          <div style={styles.empty}>No environments yet — add one in the form to pick flows.</div>
        ) : (
          environments.map((env) => {
            const envHasAny = FLOW_KINDS.some((f) => {
              const allId = flowId(env.name, f.id);
              return set.has(allId) || env.roles.some((r) => set.has(`${allId}:${r}`));
            });
            return (
              <div key={env.name} style={styles.envGroup}>
                <div style={styles.envHead}>
                  <span>{env.name}</span>
                  <button type="button" style={styles.envLink} onClick={() => setEnvAll(env, !envHasAny)}>
                    {envHasAny ? 'Clear' : 'All'}
                  </button>
                </div>
                {FLOW_KINDS.map((f) => {
                  const allId = flowId(env.name, f.id);
                  const roleIds = env.roles.map((r) => `${allId}:${r}`);
                  const allOn = set.has(allId);
                  const active = allOn || roleIds.some((rid) => set.has(rid));
                  const trace = active ? traceByGroup.get(allId) : undefined;
                  const color = trace?.color ?? oracle.red;
                  return (
                    <div key={f.id}>
                      <div style={{ ...styles.row, ...(active ? styles.rowOn : null) }}>
                        <input type="checkbox" checked={allOn} title="Toggle all endpoints" onChange={() => toggleAll(allId, roleIds)} />
                        {active && <span style={{ ...styles.swatch, background: color }} />}
                        <span>
                          <span style={styles.flowLabel}>{f.label}</span>{' '}
                          <span style={styles.flowSub}>· {f.sub}</span>
                        </span>
                      </div>
                      {/* per-endpoint chips: click one to trace just that endpoint */}
                      {env.roles.length > 0 && (
                        <div style={styles.chipsRow}>
                          {env.roles.map((r) => {
                            const rid = `${allId}:${r}`;
                            const on = allOn || set.has(rid);
                            return (
                              <span
                                key={r}
                                role="button"
                                title={on ? `Deselect ${r}` : `Trace ${r}`}
                                onClick={() => toggleRole(allId, rid, roleIds)}
                                style={{ ...styles.chip, ...(on ? { background: color, color: '#fff', borderColor: color } : styles.chipOff) }}
                              >
                                {r}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {trace && (() => {
                        const step = steps[allId];
                        const total = trace.hops.length;
                        return (
                          <>
                            <div style={styles.stepBar}>
                              <button type="button" style={styles.stepBtn} title="Previous hop" onClick={() => onStep(allId, 'prev')}>◀</button>
                              <button type="button" style={{ ...styles.stepBtn, ...(step == null ? styles.stepBtnOn : null) }} title="Auto-play" onClick={() => onStep(allId, 'play')}>▶ Auto</button>
                              <button type="button" style={styles.stepBtn} title="Next hop" onClick={() => onStep(allId, 'next')}>▶</button>
                              <span style={styles.stepInfo}>{step == null ? 'auto' : `${step + 1}/${total}`}</span>
                            </div>
                            <ol style={styles.hops}>
                              {trace.hops.map((h) => (
                                <li key={h.seq} style={{ ...styles.hop, ...(step === h.seq - 1 ? styles.hopActive : null) }}>
                                  <span style={{ ...styles.hopSeq, color: trace.color }}>{h.seq}.</span>
                                  <span>{h.label}</span>
                                </li>
                              ))}
                              {!trace.ok && <li style={styles.hopWarn}>⚠ path could not fully resolve</li>}
                            </ol>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
