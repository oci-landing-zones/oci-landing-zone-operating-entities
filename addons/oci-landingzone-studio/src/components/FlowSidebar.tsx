/* eslint-disable react-refresh/only-export-components */
/**
 * FlowSidebar — docked, collapsible right-side flow picker (diagram-only, step 3+).
 *
 * Lists the canonical traffic flows per environment. Ticking a flow traces ONE
 * endpoint (the first subnet role) so the diagram shows a single clear path;
 * the role chips add or swap endpoints and the "all" chip traces every
 * endpoint at once. Selections are composite ids in DiagramOptions.activeFlows:
 * `<env>:<kind>` for all endpoints, `<env>:<kind>:<role>` for one endpoint.
 *
 * Under an active flow the sidebar shows the hop list for one focused endpoint —
 * the same path the diagram animates — with a firewall-inspection summary.
 * Clicking a hop pauses the packet on it.
 */

import React from 'react';
import { oracle } from '../theme';
import Switch from './Switch';
import { FLOW_COLORS, FLOW_KIND_COLORS, FLOW_KIND_LABELS, type FlowHop, type FlowKind, type FlowTrace } from '../services/flowTrace';
import type { FlowFocus } from '../diagram/FlowOverlay';

/** Flows that can be traced at once — one per distinguishable colour. */
export const MAX_FLOWS = FLOW_COLORS.length;

/** The four canonical flows traced through the landing zone. */
export const FLOW_KINDS = [
  { id: 'egress',    label: 'Spoke → Internet',     sub: 'egress' },
  { id: 'ingress',   label: 'Internet → Spoke',     sub: 'ingress' },
  { id: 'services',  label: 'Spoke → OCI Services',  sub: 'SGW' },
] as const;

/** Composite id for one flow in one environment. */
export const flowId = (env: string, kind: string) => `${env}:${kind}`;

export interface FlowChoice {
  id: string;
  label: string;
  sub: string;
}

/** Concrete choices for one source environment, including every east-west destination. */
export function flowChoices(environments: { name: string }[], sourceIndex: number, ingressAvailable = true, externalConnections: { id: string; name: string; type: string }[] = []): FlowChoice[] {
  const source = environments[sourceIndex];
  if (!source) return [];
  return [
    { id: flowId(source.name, 'egress'), label: 'Spoke → Internet', sub: 'egress' },
    ...(ingressAvailable ? [{ id: flowId(source.name, 'ingress'), label: 'Internet → Spoke', sub: 'ingress' }] : []),
    ...environments
      .filter((_, index) => index !== sourceIndex)
      .map((destination) => ({
        id: `${source.name}>${destination.name}:east-west`,
        label: `Spoke → ${destination.name}`,
        sub: 'east-west',
      })),
    { id: flowId(source.name, 'services'), label: 'Spoke → OCI Services', sub: 'Service Gateway' },
    ...externalConnections.flatMap((connection) => [
      { id: flowId(source.name, `hybrid-out@${connection.id}`), label: `Spoke → ${connection.name}`, sub: connection.type },
      { id: flowId(source.name, `hybrid-in@${connection.id}`), label: `${connection.name} → Spoke`, sub: connection.type },
    ]),
  ];
}

/** The endpoint roles currently traced for one flow, in subnet order. */
export function selectedRoles(active: ReadonlySet<string>, allId: string, roles: string[]): string[] {
  return active.has(allId) ? roles : roles.filter((role) => active.has(`${allId}:${role}`));
}

/** Ticking a flow traces one endpoint; unticking removes every pick for it. */
export function toggleFlow(active: string[], allId: string, roles: string[]): string[] {
  const ids = new Set([allId, ...roles.map((role) => `${allId}:${role}`)]);
  if (active.some((id) => ids.has(id))) return active.filter((id) => !ids.has(id));
  return [...active, roles.length ? `${allId}:${roles[0]}` : allId];
}

/** Split a hop label ("INT FW: 0.0.0.0/0 → NGW (inspect)") into place and route. */
export function describeHop(hop: Pick<FlowHop, 'label'>): { place: string; route: string } {
  const label = hop.label.replace(/\s*\(inspect\)$/, '');
  const colon = label.indexOf(': ');
  if (colon > 0) return { place: label.slice(0, colon), route: label.slice(colon + 2) };
  return { place: label.replace(/^→\s*/, 'Delivered to '), route: '' };
}

const styles = {
  panel: {
    display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    border: `1px solid ${oracle.border}`, borderTop: `3px solid ${oracle.red}`, borderRadius: 8,
    background: oracle.surface, boxShadow: '0 1px 2px rgba(32,31,28,0.04)',
  } as React.CSSProperties,
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '12px 14px', borderBottom: `1px solid ${oracle.border}`,
  } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 700, color: oracle.ink } as React.CSSProperties,
  headerBtns: { display: 'flex', gap: 6 } as React.CSSProperties,
  collapseBtn: {
    padding: '4px 9px', fontSize: 12, fontWeight: 700, color: oracle.text,
    background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 5, cursor: 'pointer',
  } as React.CSSProperties,
  body: { flex: 1, overflowY: 'auto', padding: '10px 12px 16px' } as React.CSSProperties,
  envGroup: { marginBottom: 10, borderBottom: `1px solid ${oracle.border}`, paddingBottom: 6 } as React.CSSProperties,
  envHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    margin: '8px 2px 6px', fontSize: 13, fontWeight: 700, color: oracle.text,
  } as React.CSSProperties,
  envToggle: {
    display: 'flex', alignItems: 'center', gap: 6, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, lineHeight: 1.4, fontWeight: 700, minHeight: 32, color: oracle.text,
  } as React.CSSProperties,
  envCount: { padding: '0 6px', borderRadius: 8, background: oracle.redTint, color: oracle.redDark, letterSpacing: 0 } as React.CSSProperties,
  envLink: { fontSize: 10.5, fontWeight: 700, color: oracle.red, background: 'none', border: 'none', cursor: 'pointer', padding: 0 } as React.CSSProperties,
  row: {
    display: 'flex', alignItems: 'center', gap: 9, minHeight: 44, padding: '8px', borderRadius: 6, cursor: 'pointer',
  } as React.CSSProperties,
  rowOn: { background: oracle.redTint } as React.CSSProperties,
  flowLabel: { fontSize: 13, fontWeight: 600, color: oracle.ink, lineHeight: 1.4 } as React.CSSProperties,
  flowSub: { fontSize: 12, lineHeight: 1.45, fontWeight: 400, color: oracle.textMuted } as React.CSSProperties,
  empty: { fontSize: 13, color: oracle.textMuted, lineHeight: 1.5, padding: '8px 4px' } as React.CSSProperties,
  guidance: { fontSize: 13, color: oracle.textMuted, lineHeight: 1.5, margin: '0 2px 16px' } as React.CSSProperties,
  swatch: { width: 10, height: 10, borderRadius: 2, flexShrink: 0, border: '1px solid rgba(0,0,0,0.15)' } as React.CSSProperties,
  detail: { margin: '2px 0 10px 26px' } as React.CSSProperties,
  chipsRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, margin: '1px 0 8px 26px' } as React.CSSProperties,
  chip: { padding: '2px 9px', fontSize: 10.5, fontWeight: 700, borderRadius: 11, cursor: 'pointer', border: `1px solid ${oracle.border}`, lineHeight: 1.35, userSelect: 'none' } as React.CSSProperties,
  chipOff: { background: oracle.surfaceAlt, color: oracle.textMuted } as React.CSSProperties,
  allRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '2px 2px 12px', marginBottom: 10, borderBottom: `1px solid ${oracle.border}` } as React.CSSProperties,
  allTitle: { fontSize: 14, lineHeight: 1.4, fontWeight: 600, color: oracle.ink } as React.CSSProperties,
  legend: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', margin: '0 2px 12px' } as React.CSSProperties,
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: oracle.text } as React.CSSProperties,
  legendLine: { width: 18, height: 3, borderRadius: 2, flexShrink: 0 } as React.CSSProperties,
  pickRow: {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
    textAlign: 'left', background: 'none', border: '1px solid transparent', font: 'inherit',
  } as React.CSSProperties,
  selectedTag: { marginLeft: 'auto', padding: '0 7px', borderRadius: 8, fontSize: 9.5, fontWeight: 800, background: oracle.ink, color: '#fff', flexShrink: 0 } as React.CSSProperties,
  capNote: { fontSize: 11, lineHeight: 1.4, color: oracle.textMuted, background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 6, padding: '6px 8px', margin: '0 2px 10px' } as React.CSSProperties,
  chipLabel: { fontSize: 10.5, fontWeight: 700, color: oracle.textMuted, marginRight: 2 } as React.CSSProperties,
  summary: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: oracle.textMuted, marginBottom: 6 } as React.CSSProperties,
  badge: { padding: '1px 7px', borderRadius: 9, fontSize: 10.5, fontWeight: 800 } as React.CSSProperties,
  badgeOk: { background: oracle.greenFill, color: oracle.greenDark } as React.CSSProperties,
  badgeNone: { background: oracle.surfaceAlt, color: oracle.textMuted, border: `1px solid ${oracle.border}` } as React.CSSProperties,
  badgeWarn: { background: oracle.redTint, color: oracle.redDark } as React.CSSProperties,
  focusRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 6 } as React.CSSProperties,
  focusBtn: { padding: '2px 8px', fontSize: 10.5, fontWeight: 700, borderRadius: 4, cursor: 'pointer', background: oracle.surface, color: oracle.text, border: `1px solid ${oracle.border}` } as React.CSSProperties,
  stepBar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 } as React.CSSProperties,
  stepBtn: { minWidth: 26, padding: '3px 6px', fontSize: 11, fontWeight: 800, color: oracle.text, background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 5, cursor: 'pointer', lineHeight: 1, whiteSpace: 'nowrap', flexShrink: 0 } as React.CSSProperties,
  stepBtnOn: { background: oracle.red, border: `1px solid ${oracle.redDark}`, color: '#fff' } as React.CSSProperties,
  stepBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' } as React.CSSProperties,
  stepInfo: { flexBasis: '100%', fontSize: 12, lineHeight: 1.5, color: oracle.textMuted } as React.CSSProperties,
  // Step-by-step hop list: each hop is a button that pauses the packet on it.
  hops: { listStyle: 'none', margin: 0, padding: 0 } as React.CSSProperties,
  hop: {
    display: 'grid', gridTemplateColumns: '20px 1fr', gap: 7, width: '100%', padding: '5px 6px', textAlign: 'left',
    background: 'none', border: '1px solid transparent', borderRadius: 6, cursor: 'pointer', color: oracle.text, font: 'inherit',
  } as React.CSSProperties,
  hopActive: { background: oracle.redTint, border: `1px solid ${oracle.border}` } as React.CSSProperties,
  // Same look as the diagram's hop badges: ink number in a ring of the flow colour.
  hopSeq: {
    position: 'relative', width: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
    fontSize: 10.5, fontWeight: 800, color: oracle.ink, background: '#fff', fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,
  hopPlace: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: oracle.ink, lineHeight: 1.4 } as React.CSSProperties,
  hopRoute: { fontSize: 12, color: oracle.textMuted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: 1.5, overflowWrap: 'anywhere' } as React.CSSProperties,
  hopTag: { padding: '0 6px', borderRadius: 8, fontSize: 9.5, fontWeight: 800, background: oracle.greenFill, color: oracle.greenDark } as React.CSSProperties,
  hopWarn: { padding: '4px 6px', fontSize: 10.5, fontWeight: 700, color: oracle.red } as React.CSSProperties,

  /* Collapsed rail — mirrors the diagram collapse rail. */
  rail: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%', padding: '14px 0',
    border: `1px solid ${oracle.border}`, borderTop: `3px solid ${oracle.red}`, borderRadius: 8,
    background: oracle.surface, cursor: 'pointer', boxShadow: '0 1px 2px rgba(32,31,28,0.04)',
  } as React.CSSProperties,
  railChevron: { fontSize: 20, fontWeight: 800, color: oracle.red, lineHeight: 1 } as React.CSSProperties,
  railLabel: { writingMode: 'vertical-rl', fontSize: 13, fontWeight: 700, color: oracle.ink, letterSpacing: 0.4 } as React.CSSProperties,
};

/** Selected chip/toggle: a tint of the flow colour with ink text, so every colour stays legible. */
const picked = (color: string): React.CSSProperties => ({ background: `${color}1f`, color: oracle.ink, border: `1px solid ${color}` });

/** Hop list, step controls and inspection summary for one traced endpoint. */
function FlowDetail({ trace, step, roles, focus, onFocus, onStep, onHoverHop }: {
  trace: FlowTrace;
  step: number | null | undefined;
  roles: string[];
  focus: string;
  onFocus: (role: string) => void;
  onStep: (action: 'prev' | 'next' | 'play' | 'goto', hop?: number) => void;
  onHoverHop: (hop: number | undefined) => void;
}) {
  const total = trace.hops.length;
  const atStart = step === 0;
  const atEnd = step != null && step >= total - 1;
  const inspections = trace.hops.filter((hop) => hop.inspected).length;
  return (
    <div style={styles.detail}>
      <div style={styles.summary}>
        <span>{total} hops</span>
        {!trace.ok ? <span style={{ ...styles.badge, ...styles.badgeWarn }}>Path incomplete</span>
          : inspections > 0 ? <span style={{ ...styles.badge, ...styles.badgeOk }}>Firewall inspected{inspections > 1 ? ` ×${inspections}` : ''}</span>
          : <span style={{ ...styles.badge, ...styles.badgeNone }}>No firewall in path</span>}
      </div>
      {roles.length > 1 && (
        <div style={styles.focusRow} role="group" aria-label="Show hops for endpoint">
          <span style={styles.chipLabel}>Hops for</span>
          {roles.map((role) => (
            <button key={role} type="button" aria-pressed={role === focus} onClick={() => onFocus(role)}
              style={{ ...styles.focusBtn, ...(role === focus ? picked(trace.color) : null) }}>
              {role}
            </button>
          ))}
        </div>
      )}
      <div style={styles.stepBar}>
        <button type="button" disabled={atStart} style={{ ...styles.stepBtn, ...(atStart ? styles.stepBtnDisabled : null) }} title="Previous hop" aria-label="Previous hop" onClick={() => onStep('prev')}>◀</button>
        <button type="button" style={{ ...styles.stepBtn, ...(step == null ? styles.stepBtnOn : null) }} title="Auto-play" onClick={() => onStep('play')}>▶ Auto</button>
        <button type="button" disabled={atEnd} style={{ ...styles.stepBtn, ...(atEnd ? styles.stepBtnDisabled : null) }} title="Next hop" aria-label="Next hop" onClick={() => onStep('next')}>▶</button>
        <span style={styles.stepInfo}>{step == null ? 'Select a hop to pause the animation.' : `Hop ${step + 1} of ${total}`}</span>
      </div>
      <ol style={styles.hops}>
        {trace.hops.map((hop, index) => {
          const { place, route } = describeHop(hop);
          const current = step === index;
          return (
            <li key={hop.seq}>
              <button type="button" aria-current={current ? 'step' : undefined} onClick={() => onStep('goto', index)}
                onMouseEnter={() => onHoverHop(index)} onMouseLeave={() => onHoverHop(undefined)}
                onFocus={() => onHoverHop(index)} onBlur={() => onHoverHop(undefined)}
                style={{ ...styles.hop, ...(current ? styles.hopActive : null) }}>
                <span style={{ ...styles.hopSeq, border: `2px solid ${trace.color}` }}>{hop.seq}</span>
                <span>
                  <span style={styles.hopPlace}>{place}{hop.inspected && <span style={styles.hopTag}>inspected</span>}</span>
                  {route && <span style={{ ...styles.hopRoute, display: 'block' }}>{route}</span>}
                </span>
              </button>
            </li>
          );
        })}
        {!trace.ok && <li style={styles.hopWarn}>⚠ The path could not fully resolve — check the route tables for this endpoint.</li>}
      </ol>
    </div>
  );
}

const KIND_ORDER: FlowKind[] = ['egress', 'ingress', 'east-west', 'services', 'hybrid-in', 'hybrid-out'];

export default function FlowSidebar({
  environments, externalConnections = [], active, traces, steps, onStep, onChange, collapsed, onToggleCollapse, onFocusChange,
  allFlows = false, onAllFlowsChange, selected = null, onSelect, ingressAvailable = true,
}: {
  environments: { name: string; roles: string[] }[];
  externalConnections?: { id: string; name: string; type: string }[];
  ingressAvailable?: boolean;
  active: string[];
  traces: FlowTrace[];
  steps: Record<string, number | null | undefined>;
  onStep: (id: string, action: 'prev' | 'next' | 'play' | 'goto', hop?: number) => void;
  onChange: (next: string[]) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Hovering a flow or one of its hops emphasises it in the diagram. */
  onFocusChange?: (focus: FlowFocus | null) => void;
  /** Trace every flow at once, coloured by traffic type. */
  allFlows?: boolean;
  onAllFlowsChange?: (on: boolean) => void;
  /** Flow selected by clicking its path on the diagram (`<env>:<kind>`). */
  selected?: string | null;
  onSelect?: (group: string | null) => void;
}) {
  // Per flow: which traced endpoint the hop list follows.
  const [focus, setFocus] = React.useState<Record<string, string>>({});
  // Per environment: an explicit open/closed choice, overriding the default.
  const [openEnvs, setOpenEnvs] = React.useState<Record<string, boolean>>({});
  const set = new Set(active);
  // Count flows, not endpoint picks: `prod:egress:web` and `prod:egress:db` are one flow.
  const selectedCount = new Set(active.map((id) => id.split(':').slice(0, 2).join(':'))).size;
  const capped = selectedCount >= MAX_FLOWS;
  // A flow clicked on the diagram scrolls into view here.
  React.useEffect(() => {
    if (selected) document.getElementById(`lz-flow-${selected}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  // Traces carry `<scope>:<kind>[:<role>]#<subnetIdx>` ids; index them by flow and role.
  const traceFor = (allId: string, roles: string[], role: string) => traces.find((trace) => {
    const [base, idx] = trace.id.split('#');
    const parts = base.split(':');
    return `${parts[0]}:${parts[1]}` === allId && (parts[2] ?? roles[Number(idx)]) === role;
  });

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
    if (roleIds.length > 1 && roleIds.every((r) => next.has(r))) { roleIds.forEach((r) => next.delete(r)); next.add(allId); }
    onChange([...next]);
  };

  const clearEnvironment = (env: { name: string; roles: string[] }, choices: FlowChoice[]) => {
    const next = new Set(set);
    choices.forEach((choice) => {
      next.delete(choice.id);
      env.roles.forEach((role) => next.delete(`${choice.id}:${role}`));
    });
    onChange([...next]);
  };

  return (
    <section style={styles.panel} aria-label="Traffic flows">
      <div style={styles.header}>
        <span style={styles.title}>{allFlows ? 'All flows' : `Flows${selectedCount ? ` · ${selectedCount}` : ''}`}</span>
        <span style={styles.headerBtns}>
          {!allFlows && selectedCount > 0 && <button type="button" style={styles.collapseBtn} onClick={() => onChange([])}>Clear all</button>}
          <button type="button" style={styles.collapseBtn} onClick={onToggleCollapse} title="Collapse to the side">
            Collapse ›
          </button>
        </span>
      </div>
      <div style={styles.body}>
        {onAllFlowsChange && (
          <div style={styles.allRow}>
            <Switch checked={allFlows} onChange={onAllFlowsChange} ariaLabel="Show all flows" />
            <span>
              <span style={{ ...styles.allTitle, display: 'block' }}>Show all flows</span>
              <span style={{ ...styles.flowSub, display: 'block', marginTop: 4 }}>Compare all routes, coloured by traffic type.</span>
            </span>
          </div>
        )}
        {allFlows ? (
          <>
            <div style={styles.legend} aria-label="Traffic types">
              {KIND_ORDER.map((kind) => (
                <span key={kind} style={styles.legendItem}>
                  <span style={{ ...styles.legendLine, background: FLOW_KIND_COLORS[kind] }} />
                  {FLOW_KIND_LABELS[kind]}
                </span>
              ))}
            </div>
            {environments.map((env, envIndex) => {
              const choices = flowChoices(environments, envIndex, ingressAvailable, externalConnections);
              const hasSelected = choices.some((choice) => choice.id === selected);
              const open = hasSelected || (openEnvs[env.name] ?? true);
              return (
                <div key={env.name} style={styles.envGroup}>
                  <div style={styles.envHead}>
                    <button type="button" style={styles.envToggle} aria-expanded={open}
                      onClick={() => setOpenEnvs((prev) => ({ ...prev, [env.name]: !open }))}>
                      <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                      <span>{env.name}</span>
                    </button>
                  </div>
                  {open && choices.map((choice) => {
                    const isSelected = choice.id === selected;
                    const trace = traces.find((t) => t.id.split('#')[0].split(':').slice(0, 2).join(':') === choice.id);
                    const color = trace?.color ?? oracle.ink;
                    return (
                      <div key={choice.id} id={`lz-flow-${choice.id}`}
                        onMouseEnter={() => onFocusChange?.({ group: choice.id })}
                        onMouseLeave={() => onFocusChange?.(null)}>
                        <button type="button" aria-pressed={isSelected} onClick={() => onSelect?.(choice.id)}
                          style={{ ...styles.pickRow, ...(isSelected ? picked(color) : null) }}>
                          <span style={{ ...styles.swatch, background: color }} />
                          <span>
                            <span style={styles.flowLabel}>{choice.label}</span>{' '}
                            <span style={styles.flowSub}>· {choice.sub}</span>
                          </span>
                          {isSelected && <span style={styles.selectedTag}>Selected</span>}
                        </button>
                        {isSelected && trace && (
                          <FlowDetail
                            trace={trace}
                            step={steps[choice.id]}
                            roles={[]}
                            focus=""
                            onFocus={() => {}}
                            onStep={(action, hop) => onStep(choice.id, action, hop)}
                            onHoverHop={(hop) => onFocusChange?.({ group: choice.id, hop })}
                          />
                        )}
                        {isSelected && !trace && <div style={{ ...styles.empty, marginLeft: 26 }}>This flow could not be traced for the current design.</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ) : <>
        {selectedCount >= MAX_FLOWS && <p style={styles.capNote} role="status">Up to {MAX_FLOWS} flows can be traced at once, so each keeps a colour you can tell apart. Clear one to add another.</p>}
        <p style={styles.guidance}>{selectedCount ? 'Choose endpoints below. Select a path to focus on its flow.' : 'Select a traffic flow to trace its route.'}</p>
        {environments.length === 0 ? (
          <div style={styles.empty}>No environments yet — add one in the form to pick flows.</div>
        ) : (
          environments.map((env, envIndex) => {
            const choices = flowChoices(environments, envIndex, ingressAvailable, externalConnections);
            const activeChoices = choices.filter((choice) => set.has(choice.id) || env.roles.some((role) => set.has(`${choice.id}:${role}`)));
            const open = choices.some((choice) => choice.id === selected) || (openEnvs[env.name] ?? (envIndex === 0 || activeChoices.length > 0));
            return (
              <div key={env.name} style={styles.envGroup}>
                <div style={styles.envHead}>
                  <button type="button" style={styles.envToggle} aria-expanded={open}
                    onClick={() => setOpenEnvs((prev) => ({ ...prev, [env.name]: !open }))}>
                    <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                    <span>{env.name}</span>
                    {activeChoices.length > 0 && <span style={styles.envCount}>{activeChoices.length}</span>}
                  </button>
                  {activeChoices.length > 0 && <button type="button" style={styles.envLink} onClick={() => clearEnvironment(env, choices)}>Clear</button>}
                </div>
                {open && choices.map((choice) => {
                  const allId = choice.id;
                  const roleIds = env.roles.map((r) => `${allId}:${r}`);
                  const allOn = set.has(allId);
                  const traced = selectedRoles(set, allId, env.roles);
                  const isActive = allOn || traced.length > 0;
                  const focusRole = traced.includes(focus[allId]) ? focus[allId] : traced[0];
                  const trace = isActive ? (focusRole ? traceFor(allId, env.roles, focusRole) : traces.find((t) => t.id.startsWith(`${allId}#`))) : undefined;
                  const color = trace?.color ?? oracle.ink;
                  return (
                    <div key={choice.id} id={`lz-flow-${allId}`}
                      onMouseEnter={() => isActive && onFocusChange?.({ group: allId })}
                      onMouseLeave={() => onFocusChange?.(null)}>
                      <label style={{ ...styles.row, ...(isActive ? styles.rowOn : null), ...(selected === allId ? { boxShadow: `inset 0 0 0 2px ${color}` } : null), ...(!isActive && capped ? { opacity: 0.5, cursor: 'not-allowed' } : null) }}>
                        <input
                          type="checkbox"
                          checked={isActive}
                          disabled={!isActive && capped}
                          aria-label={`Trace ${choice.label} for ${env.name}`}
                          onChange={() => onChange(toggleFlow(active, allId, env.roles))}
                        />
                        {isActive && <span style={{ ...styles.swatch, background: color }} />}
                        <span>
                          <span style={styles.flowLabel}>{choice.label}</span>{' '}
                          <span style={styles.flowSub}>· {choice.sub}</span>
                        </span>
                        {selected === allId && <span style={styles.selectedTag}>Selected</span>}
                      </label>
                      {isActive && env.roles.length > 0 && (
                        <div style={styles.chipsRow} role="group" aria-label={`Endpoints traced for ${choice.label}`}>
                          <span style={styles.chipLabel}>Endpoints</span>
                          {env.roles.map((r) => {
                            const rid = `${allId}:${r}`;
                            const on = allOn || set.has(rid);
                            return (
                              <button
                                type="button"
                                key={r}
                                aria-pressed={on}
                                title={on ? `Stop tracing ${r}` : `Also trace ${r}`}
                                onClick={() => toggleRole(allId, rid, roleIds)}
                                style={{ ...styles.chip, ...(on ? picked(color) : styles.chipOff) }}
                              >
                                {r}
                              </button>
                            );
                          })}
                          {env.roles.length > 1 && (
                            <button type="button" aria-pressed={allOn} title={allOn ? 'Trace only the first endpoint' : 'Trace every endpoint'}
                              // Turning "all" off drops back to the default single endpoint (untick, then re-tick).
                              onClick={() => (allOn ? onChange(toggleFlow(toggleFlow(active, allId, env.roles), allId, env.roles)) : toggleAll(allId, roleIds))}
                              style={{ ...styles.chip, ...(allOn ? picked(color) : styles.chipOff) }}>
                              all
                            </button>
                          )}
                        </div>
                      )}
                      {trace && (
                        <FlowDetail
                          trace={trace}
                          step={steps[allId]}
                          roles={traced}
                          focus={focusRole ?? ''}
                          onFocus={(role) => setFocus((prev) => ({ ...prev, [allId]: role }))}
                          onStep={(action, hop) => onStep(allId, action, hop)}
                          onHoverHop={(hop) => onFocusChange?.({ group: allId, hop })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
        </>}
      </div>
    </section>
  );
}
