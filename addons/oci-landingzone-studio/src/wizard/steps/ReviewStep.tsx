/**
 * ReviewStep — step 5 ("Review"). Summarises the model, then runs the *real* OCI
 * landing-zone jsonnet generator over the config the wizard has been building and
 * packages the resulting artifacts as one complete ZIP download.
 *
 * The generator is upstream's own `gen/` jsonnet, evaluated by go-jsonnet compiled
 * to WebAssembly — the same computation `gen/generate.sh` runs on the command line,
 * just in the browser. Nothing here reimplements it, so the outputs are the outputs.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { useWizard } from '../wizardContext';
import { containsInlineSecrets, validateHybridConnectivity } from '../../services/hybridConnectivity';
import { oracle } from '../../theme';
import { s } from './networkEditorStyles';
import { buildConfig, serializeConfig } from '../../services/lzConfig';
import { getHubKind } from '../../services/hubKinds';
import { getOutputs, saveOutputs } from '../../services/lzStore';
// The generator drags in ~0.7 MB of vendored jsonnet, so it is imported on demand
// inside `run()`. Only its names — a dependency-free module — are imported here.
import { CONFIG_FILENAME, deploymentStages, isCurrentOutputSet } from '../../generator/outputNames';
import { bundleFilename, downloadBlob, zipTextFiles } from '../../export/zip';
import { toDrawioXml } from '../../export/toDrawio';
import { downloadTextFile } from '../../export/download';
import { validatePlatformContracts } from '../../services/platformValidation';
import { validateExadataModel } from '../../services/exadata';
import { exadataReadiness, platformReadiness } from '../../services/platformReadiness';
import { validateNotificationEmails } from '../../services/notificationEmails';
import { validateRemotePeering } from '../../services/remotePeering';
import { validateRegionalDeployment } from '../../services/regionalDeployment';
import { regionShortNameError } from '../../services/regions';
import {
  APPLY_STEP, DEPLOY_TO_OCI_URL, EXISTING_DEPLOYMENT_STEP, HUB_C_BACKEND_STEPS, ORCHESTRATOR_VERSION, UPDATE_STEP,
  ORCHESTRATOR_URL as LANDING_ZONE_ORCHESTRATOR_URL,
  ORCHESTRATOR_RELEASE_URL as LANDING_ZONE_ORCHESTRATOR_RELEASE_URL,
  PRIVATE_SOURCE_STEP, RESOURCE_MANAGER_STACKS_URL, completionNetwork,
  deploymentCliSteps, deploymentHandover, deploymentOutputs, deploymentPrerequisites, deploymentReadme, deploymentSettings, expectedDeploymentFiles,
} from '../../services/deployment';
import { ErrorNotice } from '../../components/FieldError';
import type { DiagramModel } from '../../model/types';

interface RunResult {
  config: string;
  files: Record<string, string>;
}

function splitOutputs(config: string, files: Record<string, string>): RunResult {
  return { config, files };
}

const local: Record<string, CSSProperties> = {
  note:      { ...s.intro, lineHeight: 1.6, marginBottom: 16 },
  sumGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0 24px', margin: '8px 0 12px' },
  sumCell:   { padding: '10px 0', borderBottom: `1px solid ${oracle.border}`, minWidth: 0 },
  sumLabel:  { fontSize: 13, color: oracle.textMuted, marginBottom: 3 },
  sumValue:  { fontSize: 15, fontWeight: 600, color: oracle.ink, margin: 0, overflowWrap: 'anywhere' },
  counts:    { display: 'flex', flexWrap: 'wrap', gap: '6px 20px', padding: 0, margin: '0 0 24px', listStyle: 'none', fontSize: 13, lineHeight: 1.5, color: oracle.textMuted },

  runRow:    { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 18, marginBottom: 8 },
  primary:   { padding: '11px 20px', fontSize: 13.5, fontWeight: 800, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  primaryOff:{ opacity: 0.55 },
  secondary: { padding: '11px 20px', fontSize: 13.5, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontFamily: 'inherit' },
  stale:     { display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px', border: `1px solid ${oracle.borderStrong}`, background: oracle.surfaceAlt, borderRadius: 6, fontSize: 12.5, color: oracle.text, margin: '14px 0 0' },


  fileList: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  ordered: { margin: '12px 0 0 20px', padding: 0, color: oracle.text, fontSize: 14, lineHeight: 1.6 },
  links: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 8, fontSize: 12.5 },
  guide: { marginTop: 16, padding: 16, border: `1px solid ${oracle.borderStrong}`, borderRadius: 6, background: oracle.surfaceAlt, fontSize: 14, lineHeight: 1.6 },
  guideTitle: { fontSize: 14, lineHeight: 1.5, fontWeight: 700, color: oracle.ink, margin: 0 },
};

const RESOURCE_MANAGER_CREATE_STACK_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-stack.htm';
const RESOURCE_MANAGER_PLAN_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-job-plan.htm';
const RESOURCE_MANAGER_APPLY_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-job-apply.htm';

function Setting({ name, value }: { name: string; value?: string }) {
  return (
    <code className="required-setting">
      <span className="required-setting-name">{name}</span>
      {value && <><span className="required-setting-equals"> = </span><span className="required-setting-value">&quot;{value}&quot;</span></>}
    </code>
  );
}

function DeploymentText({ text }: { text: string }) {
  return <>{text.split(/`([^`]+)`/g).map((part, index) => index % 2
    ? <code className="required-setting" key={index}>{part}</code> : part)}</>;
}

export default function ReviewStep({ designName, getDiagram, diagramReady = true }: { designName: string; getDiagram?: () => DiagramModel; diagramReady?: boolean }) {
  const { model } = useWizard();
  const regional = model.foundation.stackScope === 'regional';
  const { id } = useParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Show the last generated file list when returning to Review.
  const [result, setResult] = useState<RunResult | null>(() => {
    const saved = id ? getOutputs(id) : null;
    return saved ? splitOutputs(saved.config, saved.files) : null;
  });

  const configText = useMemo(() => serializeConfig(model), [model]);
  const deploymentConfig = useMemo(() => buildConfig(model), [model]);
  const currentConfig = useRef(configText);
  useEffect(() => { currentConfig.current = configText; }, [configText]);
  const hub = getHubKind(model.network.hubKind);
  const exacc = exadataReadiness(model, 'exacc');
  const exacs = exadataReadiness(model, 'exacs');
  const contractErrors = useMemo(() => {
    const shortNameError = regionShortNameError(model.foundation.regionShortName);
    return [...new Set([
      ...(shortNameError ? [shortNameError] : []),
      ...validatePlatformContracts(model), ...validateExadataModel(model),
      ...validateNotificationEmails(model.foundation.notifications, regional),
      ...validateHybridConnectivity(model), ...validateRemotePeering(model), ...validateRegionalDeployment(model),
      ...platformReadiness(model, 'oke_simple').errors,
    ])];
  }, [model, regional]);
  const hasSecrets = containsInlineSecrets(model.hybridConnectivity);
  const prerequisites = deploymentPrerequisites(deploymentConfig);
  const handover = deploymentHandover(deploymentConfig);
  const stale = result !== null && (!isCurrentOutputSet(result, configText)
    || !Object.hasOwn(result.files, completionNetwork(deploymentConfig)));
  const deployFiles = result && !stale
    ? Object.keys(result.files)
    : expectedDeploymentFiles(deploymentConfig);
  const deployStages = deploymentStages(deployFiles, completionNetwork(deploymentConfig));
  const [firstStage, secondStage] = deployStages;

  function downloadResult(runResult: RunResult) {
    downloadBlob(
      bundleFilename(designName),
      zipTextFiles({ [CONFIG_FILENAME]: runResult.config, ...runResult.files,
        'README.txt': deploymentReadme(buildConfig(model), Object.keys(runResult.files)) }),
    );
  }

  async function run(): Promise<RunResult | null> {
    setBusy(true);
    setError(null);
    try {
      const { generateOutputs } = await import('../../generator/generate');
      const out = await generateOutputs(model);
      if (out.config !== currentConfig.current) {
        throw new Error('The model changed while generating. Review the updated design and try again.');
      }
      setResult(out);
      // Persist so the saved-builds overview can offer the artifacts too.
      if (id) {
        const persisted = saveOutputs(id, { config: out.config, files: out.files });
        if (!persisted.ok) setError(persisted.message ?? 'The ZIP was downloaded, but could not be retained in this browser.');
      }
      return out;
    } catch (err) {
      // Keep the previous snapshot; download eligibility still checks config and output format.
      setError(hasSecrets ? 'Generation failed. Check connectivity settings and required fields; secret values are omitted from diagnostics.' : err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function generateAndDownload() {
    if (busy) return;
    if (contractErrors.length > 0) {
      setError(contractErrors.join('\n'));
      return;
    }
    const generated = await run();
    if (generated && isCurrentOutputSet(generated, currentConfig.current)) downloadResult(generated);
  }

  function downloadDrawio() {
    const filename = bundleFilename(designName).replace(/-lz-outputs\.zip$/, '.drawio');
    setError(null);
    try {
      if (!getDiagram) throw new Error('Wait for the current diagram preview before exporting.');
      downloadTextFile(filename, toDrawioXml(getDiagram()), 'application/xml');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  const envCount = model.environments.filter((e) => e.name.trim()).length;

  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <h2 style={s.title}>Review your landing zone</h2>
          {regional && <p style={local.note}><strong>DR regional stack.</strong> IAM, governance, Cloud Guard and Security Zones are excluded from this download.</p>}
          <dl className="review-summary-grid" style={local.sumGrid}>
            {[
              ['Deployment', regional ? 'DR' : 'Home Region'],
              ['Region', model.foundation.region],
              ['CIS benchmark', `Level ${model.foundation.cisLevel}`],
              ['Hub', hub?.label ?? model.network.hubKind],
            ].map(([label, value]) => (
              <div key={label} style={local.sumCell}>
                <dt style={local.sumLabel}>{label}</dt>
                <dd style={local.sumValue}>{value}</dd>
              </div>
            ))}
          </dl>
          <ul style={local.counts} aria-label="Workloads and realm">
            <li>Realm {model.foundation.realm.toUpperCase()}</li>
            <li>{envCount} {envCount === 1 ? 'environment' : 'environments'}</li>
            <li>{model.projects.length} {model.projects.length === 1 ? 'project' : 'projects'}</li>
            {model.platforms.length > 0 && <li>{model.platforms.length} environment platforms</li>}
            {model.sharedPlatforms.length > 0 && <li>{model.sharedPlatforms.length} shared platforms</li>}
            {model.exadata.exacc.enabled && <li>EXACC: {exacc.status}</li>}
            {model.exadata.exacs.enabled && <li>EXACS: {exacs.status}</li>}
          </ul>

          <h3 style={{ ...s.title, fontSize: 16 }}>Download deployment files</h3>
          {hasSecrets && <p role="note">This download contains the secret values entered in this session. Store it privately. Secret values and these generated files are not retained in browser storage.</p>}
          <div style={local.note}>
            Download this design and its deployment files as a ZIP. Review the files and replace placeholders before deploying.
          </div>
          {contractErrors.length > 0 && (
            <ErrorNotice title="Complete these settings before downloading">
              <ul>{contractErrors.map((message) => <li key={message}>{message}</li>)}</ul>
            </ErrorNotice>
          )}

          <div style={local.runRow}>
            <button
              type="button"
              style={busy || contractErrors.length > 0 ? { ...local.primary, ...local.primaryOff, cursor: busy ? 'progress' : 'not-allowed' } : local.primary}
              onClick={generateAndDownload}
              disabled={busy || contractErrors.length > 0}
            >
              {busy ? 'Preparing download…' : 'Download files'}
            </button>
            <button type="button" style={local.secondary} onClick={downloadDrawio} disabled={!diagramReady || !getDiagram}>
              Export diagram (.drawio)
            </button>
          </div>

          {!diagramReady && <p role="status" style={local.note}>Diagram export is waiting for the current preview.</p>}

          {error && (
            <ErrorNotice title="Could not prepare the download">{error}</ErrorNotice>
          )}
        </div>
      </section>

      <section className="deployment-guide" style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <h2 style={s.title}>Deploy with OCI Resource Manager</h2>
          <div style={local.note}>
            Resource Manager runs the <a className="guide-link" href={LANDING_ZONE_ORCHESTRATOR_RELEASE_URL} target="_blank" rel="noreferrer">Landing Zone Orchestrator {ORCHESTRATOR_VERSION} ↗</a> with your generated JSON files. Follow these steps in order, using the same stack for both phases.
          </div>
          {(!result || stale) && <p style={local.note}>File lists are a preview of this design. Download the current files before deployment.</p>}
          <div style={local.guide}>
            <h3 style={local.guideTitle}>1. Prepare the files</h3>
            <ul style={local.ordered}>
              {prerequisites.map((step) => <li key={step}><DeploymentText text={step} /></li>)}
              <li>{PRIVATE_SOURCE_STEP}</li>
              <li><code className="required-setting">{CONFIG_FILENAME}</code> is the design source. Diagram exports are review artifacts. Upload only the generated deployment JSON files; do not mix them with published blueprint files.</li>
            </ul>
          </div>
          <div style={local.guide}>
            <h3 style={local.guideTitle}>2. Create and apply phase 1</h3>
            <ul style={local.ordered}>
              <li>Open <a className="guide-link" href={DEPLOY_TO_OCI_URL} target="_blank" rel="noreferrer">Deploy to OCI ↗</a> for a prefilled <strong>Create Stack</strong> wizard using the Landing Zone Orchestrator and private Object Storage configuration source. Select <code className="required-setting">rms-facade</code> as the working directory.</li>
              <li>In the stack variables, confirm <Setting name="configuration_source" value="ocibucket" />. Enter your bucket name in <Setting name="oci_configuration_bucket" /> and set <Setting name="oci_configuration_objects" /> to exactly these phase 1 files:
                <div style={local.fileList}>{firstStage.files.map((file) => <code key={file} className="required-setting">{file}</code>)}</div>
              </li>
              {deploymentSettings(deploymentConfig).map((step) => <li key={step}><DeploymentText text={step} /></li>)}
              <li>{APPLY_STEP}</li>
            </ul>
          </div>
          <div style={local.guide}>
            <h3 style={local.guideTitle}>3. Update and apply phase 2</h3>
            <ul style={local.ordered}>
              {model.network.hubKind === 'hub_c' && HUB_C_BACKEND_STEPS.map((step) => <li key={step}><DeploymentText text={step} /></li>)}
              <li>In the same stack, edit the variables. Replace <Setting name="oci_configuration_objects" /> with exactly these phase 2 files. The final security and observability files replace their <code className="required-setting">_pre</code> counterparts:
                <div style={local.fileList}>{secondStage.files.map((file) => <code key={file} className="required-setting">{file}</code>)}</div>
              </li>
              <li>{UPDATE_STEP}</li>
              {deploymentOutputs(deploymentConfig).map((step) => <li key={step}><DeploymentText text={step} /></li>)}
            </ul>
          </div>
          {handover.length > 0 && <div style={local.guide}>
            <h3 style={local.guideTitle}>4. Complete external setup</h3>
            <ul style={local.ordered}>{handover.map((step) => <li key={step}>{step}</li>)}</ul>
            {Object.keys(model.hybridConnectivity?.ipsecs ?? {}).length > 0 && <p><a className="guide-link" href="https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm" target="_blank" rel="noreferrer">Oracle VPN setup</a></p>}
            {(Object.values(model.hybridConnectivity?.fast_connect_virtual_circuits ?? {}).some((circuit) => circuit.provision_fc_virtual_circuit !== false) || Object.keys(model.hybridConnectivity?.cross_connect_groups ?? {}).length > 0) && <p><a className="guide-link" href="https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectoverview.htm" target="_blank" rel="noreferrer">Oracle FastConnect setup</a></p>}
          </div>}
          <details style={local.guide}>
            <summary style={{ ...local.guideTitle, cursor: 'pointer', minHeight: 44, padding: '12px 0', boxSizing: 'border-box' }}>Updating an existing landing zone</summary>
            <p>{EXISTING_DEPLOYMENT_STEP}</p>
          </details>
          <details style={local.guide}>
            <summary style={{ ...local.guideTitle, cursor: 'pointer', minHeight: 44, padding: '12px 0', boxSizing: 'border-box' }}>Terraform CLI or CI/CD alternative</summary>
            <p>Use the same phase file lists and applicable prerequisites above. Replace the Resource Manager actions with this sequence:</p>
            <ol style={local.ordered}>{deploymentCliSteps(deploymentConfig).map((step) => <li key={step}><DeploymentText text={step} /></li>)}</ol>
          </details>
          <div className="deployment-links-heading">OCI Resource Manager resources</div>
          <div className="deployment-links" style={local.links} aria-label="OCI Resource Manager resources">
            <a href={RESOURCE_MANAGER_STACKS_URL} target="_blank" rel="noreferrer"><span>Open Resource Manager stacks</span><span aria-hidden="true">↗</span></a>
            <a href={RESOURCE_MANAGER_CREATE_STACK_GUIDE_URL} target="_blank" rel="noreferrer"><span>Read: create a stack</span><span aria-hidden="true">↗</span></a>
            <a href={RESOURCE_MANAGER_PLAN_GUIDE_URL} target="_blank" rel="noreferrer"><span>Read: plan a deployment</span><span aria-hidden="true">↗</span></a>
            <a href={RESOURCE_MANAGER_APPLY_GUIDE_URL} target="_blank" rel="noreferrer"><span>Read: apply a deployment</span><span aria-hidden="true">↗</span></a>
            <a href={LANDING_ZONE_ORCHESTRATOR_URL} target="_blank" rel="noreferrer"><span>Landing Zone Orchestrator source</span><span aria-hidden="true">↗</span></a>
            <a href="https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/managingconfigurationsourceproviders.htm" target="_blank" rel="noreferrer"><span>Read: private configuration sources</span><span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}
