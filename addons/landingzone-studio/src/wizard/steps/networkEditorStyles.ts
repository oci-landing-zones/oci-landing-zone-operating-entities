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
  col:     { display: 'grid', gap: 20 },
  panel:   { border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surface, boxShadow: '0 1px 2px rgba(32,31,28,0.04)' },
  accent:  { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' },
  body:    { padding: 20 },
  title:   { fontSize: 15, fontWeight: 700, marginBottom: 16, color: oracle.ink },
  label:   { display: 'block', fontSize: 12, color: oracle.textMuted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  input:   { width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, fontSize: 14, background: oracle.surface, color: oracle.text, fontFamily: FONT },

  kindRow: { display: 'flex', gap: 10, marginBottom: 10 },
  kindBtn: { flex: 1, padding: '10px 12px', fontSize: 14, fontWeight: 700, fontFamily: FONT, border: `1px solid ${oracle.borderStrong}`, borderRadius: 6, background: oracle.surface, color: oracle.text, cursor: 'pointer' },
  kindBtnActive: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.red },
  helpRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 18 },
  help:    { fontSize: 12.5, lineHeight: 1.5, color: oracle.textMuted, flex: 1 },
  infoBtn: { flexShrink: 0, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${oracle.red}`, borderRadius: '50%', background: oracle.surface, color: oracle.red, fontSize: 12, fontWeight: 800, fontFamily: 'Georgia, serif', fontStyle: 'italic', cursor: 'pointer', lineHeight: 1, padding: 0 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(32,31,28,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:   { background: oracle.surface, borderRadius: 8, border: `1px solid ${oracle.border}`, boxShadow: '0 12px 40px rgba(32,31,28,0.3)', width: 'min(680px, 100%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${oracle.border}`, background: oracle.surfaceAlt },
  modalTitle: { fontSize: 16, fontWeight: 700, color: oracle.ink },
  modalClose: { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${oracle.border}`, borderRadius: 4, background: oracle.surface, color: oracle.text, fontSize: 15, cursor: 'pointer', lineHeight: 1 },
  modalBody: { padding: '18px 22px', overflowY: 'auto', fontSize: 13.5, lineHeight: 1.6, color: oracle.text },
  docH:    { fontSize: 14, fontWeight: 700, color: oracle.ink, margin: '16px 0 6px' },
  docToc:  { margin: '0 0 4px', paddingLeft: 20, color: oracle.textMuted },
  docUl:   { margin: '4px 0', paddingLeft: 20 },

  tableHead: { display: 'grid', gridTemplateColumns: '1fr 1fr 64px', gap: 12, alignItems: 'center', padding: '10px 12px', background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: '6px 6px 0 0', fontSize: 12, fontWeight: 700, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  row:     { display: 'grid', gridTemplateColumns: '1fr 1fr 64px', gap: 12, alignItems: 'center', padding: '10px 12px', borderLeft: `1px solid ${oracle.border}`, borderRight: `1px solid ${oracle.border}`, borderBottom: `1px solid ${oracle.border}` },
  rowInput:{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, fontSize: 14, background: oracle.surface, color: oracle.text, fontFamily: FONT },
  empty:   { padding: '16px 12px', border: `1px dashed ${oracle.border}`, borderTop: 'none', color: oracle.textMuted, fontSize: 13 },

  subCard: { marginTop: 18, border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surfaceAlt, padding: 16 },
  subHead: { fontSize: 14, fontWeight: 700, color: oracle.ink, marginBottom: 12 },
  addGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'start' },
  addLabel:{ display: 'block', fontSize: 12, color: oracle.textMuted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  addBtn:  { padding: '9px 18px', fontSize: 14, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontWeight: 700, marginTop: 24 },
  addBtnDisabled: { background: oracle.borderStrong, borderColor: oracle.borderStrong, cursor: 'not-allowed' },
  select:  { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, fontSize: 14, background: oracle.surface, color: oracle.text, fontFamily: FONT },

  errInput: { borderColor: '#b3261e', background: '#fff8f7' },
  errText:  { marginTop: 4, fontSize: 11.5, color: '#b3261e', fontWeight: 600 },

  envHead:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' },
  envHeadTitle: { fontSize: 15, fontWeight: 700, color: oracle.ink },
  envHeadSub: { fontSize: 12, color: oracle.textMuted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  baseRow:  { display: 'flex', gap: 8, marginBottom: 10 },
  basePill: { padding: '5px 12px', fontSize: 12.5, fontWeight: 700, fontFamily: FONT, border: `1px solid ${oracle.borderStrong}`, borderRadius: 999, background: oracle.surface, color: oracle.text, cursor: 'pointer' },
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
