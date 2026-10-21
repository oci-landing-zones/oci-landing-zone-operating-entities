import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { LzModel } from '../model/types';
import { drNetworkOptions, type DrDesignDraft } from '../services/disasterRecoveryDesign';
import { generateDrFileBundle } from '../services/disasterRecoveryGeneration';
import { generatedFileScope } from '../services/generatedFileScope';
import { drDesignFingerprint } from '../services/disasterRecoverySavedDesign';
import type { LzOutputs } from '../services/lzStore';
import { bundleFilename, downloadBlob, zipTextFiles } from '../export/zip';
import { buildDrComparisonDiagram } from '../services/disasterRecoveryDiagram';
import { toDrawioXml } from '../export/toDrawio';
import { downloadTextFile } from '../export/download';
import { oracle } from '../theme';

const action: CSSProperties = { minHeight: 44, padding: '10px 16px', font: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: oracle.red, border: `1px solid ${oracle.redDark}`, borderRadius: 6, cursor: 'pointer' };
const summary: CSSProperties = { fontSize: 14, lineHeight: 1.55, overflowWrap: 'anywhere' };
const card: CSSProperties = { display: 'grid', gap: 16, minWidth: 0, padding: 'var(--dr-card-padding, 20px)', border: `1px solid ${oracle.border}`, borderRadius: 12, background: oracle.surface };
const cardHeader: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingBottom: 12, margin: 0, borderBottom: `1px solid ${oracle.border}` };
const cardDownloads: CSSProperties = { alignSelf: 'start' };
type DownloadScope = 'DR' | 'all' | 'Original' | 'HomeNetwork';

function StackFacts({ values }: { values: Array<[string, string]> }) {
  return <dl style={{ display: 'grid', gridTemplateColumns: 'var(--dr-label-width, 100px) minmax(0, 1fr)', gap: '9px 14px', margin: 0, ...summary }}>
    {values.map(([label, value]) => <div key={label} style={{ display: 'contents' }}>
      <dt style={{ color: oracle.textMuted }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{value}</dd>
    </div>)}
  </dl>;
}

export default function DisasterRecoveryGeneration({ name, model, draft, onChangeDraft, initialOutputs, onArtifactsChange, onBusyChange }: {
  name: string; model: LzModel; draft: DrDesignDraft; onChangeDraft: (draft: DrDesignDraft) => void;
  initialOutputs?: Pick<LzOutputs, 'config' | 'files'> | null;
  onArtifactsChange?: (outputs: Pick<LzOutputs, 'config' | 'files'>) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const options = drNetworkOptions(model);
  const projects = options.projects.filter((option) => draft.projectNetworkIds.includes(option.id));
  const platforms = options.platforms.filter((option) => draft.platformIds.includes(option.id));
  const initialCurrent = initialOutputs?.config === drDesignFingerprint(model, draft) ? initialOutputs : null;
  const [files, setFiles] = useState<Record<string, string> | null>(() => initialCurrent ? Object.fromEntries(Object.entries(initialCurrent.files).filter(([path]) => !path.startsWith('Home-original/'))) : null);
  const [originalFiles, setOriginalFiles] = useState<Record<string, string> | null>(() => initialCurrent ? Object.fromEntries(Object.entries(initialCurrent.files).filter(([path]) => path.startsWith('Home-original/')).map(([path, body]) => [path.slice('Home-original/'.length), body])) : null);
  const generatedDraft = useRef(initialCurrent?.config ?? '');
  const [activeDownload, setActiveDownload] = useState<DownloadScope | null>(null);
  const busy = activeDownload !== null;
  useEffect(() => { onBusyChange?.(busy); return () => { onBusyChange?.(false); }; }, [busy, onBusyChange]);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function download(scope: DownloadScope) {
    if (busy) return;
    setActiveDownload(scope);
    setError(null);
    try {
      if (scope === 'Original') {
        setProgress('Generating the original Home configuration without RPC…');
        const { generateOutputs } = await import('../generator/generate');
        const original = await generateOutputs(model);
        if (!mounted.current) return;
        const originalBundle = { 'config.jsonnet': original.config, ...original.files };
        setOriginalFiles(originalBundle);
        const fingerprint = drDesignFingerprint(model, draft);
        onArtifactsChange?.({ config: fingerprint, files: {
          ...(generatedDraft.current === fingerprint ? files : {}),
          ...Object.fromEntries(Object.entries(originalBundle).map(([name, body]) => [`Home-original/${name}`, body])),
        } });
        downloadBlob(bundleFilename(`${name}-home-original`), zipTextFiles(originalBundle));
        setProgress('Original Home configuration downloaded without RPC.');
        return;
      }
      const downloadDraft = scope === 'HomeNetwork' ? { ...draft, rpcEnabled: true } : draft;
      if (scope === 'HomeNetwork' && !draft.rpcEnabled) onChangeDraft(downloadDraft);
      const draftKey = drDesignFingerprint(model, downloadDraft);
      const generated = files && Object.hasOwn(files, 'DR/network.json') && generatedDraft.current === draftKey ? files : await generateDrFileBundle(model, downloadDraft, (message) => { if (mounted.current) setProgress(message); });
      if (!mounted.current) return;
      setFiles(generated);
      generatedDraft.current = draftKey;
      onArtifactsChange?.({ config: draftKey, files: {
        ...generated,
        ...Object.fromEntries(Object.entries(originalFiles ?? {}).map(([name, body]) => [`Home-original/${name}`, body])),
      } });
      if (scope === 'HomeNetwork') {
        downloadTextFile('network.json', generated['Home/network.json'], 'application/json');
        setProgress('Updated Home network.json downloaded, including RPC.');
        return;
      }
      const selected = scope === 'all' ? generated : Object.fromEntries(Object.entries(generated)
        .filter(([path]) => path.startsWith(`${scope}/`) || path === 'README.txt')
        .map(([path, body]) => [path.replace(`${scope}/`, ''), body]));
      downloadBlob(bundleFilename(`${name}-${scope === 'all' ? 'home-and-dr' : scope}`), zipTextFiles(selected));
      setProgress('Files generated. The ZIP download is ready.');
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mounted.current) setActiveDownload(null);
    }
  }
  const fileList = (scope: 'Home' | 'DR' | 'Original', onlyNetwork = false) => {
    const entries = (scope === 'Original' ? Object.entries(originalFiles ?? {}) : Object.entries(files ?? {}).filter(([path]) => path.startsWith(`${scope}/`)).map(([path, body]) => [path.slice(scope.length + 1), body]))
      .filter(([name]) => !onlyNetwork || name === 'network.json');
    return entries.length > 0 && <details style={{ ...summary, marginTop: 14 }}>
      <summary style={{ cursor: 'pointer' }}>Generated files ({entries.length})</summary>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table aria-label={`Generated ${scope === 'Original' ? 'original Home' : scope} files and scope`} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead><tr>{['File', 'Scope'].map((label) => <th key={label} scope="col" style={{ padding: '8px 10px', background: oracle.surfaceAlt, borderBottom: `1px solid ${oracle.border}` }}>{label}</th>)}</tr></thead>
          <tbody>{entries.map(([name, body]) => <tr key={name}>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${oracle.border}`, overflowWrap: 'anywhere', fontSize: 12 }}><code>{name}</code></td>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${oracle.border}` }}>
              <span style={{ display: 'inline-block', padding: '3px 7px', borderRadius: 5, fontSize: 12, lineHeight: 1.4, fontWeight: 600, background: scope === 'DR' ? oracle.redTint : oracle.surfaceAlt, color: scope === 'DR' ? oracle.redDark : oracle.text }}>{generatedFileScope(name, body, scope === 'DR' ? 'DR' : 'HR')}</span>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: oracle.textMuted }}>Global resources are managed by the Home stack.</p>
    </details>;
  };
  function downloadDiagram() {
    const diagram = buildDrComparisonDiagram(model, draft);
    downloadTextFile(bundleFilename(`${name}-home-and-dr`).replace('-lz-outputs.zip', '.drawio'), toDrawioXml(diagram, 'Home and DR regions'), 'application/xml');
  }
  return <section className="studio-dr-generation" aria-label="Disaster Recovery file generation">
    <h3 style={{ margin: '0 0 10px', fontSize: 20 }}>{name}</h3>
    <p style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '0 0 22px', fontSize: 13 }}>
      {[`Realm: ${model.foundation.realm}`, `CIS Level ${model.foundation.cisLevel}`].map((value) => <span key={value} style={{ padding: '6px 10px', background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 6, color: oracle.textMuted }}>{value}</span>)}
    </p>
    <style>{`.studio-dr-generation button:focus-visible, .studio-dr-generation summary:focus-visible { outline: 3px solid ${oracle.redDark}; outline-offset: 3px; }
      .studio-dr-generation button:not(:disabled):hover { background: ${oracle.redDark} !important; }
      .studio-dr-generation-stacks h4 { line-height: 1.4; text-wrap: balance; }
      .studio-dr-generation-stacks { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-areas: "original" "updated" "dr"; gap: 16px 20px; align-items: start; }
      .studio-dr-generation-stacks[data-rpc="false"] { grid-template-areas: "original" "dr"; }
      @media (max-width: 600px) { .studio-dr-generation { --dr-card-padding: 16px; --dr-label-width: 86px; } .studio-dr-generation button { width: 100%; } }
      @media (min-width: 900px) {
        .studio-dr-generation-stacks { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-areas: "original dr" "original dr" "original dr" "original dr" "original dr" "original dr" "updated ."; }
        .studio-dr-generation-stacks[data-rpc="false"] { grid-template-areas: "original dr" "original dr" "original dr" "original dr" "original dr" "original dr"; }
        .studio-dr-generation-stacks > section:not([aria-label]) { grid-template-rows: subgrid; }
      }`}</style>
    <div className="studio-dr-generation-stacks" data-rpc={!!draft.rpcEnabled}>
      <section style={{ ...card, gridArea: 'original' }}>
        <header style={cardHeader}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 18 }}>
            <span aria-label="Step 1" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: oracle.red, color: '#fff', fontSize: 16, fontWeight: 700 }}>1</span>
            Stack 1 · Home region · without RPC
          </h4>
          <span style={{ marginLeft: 'auto', padding: '5px 9px', borderRadius: 6, background: oracle.greenFill, fontSize: 12, fontWeight: 700, color: oracle.greenDark, whiteSpace: 'nowrap' }}>✓ Already deployed</span>
        </header>
        <StackFacts values={[
          ['Region', model.foundation.region],
          ['Hub', `Hub ${model.network.hubKind.slice(-1).toUpperCase()} · ${model.network.hubVcnCidr}`],
          ['Environments', model.environments.map((env) => env.name).join(', ') || 'None'],
          ['Projects', model.projects.map((project) => project.name).join(', ') || 'None'],
          ['Platforms', options.platforms.map((option) => `${option.scope} · ${option.name}`).join(', ') || 'None'],
        ]} />
        <p style={{ ...summary, margin: 0, color: oracle.textMuted }}>Complete stack: IAM, shared compartments, governance, network, security, observability and configured platforms.</p>
        <div>
          <p style={{ ...summary, margin: 0 }}><strong>RPC: Not included · Original version</strong></p>
          <aside aria-labelledby="home-required-outputs-title" style={{ marginTop: 14, padding: '14px 16px', background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 8 }}>
            <h5 id="home-required-outputs-title" style={{ margin: '0 0 8px', fontSize: 14 }}>Required dependencies</h5>
            <p style={{ ...summary, margin: 0 }}>Enable output generation in Stack 1 (Home). Stack 2 needs these outputs as dependencies to deploy the DR resources.</p>
          </aside>
        </div>
        <div style={cardDownloads}>
        <h5 style={{ margin: '0 0 10px', fontSize: 15 }}>LZ config · Home region</h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" style={{ ...action, opacity: activeDownload === 'Original' ? 0.5 : 1 }} disabled={busy} aria-busy={activeDownload === 'Original'} onClick={() => void download('Original')}>Download LZ config</button>
        </div>
        </div>
        <div>{fileList('Original')}</div>
      </section>
      <section style={{ ...card, gridArea: 'dr', borderTop: `3px solid ${oracle.red}`, paddingTop: 20 }}>
        <header style={cardHeader}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 18 }}>
            <span aria-label={`Step ${draft.rpcEnabled ? 3 : 2}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: oracle.red, color: '#fff', fontSize: 16, fontWeight: 700 }}>{draft.rpcEnabled ? 3 : 2}</span>
            Stack 2 · DR region{!draft.rpcEnabled && ' · without RPC'}
          </h4>
          <span style={{ padding: '5px 9px', fontSize: 12, fontWeight: 700, borderRadius: 6, color: oracle.redDark, background: oracle.redTint }}>Regional stack</span>
        </header>
        <StackFacts values={[
          ['Region', draft.region || 'No region selected'],
          ['Hub', `Hub ${draft.hubKind.slice(-1).toUpperCase()} · ${draft.hubNetwork?.hubVcnCidr || 'CIDR pending'}`],
          ['Environments', projects.map((option) => draft.environmentNames?.[option.id.replace('projects:', '')] || option.scope).join(', ') || 'None selected'],
          ['Projects', model.projects.filter((project) => model.environments.some((env) => draft.projectNetworkIds.includes(`projects:${env.id}`) && (project.environments === 'all' || project.environments.includes(env.id)))).map((project) => project.name).join(', ') || 'None selected'],
          ['Platforms', platforms.map((option) => `${option.scope} · ${option.name}`).join(', ') || 'None selected'],
        ]} />
        <p style={{ ...summary, margin: 0, color: oracle.textMuted }}>Regional network, security, observability and selected platforms. IAM and governance are owned by Stack 1.</p>
        <div>
          <p style={{ ...summary, margin: 0 }}><strong>RPC: {draft.rpcEnabled ? 'Included · Requester' : 'Not included'}</strong></p>
          <aside aria-labelledby="dr-required-outputs-title" style={{ marginTop: 14, padding: '14px 16px', background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 8 }}>
            <h5 id="dr-required-outputs-title" style={{ margin: '0 0 8px', fontSize: 14 }}>Required dependencies</h5>
            <p style={{ ...summary, margin: 0 }}>{draft.rpcEnabled ? <>The DR <code>network.json</code> references the Home RPC through its network dependency output.</> : 'Use the outputs generated by Stack 1 (Home) as dependencies for this stack.'}</p>
          </aside>
        </div>
        <div style={cardDownloads}>
        <h5 style={{ margin: '0 0 10px', fontSize: 15 }}>LZ config · DR region</h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" style={{ ...action, opacity: activeDownload === 'DR' ? 0.5 : 1 }} disabled={busy} aria-busy={activeDownload === 'DR'} onClick={() => void download('DR')}>Download LZ DR config</button>
        </div>
        </div>
        <div>{fileList('DR')}</div>
      </section>
    {draft.rpcEnabled && <section aria-label="Home region including RPC" style={{ gridArea: 'updated', minWidth: 0, padding: 'var(--dr-card-padding, 20px)', border: `1px solid ${oracle.border}`, borderLeft: `4px solid ${oracle.red}`, borderRadius: 12, background: oracle.surface }}>
      <header style={cardHeader}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 18 }}>
          <span aria-label="Step 2" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: oracle.red, color: '#fff', fontSize: 16, fontWeight: 700 }}>2</span>
          Stack 1 · Home region including RPC
        </h4>
        <span style={{ padding: '5px 9px', borderRadius: 6, background: oracle.redTint, color: oracle.redDark, fontSize: 12, fontWeight: 700 }}>Requires stack update</span>
      </header>
      <section aria-labelledby="home-rpc-configuration-title" style={{ marginTop: 18 }}>
      <h5 id="home-rpc-configuration-title" style={{ margin: '0 0 16px', fontSize: 16 }}>Configuration</h5>
      <StackFacts values={[
        ['Region', model.foundation.region],
        ['RPC', 'Home acceptor, DRG attachment and routes to DR'],
        ['Network file', 'Updated network.json'],
      ]} />
      <p style={{ ...summary, color: oracle.textMuted }}>Complete stack: IAM, shared compartments, governance, network, security, observability and configured platforms. + RPC</p>
      {!draft.rpcEnabled && <p style={{ ...summary, color: oracle.textMuted }}>Downloading this updated file enables RPC for the Home and DR configurations.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button type="button" style={{ ...action, opacity: activeDownload === 'HomeNetwork' ? 0.5 : 1 }} disabled={busy} aria-busy={activeDownload === 'HomeNetwork'} onClick={() => void download('HomeNetwork')}>Download updated network file</button>
      </div>
      {draft.rpcEnabled && fileList('Home', true)}
      </section>
      <section aria-labelledby="home-rpc-update-steps-title" style={{ marginTop: 22, padding: 18, border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surfaceAlt }}>
        <h5 id="home-rpc-update-steps-title" style={{ margin: '0 0 12px', fontSize: 16 }}>Update steps</h5>
        <ol style={{ ...summary, margin: 0, paddingLeft: 20, display: 'grid', gap: 10 }}>
          <li>Replace <code>network.json</code> in the existing Home stack with the updated file.</li>
          <li>Run <strong>Plan</strong> and review the changes.</li>
          <li>Run <strong>Apply</strong> on the same Home stack.</li>
          <li>Export the updated <code>network_output.json</code> and make it available to Stack 2.</li>
        </ol>
      </section>
    </section>}
    </div>
    {progress && <p role="status" aria-live="polite" style={summary}>{progress}</p>}
    {error && <p role="alert" style={{ ...summary, color: oracle.redDark, whiteSpace: 'pre-wrap' }}>{error}</p>}
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
      <button type="button" style={action} onClick={downloadDiagram}>Download draw.io</button>
    </div>
    <aside aria-labelledby="dr-dependency-sources-title" style={{ marginTop: 22, padding: '18px 20px', background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 8 }}>
      <h4 id="dr-dependency-sources-title" style={{ margin: '0 0 12px', fontSize: 16 }}>Managing dependencies in OCI Resource Manager</h4>
      <p style={{ ...summary, margin: '0 0 12px' }}>Share the output dependency files between the Home and DR stacks using either of these sources:</p>
      <ul style={{ ...summary, margin: 0, paddingLeft: 20, display: 'grid', gap: 10 }}>
        <li><strong>Private OCI Object Storage buckets.</strong> Store the Stack 1 outputs in a Home-region bucket and replicate the required dependency files to a bucket in the DR region. Configure Stack 2 to read the replicated files.</li>
        <li><strong>Private GitHub repository.</strong> Store the generated output dependency files in a private repository and configure Stack 2 to read them from that repository.</li>
      </ul>
    </aside>
  </section>;
}
