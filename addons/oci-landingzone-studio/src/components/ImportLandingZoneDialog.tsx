import React, { useEffect, useRef, useState } from 'react';
import { importConfigFile } from '../services/configImportFile';
import { resolveImportedFinOps, type ImportedConfig } from '../services/importConfig';
import { createLZ } from '../services/lzStore';
import { oracle } from '../theme';
import { ErrorNotice } from './FieldError';
import ValidatedInput from './ValidatedInput';

const button: React.CSSProperties = {
  padding: '11px 20px', font: 'inherit', fontSize: 14, fontWeight: 700,
  background: oracle.surface, color: oracle.text, border: `1px solid ${oracle.border}`, borderRadius: 6, cursor: 'pointer',
};
const primary: React.CSSProperties = { ...button, background: oracle.red, color: '#fff', border: `1px solid ${oracle.redDark}` };

export function FinOpsImportChoice({ value, onChange }: { value: boolean | null; onChange: (enabled: boolean) => void }) {
  return <fieldset aria-describedby="import-finops-description" style={{ margin: '20px 0 0', padding: 16, border: `1px solid ${oracle.border}`, borderRadius: 6 }}>
    <legend style={{ fontSize: 14, fontWeight: 700 }}>FinOps tags</legend>
    <p id="import-finops-description" style={{ margin: '0 0 8px', fontSize: 14 }}>
      This older export contains FinOps settings but does not record whether FinOps tags were enabled. Choose how to import them. Keeping tags preserves their saved values; disabling them omits FinOps tags and tag-based budgets from new downloads. Compartment-based budgets remain available.
    </p>
    {[{ enabled: true, label: 'Keep FinOps tags' }, { enabled: false, label: 'Disable FinOps tags' }].map(({ enabled, label }) =>
      <label key={String(enabled)} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, cursor: 'pointer', fontSize: 14 }}>
        <input type="radio" name="import-finops" value={enabled ? 'enabled' : 'disabled'} required checked={value === enabled} onChange={() => onChange(enabled)} />
        {label}
      </label>)}
  </fieldset>;
}

export default function ImportLandingZoneDialog({ onClose, onImported }: { onClose: () => void; onImported: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ImportedConfig | null>(null);
  const [finOpsChoice, setFinOpsChoice] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [filename, setFilename] = useState('');

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    chooseButton.current?.focus();
    return () => { controller.current?.abort(); element.close(); };
  }, []);
  useEffect(() => { if (pending) nameInput.current?.focus(); }, [pending]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPending(null);
    setFinOpsChoice(null);
    setError(null);
    setFilename(file.name);
    setImporting(true);
    const active = new AbortController();
    controller.current = active;
    try {
      const result = await importConfigFile(file, active.signal);
      if (active.signal.aborted) return;
      setName(`Imported Landing Zone (${result.model.foundation.regionShortName})`);
      setPending(result);
    } catch (err) {
      if (!active.signal.aborted) setError(err instanceof Error ? err.message.slice(0, 1000) : 'Could not import this configuration.');
    } finally {
      if (!active.signal.aborted) setImporting(false);
    }
  }

  function confirmImport(event: React.FormEvent) {
    event.preventDefault();
    if (!pending || !name.trim()) return;
    let model;
    try { model = resolveImportedFinOps(pending, finOpsChoice); }
    catch (err) { setError(err instanceof Error ? err.message : 'Choose how to import FinOps tags.'); return; }
    const created = createLZ(name, model);
    if (!created.ok || !created.record) {
      setError(created.message ?? 'Could not save the imported Landing Zone.');
      return;
    }
    onImported(created.record.id);
  }

  return (
    <dialog ref={dialog} className="studio-import-dialog" aria-labelledby="import-lz-title" aria-describedby="import-lz-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      style={{ boxSizing: 'border-box', width: 620, maxWidth: 'calc(100% - 32px)', maxHeight: 'calc(100% - 48px)', padding: 24,
        color: oracle.text, background: oracle.surface, border: `1px solid ${oracle.border}`, borderRadius: 10, font: 'inherit' }}>
      <style>{'.studio-import-dialog::backdrop { background: rgba(32, 31, 28, 0.48); }'}</style>
      <h2 id="import-lz-title" style={{ margin: '0 0 16px', fontSize: 22 }}>Import</h2>
      <div id="import-lz-description" style={{ fontSize: 15, lineHeight: 1.6 }}>
        <p style={{ margin: '0 0 12px' }}>To import a previous Landing Zone design, extract its ZIP file and select <strong>config.jsonnet</strong>.</p>
        <p style={{ margin: '0 0 20px', color: oracle.textMuted }}>Studio will restore it as a new editable design. Existing designs will be kept. Your file stays in this browser.</p>
      </div>
      <input ref={fileInput} type="file" accept=".jsonnet" aria-label="Choose config.jsonnet" hidden onChange={handleFile} />
      <button ref={chooseButton} type="button" style={{ ...(pending ? button : primary), ...(importing ? { cursor: 'wait', opacity: 0.7 } : {}) }}
        disabled={importing} onClick={() => fileInput.current?.click()}>
        {importing ? 'Reading configuration…' : pending ? 'Choose another file' : 'Choose config.jsonnet'}
      </button>
      <p style={{ margin: '10px 0 0', color: oracle.textMuted, fontSize: 13 }}>Standalone Studio exports only · .jsonnet · Maximum 1 MB</p>
      {importing && <p role="status">Reading config.jsonnet locally…</p>}
      {error && <ErrorNotice title={pending ? 'Could not save the imported design' : 'Could not import this file'}>{error}</ErrorNotice>}
      {pending ? (
        <form onSubmit={confirmImport}>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${oracle.border}`, lineHeight: 1.6 }}>
            <strong style={{ overflowWrap: 'anywhere' }}>{filename}</strong>
            <p style={{ margin: '4px 0 16px', fontSize: 14, color: oracle.textMuted }}>
              {pending.model.foundation.region} · Hub {pending.model.network.hubKind.slice(-1).toUpperCase()} · CIS Level {pending.model.foundation.cisLevel} · {pending.model.environments.length} environments
            </p>
            <label htmlFor="import-lz-name" style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Landing Zone name</label>
            <ValidatedInput ref={nameInput} id="import-lz-name" error={!name.trim() ? 'Enter a name for this design.' : null} value={name} onChange={(event) => setName(event.target.value)} required maxLength={120}
              style={{ boxSizing: 'border-box', width: '100%', padding: '10px 12px', font: 'inherit', color: oracle.text,
                background: oracle.appBg, border: `1px solid ${oracle.border}`, borderRadius: 4 }} />
            {pending.warnings.map((warning) => <p key={warning} style={{ fontSize: 14 }}>{warning}</p>)}
            {pending.requiresFinOpsChoice && <FinOpsImportChoice value={finOpsChoice} onChange={setFinOpsChoice} />}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
            <button type="submit" disabled={!name.trim() || !!pending.requiresFinOpsChoice && finOpsChoice === null}
              style={{ ...primary, ...(!name.trim() || pending.requiresFinOpsChoice && finOpsChoice === null ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}>Import Landing Zone</button>
            <button type="button" onClick={onClose} style={button}>Cancel</button>
          </div>
        </form>
      ) : <div style={{ marginTop: 24 }}><button type="button" onClick={onClose} style={button}>Cancel</button></div>}
    </dialog>
  );
}
