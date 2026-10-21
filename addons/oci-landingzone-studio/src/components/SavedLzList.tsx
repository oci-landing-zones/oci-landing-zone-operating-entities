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
import { deleteLZ, duplicateLZ, getLZ, getOutputs, listLZs, saveOutputs, type LzMeta } from '../services/lzStore';
import { serializeConfig } from '../services/lzConfig';
import { CONFIG_FILENAME, isCurrentOutputSet } from '../generator/outputNames';
import { bundleFilename, downloadBlob, zipTextFiles } from '../export/zip';
import { downloadTextFile } from '../export/download';
import DisasterRecoverySourceDialog from './DisasterRecoverySourceDialog';
import { drRegionOptions } from '../services/disasterRecoveryDesign';
import { drDesignFingerprint, isCurrentDrOutputSet } from '../services/disasterRecoverySavedDesign';

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
  if (region) chips.push(rec.disasterRecovery ? `Home: ${region}` : region);
  if (rec.disasterRecovery) {
    const draft = rec.disasterRecovery.draft;
    chips.push(`DR: ${drRegionOptions(m).find((item) => item.id === draft.region)?.shortName ?? draft.region}`);
  }
  chips.push(`${envs} env${envs === 1 ? '' : 's'}`);
  chips.push(`${projects} project${projects === 1 ? '' : 's'}`);
  if (platforms > 0) chips.push(`${platforms} platform${platforms === 1 ? '' : 's'}`);
  return chips;
}

interface CardOutputs {
  combined: boolean;
  fileCount: number;
  generatedAt: string;
  /** The design changed or the output uses an older deployment contract. */
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
    combined: !!rec?.disasterRecovery,
    fileCount: Object.keys(saved.files).length,
    generatedAt: saved.generatedAt,
    stale: !rec || (rec.disasterRecovery ? !isCurrentDrOutputSet(rec, saved) : !isCurrentOutputSet(saved, serializeConfig(rec.model))),
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
  const [openedDrId, setOpenedDrId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<{ id: string; scope: 'Home' | 'DR' } | null>(null);

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
  const descriptions = useMemo(() => Object.fromEntries(records.map((record) => [record.id, getLZ(record.id)?.model.foundation.description?.trim() ?? ''])), [records]);
  const combinedDesigns = useMemo(() => new Set(records.filter((record) => getLZ(record.id)?.disasterRecovery).map((record) => record.id)), [records]);

  async function downloadRegionalConfig(id: string, scope: 'Home' | 'DR') {
    if (downloading) return;
    const record = getLZ(id);
    if (!record?.disasterRecovery) { setStorageError('This Home and DR design is no longer available.'); return; }
    setDownloading({ id, scope });
    setStorageError(null);
    try {
      const saved = getOutputs(id);
      let files = saved && isCurrentDrOutputSet(record, saved) ? saved.files : null;
      let warning: string | null = null;
      if (!files) {
        const { generateDrFileBundle } = await import('../services/disasterRecoveryGeneration');
        const fingerprint = drDesignFingerprint(record.model, record.disasterRecovery.draft);
        files = { ...(saved?.config === fingerprint ? saved.files : {}), ...await generateDrFileBundle(record.model, record.disasterRecovery.draft) };
        const persisted = saveOutputs(id, { config: fingerprint, files });
        if (!persisted.ok) warning = 'The configuration was downloaded, but its files could not be retained in browser storage.';
        reload();
      }
      const regionalFiles = Object.fromEntries(Object.entries(files)
        .filter(([path]) => path.startsWith(`${scope}/`) || path === 'README.txt')
        .map(([path, body]) => [path.replace(`${scope}/`, ''), body]));
      downloadBlob(bundleFilename(`${record.name}-${scope.toLowerCase()}`), zipTextFiles(regionalFiles));
      setStorageError(warning);
    } catch (error) { setStorageError(error instanceof Error ? error.message : 'Could not generate the regional configuration. Open the design to review it.'); }
    finally { setDownloading(null); }
  }

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

  async function handleDownloadDiagram(id: string, name: string) {
    const record = getLZ(id);
    if (!record) { setStorageError('This Landing Zone is no longer available in browser storage.'); return; }
    try {
      const { toDrawioXml } = await import('../export/toDrawio');
      const diagram = record.disasterRecovery
        ? (await import('../services/disasterRecoveryDiagram')).buildDrComparisonDiagram(record.model, record.disasterRecovery.draft)
        : (await import('../diagram/buildGraph')).buildGraph(record.model, 5, {});
      downloadTextFile(bundleFilename(name).replace(/-lz-outputs\.zip$/, '.drawio'), toDrawioXml(diagram), 'application/xml');
      setStorageError(null);
    } catch {
      setStorageError('Could not export the diagram. Open this Landing Zone and review its design.');
    }
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
          const combined = combinedDesigns.has(r.id);
          return (
            <div key={r.id} style={isCurrent ? { ...s.card, ...s.cardCurrent } : s.card}>
              <div style={s.accent} />
              <div style={s.body}>
                <div style={s.nameRow}>
                  <span style={s.name}>{r.name}</span>
                  {isCurrent && <span style={s.badge}>This one</span>}
                </div>
                {descriptions[r.id] && <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: oracle.textMuted, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{descriptions[r.id]}</p>}
                {chips.length > 0 && (
                  <div style={s.summaryRow}>
                    {chips.map((c) => <span key={c} style={s.chip}>{c}</span>)}
                  </div>
                )}
                <div style={s.meta}>Edited {formatTime(r.updatedAt)}</div>

                {/* Config downloads retain the generated snapshot; diagrams use the saved design. */}
                <div style={s.outBox}>
                  {out && (
                    <div style={s.outHead}>
                      <span style={s.outTitle}>LZ config</span>
                      {out.stale
                        ? <span style={s.staleTag} title="The design or deployment format changed. Open step 5 to regenerate these files.">Stale</span>
                        : <span style={s.outMeta}>{formatTime(out.generatedAt)}</span>}
                    </div>
                  )}
                  <div style={s.outRow}>
                    {combined && <>
                      <button type="button" style={{ ...s.zipBtn, opacity: downloading?.id === r.id && downloading.scope === 'Home' ? 0.5 : 1 }} disabled={!!downloading}
                        title="Download the Home stack configuration" onClick={() => void downloadRegionalConfig(r.id, 'Home')}>Download LZ config</button>
                      <button type="button" style={{ ...s.zipBtn, opacity: downloading?.id === r.id && downloading.scope === 'DR' ? 0.5 : 1 }} disabled={!!downloading}
                        title="Download the DR stack configuration" onClick={() => void downloadRegionalConfig(r.id, 'DR')}>Download LZ DR config</button>
                    </>}
                    {!combined && out && !out.stale && (
                      <button
                        type="button"
                        style={s.zipBtn}
                        title={out.combined ? `${out.fileCount} files for Home and DR` : `${out.fileCount} outputs + ${CONFIG_FILENAME}`}
                        onClick={() => downloadBlob(
                          bundleFilename(r.name),
                          zipTextFiles(out.combined ? out.files : { [CONFIG_FILENAME]: out.config, ...out.files }),
                        )}
                      >
                        {out.combined ? 'Download Home + DR config' : 'Download LZ config'}
                      </button>
                    )}
                    <button type="button" style={s.zipBtn} title="Download the saved design as an editable .drawio diagram" onClick={() => void handleDownloadDiagram(r.id, r.name)}>
                      Download draw.io
                    </button>
                  </div>
                </div>
              </div>
              <div style={s.actions}>
                {!isCurrent && (
                  <button type="button" style={s.open} onClick={() => getLZ(r.id)?.disasterRecovery ? setOpenedDrId(r.id) : navigate(`/lz/${r.id}`)}>Open</button>
                )}
                <button type="button" style={s.btn} onClick={() => handleDuplicate(r.id)}>Duplicate</button>
                <button type="button" style={s.danger} onClick={() => handleDelete(r.id, r.name)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      {openedDrId && <DisasterRecoverySourceDialog initialDesignId={openedDrId} onClose={() => setOpenedDrId(null)}
        onSaved={(_id, warning) => { setStorageError(warning ?? null); reload(); }} />}
    </>
  );
}
