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
import { toDrawioXml } from '../../export/toDrawio';
import { downloadTextFile } from '../../export/download';
import { validatePlatformContracts } from '../../services/platformValidation';
import { validateExadataModel } from '../../services/exadata';
import { exadataReadiness, platformReadiness } from '../../services/platformReadiness';
import { validateNotificationEmails } from '../../services/notificationEmails';
import { validateRemotePeering } from '../../services/remotePeering';
import { validateRegionalDeployment } from '../../services/regionalDeployment';

interface RunResult {
  config: string;
  files: Record<string, string>;
}

function splitOutputs(config: string, files: Record<string, string>): RunResult {
  return { config, files };
}

const local: Record<string, CSSProperties> = {
  note:      { fontSize: 12.5, color: oracle.textMuted, marginBottom: 16, lineHeight: 1.55 },
  sumGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 24 },
  sumCell:   { background: oracle.surface, padding: '11px 13px', border: `1px solid ${oracle.border}`, borderRadius: 4 },
  sumLabel:  { fontSize: 10.5, fontWeight: 700, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  sumValue:  { fontSize: 14, fontWeight: 700, color: oracle.ink, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },

  runRow:    { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 18, marginBottom: 8 },
  primary:   { padding: '11px 20px', fontSize: 13.5, fontWeight: 800, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  primaryOff:{ opacity: 0.55, cursor: 'progress' },
  secondary: { padding: '11px 20px', fontSize: 13.5, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontFamily: 'inherit' },
  stale:     { display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px', border: `1px solid ${oracle.borderStrong}`, background: oracle.surfaceAlt, borderRadius: 6, fontSize: 12.5, color: oracle.text, margin: '14px 0 0' },

  errBox:    { marginTop: 16, border: `1px solid ${oracle.red}`, borderRadius: 6, overflow: 'hidden' },
  errHead:   { padding: '9px 13px', background: oracle.redTint, color: oracle.redDark, fontSize: 12.5, fontWeight: 800 },
  errBody:   { margin: 0, padding: '12px 13px', background: oracle.surface, fontSize: 12, lineHeight: 1.55, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: oracle.text, whiteSpace: 'pre-wrap', overflowX: 'auto', maxHeight: 260 },

  deployGrid: { display: 'grid', gap: 14, marginTop: 20 },
  deployCard: { border: `1px solid ${oracle.border}`, borderRadius: 6, padding: 16, background: oracle.surfaceAlt },
  deployTitle: { fontSize: 13.5, fontWeight: 800, color: oracle.ink, marginBottom: 5 },
  fileList: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  fileChip: { padding: '3px 7px', borderRadius: 4, border: `1px solid ${oracle.border}`, background: oracle.surface, fontSize: 11.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  ordered: { margin: '14px 0 0 22px', padding: 0, color: oracle.text, fontSize: 13, lineHeight: 1.7 },
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

function Setting({ name, value }: { name: string; value?: string }) {
  return (
    <code className="required-setting">
      <span className="required-setting-name">{name}</span>
      {value && <><span className="required-setting-equals"> = </span><span className="required-setting-value">&quot;{value}&quot;</span></>}
    </code>
  );
}

function HubDeploymentGuide({ hubKind }: { hubKind: string }) {
  if (hubKind === 'hub_a' || hubKind === 'hub_b') {
    return (
      <div style={local.guide}>
        <div style={local.guideTitle}>Hub routing</div>
        <p style={local.note}>The Orchestrator resolves OCI Network Firewall route targets from the resource keys in <code>network.json</code>. Retain this network file in both phases.</p>
      </div>
    );
  }

  if (hubKind === 'hub_c') {
    return (
      <div style={local.guide}>
        <div style={local.guideTitle}>Prepare Hub C firewall backends</div>
        <ol style={local.ordered}>
          <li>NLB route targets resolve from generated resource keys in <code>network.json</code>. Before sending traffic, configure the third-party firewall VMs outside Studio.</li>
          <li>In <code>network_backends.json</code>, set each firewall backend <code>target_id</code> to a private-IP OCID, instance OCID, bare instance key, or qualified <code>instance.vnic</code> key.</li>
          <li>A bare instance key targets the primary interface. It resolves through <code>instances_dependency</code> first; if absent there, it can resolve through the primary private-IP target map. For separate trust and untrust interfaces, use the appropriate qualified <code>instance.vnic</code> key or private-IP OCID.</li>
          <li>Once the firewall backends are ready, update the same stack to use <code>network_backends.json</code> instead of <code>network.json</code>. Supply exactly one network file, then plan and apply.</li>
        </ol>
      </div>
    );
  }

  return null;
}

export default function ReviewStep({ designName }: { designName: string }) {
  const { model } = useWizard();
  const regional = model.foundation.stackScope === 'regional';
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
  const currentConfig = useRef(configText);
  useEffect(() => { currentConfig.current = configText; }, [configText]);
  const hub = getHubKind(model.network.hubKind);
  const exacc = exadataReadiness(model, 'exacc');
  const exacs = exadataReadiness(model, 'exacs');
  const contractErrors = useMemo(() => [...new Set([
    ...validatePlatformContracts(model), ...validateExadataModel(model),
    ...validateNotificationEmails(model.foundation.notifications, regional),
    ...validateRemotePeering(model), ...validateRegionalDeployment(model),
    ...platformReadiness(model, 'oke_simple').errors, ...platformReadiness(model, 'ocvs').errors,
  ])], [model, regional]);
  const stale = result !== null && !isCurrentOutputSet(result, configText);
  const deployFiles = result && !stale
    ? Object.keys(result.files)
    : expectedCoreFiles(model.foundation.cisLevel, regional);
  const deployStages = deploymentStages(deployFiles);
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
      // Keep the previous snapshot; download eligibility still checks config and output format.
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function downloadBundle() {
    if (!result || !isCurrentOutputSet(result, currentConfig.current)) return;
    downloadResult(result);
  }

  async function generateAndDownload() {
    if (busy) return;
    if (contractErrors.length > 0) {
      setError(contractErrors.join('\n'));
      return;
    }
    if (result && !stale) {
      downloadBundle();
      return;
    }
    const generated = await run();
    if (generated && isCurrentOutputSet(generated, currentConfig.current)) downloadResult(generated);
  }

  function downloadDrawio() {
    const filename = bundleFilename(designName).replace(/-lz-outputs\.zip$/, '.drawio');
    // Review export is always the complete structural model. Diagram-only
    // endpoint, route-table, and packet-flow overlays are deliberately omitted.
    downloadTextFile(filename, toDrawioXml(buildGraph(model, 5, {})), 'application/xml');
  }

  const envCount = model.environments.filter((e) => e.name.trim()).length;

  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Review your landing zone</div>
          {regional && <p style={local.note}><strong>DR regional stack.</strong> Deploy Home first, with this DR region selected for the Object Storage key-use grant. Supply the Home compartments output and any required network dependencies to a separate DR stack/state. Matching platform and extension IAM prerequisites must already exist in Home. IAM, governance, Cloud Guard and Security Zones are excluded from this download.</p>}
          {!!model.remotePeeringConnections?.length && <p style={local.note}><strong>X-RPC:</strong> deploy each acceptor first. Supply its RPC OCID or network dependency output to the requester. Review remote CIDRs, learned routes and firewall policies on both sides before allowing traffic.</p>}
          <div className="review-summary-grid" style={local.sumGrid}>
            {[
              ['Deployment', regional ? 'Disaster Recovery' : 'Complete'],
              ['Region', model.foundation.region],
              ['Realm', model.foundation.realm],
              ['CIS benchmark', `Level ${model.foundation.cisLevel}`],
              ['Hub', hub?.label ?? model.network.hubKind],
              ['Environments', String(envCount)],
              ['Projects', String(model.projects.length)],
              ['Platforms', String(model.platforms.length)],
              ['Shared platforms', String(model.sharedPlatforms.length)],
              ['EXACC', exacc.status],
              ['EXACS', exacs.status],
            ].map(([label, value]) => (
              <div key={label} style={local.sumCell}>
                <div style={local.sumLabel}>{label}</div>
                <div style={local.sumValue}>{value}</div>
              </div>
            ))}
          </div>

          <div style={s.title}>Download deployment files</div>
          <div style={local.note}>
            Download one package containing a record of this design and the deployment files. Review the files and resolve every placeholder before you deploy.
          </div>
          {contractErrors.length > 0 && (
            <div style={local.errBox}>
              <div style={local.errHead}>Resolve these conflicts before downloading</div>
              <pre style={local.errBody}>{contractErrors.join('\n')}</pre>
            </div>
          )}

          <div style={local.runRow}>
            <button
              type="button"
              style={busy ? { ...local.primary, ...local.primaryOff } : local.primary}
              onClick={generateAndDownload}
              disabled={busy || contractErrors.length > 0}
            >
              {busy ? 'Preparing download…' : 'Download files'}
            </button>
            <button type="button" style={local.secondary} onClick={downloadDrawio}>
              Export diagram (.drawio)
            </button>
          </div>

          {error && (
            <div style={local.errBox}>
              <div style={local.errHead}>Could not prepare the download</div>
              <pre style={local.errBody}>{error}</pre>
            </div>
          )}
        </div>
      </section>

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Deploy with OCI Resource Manager</div>
          <div style={local.note}>
            Resource Manager runs the <a className="guide-link" href={LANDING_ZONE_ORCHESTRATOR_RELEASE_URL} target="_blank" rel="noreferrer">Landing Zone Orchestrator v2.2.0 ↗</a>. The files from Studio are a separate configuration source for that stack. Use one stack for both phases; phase 2 updates its security, observability, and workload files.
          </div>
          <div style={local.guide}>
            <div style={local.guideTitle}>Create and run the stack</div>
            <ol style={local.ordered}>
              <li>Unzip the download. Keep the generated files in a customer-controlled private Object Storage bucket or approved private GitHub repository. Do not mix them with published blueprint files.</li>
              <li>Open <a className="guide-link" href={DEPLOY_TO_OCI_URL} target="_blank" rel="noreferrer">Deploy to OCI ↗</a> for a prefilled <strong>Create Stack</strong> wizard using the Landing Zone Orchestrator and private Object Storage configuration source. Select <code>rms-facade</code> as the working directory.</li>
              <li>In the stack variables, confirm <Setting name="configuration_source" value="ocibucket" />. Then enter the bucket name in <Setting name="oci_configuration_bucket" /> and the current phase's file list in <Setting name="oci_configuration_objects" />. You can instead use an approved private GitHub source.</li>
              <li>Select <strong>Create</strong> without running an apply. From the stack details page, select <strong>Plan</strong>, review the changes and policy impact, then select <strong>Apply</strong>. Wait for a successful apply before starting phase 2.</li>
            </ol>
          </div>
          <div style={local.deployGrid}>
            {firstStage && (
              <div style={local.deployCard}>
                <div style={local.deployTitle}>{firstStage.title}</div>
                <div style={{ fontSize: 12.5, color: oracle.textMuted, lineHeight: 1.5 }}>{firstStage.description}</div>
                <div style={local.fileList}>
                  {firstStage.files.map((file) => <code key={file} style={local.fileChip}>{file}</code>)}
                </div>
              </div>
            )}
            <div style={local.phaseChange}>
              <div>
                <div style={local.phaseChangeTitle}>Important — update the configuration before phase 2</div>
                <div>
                  Security and observability files ending in <code>_pre</code> are only for phase 1. In phase 2, replace them with their final files and retain the network file. Supplying both control variants can create duplicate configuration families.
                </div>
              </div>
            </div>
            <HubDeploymentGuide hubKind={model.network.hubKind} />
            {remainingStages.map((deployment) => (
              <div key={deployment.title} style={local.deployCard}>
                <div style={local.deployTitle}>{deployment.title}</div>
                <div style={{ fontSize: 12.5, color: oracle.textMuted, lineHeight: 1.5 }}>{deployment.description}</div>
                <div style={local.fileList}>
                  {deployment.files.map((file) => <code key={file} style={local.fileChip}>{file}</code>)}
                </div>
              </div>
            ))}
          </div>
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
