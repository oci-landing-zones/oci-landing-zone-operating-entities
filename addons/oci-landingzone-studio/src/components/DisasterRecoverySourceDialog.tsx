import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { LzModel } from '../model/types';
import { importConfigFile } from '../services/configImportFile';
import { clearOutputs, getLZ, getOutputs, listLZs, saveDisasterRecoveryLZ, saveOutputs, type LzOutputs, type LzRecord } from '../services/lzStore';
import { oracle } from '../theme';
import DisasterRecoveryConfiguration from './DisasterRecoveryConfiguration';
import { createDrDraft, type DrDesignDraft } from '../services/disasterRecoveryDesign';
import DisasterRecoveryGeneration from './DisasterRecoveryGeneration';
import { drDesignFingerprint } from '../services/disasterRecoverySavedDesign';

const control: CSSProperties = { boxSizing: 'border-box', width: '100%', padding: '10px 12px', font: 'inherit', color: oracle.text, background: oracle.surface, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4 };
const button: CSSProperties = { padding: '11px 20px', font: 'inherit', fontSize: 14, fontWeight: 700, color: oracle.text, background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 6, cursor: 'pointer' };

interface DrSource { name: string; model: LzModel; warnings: string[]; draft: DrDesignDraft; savedId?: string; sourceLabel: string }

function savedSource(record: LzRecord): DrSource {
  return { name: record.name, model: record.model, warnings: [], draft: record.disasterRecovery?.draft ?? createDrDraft(record.model),
    savedId: record.disasterRecovery ? record.id : undefined, sourceLabel: record.disasterRecovery?.sourceLabel ?? 'Saved Landing Zone' };
}

export default function DisasterRecoverySourceDialog({ onClose, initialDesignId, onSaved }: {
  onClose: () => void; initialDesignId?: string; onSaved?: (id: string, warning?: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const savedRadio = useRef<HTMLInputElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [records] = useState(listLZs);
  const [initialRecord] = useState(() => initialDesignId ? getLZ(initialDesignId) : null);
  const [mode, setMode] = useState<'saved' | 'file'>('saved');
  const [selectedId, setSelectedId] = useState('');
  const [source, setSource] = useState<DrSource | null>(() => initialRecord?.disasterRecovery ? savedSource(initialRecord) : null);
  const [artifacts, setArtifacts] = useState<Pick<LzOutputs, 'config' | 'files'> | null>(() => initialRecord?.disasterRecovery ? getOutputs(initialRecord.id) : null);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(!!initialRecord?.disasterRecovery);
  const [generating, setGenerating] = useState(!!initialRecord?.disasterRecovery);
  const [error, setError] = useState<string | null>(null);
  const title = generating ? 'Generate Landing Zone files' : reviewing ? 'Configure Disaster Recovery' : 'Add Disaster Recovery';

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    savedRadio.current?.focus();
    return () => { controller.current?.abort(); element.close(); };
  }, []);

  useEffect(() => {
    if (reviewing) detailHeading.current?.focus();
    else savedRadio.current?.focus();
    if (content.current) content.current.scrollTop = 0;
  }, [reviewing, generating]);

  function chooseMode(next: 'saved' | 'file') {
    controller.current?.abort();
    setBusy(false);
    setMode(next);
    setSource(null);
    setArtifacts(null);
    setSelectedId('');
    setError(null);
  }
  function chooseSaved(id: string) {
    setSelectedId(id);
    setError(null);
    const record = id ? getLZ(id) : null;
    setSource(record ? savedSource(record) : null);
    setArtifacts(record?.disasterRecovery ? getOutputs(record.id) : null);
    if (id && !record) setError('This Landing Zone is no longer available. Choose another design.');
  }
  async function chooseFile(file: File | undefined) {
    if (!file) return;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError(null);
    setSource(null);
    setArtifacts(null);
    try {
      const imported = await importConfigFile(file, active.signal);
      if (!active.signal.aborted) setSource({ name: file.name, ...imported, draft: createDrDraft(imported.model), sourceLabel: 'Imported config.jsonnet' });
    } catch (err) {
      if (!active.signal.aborted) setError(err instanceof Error ? err.message.slice(0, 1000) : 'Could not read this configuration.');
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }

  function saveDesign() {
    if (!source || generationBusy) return;
    if (!source.draft.region || !source.draft.regionConfirmed) {
      setError('Select and confirm a DR region before saving this design.');
      return;
    }
    const baseName = source.savedId ? source.name.replace(/ · Home \+ DR(?: \+ RPC)?$/, '') : source.name;
    const name = `${baseName} · Home + DR${source.draft.rpcEnabled ? ' + RPC' : ''}`;
    const result = saveDisasterRecoveryLZ({ id: source.savedId, name, model: source.model, draft: source.draft, sourceLabel: source.sourceLabel });
    if (!result.ok || !result.record) { setError(result.message ?? 'Could not save this design.'); return; }
    let warning: string | undefined;
    if (artifacts?.config === drDesignFingerprint(source.model, source.draft) && Object.keys(artifacts.files).length) {
      if (!saveOutputs(result.record.id, artifacts).ok) warning = 'The Home and DR design was saved, but its generated files could not be retained. Open it to generate them again.';
    } else clearOutputs(result.record.id);
    onSaved?.(result.record.id, warning);
    onClose();
  }

  return (
    <dialog ref={dialog} className="studio-dr-source-dialog" aria-labelledby="dr-source-title" aria-describedby="dr-source-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      style={{ boxSizing: 'border-box', width: reviewing ? 1240 : 620, maxWidth: 'calc(100% - 32px)', maxHeight: 'calc(100% - 48px)', height: reviewing ? 'calc(100% - 48px)' : undefined, padding: 0, overflow: 'hidden',
        color: oracle.text, background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 10, font: 'inherit' }}>
      <style>{'.studio-dr-source-dialog[open] { display: flex; flex-direction: column; } .studio-dr-source-dialog::backdrop { background: rgba(32, 31, 28, 0.48); }'}</style>
      <div ref={content} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: 24 }}>
      <h2 ref={detailHeading} id="dr-source-title" tabIndex={-1} style={{ margin: '0 0 16px', fontSize: 22 }}>{title}</h2>
      <p id="dr-source-description" style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.6 }}>
        {generating ? 'Follow the deployment steps and download the configuration files for the Home and Disaster Recovery stacks.' : reviewing ? 'Review the home configuration and choose the region, network and platforms for Disaster Recovery.' : 'Choose the existing Landing Zone to use as the starting point for a Disaster Recovery design in another region.'}
      </p>
      {!reviewing && <>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 20px', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <legend style={{ fontSize: 14, fontWeight: 700, padding: 0, marginBottom: 12 }}>Landing Zone source</legend>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input ref={savedRadio} type="radio" name="dr-source" checked={mode === 'saved'} onChange={() => chooseMode('saved')} />Saved Landing Zone
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="radio" name="dr-source" checked={mode === 'file'} onChange={() => chooseMode('file')} />Import config.jsonnet
        </label>
      </fieldset>
      {mode === 'saved' ? (
        records.length ? <>
          <label htmlFor="dr-saved-design" style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Saved Landing Zone</label>
          <select id="dr-saved-design" style={control} value={selectedId} onChange={(event) => chooseSaved(event.target.value)}>
            <option value="">Choose a Landing Zone</option>
            {records.map((record) => <option key={record.id} value={record.id}>{record.name}</option>)}
          </select>
        </> : <p style={{ color: oracle.textMuted, lineHeight: 1.5 }}>No saved Landing Zones yet. Select Import config.jsonnet to choose an exported configuration.</p>
      ) : <>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>Extract the ZIP for your existing Landing Zone and select <strong>config.jsonnet</strong>. Your file stays in this browser.</p>
        <input ref={fileInput} type="file" accept=".jsonnet" aria-label="Choose DR source config.jsonnet" hidden onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = ''; void chooseFile(file);
        }} />
        <button type="button" disabled={busy} style={{ ...button, background: oracle.red, color: '#fff', border: `1px solid ${oracle.redDark}`, ...(busy ? { cursor: 'wait', opacity: 0.7 } : {}) }} onClick={() => fileInput.current?.click()}>
          {busy ? 'Reading configuration…' : 'Choose config.jsonnet'}
        </button>
        <p style={{ fontSize: 13, color: oracle.textMuted }}>Standalone Studio exports only · .jsonnet · Maximum 1 MB</p>
      </>}
      {busy && <p role="status">Reading the source configuration locally…</p>}
      {error && <p role="alert" style={{ fontSize: 14, color: '#9f1d1d', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{error}</p>}
      {source && <section aria-label="Selected DR source" style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${oracle.border}` }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, overflowWrap: 'anywhere' }}>{source.name}</h3>
        {source.model.foundation.description && <p style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{source.model.foundation.description}</p>}
        <p style={{ fontSize: 14, color: oracle.textMuted, lineHeight: 1.6 }}>
          Home region: {source.model.foundation.region}<br />
          Hub {source.model.network.hubKind.slice(-1).toUpperCase()} · CIS Level {source.model.foundation.cisLevel} · {source.model.environments.length} environments
        </p>
        {source.warnings.map((warning) => <p key={warning} style={{ fontSize: 14, lineHeight: 1.5 }}>{warning}</p>)}
        <p role="status" style={{ fontSize: 14, lineHeight: 1.5 }}>Select Next to review the full configuration.</p>
      </section>}
      </>}
      {reviewing && !generating && source && <>
        <DisasterRecoveryConfiguration name={source.name} model={source.model} sourceLabel={source.sourceLabel}
          draft={source.draft ?? createDrDraft(source.model)} onChange={(draft) => setSource((current) => current ? { ...current, draft } : null)} />
        {source.warnings.map((warning) => <p key={warning} style={{ fontSize: 14, lineHeight: 1.5 }}>{warning}</p>)}
      </>}
      {generating && source && <DisasterRecoveryGeneration name={source.name} model={source.model} draft={source.draft}
        initialOutputs={artifacts} onArtifactsChange={setArtifacts} onBusyChange={setGenerationBusy}
        onChangeDraft={(draft) => setSource((current) => current ? { ...current, draft } : null)} />}
      </div>
      <footer aria-label="Disaster Recovery navigation" style={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12,
        padding: '16px 24px', background: oracle.surface, borderTop: `1px solid ${oracle.border}` }}>
        {generating && error && <p role="alert" style={{ width: '100%', margin: 0, color: oracle.redDark, fontSize: 14, textAlign: 'center' }}>{error}</p>}
        {reviewing ? <>
          <button type="button" style={button} onClick={() => generating ? setGenerating(false) : setReviewing(false)}>Back</button>
          <button type="button" style={button} onClick={onClose}>Close</button>
          {generating && <button type="button" disabled={generationBusy} style={{ ...button, background: oracle.red, color: '#fff', borderColor: oracle.redDark, opacity: generationBusy ? 0.5 : 1 }} onClick={saveDesign}>Save</button>}
          {!generating && <button type="button" style={{ ...button, background: oracle.red, color: '#fff', borderColor: oracle.redDark }} onClick={() => setGenerating(true)}>Next</button>}
        </> : <>
          <button type="button" disabled={!source || busy || !!error}
            style={{ ...button, background: oracle.red, color: '#fff', border: `1px solid ${oracle.redDark}`, ...(!source || busy || error ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
            onClick={() => { if (source && !busy && !error) setReviewing(true); }}>Next</button>
          <button type="button" style={button} onClick={onClose}>Cancel</button>
        </>}
      </footer>
    </dialog>
  );
}
