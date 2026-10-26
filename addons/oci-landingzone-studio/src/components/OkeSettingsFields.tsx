import type { CSSProperties } from 'react';
import type { PlatformConfig } from '../model/types';
import { oracle } from '../theme';
import { okeDefaultParams, okeNetworkProfilePatch } from '../services/platforms';
import { s } from '../wizard/steps/networkEditorStyles';
import Switch from './Switch';
import ValidatedInput from './ValidatedInput';
import FieldError from './FieldError';
import InfoButton from './InfoButton';
import { okeModelIssues } from '../services/okeValidation';
import { fieldErrorProps } from '../services/fieldErrors';
import { useWizard } from '../wizard/wizardContext';

const local: Record<string, CSSProperties> = {
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
  const oke = platform.okeParams ?? okeDefaultParams();
  const { model } = useWizard();
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
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-k8s`}>Kubernetes version</label><input id={`${platform.id}-k8s`} style={s.rowInput} value={oke.kubernetesVersion} onChange={(e) => setOke({ kubernetesVersion: e.target.value })} /></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-api`}>API endpoint allowed CIDRs</label><ValidatedInput id={`${platform.id}-api`} error={errors('apiAllowedCidrs')} style={s.rowInput} value={oke.apiAllowedCidrs.join(', ')} onChange={(e) => setOke({ apiAllowedCidrs: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></div>
                  </div>
                </div>
                <div style={local.group}>
                  <div style={local.groupTitle}>Networking</div>
                  <div className="oke-fields-grid" style={local.settingsFields}>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-svc`}>Services CIDR</label><ValidatedInput id={`${platform.id}-svc`} error={errors('servicesCidr')} style={s.rowInput} value={oke.servicesCidr} onChange={(e) => setOke({ servicesCidr: e.target.value })} /></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-cni`}>Pod networking</label><select id={`${platform.id}-cni`} value={oke.cniType} onChange={(e) => {
                      const cniType = e.target.value as 'native' | 'overlay';
                      onPlatform({ ...(cniType === 'overlay' ? { subnets: platform.subnets.filter((sn) => sn.name !== 'pods') } : {}), okeParams: { ...oke, cniType, ...(cniType === 'overlay' && !oke.podsCidr ? { podsCidr: '10.244.0.0/16' } : {}) } });
                    }}><option value="native">Native VCN</option><option value="overlay">Overlay (Flannel)</option></select></div>
                    <div><div className="studio-info-heading"><label style={s.addLabel} htmlFor={`${platform.id}-size`}>Network profile</label><InfoButton title="OKE network profiles"><p>Small, Medium and Large use /20, /18 and /16 VCNs respectively. The profile allocates the required subnets for the selected pod networking and File Storage settings.</p><p>Choose Manual subnets to edit those subnet ranges yourself. Changing a profile recalculates the networks for all selected environments, so review the address plan afterward.</p></InfoButton></div><select id={`${platform.id}-size`} {...fieldErrorProps(`${platform.id}-size-error`, errors('clusterSize'))} value={oke.clusterSize ?? 'manual'} onChange={(e) => {
                      const size = e.target.value === 'manual' ? undefined : e.target.value as 'small' | 'medium' | 'large';
                      onPlatform(okeNetworkProfilePatch(platform, size));
                    }}><option value="manual">Manual subnets</option><option value="small">Small (/20)</option><option value="medium">Medium (/18)</option><option value="large">Large (/16)</option></select><FieldError id={`${platform.id}-size-error`} error={errors('clusterSize')} /></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-pods`}>Pod CIDR</label><ValidatedInput id={`${platform.id}-pods`} error={errors('podsCidr')} style={s.rowInput} placeholder={oke.cniType === 'overlay' ? '10.244.0.0/16' : 'Optional for native'} value={oke.podsCidr ?? ''} onChange={(e) => setOke({ podsCidr: e.target.value || undefined })} /></div>
                  </div>
                </div>
                <div style={local.group}>
                  <div style={local.groupTitle}>Workers</div>
                  <div className="oke-fields-grid" style={local.settingsFields}>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-img`}>Worker image selector</label><input id={`${platform.id}-img`} style={s.rowInput} value={oke.workerImage} onChange={(e) => setOke({ workerImage: e.target.value })} /></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-boot`}>Worker boot volume (GB)</label><ValidatedInput id={`${platform.id}-boot`} error={errors('workerBootVolumeSize')} type="number" min="50" max="32768" style={s.rowInput} value={oke.workerBootVolumeSize} onChange={(e) => setOke({ workerBootVolumeSize: Number(e.target.value) })} /></div>
                  </div>
                </div>
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
