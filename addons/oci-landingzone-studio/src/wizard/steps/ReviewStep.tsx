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
import { isCurrentOutputSet } from '../../generator/outputNames';
import { bundleFilename, downloadBlob, zipTextFiles } from '../../export/zip';
import { toDrawioPagesXml, toDrawioXml } from '../../export/toDrawio';
import { createDiagramGraph, REVIEW_DIAGRAM_OPTIONS } from '../diagramGraph';
import { loadDiagramPreview } from '../../services/diagramPreview';
import { downloadTextFile } from '../../export/download';
import { validatePlatformContracts } from '../../services/platformValidation';
import { reconcileExadata, validateExadataModel } from '../../services/exadata';
import { exadataReadiness, platformReadiness } from '../../services/platformReadiness';
import { validateCloudGuard } from '../../services/cloudGuard';
import { validateNotificationEmails } from '../../services/notificationEmails';
import { validateCostGovernance } from '../../services/costGovernance';
import { costCenterCoverageError, type UncoveredCostResource } from '../../services/costCenterCoverage';
import { validateRemotePeering } from '../../services/remotePeering';
import { validateRegionalDeployment } from '../../services/regionalDeployment';
import { BASTION_DOCUMENTATION_URL, validateBastion } from '../../services/bastion';
import { regionShortNameError } from '../../services/regions';
import {
  plannedDeploymentStages, APPLY_STEP, DEPLOY_TO_OCI_URL, EXISTING_DEPLOYMENT_STEP, HUB_C_BACKEND_STEPS, ORCHESTRATOR_VERSION, UPDATE_STEP,
  ORCHESTRATOR_URL as LANDING_ZONE_ORCHESTRATOR_URL,
  ORCHESTRATOR_RELEASE_URL as LANDING_ZONE_ORCHESTRATOR_RELEASE_URL,
  PRIVATE_SOURCE_STEP, RESOURCE_MANAGER_STACKS_URL, completionNetwork, DEPLOYMENT_UPDATE_NOTICE,
  deploymentCliSteps, deploymentHandover, deploymentOutputs, deploymentPrerequisites, deploymentSettings, expectedDeploymentFiles,
} from '../../services/deployment';
import { ErrorNotice } from '../../components/FieldError';
import type { DiagramModel } from '../../model/types';
import { deploymentDownloadFiles, homePrimaryDeploymentPlan, shouldSplitHomePrimary, primaryRuntimeRequirements, type HomePrimaryDeployment } from '../../services/homePrimaryDeployment';

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

function HomePrimaryGuide({ operations }: { operations: HomePrimaryDeployment[] }) {
  const secondaryRegion = operations[1]?.config.dr_region;
  return <>
    <p style={local.note}>This package is for a new installation. It does not automatically migrate resources or existing Terraform state. The root <code className="deployment-file">config.jsonnet</code> preserves the editable Studio design; each deployment folder contains its own reproducible source and README.</p>
    {secondaryRegion && <p style={local.note}>This download contains Home and Primary. Deploy Secondary in {secondaryRegion} third using its separate linked design and ZIP, after both stacks complete.</p>}
    {operations.map((operation, operationIndex) => {
      const home = operation.name === 'Home';
      const runtime = primaryRuntimeRequirements(operation.config);
      return <section className="deployment-step" key={operation.name} aria-label={`${operation.name} stack deployment`}>
        <h3>{operationIndex + 1}. Deploy {operation.name} — {operation.config.region}</h3>
        <p>Use <code className="deployment-file">{operation.folder}/</code> in a separate {operation.name} stack and Terraform state. {home ? 'Home creates shared IAM, governance and Home controls, without networks or workloads.' : 'Start after all Home phases succeed. Primary creates regional networks, controls and workloads.'}</p>
        <p>Review this folder’s generated JSON files and upload them to your private Object Storage bucket. Open <a className="guide-link" href={DEPLOY_TO_OCI_URL} target="_blank" rel="noreferrer">Deploy to OCI ↗</a>, select <code className="deployment-code">rms-facade</code> as the working directory and set the stack region to {operation.config.region}.</p>
        <p>Confirm <Setting name="configuration_source" value="ocibucket" />, enter your private bucket in <Setting name="oci_configuration_bucket" /> and select exactly the phase files below in <Setting name="oci_configuration_objects" />. Keep source configs and runtime dependencies out of that list.</p>
        {home ? <p>Set <Setting name="save_output" value={true} />. When Home completes, retain <code className="deployment-file">compartments_output.json</code> for Primary. This runtime output is produced during deployment and is not in the download.</p>
          : <><p>Copy only <code className="deployment-file">compartments_output.json</code> from completed Home to the Primary stack’s private configuration bucket. {runtime.externalRpc && <>Also copy <code className="deployment-file">network_output.json</code> from the completed external RPC acceptor to that bucket. </>}Set <Setting name="oci_dependency_objects" /> to <code className="deployment-code">{runtime.externalRpc ? '["compartments_output.json", "network_output.json"]' : '["compartments_output.json"]'}</code>.</p><p>Primary retains Security Zones, regional keys and their key-specific IAM grants, including policies managed with the <code className="deployment-code">oci.home</code> provider alias.</p></>}
        {!home && runtime.outputConsumers.length > 0 && <p>Set <Setting name="save_output" value={true} /> and retain <code className="deployment-file">network_output.json</code> for {runtime.outputConsumers.join(' and ')} after Primary completes.</p>}
        {operation.stages.map((stage, index) => <div className="deployment-step" key={stage.title}>
          <h4>{operation.name} phase {index + 1}: {stage.title.replace(/^\d+\. /, '')}</h4>
          <p>{stage.description}</p>
          {!home && index > 0 && operation.config.hub.kind === 'hub_c' && <ul className="deployment-list">{HUB_C_BACKEND_STEPS.map((step) => <li key={step}><DeploymentText text={step} /></li>)}</ul>}
          <ul className="deployment-files" aria-label={`${operation.name} phase ${index + 1} files`}>{stage.files.map((file) => <li key={file}><code className="deployment-file">{file}</code></li>)}</ul>
          <p>{index === 0 ? 'Create without running an apply. Run Plan, review correctness, security and compliance, then Apply. Wait for success before continuing.' : 'In this same stack, replace oci_configuration_objects with the exact phase list above. Run Plan, review, then Apply. Wait for success before continuing.'}</p>
        </div>)}
        <details className="deployment-step deployment-alternative">
          <summary>{operation.name}: Terraform CLI or CI/CD alternative</summary>
          <ol className="deployment-list">
            <li>Download Orchestrator {ORCHESTRATOR_VERSION} and use <code className="deployment-code">rms-facade</code> with approved OCI authentication and a separate Terraform state for this {operation.name} stack.</li>
            <li>In private <code className="deployment-file">deployment.tfvars</code>, set <Setting name="configuration_source" value="file" />, <Setting name="tenancy_ocid" /> and <Setting name="region" value={operation.config.region} />. Set <Setting name="local_config_file_paths" /> to absolute paths for this stack’s phase 1 files.</li>
            <li>{home ? <>Set <Setting name="save_output" value={true} /> and retain the locally generated <code className="deployment-file">compartments_output.json</code> for Primary.</> : <>Set <Setting name="local_dependency_file_paths" /> to the absolute {runtime.externalRpc ? 'paths' : 'path'} of <code className="deployment-file">compartments_output.json</code> from completed Home{runtime.externalRpc && <> and <code className="deployment-file">network_output.json</code> from the completed external RPC acceptor</>}.</>}</li>
            {!home && runtime.outputConsumers.length > 0 && <li>Set <Setting name="save_output" value={true} /> and retain the locally generated <code className="deployment-file">network_output.json</code> for {runtime.outputConsumers.join(' and ')}.</li>}
            <li>Run <code className="deployment-code">terraform init</code>, then <code className="deployment-code">terraform plan -var-file=deployment.tfvars -out=deployment.tfplan</code>. Review the plan, then run <code className="deployment-code">terraform apply deployment.tfplan</code>.</li>
            {operation.stages.length > 1 && <li>After phase 1 succeeds, replace <Setting name="local_config_file_paths" /> with the phase 2 list. Plan, review and apply again using this same stack and state.</li>}
          </ol>
        </details>
      </section>;
    })}
    {secondaryRegion && <section className="deployment-step" aria-label="Secondary stack deployment">
      <h3>3. Deploy Secondary — {secondaryRegion}</h3>
      <p>Open its separate linked design and ZIP after Home and Primary complete. Use <code className="deployment-file">compartments_output.json</code> from Home and <code className="deployment-file">network_output.json</code> from Primary as runtime dependencies for that separate Secondary stack.</p>
    </section>}
    {operations[1] && deploymentHandover(operations[1].config).length > 0 && <div className="deployment-step"><h3>Complete external setup</h3><ul className="deployment-list">{deploymentHandover(operations[1].config).map((step) => <li key={step}>{step}</li>)}</ul></div>}
  </>;
}

export default function ReviewStep({ designName, getDiagram, diagramReady = true, generatedFiles, uncoveredCostResources }: { designName: string; getDiagram?: () => DiagramModel; diagramReady?: boolean; generatedFiles?: readonly string[]; uncoveredCostResources?: readonly UncoveredCostResource[] }) {
  const { model, homeSource } = useWizard();
  const regional = model.foundation.stackScope === 'regional';
  const splitHomePrimary = shouldSplitHomePrimary(model);
  const [packaged, setPackaged] = useState<{ config: string; files: Record<string, string> } | null>(null);
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
      ...validateBastion(model), ...validateCloudGuard(model),
      ...validateNotificationEmails(model.foundation.notifications, regional, model.foundation.cloudGuardEnabled !== false),
      ...validateCostGovernance(model),
      ...(coverageError ? [coverageError] : []),
      ...validateHybridConnectivity(model), ...validateRemotePeering(model), ...validateRegionalDeployment(model, homeSource?.model),
      ...platformReadiness(model, 'oke_simple').errors,
    ])];
  }, [model, regional, uncoveredCostResources, homeSource?.model]);
  const hasSecrets = containsInlineSecrets(model.hybridConnectivity);
  const prerequisites = deploymentPrerequisites(deploymentConfig);
  const handover = deploymentHandover(deploymentConfig);
  const stale = result !== null && (!isCurrentOutputSet(result, configText)
    || !Object.hasOwn(result.files, completionNetwork(deploymentConfig)));
  const deployFiles = generatedFiles ? [...generatedFiles] : result && !stale
    ? Object.keys(result.files)
    : expectedDeploymentFiles(deploymentConfig);
  const deployStages = plannedDeploymentStages(deploymentConfig, deployFiles);
  const [firstStage, secondStage] = deployStages;

  const homePrimaryPlan = useMemo(() => {
    if (!splitHomePrimary) return [];
    const preview = homePrimaryDeploymentPlan(model);
    if (!packaged || packaged.config !== configText) {
      return generatedFiles?.includes('network.json')
        ? homePrimaryDeploymentPlan(model, { primary: generatedFiles.filter((file) => file !== 'iam.json' && !file.startsWith('governance')) })
        : preview;
    }
    const names = (folder: string) => Object.keys(packaged.files).filter((path) => path.startsWith(`${folder}/`) && path.endsWith('.json')).map((path) => path.slice(folder.length + 1));
    return homePrimaryDeploymentPlan(model, { home: names(preview[0].folder), primary: names(preview[1].folder) });
  }, [model, splitHomePrimary, packaged, configText, generatedFiles]);

  async function downloadResult(runResult: RunResult) {
    const files = await deploymentDownloadFiles(model, runResult);
    if (runResult.config !== currentConfig.current) throw new Error('The model changed while preparing the download. Review the updated design and try again.');
    setPackaged({ config: runResult.config, files });
    downloadBlob(bundleFilename(designName), zipTextFiles(files));
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
    if (generated && isCurrentOutputSet(generated, currentConfig.current)) {
      setBusy(true);
      try { await downloadResult(generated); }
      catch (error) { setError(hasSecrets ? 'Could not prepare the download. Check the current design; secret values are omitted from diagnostics.' : error instanceof Error ? error.message : String(error)); }
      finally { setBusy(false); }
    }
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
        if (!homeSource.model) throw new Error('The linked Primary deployment design is unavailable. Restore it before exporting both diagrams.');
        const homeModel = reconcileExadata(homeSource.model);
        const preview = await loadDiagramPreview(homeModel, controller.signal);
        if (controller.signal.aborted) return;
        const homeDiagram = createDiagramGraph(homeModel, preview)(5, REVIEW_DIAGRAM_OPTIONS);
        xml = toDrawioPagesXml([{ name: 'DR', diagram }, { name: 'Primary deployment', diagram: homeDiagram }]);
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
  const zoneModel = regional ? homeSource?.model : model;
  const zoneOwner = regional && zoneModel ? 'Primary: ' : '';
  const recipe1Summary = !zoneModel ? 'Managed by primary deployment' : zoneOwner + (zoneModel.foundation.landingZoneSecurityZone === false ? 'Off' : `On · CIS Level ${zoneModel.foundation.cisLevel}`);
  const additionalZones = zoneModel ? [
    ...(zoneModel.foundation.sharedNetworkSecurityZone !== false ? ['Legacy shared-network zone (retained)'] : []),
    ...zoneModel.environments.filter((env) => env.securityZone).map((env) => `Recipe ${zoneModel.foundation.environmentSecurityZoneRecipeNumber === 2 ? '02' : '03'} — ${env.name}`),
  ] : null;
  const additionalZonesSummary = additionalZones ? zoneOwner + (additionalZones.join(', ') || 'None') : 'Managed by primary deployment';


  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <h2 style={s.title}>Review your landing zone</h2>
          {regional && <p style={local.note}><strong>DR regional stack.</strong> IAM, governance, Cloud Guard and Security Zones are excluded from this download.</p>}
          <dl className="review-summary-grid" style={local.sumGrid}>
            {[
              ['Deployment', regional ? 'DR' : splitHomePrimary ? (deploymentConfig.dr_region ? 'Home + Primary + Secondary (three stacks)' : 'Home + Primary (two stacks)') : 'Primary deployment'],
              [regional ? 'Secondary region' : 'Primary region', model.foundation.region],
              ['Tenancy home region', model.foundation.tenancyHomeRegion || 'Not specified'],
              ['CIS benchmark', `Level ${model.foundation.cisLevel}`],
              ['Cloud Guard', regional ? 'Managed by primary deployment' : model.foundation.cloudGuardEnabled === false ? (model.foundation.cloudGuardExistingConfirmed ? 'Managed externally' : 'Excluded; confirmation required') : 'Included'],
              ['Vulnerability Scanning', model.foundation.vulnerabilityScanningEnabled === false ? 'Excluded' : 'Included'],
              ['Security Zone Recipe 01', recipe1Summary],
              ['Additional Security Zones', additionalZonesSummary],
              ['Hub', hub?.label ?? model.network.hubKind],
              ['OCI Bastion', model.bastion?.enabled ? 'Hub management subnet' : 'Off'],
            ].map(([label, value]) => (
              <div key={label} style={local.sumCell}>
                <dt style={local.sumLabel}>{label}</dt>
                <dd style={local.sumValue}>{value}</dd>
              </div>
            ))}
          </dl>
          {model.network.subnets.some((subnet) => !hub?.defaultSubnets.some((required) => required.name === subnet.name)) && <p style={s.help}>
            Custom hub subnets ({model.network.subnets.filter((subnet) => !hub?.defaultSubnets.some((required) => required.name === subnet.name)).map((subnet) => `${subnet.name}: ${subnet.cidr}`).join(', ')}) are private and share the mgmt route table and security list.
          </p>}
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
          {stale && <p role="status" style={local.note}><strong>Deployment update required.</strong> {DEPLOYMENT_UPDATE_NOTICE} Studio does not check live OCI deployment status.</p>}
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
            ? 'The .drawio file includes separate DR and Primary deployment pages. The linked Primary deployment design must be available.'
            : 'This standalone DR design has no linked Primary deployment. Its export contains only the DR diagram.'}</p>}
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
            Resource Manager runs the <a className="guide-link" href={LANDING_ZONE_ORCHESTRATOR_RELEASE_URL} target="_blank" rel="noreferrer">Landing Zone Orchestrator {ORCHESTRATOR_VERSION} ↗</a> with your generated JSON files. {splitHomePrimary ? (deploymentConfig.dr_region ? 'Deploy Home first, then Primary, then Secondary, using three separate stacks and Terraform states.' : 'Deploy Home first, then Primary, using two separate stacks and Terraform states.') : secondStage ? 'Follow these steps in order, using the same stack for both phases.' : 'Deploy the final files in one stack with one plan and apply.'}
          </div>
          {(!result || stale || (splitHomePrimary && packaged?.config !== configText)) && <p style={local.note}>File lists are a preview of this design. Download the current files before deployment.</p>}
          {splitHomePrimary ? <HomePrimaryGuide operations={homePrimaryPlan} /> : <>
          <div className="deployment-step">
            <h3>1. Prepare the files</h3>
            {regional && homeSource && <p><Link className="guide-link" to={`/lz/${homeSource.id}?step=review`} target="_blank" rel="noreferrer">Open primary deployment Review ↗</Link> to follow its deployment steps.</p>}
            <ul className="deployment-list">
              {prerequisites.map((step) => <li key={step}><DeploymentText text={step} /></li>)}
              <li>{PRIVATE_SOURCE_STEP}</li>
              <li>Upload only the generated deployment JSON files; do not mix them with published blueprint files.</li>
            </ul>
          </div>
          <div className="deployment-step">
            <h3>{secondStage ? '2. Create and apply phase 1' : '2. Create and apply'}</h3>
            <p>Open <a className="guide-link" href={DEPLOY_TO_OCI_URL} target="_blank" rel="noreferrer">Deploy to OCI ↗</a> for a prefilled <strong>Create Stack</strong> wizard using the Landing Zone Orchestrator and private Object Storage configuration source. Select <code className="deployment-code">rms-facade</code> as the working directory.</p>
            <p>In the stack variables, confirm <Setting name="configuration_source" value="ocibucket" />. Enter your bucket name in <Setting name="oci_configuration_bucket" /> and set <Setting name="oci_configuration_objects" /> to exactly these {secondStage ? 'phase 1' : 'deployment'} files:</p>
            {firstStage.files.some((file) => /^security_cis[12]_pre\.json$/.test(file)) && <p>{firstStage.description}</p>}
            <ul className="deployment-files" aria-label={secondStage ? 'Phase 1 files' : 'Deployment files'}>{firstStage.files.map((file) => <li key={file}><code className="deployment-file">{file}</code></li>)}</ul>
            {deploymentSettings(deploymentConfig).map((step) => <p key={step}><DeploymentText text={step} /></p>)}
            <p>{secondStage ? APPLY_STEP : APPLY_STEP.replace(' Wait for a successful apply before starting phase 2.', ' Wait for a successful apply.')}</p>
            {!secondStage && deploymentOutputs(deploymentConfig).map((step) => <p key={step}><DeploymentText text={step} /></p>)}
          </div>
          {secondStage && <div className="deployment-step">
            <h3>3. Update and apply phase 2</h3>
            {firstStage.files.some((file) => /^security_cis[12]_pre\.json$/.test(file)) && <p>{secondStage.description}</p>}
            {model.network.hubKind === 'hub_c' && <ul className="deployment-list">
              {HUB_C_BACKEND_STEPS.map((step) => <li key={step}><DeploymentText text={step} /></li>)}
            </ul>}
            <p>In the same stack, edit the variables. Replace <Setting name="oci_configuration_objects" /> with exactly these phase 2 files. Retain complete control files, replace each selected <code className="deployment-code">_pre</code> file with its final counterpart, and add workload files:</p>
            <ul className="deployment-files" aria-label="Phase 2 files">{secondStage.files.map((file) => <li key={file}><code className="deployment-file">{file}</code></li>)}</ul>
            <p>{UPDATE_STEP}</p>
            {deploymentOutputs(deploymentConfig).map((step) => <p key={step}><DeploymentText text={step} /></p>)}
          </div>}
          {handover.length > 0 && <div className="deployment-step">
            <h3>{secondStage ? 4 : 3}. Complete external setup</h3>
            <ul className="deployment-list">{handover.map((step) => <li key={step}>{step}</li>)}</ul>
            {Object.keys(model.hybridConnectivity?.ipsecs ?? {}).length > 0 && <p><a className="guide-link" href="https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm" target="_blank" rel="noreferrer">Oracle VPN setup</a></p>}
            {(Object.values(model.hybridConnectivity?.fast_connect_virtual_circuits ?? {}).some((circuit) => circuit.provision_fc_virtual_circuit !== false) || Object.keys(model.hybridConnectivity?.cross_connect_groups ?? {}).length > 0) && <p><a className="guide-link" href="https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectoverview.htm" target="_blank" rel="noreferrer">Oracle FastConnect setup</a></p>}
          </div>}
          {model.bastion?.enabled && <div style={local.guide}>
            <h3 style={local.guideTitle}>After deployment</h3>
            <p>Use a temporary access session to open a private database web interface or connect to a virtual machine. Follow the{' '}
              <a className="guide-link" href={BASTION_DOCUMENTATION_URL} target="_blank" rel="noreferrer">Connect through OCI Bastion</a> guide to create a session and set up your client.
            </p>
          </div>}
          <details className="deployment-step deployment-alternative">
            <summary>Updating an existing landing zone</summary>
            <p>{EXISTING_DEPLOYMENT_STEP}</p>
          </details>
          <details className="deployment-step deployment-alternative">
            <summary>Terraform CLI or CI/CD alternative</summary>
            <p>Use the same phase file lists and applicable prerequisites above. Replace the Resource Manager actions with this sequence:</p>
            <ol className="deployment-list">{deploymentCliSteps(deploymentConfig, !!secondStage).map((step) => <li key={step}><DeploymentText text={step} /></li>)}</ol>
          </details>
          </>}
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
