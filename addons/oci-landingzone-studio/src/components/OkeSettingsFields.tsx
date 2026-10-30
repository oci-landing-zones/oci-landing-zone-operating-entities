import type { CSSProperties } from 'react';
import type { PlatformConfig } from '../model/types';
import { oracle } from '../theme';
import { OKE_VERSION_SUGGESTIONS } from '../services/okeVersions';
import { okeDefaultParams, okeNetworkProfilePatch } from '../services/platforms';
import { s } from '../wizard/steps/networkEditorStyles';
import Switch from './Switch';
import ValidatedInput from './ValidatedInput';
import FieldError from './FieldError';
import InfoButton from './InfoButton';
import { okeModelIssues } from '../services/okeValidation';
import { parseCidr } from '../services/cidr';
import { fieldErrorProps } from '../services/fieldErrors';
import { useWizard } from '../wizard/wizardContext';

const local: Record<string, CSSProperties> = {
  cidrAction: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flexShrink: 0, border: 0, color: '#fff', fontSize: 22, lineHeight: 1, cursor: 'pointer' },
  featureGrid:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', columnGap: 24 },
  fieldHint:  { fontSize: 11.5, color: oracle.textMuted, marginTop: 4 },
  group:      { border: `1px solid ${oracle.border}`, borderRadius: 6, padding: 16, background: oracle.surface, minWidth: 0 },
  groupTitle: { fontSize: 12, fontWeight: 800, color: oracle.ink, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  okeGrid:    { display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 8, alignItems: 'start' },
  settingsFields: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px 24px' },
  switchCopy: { minWidth: 0, fontSize: 14, lineHeight: 1.35 },
  switchRow:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: `1px solid ${oracle.border}` },
};

export default function OkeSettingsFields({ platform, onPlatform }: { platform: PlatformConfig; onPlatform: (patch: Partial<PlatformConfig>) => void }) {
  const { model } = useWizard();
  const oke = platform.okeParams ?? okeDefaultParams(model.network);
  const issues = okeModelIssues(model).filter((issue) => issue.platformId === platform.id);
  const errors = (field: string) => [...new Set(issues.filter((issue) => issue.field === field).map((issue) => issue.message))];
  function setOke(patch: Partial<typeof oke>) { onPlatform({ okeParams: { ...oke, ...patch } }); }
  return (
<div style={s.subCard}>
              <div style={s.subHead}>OKE settings</div>
              <div className="oke-settings-grid" style={local.okeGrid}>
                <div style={local.group}>
                  <div style={local.groupTitle}>Cluster</div>
                  <div className="oke-fields-grid" style={local.settingsFields}>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-k8s`}>Kubernetes version</label><select id={`${platform.id}-k8s`} {...fieldErrorProps(`${platform.id}-k8s-error`, errors('kubernetesVersion'))} value={oke.kubernetesVersion} onChange={(e) => setOke({ kubernetesVersion: e.target.value })}>
                      {!OKE_VERSION_SUGGESTIONS.some((version) => version === oke.kubernetesVersion) && <option value={oke.kubernetesVersion} disabled>Select a Kubernetes version</option>}
                      {OKE_VERSION_SUGGESTIONS.map((version) => <option key={version} value={version}>{version}</option>)}
                    </select><FieldError id={`${platform.id}-k8s-error`} error={errors('kubernetesVersion')} /></div>
                    <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                      <legend style={s.addLabel}>API Server allowed CIDRs</legend>
                      {oke.apiAllowedCidrs.map((cidr, index) => <div key={index} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                        <ValidatedInput id={index === 0 ? `${platform.id}-api` : `${platform.id}-api-${index}`} aria-label={`API Server allowed CIDR ${index + 1}`} style={s.rowInput} autoFocus={cidr === ''} value={cidr}
                          error={!parseCidr(cidr) ? 'Enter a valid IPv4 CIDR block.' : null}
                          onChange={(event) => setOke({ apiAllowedCidrs: oke.apiAllowedCidrs.map((value, i) => i === index ? event.target.value : value) })} />
                        <button type="button" aria-label={`Remove API Server CIDR ${index + 1}`} title="Remove CIDR block" style={{ ...local.cidrAction, background: oracle.red, borderRadius: '50%' }} onClick={() => setOke({ apiAllowedCidrs: oke.apiAllowedCidrs.filter((_, i) => i !== index) })}><span aria-hidden="true">×</span></button>
                      </div>)}
                      {oke.apiAllowedCidrs.length === 0 && <FieldError id={`${platform.id}-api-error`} error={errors('apiAllowedCidrs')} />}
                      <button type="button" aria-label="Add CIDR block" title="Add CIDR block" style={{ ...local.cidrAction, background: oracle.greenDark, borderRadius: 6 }} onClick={() => setOke({ apiAllowedCidrs: [...oke.apiAllowedCidrs, ''] })}><span aria-hidden="true">+</span></button>
                    </fieldset>
                  </div>
                </div>
                <div style={local.group}>
                  <div style={local.groupTitle}>Networking</div>
                  <div className="oke-fields-grid" style={local.settingsFields}>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-cni`}>Kubernetes CNI</label><select id={`${platform.id}-cni`} value={oke.cniType} onChange={(e) => {
                      const cniType = e.target.value as 'native' | 'overlay';
                      onPlatform({ ...(cniType === 'overlay' ? { subnets: platform.subnets.filter((sn) => sn.name !== 'pods') } : {}), okeParams: { ...oke, cniType, podsCidr: cniType === 'overlay' ? oke.podsCidr || '10.244.0.0/16' : undefined } });
                    }}><option value="native">VCN Native</option><option value="overlay">Overlay (Flannel)</option></select></div>
                    <div><div className="studio-info-heading"><label style={s.addLabel} htmlFor={`${platform.id}-size`}>Network profile</label><InfoButton title="OKE network profiles"><p>Small, Medium and Large use /20, /18 and /16 VCNs respectively. The profile allocates the required subnets for the selected pod networking and File Storage settings.</p><p>Choose Manual subnets to edit those subnet ranges yourself. Changing a profile recalculates the networks for all selected environments, so review the address plan afterward.</p></InfoButton></div><select id={`${platform.id}-size`} {...fieldErrorProps(`${platform.id}-size-error`, errors('clusterSize'))} value={oke.clusterSize ?? 'manual'} onChange={(e) => {
                      const size = e.target.value === 'manual' ? undefined : e.target.value as 'small' | 'medium' | 'large';
                      onPlatform(okeNetworkProfilePatch(platform, size));
                    }}><option value="manual">Manual subnets</option><option value="small">Small (/20)</option><option value="medium">Medium (/18)</option><option value="large">Large (/16)</option></select><FieldError id={`${platform.id}-size-error`} error={errors('clusterSize')} /></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-svc`}>Service CIDR</label><ValidatedInput id={`${platform.id}-svc`} error={errors('servicesCidr')} style={s.rowInput} value={oke.servicesCidr} onChange={(e) => setOke({ servicesCidr: e.target.value })} /></div>
                    {oke.cniType === 'overlay' && <div><label style={s.addLabel} htmlFor={`${platform.id}-pods`}>Pod CIDR</label><ValidatedInput id={`${platform.id}-pods`} error={errors('podsCidr')} style={s.rowInput} placeholder="10.244.0.0/16" value={oke.podsCidr ?? ''} onChange={(e) => setOke({ podsCidr: e.target.value || undefined })} /></div>}
                  </div>
                </div>
                <div style={local.group}>
                  <div style={local.groupTitle}>Workers</div>
                  <div style={{ ...local.switchRow, borderTop: 'none', paddingTop: 0 }}>
                    <div style={local.switchCopy}><strong>Create sample node pool</strong><div style={local.fieldHint}>Creates one managed pool per cluster with 1 VM.Standard.E5.Flex node (1 OCPU, 8 GB memory). Turn off to create the cluster without worker nodes.</div></div>
                    <Switch checked={oke.createNodePools !== false} onChange={(checked) => setOke({ createNodePools: checked })} ariaLabel="Create sample node pool" />
                  </div>
                  <div style={{ ...local.switchRow, borderTop: 'none', paddingTop: 0 }}>
                    <div style={local.switchCopy}><strong>Allow worker internet access</strong><div style={local.fieldHint}>Allow outbound internet traffic through the configured hub routing. With Flannel, this also controls pod internet access.</div></div>
                    <Switch checked={oke.workerInternetAccess !== false} onChange={(checked) => setOke({ workerInternetAccess: checked })} ariaLabel="Allow worker internet access" />
                  </div>
                  <div style={{ ...local.switchRow, borderTop: 'none', paddingTop: 0 }}>
                    <div style={local.switchCopy}><strong>Allow worker spoke connectivity</strong><div style={local.fieldHint}>Attach a peering NSG allowing traffic to and from the peer CIDRs listed below. Internet access can still allow outbound spoke traffic when this is off. With Flannel, this also applies to pods.</div></div>
                    <Switch checked={oke.workerSpokeAccess === true} onChange={(checked) => setOke({ workerSpokeAccess: checked })} ariaLabel="Allow worker spoke connectivity" />
                  </div>
                  {oke.createNodePools !== false && <div className="oke-fields-grid" style={local.settingsFields}>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-img`}>Worker node image</label><select id={`${platform.id}-img`} value={oke.workerImage} onChange={(e) => setOke({ workerImage: e.target.value })}>
                      {!['8\\.[0-9]+', '9\\.[0-9]+'].includes(oke.workerImage) && <option value={oke.workerImage} disabled>Select a supported operating system</option>}
                      <option value={'8\\.[0-9]+'}>Oracle Linux 8</option>
                      <option value={'9\\.[0-9]+'}>Oracle Linux 9</option>
                    </select></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-boot`}>Worker boot volume (GB)</label><ValidatedInput id={`${platform.id}-boot`} error={errors('workerBootVolumeSize')} type="number" min="50" max="32768" style={s.rowInput} value={oke.workerBootVolumeSize} onChange={(e) => setOke({ workerBootVolumeSize: Number(e.target.value) })} /></div>
                  </div>}
                </div>
                {oke.cniType === 'native' && <div style={local.group}>
                  <div style={local.groupTitle}>Pods</div>
                  <div style={{ ...local.switchRow, borderTop: 'none', paddingTop: 0 }}>
                    <div style={local.switchCopy}><strong>Allow pod internet access</strong><div style={local.fieldHint}>Allow outbound internet traffic through the configured hub routing.</div></div>
                    <Switch checked={oke.podInternetAccess !== false} onChange={(checked) => setOke({ podInternetAccess: checked })} ariaLabel="Allow pod internet access" />
                  </div>
                  <div style={{ ...local.switchRow, borderTop: 'none', paddingTop: 0 }}>
                    <div style={local.switchCopy}><strong>Allow pod spoke connectivity</strong><div style={local.fieldHint}>Attach a peering NSG allowing traffic to and from the peer CIDRs listed below. Internet access can still allow outbound spoke traffic when this is off.</div></div>
                    <Switch checked={oke.podSpokeAccess === true} onChange={(checked) => setOke({ podSpokeAccess: checked })} ariaLabel="Allow pod spoke connectivity" />
                  </div>
                </div>}
                {(oke.workerSpokeAccess === true || (oke.cniType === 'native' && oke.podSpokeAccess === true)) && <div style={local.group}>
                  <div style={local.groupTitle}>Peering</div>
                  <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                    <legend style={s.addLabel}>Peer VCN CIDR blocks</legend>
                    <div style={local.fieldHint}>Only these CIDRs are permitted by the peering NSG. Attach it using the worker or pod spoke-connectivity switch. External networks also require DRG routes and peering configured separately.</div>
                    {(oke.peerVcnCidrs ?? []).map((cidr, index) => <div key={index} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                      <ValidatedInput id={`${platform.id}-peer-${index}`} aria-label={`Peer VCN CIDR ${index + 1}`} style={s.rowInput} autoFocus={cidr === ''} value={cidr}
                        error={!parseCidr(cidr) || cidr === '0.0.0.0/0' ? 'Enter a peer IPv4 CIDR; 0.0.0.0/0 is not allowed.' : null}
                        onChange={(event) => setOke({ peerVcnCidrs: (oke.peerVcnCidrs ?? []).map((value, i) => i === index ? event.target.value : value) })} />
                      <button type="button" aria-label={`Remove peer CIDR ${index + 1}`} title="Remove peer CIDR" style={{ ...local.cidrAction, background: oracle.red, borderRadius: '50%' }} onClick={() => setOke({ peerVcnCidrs: (oke.peerVcnCidrs ?? []).filter((_, i) => i !== index) })}><span aria-hidden="true">×</span></button>
                    </div>)}
                    <FieldError id={`${platform.id}-peers-error`} error={errors('peerVcnCidrs')} />
                    {(oke.peerVcnCidrs ?? []).length === 0 && <div style={local.fieldHint}>No peer CIDRs selected. No peering NSG will be created or attached.</div>}
                    <button type="button" aria-label="Add peer CIDR block" title="Add peer CIDR block" style={{ ...local.cidrAction, background: oracle.greenDark, borderRadius: 6, marginTop: 8 }} onClick={() => setOke({ peerVcnCidrs: [...oke.peerVcnCidrs ?? [], ''] })}><span aria-hidden="true">+</span></button>
                  </fieldset>
                </div>}
                <div className="oke-features-group" style={{ ...local.group, gridColumn: '1 / -1' }}>
                  <div style={local.groupTitle}>Optional features</div>
                  <div className="oke-feature-grid" style={local.featureGrid}>
                    <div style={{ ...local.switchRow, borderTop: 'none', paddingTop: 0 }}>
                      <div style={local.switchCopy}><strong>Allow public load balancers</strong><div style={{ ...local.fieldHint, lineHeight: 1.5, marginTop: 5 }}>Creates the Hub frontend networking and IAM prerequisites. OCI creates a load balancer only when a Kubernetes Service requests one.</div></div>
                      <Switch checked={oke.publicLoadBalancer} onChange={(checked) => setOke({ publicLoadBalancer: checked })} ariaLabel="Allow public load balancers" />
                    </div>
                    <div style={{ ...local.switchRow, borderTop: 'none', paddingTop: 0 }}>
                      <div style={local.switchCopy}><strong>Enable File Storage support</strong><div style={{ ...local.fieldHint, lineHeight: 1.5, marginTop: 5 }}>Creates FSS networking and IAM prerequisites—not file systems, mount targets, or Kubernetes storage objects.</div></div>
                      <Switch checked={oke.createFss} onChange={(checked) => setOke({ createFss: checked })} ariaLabel="Enable File Storage support" />
                    </div>
                  </div>
                </div>
              </div>
              {oke.clusterSize && <div style={local.fieldHint}>Changing the network profile recalculates the VCN ranges and subnet layout for all selected environments. Review the address plan after changing it. To define subnets yourself, select Manual subnets.</div>}
            </div>
  );
}
