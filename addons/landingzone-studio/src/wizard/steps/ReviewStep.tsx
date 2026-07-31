/**
 * ReviewStep — step 5 ("Review"). Summarises the model, then runs the *real* OCI
 * landing-zone jsonnet generator over the config the wizard has been building and
 * offers the resulting artifacts for download.
 *
 * The generator is upstream's own `gen/` jsonnet, evaluated by go-jsonnet compiled
 * to WebAssembly — the same computation `gen/generate.sh` runs on the command line,
 * just in the browser. Nothing here reimplements it, so the outputs are the outputs.
 *
 * Hub A deploys `network_pre.json` first (placeholder firewall OCIDs), then
 * `network.json` once the firewall's private IPs exist. Those two are surfaced
 * directly; the other ten artifacts ride along in the bundle.
 */

import { useMemo, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { useWizard } from '../wizardContext';
import { oracle } from '../../theme';
import { s } from './networkEditorStyles';
import { serializeConfig } from '../../services/lzConfig';
import { getHubKind } from '../../services/hubKinds';
import { getOutputs, saveOutputs } from '../../services/lzStore';
// The generator drags in ~0.7 MB of vendored jsonnet, so it is imported on demand
// inside `run()`. Only its names — a dependency-free module — are imported here.
import { CONFIG_FILENAME, OUTPUT_BLURB, PRIMARY_OUTPUTS } from '../../generator/outputNames';
import { downloadTextFile } from '../../export/download';
import { downloadBlob, zipTextFiles } from '../../export/zip';

interface RunResult {
  config: string;
  files: Record<string, string>;
  primary: string[];
  secondary: string[];
}

/** Split a generator run into the Hub A artifacts and everything else. */
function splitOutputs(config: string, files: Record<string, string>): RunResult {
  const primary = PRIMARY_OUTPUTS.filter((name) => name in files);
  const secondary = Object.keys(files).filter((name) => !primary.includes(name as never)).sort();
  return { config, files, primary, secondary };
}

const local: Record<string, CSSProperties> = {
  note:      { fontSize: 12.5, color: oracle.textMuted, marginBottom: 16, lineHeight: 1.55 },
  sumGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1, background: oracle.border, border: `1px solid ${oracle.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 20 },
  sumCell:   { background: oracle.surface, padding: '11px 13px' },
  sumLabel:  { fontSize: 10.5, fontWeight: 700, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  sumValue:  { fontSize: 14, fontWeight: 700, color: oracle.ink, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },

  runRow:    { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  primary:   { padding: '11px 20px', fontSize: 13.5, fontWeight: 800, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  primaryOff:{ opacity: 0.55, cursor: 'progress' },
  secondary: { padding: '10px 15px', fontSize: 13, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontFamily: 'inherit' },
  hint:      { fontSize: 12, color: oracle.textMuted },

  stale:     { display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px', border: `1px solid ${oracle.borderStrong}`, background: oracle.surfaceAlt, borderRadius: 6, fontSize: 12.5, color: oracle.text, margin: '14px 0 0' },

  errBox:    { marginTop: 16, border: `1px solid ${oracle.red}`, borderRadius: 6, overflow: 'hidden' },
  errHead:   { padding: '9px 13px', background: oracle.redTint, color: oracle.redDark, fontSize: 12.5, fontWeight: 800 },
  errBody:   { margin: 0, padding: '12px 13px', background: oracle.surface, fontSize: 12, lineHeight: 1.55, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: oracle.text, whiteSpace: 'pre-wrap', overflowX: 'auto', maxHeight: 260 },

  outHead:   { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 20, marginBottom: 12 },
  fileList:  { border: `1px solid ${oracle.border}`, borderRadius: 6, overflow: 'hidden' },
  fileRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 13px', borderBottom: `1px solid ${oracle.border}` },
  fileName:  { fontSize: 13.5, fontWeight: 700, color: oracle.ink, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  fileMeta:  { fontSize: 11.5, color: oracle.textMuted, marginTop: 2 },
  dlBtn:     { padding: '6px 13px', fontSize: 12.5, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  extra:     { padding: '11px 13px', background: oracle.surfaceAlt, fontSize: 12, color: oracle.textMuted, lineHeight: 1.6 },
};

const KB = (text: string) => `${(new Blob([text]).size / 1024).toFixed(1)} KB`;

function slugify(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() || 'landing-zone';
}

export default function ReviewStep() {
  const { model } = useWizard();
  const { id } = useParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Seed from the last saved run, so leaving and returning to step 5 (or reloading)
  // doesn't lose artifacts that are already on disk.
  const [result, setResult] = useState<RunResult | null>(() => {
    const saved = id ? getOutputs(id) : null;
    return saved ? splitOutputs(saved.config, saved.files) : null;
  });

  const configText = useMemo(() => serializeConfig(model), [model]);
  const hub = getHubKind(model.network.hubKind);
  const slug = slugify(model.presentation.landingZone || 'landing-zone');

  // Outputs are a snapshot. If the model has moved since, say so rather than
  // letting someone download artifacts that no longer match the diagram.
  const stale = result !== null && result.config !== configText;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const { generateOutputs } = await import('../../generator/generate');
      const out = await generateOutputs(model);
      setResult(out);
      // Persist so the saved-builds overview can offer the artifacts too.
      if (id) saveOutputs(id, { config: out.config, files: out.files });
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function downloadBundle() {
    if (!result) return;
    downloadBlob(`${slug}-lz-outputs.zip`, zipTextFiles({ [CONFIG_FILENAME]: result.config, ...result.files }));
  }

  const envCount = model.environments.filter((e) => e.name.trim()).length;

  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Review</div>
          <div style={local.sumGrid}>
            {[
              ['Region', model.foundation.region],
              ['Realm', model.foundation.realm],
              ['Hub', hub?.label ?? model.network.hubKind],
              ['Environments', String(envCount)],
              ['Projects', String(model.projects.length)],
              ['Platforms', String(model.platforms.length)],
            ].map(([label, value]) => (
              <div key={label} style={local.sumCell}>
                <div style={local.sumLabel}>{label}</div>
                <div style={local.sumValue}>{value}</div>
              </div>
            ))}
          </div>

          <div style={s.title}>Review and outputs</div>
          <div style={local.note}>
            Runs the OCI landing-zone generator (upstream&apos;s own jsonnet, compiled to WebAssembly)
            over the config below and produces the deployable JSON. The engine downloads on first
            use — about 2 MB.
          </div>

          <div style={local.runRow}>
            <button
              type="button"
              style={busy ? { ...local.primary, ...local.primaryOff } : local.primary}
              onClick={run}
              disabled={busy}
            >
              {busy ? 'Generating…' : 'Create LZ JSON outputs'}
            </button>
            <button
              type="button"
              style={local.secondary}
              onClick={() => downloadTextFile(CONFIG_FILENAME, configText, 'text/plain')}
            >
              {CONFIG_FILENAME}
            </button>
            {!result && !busy && !error && (
              <span style={local.hint}>The config from steps 1–4 becomes the generator&apos;s input.</span>
            )}
          </div>

          {stale && (
            <div style={local.stale}>
              <strong>Model changed</strong>
              <span style={{ color: oracle.textMuted }}>
                — these outputs are from an earlier config. Generate again to refresh them.
              </span>
            </div>
          )}

          {error && (
            <div style={local.errBox}>
              <div style={local.errHead}>The generator rejected this configuration</div>
              <pre style={local.errBody}>{error}</pre>
            </div>
          )}

          {result && (
            <>
              <div style={local.outHead}>
                <button type="button" style={local.primary} onClick={downloadBundle}>Download bundle (.zip)</button>
                <span style={local.hint}>
                  {Object.keys(result.files).length + 1} files, including {CONFIG_FILENAME}
                </span>
              </div>

              <div style={local.fileList}>
                {result.primary.map((name) => (
                  <div key={name} style={local.fileRow}>
                    <div>
                      <div style={local.fileName}>{name}</div>
                      <div style={local.fileMeta}>{OUTPUT_BLURB[name] ?? ''} {KB(result.files[name])}</div>
                    </div>
                    <button
                      type="button"
                      style={local.dlBtn}
                      onClick={() => downloadTextFile(name, result.files[name], 'application/json')}
                    >
                      Download
                    </button>
                  </div>
                ))}
                {result.secondary.length > 0 && (
                  <div style={local.extra}>
                    <strong>{result.secondary.length} more files</strong> in the bundle — not needed for Hub A yet:{' '}
                    {result.secondary.join(', ')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
