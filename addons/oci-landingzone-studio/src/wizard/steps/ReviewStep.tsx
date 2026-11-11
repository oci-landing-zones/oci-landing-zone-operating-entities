/**
 * ReviewStep — step 6 ("Review"). Summarises the model, then runs the *real* OCI
 * landing-zone jsonnet generator over the config the wizard has been building and
 * packages the resulting artifacts as one complete ZIP download.
 *
 * The generator is upstream's own `gen/` jsonnet, evaluated by go-jsonnet compiled
 * to WebAssembly — the same computation `gen/generate.sh` runs on the command line,
 * just in the browser. Nothing here reimplements it, so the outputs are the outputs.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { toDrawioPagesXml, toDrawioXml } from '../../export/toDrawio';
import { createDiagramGraph, REVIEW_DIAGRAM_OPTIONS } from '../diagramGraph';
import { loadDiagramPreview } from '../../services/diagramPreview';
import { downloadTextFile } from '../../export/download';
import { validatePlatformContracts } from '../../services/platformValidation';
import { reconcileExadata, validateExadataModel } from '../../services/exadata';
import { exadataReadiness, platformReadiness } from '../../services/platformReadiness';
import { validateNotificationEmails } from '../../services/notificationEmails';
import { validateCostGovernance } from '../../services/costGovernance';
import { costCenterCoverageError, type UncoveredCostResource } from '../../services/costCenterCoverage';
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


  links: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 8, fontSize: 12.5 },
};

const RESOURCE_MANAGER_CREATE_STACK_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-stack.htm';
const RESOURCE_MANAGER_PLAN_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-job-plan.htm';
const RESOURCE_MANAGER_APPLY_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-job-apply.htm';

function Setting({ name, value }: { name: string; value?: string | boolean }) {
  return (
    <code className="required-setting">
      <span className="required-setting-name">{name}</span>
      {value !== undefined && <><span className="required-setting-equals"> = </span><span className="required-setting-value">{typeof value === 'boolean' ? String(value) : <>&quot;{value}&quot;</>}</span></>}
    </code>
  );
}

function DeploymentText({ text }: { text: string }) {
  return <>{text.split(/`([^`]+)`/g).map((part, index) => {
    if (index % 2 === 0) return part;
    if (/^[\w./-]+\.(?:json|jsonnet|tfvars|tfplan|txt)$/.test(part)) {
      return <code className="deployment-file" key={index}>{part}</code>;
    }
    const setting = /^([a-z][a-z0-9_]*)(?: = ("[^"]*"|true|false))?$/.exec(part);
    if (setting) {
      const raw = setting[2];
      const value = raw === undefined ? undefined : raw.startsWith('"') ? raw.slice(1, -1) : raw === 'true';
      return <Setting key={index} name={setting[1]} value={value} />;
    }
    return <code className="deployment-code" key={index}>{part}</code>;
  })}</>;
}

export default function ReviewStep({ designName, getDiagram, diagramReady = true, generatedFiles, uncoveredCostResources }: { designName: string; getDiagram?: () => DiagramModel; diagramReady?: boolean; generatedFiles?: readonly string[]; uncoveredCostResources?: readonly UncoveredCostResource[] }) {
  const { model, homeSource } = useWizard();
  const regional = model.foundation.stackScope === 'regional';
  const { id } = useParams();
  const [busy, setBusy] = useState(false);
  const [diagramBusy, setDiagramBusy] = useState(false);
  const diagramRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { diagramRequest.current?.abort(); }, [model, homeSource]);
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
    const coverageError = costCenterCoverageError(uncoveredCostResources ?? [], model);
    return [...new Set([
      ...(shortNameError ? [shortNameError] : []),
      ...validatePlatformContracts(model), ...validateExadataModel(model),
      ...validateNotificationEmails(model.foundation.notifications, regional),
      ...validateCostGovernance(model),
      ...(coverageError ? [coverageError] : []),
      ...validateHybridConnectivity(model), ...validateRemotePeering(model), ...validateRegionalDeployment(model),
      ...platformReadiness(model, 'oke_simple').errors,
    ])];
  }, [model, regional, uncoveredCostResources]);
  const hasSecrets = containsInlineSecrets(model.hybridConnectivity);
  const prerequisites = deploymentPrerequisites(deploymentConfig);
  const handover = deploymentHandover(deploymentConfig);
  const stale = result !== null && (!isCurrentOutputSet(result, configText)
    || !Object.hasOwn(result.files, completionNetwork(deploymentConfig)));
  const deployFiles = generatedFiles ? [...generatedFiles] : result && !stale
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

  async function downloadDrawio() {
    const filename = bundleFilename(designName).replace(/-lz-outputs\.zip$/, '.drawio');
    const controller = new AbortController();
    diagramRequest.current?.abort();
    diagramRequest.current = controller;
    setDiagramBusy(true);
    setError(null);
    try {
      if (!getDiagram) throw new Error('Wait for the current diagram preview before exporting.');
      const diagram = getDiagram();
      let xml: string;
      if (regional && homeSource) {
        if (!homeSource.model) throw new Error('The linked Home Region design is unavailable. Restore it before exporting both diagrams.');
        const homeModel = reconcileExadata(homeSource.model);
        const preview = await loadDiagramPreview(homeModel, controller.signal);
        if (controller.signal.aborted) return;
        const homeDiagram = createDiagramGraph(homeModel, preview)(5, REVIEW_DIAGRAM_OPTIONS);
        xml = toDrawioPagesXml([{ name: 'DR', diagram }, { name: 'Home Region', diagram: homeDiagram }]);
      } else {
        xml = toDrawioXml(diagram, regional ? 'DR' : 'Landing Zone');
      }
      if (!controller.signal.aborted) downloadTextFile(filename, xml, 'application/xml');
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (diagramRequest.current === controller) {
        diagramRequest.current = null;
        setDiagramBusy(false);
      }
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
            <button type="button" style={local.secondary} onClick={downloadDrawio} disabled={!diagramReady || !getDiagram || diagramBusy}>
              {diagramBusy ? 'Preparing diagram…' : 'Export diagram (.drawio)'}
            </button>
          </div>

          {regional && <p style={s.help}>{homeSource
            ? 'The .drawio file includes separate DR and Home Region pages. The linked Home Region design must be available.'
            : 'This standalone DR design has no linked Home Region. Its export contains only the DR diagram.'}</p>}
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
          <div className="deployment-step">
            <h3>1. Prepare the files</h3>
            {regional && homeSource && <p><Link className="guide-link" to={`/lz/${homeSource.id}?step=review`} target="_blank" rel="noreferrer">Open Home Region Review ↗</Link> to follow its deployment steps.</p>}
            <ul className="deployment-list">
              {prerequisites.map((step) => <li key={step}><DeploymentText text={step} /></li>)}
              <li>{PRIVATE_SOURCE_STEP}</li>
              <li>Upload only the generated deployment JSON files; do not mix them with published blueprint files.</li>
            </ul>
          </div>
          <div className="deployment-step">
            <h3>2. Create and apply phase 1</h3>
            <p>Open <a className="guide-link" href={DEPLOY_TO_OCI_URL} target="_blank" rel="noreferrer">Deploy to OCI ↗</a> for a prefilled <strong>Create Stack</strong> wizard using the Landing Zone Orchestrator and private Object Storage configuration source. Select <code className="deployment-code">rms-facade</code> as the working directory.</p>
            <p>In the stack variables, confirm <Setting name="configuration_source" value="ocibucket" />. Enter your bucket name in <Setting name="oci_configuration_bucket" /> and set <Setting name="oci_configuration_objects" /> to exactly these phase 1 files:</p>
            <ul className="deployment-files" aria-label="Phase 1 files">{firstStage.files.map((file) => <li key={file}><code className="deployment-file">{file}</code></li>)}</ul>
            {deploymentSettings(deploymentConfig).map((step) => <p key={step}><DeploymentText text={step} /></p>)}
            <p>{APPLY_STEP}</p>
          </div>
          <div className="deployment-step">
            <h3>3. Update and apply phase 2</h3>
            {model.network.hubKind === 'hub_c' && <ul className="deployment-list">
              {HUB_C_BACKEND_STEPS.map((step) => <li key={step}><DeploymentText text={step} /></li>)}
            </ul>}
            <p>In the same stack, edit the variables. Replace <Setting name="oci_configuration_objects" /> with exactly these phase 2 files. The final security and observability files replace their <code className="deployment-code">_pre</code> counterparts:</p>
            <ul className="deployment-files" aria-label="Phase 2 files">{secondStage.files.map((file) => <li key={file}><code className="deployment-file">{file}</code></li>)}</ul>
            <p>{UPDATE_STEP}</p>
            {deploymentOutputs(deploymentConfig).map((step) => <p key={step}><DeploymentText text={step} /></p>)}
          </div>
          {handover.length > 0 && <div className="deployment-step">
            <h3>4. Complete external setup</h3>
            <ul className="deployment-list">{handover.map((step) => <li key={step}>{step}</li>)}</ul>
            {Object.keys(model.hybridConnectivity?.ipsecs ?? {}).length > 0 && <p><a className="guide-link" href="https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm" target="_blank" rel="noreferrer">Oracle VPN setup</a></p>}
            {(Object.values(model.hybridConnectivity?.fast_connect_virtual_circuits ?? {}).some((circuit) => circuit.provision_fc_virtual_circuit !== false) || Object.keys(model.hybridConnectivity?.cross_connect_groups ?? {}).length > 0) && <p><a className="guide-link" href="https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectoverview.htm" target="_blank" rel="noreferrer">Oracle FastConnect setup</a></p>}
          </div>}
          <details className="deployment-step deployment-alternative">
            <summary>Updating an existing landing zone</summary>
            <p>{EXISTING_DEPLOYMENT_STEP}</p>
          </details>
          <details className="deployment-step deployment-alternative">
            <summary>Terraform CLI or CI/CD alternative</summary>
            <p>Use the same phase file lists and applicable prerequisites above. Replace the Resource Manager actions with this sequence:</p>
            <ol className="deployment-list">{deploymentCliSteps(deploymentConfig).map((step) => <li key={step}><DeploymentText text={step} /></li>)}</ol>
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
