/**
 * SavedLzList — the grid of saved Landing Zones, with open / duplicate /
 * delete. Saved names are intentionally read-only here; Foundation owns naming.
 *
 * When `currentId` is set the matching card is marked as the one being edited and
 * loses its Open button. Deleting that card hands control back to the caller via
 * `onCurrentDeleted`, since the wizard can't stay on a Landing Zone that's gone.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { oracle } from '../theme';
import { deleteLZ, duplicateLZ, getLZ, getOutputs, listLZs, type LzMeta } from '../services/lzStore';
import { serializeConfig } from '../services/lzConfig';
import { CONFIG_FILENAME } from '../generator/outputNames';
import { bundleFilename, downloadBlob, zipTextFiles } from '../export/zip';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  sectionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '0 0 16px', paddingBottom: 12, borderBottom: `1px solid ${oracle.border}` },
  sectionTitle:{ fontSize: 18, fontWeight: 800, color: oracle.ink },
  count:  { fontSize: 13, fontWeight: 700, color: oracle.textMuted, background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 999, padding: '2px 10px' },

  grid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card:   { display: 'flex', flexDirection: 'column', background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 2px rgba(32,31,28,0.04)' },
  cardCurrent: { border: `1px solid ${oracle.red}`, boxShadow: '0 1px 6px rgba(199,70,52,0.16)' },
  accent: { height: 3, background: oracle.red },
  body:   { padding: 18, flex: 1 },
  nameRow:{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  name:   { fontSize: 16, fontWeight: 700, color: oracle.ink, wordBreak: 'break-word' },
  badge:  { fontSize: 10.5, fontWeight: 800, color: oracle.red, background: oracle.redTint, border: `1px solid ${oracle.red}`, borderRadius: 999, padding: '2px 8px', letterSpacing: 0.3, textTransform: 'uppercase' },
  summaryRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  chip:   { fontSize: 11.5, fontWeight: 700, color: oracle.textMuted, background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 999, padding: '2px 9px' },
  meta:   { fontSize: 12, color: oracle.textMuted },

  outBox:  { marginTop: 14, paddingTop: 12, borderTop: `1px solid ${oracle.border}` },
  outHead: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, flexWrap: 'wrap' },
  outTitle:{ fontSize: 11, fontWeight: 800, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  outMeta: { fontSize: 11.5, color: oracle.textMuted },
  staleTag:{ fontSize: 10.5, fontWeight: 800, color: '#8a5a00', background: '#fdf3e0', border: '1px solid #e2bd77', borderRadius: 999, padding: '2px 8px', letterSpacing: 0.2, textTransform: 'uppercase' },
  outRow:  { display: 'flex', gap: 6, flexWrap: 'wrap' },
  zipBtn:  { padding: '5px 11px', fontSize: 11.5, fontWeight: 800, background: oracle.surfaceAlt, color: oracle.ink, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, cursor: 'pointer', fontFamily: FONT },

  actions:{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 18px 16px' },
  open:   { padding: '7px 14px', fontSize: 13, background: oracle.red, color: '#fff', border: `1px solid ${oracle.redDark}`, borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontFamily: FONT },
  btn:    { padding: '7px 12px', fontSize: 13, background: oracle.surface, color: oracle.text, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontFamily: FONT },
  danger: { padding: '7px 12px', fontSize: 13, background: '#fffafa', color: '#9f1d1d', border: '1px solid #d0a2a2', borderRadius: 4, cursor: 'pointer', fontWeight: 600, marginLeft: 'auto', fontFamily: FONT },
};

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

/** Compact, store-derived summary chips for a saved Landing Zone card. */
function summaryChips(id: string): string[] {
  const rec = getLZ(id);
  if (!rec) return [];
  const m = rec.model;
  const region = (m.foundation?.regionShortName || m.foundation?.region || '').trim();
  const envs = (m.environments ?? []).filter((e) => e.name?.trim()).length;
  const projects = (m.projects ?? []).length;
  const platforms = (m.platforms ?? []).length;
  const chips: string[] = [];
  if (region) chips.push(region);
  chips.push(`${envs} env${envs === 1 ? '' : 's'}`);
  chips.push(`${projects} project${projects === 1 ? '' : 's'}`);
  if (platforms > 0) chips.push(`${platforms} platform${platforms === 1 ? '' : 's'}`);
  return chips;
}

interface CardOutputs {
  fileCount: number;
  generatedAt: string;
  /** The model has moved on since these were generated. */
  stale: boolean;
  files: Record<string, string>;
  config: string;
}

/** The generator run saved against a Landing Zone, if any, and whether it still matches. */
function cardOutputs(id: string): CardOutputs | null {
  const saved = getOutputs(id);
  if (!saved) return null;
  const rec = getLZ(id);
  return {
    fileCount: Object.keys(saved.files).length,
    generatedAt: saved.generatedAt,
    stale: rec ? serializeConfig(rec.model) !== saved.config : false,
    files: saved.files,
    config: saved.config,
  };
}

export default function SavedLzList({ title = 'Your Landing Zones', currentId, onCurrentDeleted, onCountChange }: {
  title?: string;
  /** Landing Zone currently open in the wizard, if any — marked, not openable. */
  currentId?: string;
  /** Called when `currentId` itself is deleted. */
  onCurrentDeleted?: () => void;
  /** Fires whenever the saved-build count changes, e.g. so a host can swap its empty state. */
  onCountChange?: (count: number) => void;
}) {
  const navigate = useNavigate();
  const [records, setRecords] = useState<LzMeta[]>(() => listLZs());
  const [storageError, setStorageError] = useState<string | null>(null);

  const reload = () => setRecords(listLZs());
  useEffect(() => { onCountChange?.(records.length); }, [records.length, onCountChange]);
  // Per-card summaries + saved generator artifacts, recomputed only when the
  // record set changes (both read straight from the store).
  const summaries = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of records) map[r.id] = summaryChips(r.id);
    return map;
  }, [records]);
  const outputs = useMemo(() => {
    const map: Record<string, CardOutputs | null> = {};
    for (const r of records) map[r.id] = cardOutputs(r.id);
    return map;
  }, [records]);

  function handleDuplicate(id: string) {
    const result = duplicateLZ(id);
    if (!result.ok) {
      setStorageError(result.message ?? 'Could not duplicate the Landing Zone.');
      return;
    }
    setStorageError(result.message ?? null);
    reload();
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    const result = deleteLZ(id);
    if (!result.ok) {
      setStorageError(result.message ?? 'Could not delete the Landing Zone.');
      return;
    }
    setStorageError(null);
    if (id === currentId) { onCurrentDeleted?.(); return; }
    reload();
  }

  return (
    <>
      <div style={s.sectionHead}>
        <div style={s.sectionTitle}>{title}</div>
        <span style={s.count}>{records.length} saved</span>
      </div>
      {storageError && <div role="alert" style={{ color: '#9f1d1d', fontSize: 13, margin: '-6px 0 12px' }}>{storageError}</div>}

      <div style={s.grid}>
        {records.map((r) => {
          const isCurrent = r.id === currentId;
          const chips = summaries[r.id] ?? [];
          const out = outputs[r.id];
          return (
            <div key={r.id} style={isCurrent ? { ...s.card, ...s.cardCurrent } : s.card}>
              <div style={s.accent} />
              <div style={s.body}>
                <div style={s.nameRow}>
                  <span style={s.name}>{r.name}</span>
                  {isCurrent && <span style={s.badge}>This one</span>}
                </div>
                {chips.length > 0 && (
                  <div style={s.summaryRow}>
                    {chips.map((c) => <span key={c} style={s.chip}>{c}</span>)}
                  </div>
                )}
                <div style={s.meta}>Edited {formatTime(r.updatedAt)}</div>

                {/* A saved snapshot is downloadable only as its complete ZIP. */}
                {out && (
                  <div style={s.outBox}>
                    <div style={s.outHead}>
                      <span style={s.outTitle}>LZ config</span>
                      {out.stale
                        ? <span style={s.staleTag} title="The design changed after this output was created — run step 5 again.">Stale</span>
                        : <span style={s.outMeta}>{formatTime(out.generatedAt)}</span>}
                    </div>
                    {!out.stale && (
                      <div style={s.outRow}>
                        <button
                        type="button"
                        style={s.zipBtn}
                        title={`${out.fileCount} outputs + ${CONFIG_FILENAME}`}
                        onClick={() => downloadBlob(
                          bundleFilename(r.name),
                          zipTextFiles({ [CONFIG_FILENAME]: out.config, ...out.files }),
                        )}
                      >
                        Download LZ config
                      </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={s.actions}>
                {!isCurrent && (
                  <button type="button" style={s.open} onClick={() => navigate(`/lz/${r.id}`)}>Open</button>
                )}
                <button type="button" style={s.btn} onClick={() => handleDuplicate(r.id)}>Duplicate</button>
                <button type="button" style={s.danger} onClick={() => handleDelete(r.id, r.name)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
