/**
 * ReviewStep — step 5 ("Review"). Summarises the model, then runs the *real* OCI
 * landing-zone jsonnet generator over the config the wizard has been building and
 * packages the resulting artifacts as one complete ZIP download.
 *
 * The generator is upstream's own `gen/` jsonnet, evaluated by go-jsonnet compiled
 * to WebAssembly — the same computation `gen/generate.sh` runs on the command line,
 * just in the browser. Nothing here reimplements it, so the outputs are the outputs.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWizard } from '../wizardContext';
import { oracle } from '../../theme';
import { s } from './networkEditorStyles';
import { serializeConfig } from '../../services/lzConfig';
import { getHubKind } from '../../services/hubKinds';
import { getOutputs, saveOutputs } from '../../services/lzStore';
// The generator drags in ~0.7 MB of vendored jsonnet, so it is imported on demand
// inside `run()`. Only its names — a dependency-free module — are imported here.
import { CONFIG_FILENAME, deploymentStages, isCurrentOutputSet } from '../../generator/outputNames';
import { bundleFilename, downloadBlob, zipTextFiles } from '../../export/zip';
import { buildGraph } from '../../diagram/buildGraph';
import { toDrawioPagesXml, toDrawioXml } from '../../export/toDrawio';
import { createDiagramGraph } from '../diagramGraph';
import { loadDiagramPreview } from '../../services/diagramPreview';
import { downloadTextFile } from '../../export/download';
import { validatePlatformContracts } from '../../services/platformValidation';
import { reconcileExadata, validateExadataModel } from '../../services/exadata';
import { exadataReadiness, platformReadiness } from '../../services/platformReadiness';
import { validateNotificationEmails } from '../../services/notificationEmails';
import { validateRemotePeering } from '../../services/remotePeering';
import { validateRegionalDeployment } from '../../services/regionalDeployment';
import { regionShortNameError } from '../../services/regions';
import { ErrorNotice } from '../../components/FieldError';
import InfoButton from '../../components/InfoButton';
import type { DiagramModel, DiagramOptions, LzModel } from '../../model/types';

interface RunResult {
  config: string;
  files: Record<string, string>;
}

function splitOutputs(config: string, files: Record<string, string>): RunResult {
  return { config, files };
}

const local: Record<string, CSSProperties> = {
  note:      { ...s.intro, marginBottom: 16 },
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


  deployGrid: { display: 'grid', gap: 14, marginTop: 20 },
  deployCard: { border: `1px solid ${oracle.border}`, borderRadius: 6, padding: 16, background: oracle.surfaceAlt },
  deployTitle: { fontSize: 13.5, fontWeight: 800, color: oracle.ink, margin: '0 0 5px' },
  deployBody: { fontSize: 12.5, color: oracle.textMuted, lineHeight: 1.5, overflowWrap: 'anywhere' },
  fileList: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  fileChip: { padding: '3px 7px', borderRadius: 4, border: `1px solid ${oracle.border}`, background: oracle.surface, fontSize: 11.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  taskGroup: { marginTop: 14, maxWidth: '80ch' },
  taskHeading: { display: 'flex', alignItems: 'center', gap: 6, color: oracle.ink, fontWeight: 700 },
  taskList: { margin: '6px 0 0', paddingLeft: 18, display: 'grid', gap: 5 },
  dependencyList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '10px 24px', margin: '12px 0', maxWidth: '80ch' },
  dependencyPurpose: { margin: '5px 0 0', color: oracle.textMuted },
  ordered: { margin: '12px 0 0 20px', padding: 0, color: oracle.text, fontSize: 14, lineHeight: 1.6 },
  links: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 8, fontSize: 12.5 },
  guide: { marginTop: 16, padding: 16, border: `1px solid ${oracle.borderStrong}`, borderRadius: 6, background: oracle.surfaceAlt },
  guideTitle: { fontSize: 13.5, fontWeight: 800, color: oracle.ink },
  phaseChange: { display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, padding: '12px 14px', border: `1px solid ${oracle.red}`, borderLeft: `4px solid ${oracle.red}`, borderRadius: 6, background: oracle.redTint, fontSize: 12.5, lineHeight: 1.5, color: oracle.text },
  phaseChangeTitle: { fontWeight: 800, color: oracle.redDark },
};

function expectedCoreFiles(cisLevel: 1 | 2, regional: boolean): string[] {
  return [
    ...(regional ? [] : ['iam.json', 'governance.json']), 'network.json',
    `security_cis${cisLevel}_pre.json`, `security_cis${cisLevel}.json`,
    `observability_cis${cisLevel}_pre.json`, `observability_cis${cisLevel}.json`,
  ];
}

const RESOURCE_MANAGER_STACKS_URL = 'https://cloud.oracle.com/resourcemanager/stacks';
const RESOURCE_MANAGER_CREATE_STACK_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-stack.htm';
const RESOURCE_MANAGER_PLAN_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-job-plan.htm';
const RESOURCE_MANAGER_APPLY_GUIDE_URL = 'https://docs.oracle.com/en-us/iaas/Content/ResourceManager/Tasks/create-job-apply.htm';
const LANDING_ZONE_ORCHESTRATOR_URL = 'https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator';
const LANDING_ZONE_ORCHESTRATOR_RELEASE_URL = `${LANDING_ZONE_ORCHESTRATOR_URL}/releases/tag/v2.2.0`;
const DEPLOY_TO_OCI_URL = `${RESOURCE_MANAGER_STACKS_URL}/create?${new URLSearchParams({
  zipUrl: `${LANDING_ZONE_ORCHESTRATOR_URL}/archive/refs/tags/v2.2.0.zip`,
  zipUrlVariables: JSON.stringify({ configuration_source: 'ocibucket' }),
})}`;

function Setting({ name, value }: { name: string; value?: string | boolean }) {
  return (
    <code className="required-setting">
      <span className="required-setting-name">{name}</span>
      {value !== undefined && <><span className="required-setting-equals"> = </span><span className="required-setting-value">{typeof value === 'boolean' ? String(value) : <>&quot;{value}&quot;</>}</span></>}
    </code>
  );
}

function DeploymentCard({ title, description, files }: { title: string; description: ReactNode; files?: readonly string[] }) {
  return <div style={local.deployCard}>
    <h3 style={local.deployTitle}>{title}</h3>
    <div style={local.deployBody}>{description}</div>
    <DeploymentFiles files={files} />
  </div>;
}

function DeploymentFiles({ files }: { files?: readonly string[] }) {
  return !!files?.length && <div style={local.fileList}>
    {files.map((file) => <code key={file} style={local.fileChip}>{file}</code>)}
  </div>;
}

function HubDeploymentGuide({ hubKind, numbered = true }: { hubKind: string; numbered?: boolean }) {
  const List = numbered ? 'ol' : 'ul';
  if (hubKind === 'hub_c') {
    return (
      <div style={local.guide}>
        <div style={local.guideTitle}>Prepare Hub C firewall backends</div>
        <List style={local.ordered}>
          <li>NLB route targets resolve from generated resource keys in <code>network.json</code>. Before sending traffic, configure the third-party firewall VMs outside Studio.</li>
          <li>In <code>network_backends.json</code>, set each firewall backend <code>target_id</code> to a private-IP OCID, instance OCID, bare instance key, or qualified <code>instance.vnic</code> key.</li>
          <li>A bare instance key targets the primary interface. It resolves through <code>instances_dependency</code> first; if absent there, it can resolve through the primary private-IP target map. For separate trust and untrust interfaces, use the appropriate qualified <code>instance.vnic</code> key or private-IP OCID.</li>
          <li>Once the firewall backends are ready, update the same stack to use <code>network_backends.json</code> instead of <code>network.json</code>. Supply exactly one network file, then plan and apply.</li>
        </List>
      </div>
    );
  }

  return null;
}

function DrDeploymentGuide({ model, stages, homeId }: { model: LzModel; stages?: ReturnType<typeof deploymentStages>; homeId?: string }) {
  const homeConnections = (model.remotePeeringConnections ?? []).filter((connection) => connection.peerRegionName === model.foundation.homeRegion);
  const drAcceptor = homeConnections.length > 0 && homeConnections.every((connection) => connection.role === 'acceptor');
  const needsHomeRequester = homeConnections.some((connection) => connection.role === 'acceptor');
  const dependencies = ['home/compartments_output.json', ...(drAcceptor ? [] : ['home/network_output.json'])];
  const steps: { title: string; description: ReactNode; files?: string[] }[] = [
    { title: 'Deploy Home Region', description: <>
      {homeId ? <Link className="guide-link" to={`/lz/${encodeURIComponent(homeId)}?step=review`} target="_blank" rel="noreferrer">Open Home Region Review ↗</Link> : 'Open your Home Region design and select Review.'} Use its deployment steps and file lists.
      <p style={{ margin: '8px 0 0' }}>In Home’s Foundation step, set <strong>DR region</strong> to <code>{model.foundation.region || 'your DR region'}</code> so its IAM policies allow DR Object Storage to use encryption keys.</p>
      <p style={{ margin: '8px 0 0' }}>{needsHomeRequester
        ? <>{drAcceptor ? 'DR is the acceptor and Home is the requester.' : 'Home and DR have both acceptor and requester connections.'} Deploy the Home baseline with its acceptors configured, leaving out requesters whose DR acceptors do not exist yet. Add those requesters after DR applies.</>
        : 'Home is the acceptor and DR is the requester. Configure the Home acceptor in Hub Network with the DR peer region and reviewed DR VCN CIDRs.'} Review copied networks: Home and DR need non-overlapping routable ranges.</p>
      <div style={local.taskGroup}>
        <div style={local.taskHeading}>Check configuration storage and replication</div>
        <ul style={local.taskList}>
          <li>Reuse Home’s private configuration bucket, or create a Standard-tier source bucket. For a new tenancy, use the root or a bootstrap compartment before Home’s first apply. <a className="guide-link" href="https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usingversioning.htm" target="_blank" rel="noreferrer">Enable versioning on the Home source ↗</a>.</li>
          <li>Reuse its existing DR replica, or create a Standard-tier destination bucket in DR with versioning disabled and no retention rules. <a className="guide-link" href="https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usingreplication.htm" target="_blank" rel="noreferrer">Enable replication ↗</a> before publishing new files. The DR replica is read-only.</li>
          <li>During replication setup, let the Console create any missing Object Storage service replication policy.</li>
        </ul>
      </div>
      <p style={{ margin: '12px 0 0' }}>Before applying Home, set <Setting name="save_output" value={true} />, <Setting name="output_format" value="json" /> and <Setting name="oci_object_prefix" value="home" />. If Home is already deployed, update its existing ORM stack using final configuration files; do not switch back to <code>_pre</code> files.</p>
    </> },
    { title: 'Use Home’s saved outputs', description: <>
      <p style={{ margin: '8px 0 0', maxWidth: '80ch' }}>Home saves these JSON outputs automatically after a successful apply. Object Storage replicates them to DR; no manual JSON transfer is needed. Confirm the latest outputs have arrived before planning DR.</p>
      <dl style={local.dependencyList}>
        {dependencies.map((file) => <div key={file} style={{ minWidth: 0 }}>
          <dt><code style={local.fileChip}>{file}</code></dt>
          <dd style={local.dependencyPurpose}>{file.endsWith('compartments_output.json') ? 'References to the compartments created by Home.' : 'Home network references, including the acceptor RPC.'}</dd>
        </div>)}
      </dl>
      <div className="studio-info-heading"><span>These runtime output files are not included in the Studio ZIP.</span><InfoButton title="Home dependency outputs">
        <p>Replication is asynchronous. Compare source and replica ETags or checksums for the required files before creating a new DR plan. Do not apply an older saved plan after publishing newer inputs.</p>
        <p>Objects uploaded before replication was enabled are not backfilled. For an existing Home stack, publish under a new, unused output prefix and use that prefix in DR’s dependency paths. Review any impact on existing output consumers.</p>
        <p>Keep one document for each top-level dependency block; do not load both regions’ network outputs together. Add other Home outputs only when your platforms need them.</p>
      </InfoButton></div>
    </> },
    { title: 'Finish and download DR files', description: <>
      <div style={local.taskGroup}>
        <div style={local.taskHeading}>Configure RPC in Hub Network {!drAcceptor && <InfoButton title="Acceptor RPC reference">
          <p>Copy the Home acceptor RPC’s OCID from the OCI Console after Home applies. An exact generated resource key can instead resolve through Home’s <code>network_output.json</code> dependency.</p>
        </InfoButton>}</div>
        <ul style={local.taskList}>
          <li><strong>Role:</strong> {drAcceptor ? 'Keep DR as acceptor.' : homeConnections.length === 0 ? 'Add or update a DR connection as requester to Home.' : 'Use the requester connections to Home.'}</li>
          <li><strong>Peer region:</strong> <code>{model.foundation.homeRegion || 'Home Region'}</code>.</li>
          {!drAcceptor && <li><strong>Acceptor RPC:</strong> enter the Home RPC’s OCID from the OCI Console.</li>}
          <li><strong>Remote CIDRs:</strong> Home networks that should be reachable.</li>
        </ul>
        {needsHomeRequester && !drAcceptor && <p style={{ margin: '8px 0 0' }}>Keep DR acceptors as acceptors; Home will connect to them after DR applies.</p>}
      </div>
      <div style={local.taskGroup}>
        <div style={local.taskHeading}>Download and upload</div>
        <p style={{ margin: '6px 0 0' }}>Return to Review and select <strong>Download files</strong> after these edits. Unzip the fresh download and upload its deployment JSON files under <code>dr/</code> in the Home source bucket. Wait for the current files to replicate to DR; do not upload directly to the read-only replica.</p>
        <p style={{ margin: '8px 0 0' }}>Keep <code>config.jsonnet</code> as the Studio design source. Do not list it as an ORM configuration file.</p>
      </div>
    </> },
    { title: 'Create the DR stack', description: <>
      Open <a className="guide-link" href={DEPLOY_TO_OCI_URL} target="_blank" rel="noreferrer">Deploy to OCI ↗</a> in <code>{model.foundation.region || 'the DR region'}</code> and choose <code>rms-facade</code>. Home and DR use separate stacks and state.
      <p style={{ margin: '8px 0 0' }}>Set <Setting name="configuration_source" value="ocibucket" /> and <Setting name="oci_configuration_bucket" /> to the DR replica bucket. Set <Setting name="oci_dependency_objects" /> to the Home output paths from step 2; ORM reads those objects automatically on each new plan. Set <Setting name="oci_configuration_objects" /> to the first-apply files below. Keep <Setting name="save_output" value={false} /> in both DR phases because the replica is read-only. Select <strong>Create</strong> without running an apply.</p>
    </> },
    { title: 'First apply: DR prerequisites', files: stages?.[0]?.files.map((file) => `dr/${file}`), description: <>
      {stages ? 'Use exactly these objects' : 'The current Blueprint Factory preview is preparing the prerequisite file list. Once ready, use that list'} in <Setting name="oci_configuration_objects" />. Run <strong>Plan</strong>, review the changes, then <strong>Apply</strong>. Wait for success. Keep the Home outputs in <Setting name="oci_dependency_objects" />.
    </> },
    { title: 'Second apply: controls and workloads', files: stages?.slice(1).flatMap((stage) => stage.files.map((file) => `dr/${file}`)), description: <>
      {stages ? <>Replace the same DR stack’s <Setting name="oci_configuration_objects" /> with exactly these objects.</> : <>The current Blueprint Factory preview is preparing the final file list, including selected workloads.</>} Retain the network file, replace the security and observability <code>_pre</code> variants with their final counterparts, and add the generated workload files. Never supply both variants. Keep the Home dependencies, then plan and apply again.
    </> },
    ...(needsHomeRequester ? [{ title: 'Complete the Home requester', description: <>
      In the OCI Console, get the deployed DR acceptor RPC’s OCID. Enter that literal OCID in Home Hub Network’s requester, with the DR peer region and DR remote CIDRs. Download Home’s updated files and upload them to the Home source bucket, retain its final configuration files and plan/apply Home. A literal RPC OCID needs no DR network-output JSON or reverse replication. Keep DR output saving disabled.
    </> }] : []),
    { title: 'Verify the connection', description: <>
      Confirm RPC status is <strong>Peered</strong>. Check reciprocal DRG and VCN routes, firewall rules and approved traffic in both directions. For later changes, apply Home successfully, upload any updated DR configurations to the Home source, wait for current files and outputs to replicate, then create a fresh DR plan. No manual JSON transfer is needed.
      {model.foundation.cisLevel === 2 && <p style={{ margin: '8px 0 0' }}>DR creates regional Vaults and keys. Existing key material, secrets and workload data need their own recovery or replication plan.</p>}
    </> },
  ];
  return <div style={local.deployGrid}>
    <DeploymentCard title="Before you start" description={<>
      Subscribe to both regions.
    </>} />
    {steps.map((step, index) => <div key={step.title}>
      <DeploymentCard {...step} title={`${index + 1}. ${step.title}`} />
      {step.title === 'Second apply: controls and workloads' && <HubDeploymentGuide hubKind={model.network.hubKind} numbered={false} />}
    </div>)}
  </div>;
}

export default function ReviewStep({ designName, getDiagram, diagramOptions, diagramReady = true, generatedFiles }: { designName: string; getDiagram?: () => DiagramModel; diagramOptions?: DiagramOptions; diagramReady?: boolean; generatedFiles?: readonly string[] }) {
  const { model, homeSource } = useWizard();
  const regional = model.foundation.stackScope === 'regional';
  const { id } = useParams();
  const [busy, setBusy] = useState(false);
  const [diagramBusy, setDiagramBusy] = useState(false);
  const diagramRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { diagramRequest.current?.abort(); }, [model, homeSource?.model, diagramOptions, diagramReady]);
  const [error, setError] = useState<string | null>(null);
  // Show the last generated file list when returning to Review.
  const [result, setResult] = useState<RunResult | null>(() => {
    const saved = id ? getOutputs(id) : null;
    return saved ? splitOutputs(saved.config, saved.files) : null;
  });

  const configText = useMemo(() => serializeConfig(model), [model]);
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
      ...validateRemotePeering(model), ...validateRegionalDeployment(model),
      ...platformReadiness(model, 'oke_simple').errors,
    ])];
  }, [model, regional]);
  const stale = result !== null && !isCurrentOutputSet(result, configText);
  const deployFiles = generatedFiles ?? (result && !stale
    ? Object.keys(result.files)
    : expectedCoreFiles(model.foundation.cisLevel, regional));
  const deployStages = deploymentStages([...deployFiles]);
  const [firstStage, ...remainingStages] = deployStages;

  function downloadResult(runResult: RunResult) {
    downloadBlob(
      bundleFilename(designName),
      zipTextFiles({ [CONFIG_FILENAME]: runResult.config, ...runResult.files }),
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
      // Retain the previous generated file list when a new run fails.
      setError(err instanceof Error ? err.message : String(err));
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
      const diagram = getDiagram?.() ?? buildGraph(model, 5);
      let xml: string;
      if (regional && homeSource) {
        if (!homeSource.model) throw new Error('The linked Home Region design is unavailable. Restore it before exporting both diagrams.');
        const homeModel = reconcileExadata(homeSource.model);
        const preview = await loadDiagramPreview(homeModel, controller.signal);
        if (controller.signal.aborted) return;
        const homeDiagram = createDiagramGraph(homeModel, preview)(5, diagramOptions ?? {});
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
          {!!model.remotePeeringConnections?.length && <p style={local.note}><strong>RPC:</strong> deploy each acceptor first. Supply its RPC OCID or network dependency output to the requester. Review remote CIDRs, learned routes and firewall policies on both sides before allowing traffic.</p>}
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
            <button type="button" style={local.secondary} onClick={downloadDrawio} disabled={!diagramReady || diagramBusy}>
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

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <h2 style={s.title}>Deploy with OCI Resource Manager</h2>
          <div style={local.note}>
            Resource Manager runs the <a className="guide-link" href={LANDING_ZONE_ORCHESTRATOR_RELEASE_URL} target="_blank" rel="noreferrer">Landing Zone Orchestrator v2.2.0 ↗</a>. {regional ? 'Home and DR use separate stacks and state; keep the same stack for both phases within each region.' : 'Use one stack for both phases.'} The files from Studio are a separate configuration source for the stack. Phase 2 updates its security, observability, and workload files.
          </div>
          {regional ? <DrDeploymentGuide model={model} stages={generatedFiles !== undefined || (result && !stale) ? deployStages : undefined} homeId={homeSource?.id} /> : <>
          <div style={local.guide}>
            <div style={local.guideTitle}>Create and run the stack</div>
            <ol style={local.ordered}>
              <li>Unzip the download. Keep the generated files in a customer-controlled private Object Storage bucket. Do not mix them with published blueprint files.</li>
              <li>Open <a className="guide-link" href={DEPLOY_TO_OCI_URL} target="_blank" rel="noreferrer">Deploy to OCI ↗</a> for a prefilled <strong>Create Stack</strong> wizard using the Landing Zone Orchestrator and private Object Storage configuration source. Select <code>rms-facade</code> as the working directory.</li>
              <li>In the stack variables, confirm <Setting name="configuration_source" value="ocibucket" />. Then enter the bucket name in <Setting name="oci_configuration_bucket" /> and the current phase's file list in <Setting name="oci_configuration_objects" />.</li>
              <li>Select <strong>Create</strong> without running an apply. From the stack details page, select <strong>Plan</strong>, review the changes and policy impact, then select <strong>Apply</strong>. Wait for a successful apply before starting phase 2.</li>
            </ol>
          </div>
          <div style={local.deployGrid}>
            {firstStage && <DeploymentCard {...firstStage} />}
            <div style={local.phaseChange}>
              <div>
                <div style={local.phaseChangeTitle}>Important — update the configuration before phase 2</div>
                <div>
                  Security and observability files ending in <code>_pre</code> are only for phase 1. In phase 2, replace them with their final files and retain the network file. Supplying both control variants can create duplicate configuration families.
                </div>
              </div>
            </div>
            <HubDeploymentGuide hubKind={model.network.hubKind} />
            {remainingStages.map((deployment) => <DeploymentCard key={deployment.title} {...deployment} />)}
          </div>
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
