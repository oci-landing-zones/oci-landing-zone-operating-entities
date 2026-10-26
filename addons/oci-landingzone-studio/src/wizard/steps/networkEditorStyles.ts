/**
 * Shared styles for the wizard network editors (hub VCN in step 2, spoke VCNs in
 * step 3). Kept in their own module so both step components can import them
 * without a step file having to export non-component values (which breaks React
 * Fast Refresh).
 */

import type { CSSProperties } from 'react';
import { oracle } from '../../theme';

export const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

export const s: Record<string, CSSProperties> = {
  col:     { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 },
  panel:   { minWidth: 0, border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surface, boxShadow: '0 1px 2px rgba(32,31,28,0.04)' },
  accent:  { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' },
  body:    { padding: 20 },
  title:   { fontSize: 18, lineHeight: 1.35, fontWeight: 700, margin: '0 0 8px', color: oracle.ink },
  intro:   { fontSize: 14, lineHeight: 1.55, color: oracle.textMuted, margin: '0 0 20px', maxWidth: '65ch' },
  label:   { display: 'block', fontSize: 13, lineHeight: 1.4, color: oracle.text, fontWeight: 600, marginBottom: 6 },
  input:   { width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '9px 11px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, fontSize: 14, background: oracle.surface, color: oracle.text, fontFamily: FONT },

  kindRow: { display: 'flex', gap: 10, marginBottom: 10 },
  kindBtn: { flex: 1, padding: '10px 12px', fontSize: 14, fontWeight: 700, fontFamily: FONT, border: `1px solid ${oracle.borderStrong}`, borderRadius: 6, background: oracle.surface, color: oracle.text, cursor: 'pointer' },
  kindBtnActive: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.red },
  helpRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 18 },
  help:    { fontSize: 13, lineHeight: 1.5, color: oracle.textMuted, flex: 1, margin: 0 },
  docH:    { fontSize: 14, fontWeight: 700, color: oracle.ink, margin: '16px 0 6px' },
  docToc:  { margin: '0 0 4px', paddingLeft: 20, color: oracle.textMuted },
  docUl:   { margin: '4px 0', paddingLeft: 20 },

  tableHead: { display: 'grid', gridTemplateColumns: '1fr 1fr 64px', gap: 12, alignItems: 'center', padding: '10px 12px', background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: '6px 6px 0 0', fontSize: 12, fontWeight: 700, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  row:     { display: 'grid', gridTemplateColumns: '1fr 1fr 64px', gap: 12, alignItems: 'center', padding: '10px 12px', borderLeft: `1px solid ${oracle.border}`, borderRight: `1px solid ${oracle.border}`, borderBottom: `1px solid ${oracle.border}` },
  rowInput:{ width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '9px 11px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, fontSize: 14, background: oracle.surface, color: oracle.text, fontFamily: FONT },
  empty:   { padding: '16px 12px', border: `1px dashed ${oracle.border}`, borderTop: 'none', color: oracle.textMuted, fontSize: 13 },

  subCard: { marginTop: 18, border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surfaceAlt, padding: 16 },
  subHead: { fontSize: 14, fontWeight: 700, color: oracle.ink, marginBottom: 12 },
  addGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto', gap: 12, alignItems: 'end' },
  addLabel:{ display: 'block', fontSize: 13, lineHeight: 1.4, color: oracle.text, fontWeight: 600, marginBottom: 6 },
  addBtn:  { minHeight: 44, padding: '9px 14px', fontSize: 14, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontWeight: 700 },
  addBtnDisabled: { background: oracle.borderStrong, border: `1px solid ${oracle.borderStrong}`, cursor: 'not-allowed' },

  errInput: { border: '1px solid #9f1d1d', background: '#fff8f7' },
  errText:  { marginTop: 6, fontSize: 13, lineHeight: 1.5, color: '#9f1d1d', fontWeight: 500, overflowWrap: 'anywhere' },

  envHeadTitle: { fontSize: 15, fontWeight: 700, color: oracle.ink },
  baseRow:  { display: 'flex', gap: 8, flexWrap: 'wrap' },
  basePill: { minHeight: 44, padding: '7px 12px', fontSize: 13, fontWeight: 600, fontFamily: FONT, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer' },
  basePillActive: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.red },
  derivedNote: { fontSize: 12.5, color: oracle.textMuted, marginBottom: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },

  calcCard: { marginTop: 18, border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surface, overflow: 'hidden' },
  calcHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: oracle.surfaceAlt, border: 'none', borderBottom: `1px solid ${oracle.border}`, fontSize: 14, fontWeight: 700, color: oracle.ink, cursor: 'pointer', fontFamily: FONT },
  calcBody: { padding: 16, fontSize: 13 },
  calcStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 },
  calcStat: { border: `1px solid ${oracle.border}`, borderRadius: 6, padding: '8px 10px', background: oracle.surfaceAlt },
  calcStatLabel: { fontSize: 10.5, fontWeight: 700, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  calcStatValue: { fontSize: 14, fontWeight: 700, color: oracle.ink, marginTop: 2, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  calcTable: { width: '100%', borderCollapse: 'collapse' },
  calcTh: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, padding: '6px 8px', borderBottom: `1px solid ${oracle.border}` },
  calcTd: { fontSize: 12.5, padding: '6px 8px', borderBottom: `1px solid ${oracle.border}`, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
};
