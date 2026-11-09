import type { CSSProperties } from 'react';
import type { PlatformConfig } from '../model/types';
import {
  okeDefaultParams, okeNetworkProfilePatch, okeProfileCidrError,
  platformEnvInstances, setOkeEnvironmentCidr,
} from '../services/platforms';
import { s } from '../wizard/steps/networkEditorStyles';
import { VcnEditor } from '../wizard/steps/HubNetworkStep';
import Switch from './Switch';
import DeleteButton from './DeleteButton';
import ValidatedInput from './ValidatedInput';
import FieldError from './FieldError';
import InfoButton from './InfoButton';
import { okeModelIssues } from '../services/okeValidation';
import { parseCidr } from '../services/cidr';
import { fieldErrorProps } from '../services/fieldErrors';
import { useWizard } from '../wizard/wizardContext';

const local: Record<string, CSSProperties> = {
  cidrAction: { width: 44, height: 44, flexShrink: 0 },
  cidrRow: { ...s.row, gridTemplateColumns: 'minmax(0, 1fr) 44px', alignItems: 'start' },
  group: { border: 0, padding: 0, margin: 0, minWidth: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '14px 24px' },
  switchLabel: { ...s.label, display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0, marginBottom: 0 },
  switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
};

export default function OkeSettingsFields({ platform, onPlatform }: {
  platform: PlatformConfig;
  onPlatform: (patch: Partial<PlatformConfig>) => void;
}) {
  const { model, vcnErrors } = useWizard();
  const oke = platform.okeParams ?? okeDefaultParams(model.network);
  const instance = platformEnvInstances(platform, model.environments)[0];
  const vcnCidr = instance?.vcnCidr ?? platform.vcnCidr;
  const subnets = instance?.subnets ?? platform.subnets;
  const profileError = oke.clusterSize ? okeProfileCidrError(vcnCidr, oke.clusterSize) : null;
  const conflicts = [
    ...(instance ? vcnErrors[`platform:${platform.id}:${instance.id}`] ?? [] : []),
    ...(profileError ? [profileError] : []),
  ];
  const issues = okeModelIssues(model).filter((issue) => issue.platformId === platform.id);
  const errors = (field: string) => [...new Set(issues.filter((issue) => issue.field === field).map((issue) => issue.message))];

  function setOke(patch: Partial<typeof oke>) {
    onPlatform({ okeParams: { ...oke, ...patch } });
  }

  return (
    <div className="oke-settings-grid" style={{ display: 'grid', gap: 24 }}>
      <div>
        <label style={s.label} htmlFor={`${platform.id}-k8s`}>Kubernetes version</label>
        <ValidatedInput
          id={`${platform.id}-k8s`}
          error={errors('kubernetesVersion')}
          style={s.input}
          value={oke.kubernetesVersion}
          placeholder="v1.36.4"
          onChange={(event) => setOke({ kubernetesVersion: event.target.value })}
        />
      </div>

      <fieldset style={local.group}>
        <legend style={s.subHead}>Networking</legend>
        <div className="oke-fields-grid" style={local.grid}>
          <div>
            <label style={s.label} htmlFor={`${platform.id}-cni`}>Kubernetes CNI</label>
            <select id={`${platform.id}-cni`} value={oke.cniType} onChange={(event) => {
              const cniType = event.target.value as 'native' | 'overlay';
              onPlatform({
                ...(cniType === 'overlay' ? { subnets: platform.subnets.filter((subnet) => subnet.name !== 'pods') } : {}),
                okeParams: { ...oke, cniType, podsCidr: cniType === 'overlay' ? oke.podsCidr || '10.244.0.0/16' : undefined },
              });
            }}>
              <option value="native">VCN Native</option>
              <option value="overlay">Overlay (Flannel)</option>
            </select>
          </div>
          <div>
            <div className="studio-info-heading">
              <label style={s.label} htmlFor={`${platform.id}-size`}>Network profile</label>
              <InfoButton title="OKE network profiles">
                <p>Small, Medium and Large use /20, /18 and /16 VCNs respectively. The profile allocates the required subnets for the selected pod networking and File Storage settings.</p>
                <p>Choose Manual subnets to edit those subnet ranges yourself. Changing a profile recalculates this cluster’s network, so review its address plan afterward.</p>
              </InfoButton>
            </div>
            <select
              id={`${platform.id}-size`}
              {...fieldErrorProps(`${platform.id}-size-error`, errors('clusterSize'))}
              value={oke.clusterSize ?? 'manual'}
              onChange={(event) => {
                const size = event.target.value === 'manual' ? undefined : event.target.value as 'small' | 'medium' | 'large';
                onPlatform(okeNetworkProfilePatch(platform, size));
              }}
            >
              <option value="manual">Manual subnets</option>
              <option value="small">Small (/20)</option>
              <option value="medium">Medium (/18)</option>
              <option value="large">Large (/16)</option>
            </select>
            <FieldError id={`${platform.id}-size-error`} error={errors('clusterSize')} />
          </div>
        </div>

        <VcnEditor
          idPrefix={oke.clusterSize && instance ? `platform-${platform.id}-${instance.id}` : `plat-${platform.id}`}
          vcnCidr={vcnCidr}
          subnets={subnets}
          conflicts={conflicts}
          readOnlySubnets={Boolean(oke.clusterSize)}
          emptyNote="Define the required OKE subnet roles for the selected CNI shape."
          onApply={(patch) => {
            if (oke.clusterSize && patch.vcnCidr !== undefined) {
              onPlatform(instance
                ? setOkeEnvironmentCidr(platform, model.environments, instance.id, patch.vcnCidr)
                : { vcnCidr: patch.vcnCidr });
            } else if (!oke.clusterSize) onPlatform(patch);
          }}
        />
        {oke.clusterSize && <p style={{ ...s.help, marginTop: 8 }}>
          The {oke.clusterSize} profile fixes the VCN prefix and calculates these subnets automatically.
        </p>}

        <div className="oke-fields-grid" style={{ ...local.grid, marginTop: 18 }}>
          <div>
            <label style={s.label} htmlFor={`${platform.id}-svc`}>Service CIDR</label>
            <ValidatedInput
              id={`${platform.id}-svc`}
              error={errors('servicesCidr')}
              style={s.input}
              value={oke.servicesCidr}
              onChange={(event) => setOke({ servicesCidr: event.target.value })}
            />
          </div>
          {oke.cniType === 'overlay' && <div>
            <label style={s.label} htmlFor={`${platform.id}-pods`}>Pod CIDR</label>
            <ValidatedInput
              id={`${platform.id}-pods`}
              error={errors('podsCidr')}
              style={s.input}
              placeholder="10.244.0.0/16"
              value={oke.podsCidr ?? ''}
              onChange={(event) => setOke({ podsCidr: event.target.value || undefined })}
            />
          </div>}
        </div>
      </fieldset>

      <fieldset style={local.group}>
        <legend style={s.subHead}>Cluster access</legend>
        <fieldset style={local.group}>
          <legend style={s.label}>API Server allowed CIDRs</legend>
          <div style={{ ...s.tableHead, gridTemplateColumns: 'minmax(0, 1fr) 44px' }}>
            <span>CIDR</span><span />
          </div>
          {oke.apiAllowedCidrs.map((cidr, index) => <div key={index} style={local.cidrRow}>
            <ValidatedInput
              id={index === 0 ? `${platform.id}-api` : `${platform.id}-api-${index}`}
              aria-label={`API Server allowed CIDR ${index + 1}`}
              style={s.rowInput}
              autoFocus={cidr === ''}
              value={cidr}
              error={!parseCidr(cidr) ? 'Enter a valid IPv4 CIDR block.' : null}
              onChange={(event) => setOke({ apiAllowedCidrs: oke.apiAllowedCidrs.map((value, i) => i === index ? event.target.value : value) })}
            />
            <DeleteButton
              label={`Remove API Server CIDR ${index + 1}`}
              style={local.cidrAction}
              onClick={() => setOke({ apiAllowedCidrs: oke.apiAllowedCidrs.filter((_, i) => i !== index) })}
            />
          </div>)}
          {oke.apiAllowedCidrs.length === 0 && <FieldError id={`${platform.id}-api-error`} error={errors('apiAllowedCidrs')} />}
          <button type="button" style={{ ...s.addBtn, marginTop: 12 }} onClick={() => setOke({ apiAllowedCidrs: [...oke.apiAllowedCidrs, ''] })}>Add CIDR block</button>
        </fieldset>

      </fieldset>

      <fieldset style={local.group}>
        <legend style={s.subHead}>Workers</legend>
        <div style={local.switchRow}>
          <div style={{ minWidth: 0 }}>
            <span style={s.label}>Create sample node pool</span>
            <p style={s.help}>Creates one managed pool per cluster with 1 VM.Standard.E5.Flex node (1 OCPU, 8 GB memory). Turn off to create the cluster without worker nodes.</p>
          </div>
          <Switch checked={oke.createNodePools !== false} onChange={(checked) => setOke({ createNodePools: checked })} ariaLabel="Create sample node pool" />
        </div>
        {oke.createNodePools !== false && <div className="oke-fields-grid" style={{ ...local.grid, marginTop: 14 }}>
          <div>
            <label style={s.label} htmlFor={`${platform.id}-img`}>Worker node image</label>
            <select id={`${platform.id}-img`} value={oke.workerImage} onChange={(event) => setOke({ workerImage: event.target.value })}>
              {!['8\\.[0-9]+', '9\\.[0-9]+'].includes(oke.workerImage) && <option value={oke.workerImage} disabled>Select a supported operating system</option>}
              <option value={'8\\.[0-9]+'}>Oracle Linux 8</option>
              <option value={'9\\.[0-9]+'}>Oracle Linux 9</option>
            </select>
          </div>
          <div>
            <label style={s.label} htmlFor={`${platform.id}-boot`}>Worker boot volume (GB)</label>
            <ValidatedInput
              id={`${platform.id}-boot`}
              error={errors('workerBootVolumeSize')}
              type="number"
              min="50"
              max="32768"
              style={s.input}
              value={oke.workerBootVolumeSize}
              onChange={(event) => setOke({ workerBootVolumeSize: Number(event.target.value) })}
            />
          </div>
        </div>}
        <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
          <div style={local.switchRow}>
            <div style={{ minWidth: 0 }}>
              <span style={s.label}>Allow worker internet access</span>
              <p style={s.help}>Allow outbound internet traffic through the configured hub routing. With Flannel, this also controls pod internet access.</p>
            </div>
            <Switch checked={oke.workerInternetAccess !== false} onChange={(checked) => setOke({ workerInternetAccess: checked })} ariaLabel="Allow worker internet access" />
          </div>
          <div style={local.switchRow}>
            <div style={{ minWidth: 0 }}>
              <span style={s.label}>Allow worker spoke connectivity</span>
              <p style={s.help}>Attach a peering NSG allowing traffic to and from the peer CIDRs listed below. Internet access can still allow outbound spoke traffic when this is off. With Flannel, this also applies to pods.</p>
            </div>
            <Switch checked={oke.workerSpokeAccess === true} onChange={(checked) => setOke({ workerSpokeAccess: checked })} ariaLabel="Allow worker spoke connectivity" />
          </div>
        </div>
      </fieldset>

      {oke.cniType === 'native' && <fieldset style={local.group}>
        <legend style={s.subHead}>Pods</legend>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={local.switchRow}>
            <div style={{ minWidth: 0 }}>
              <span style={s.label}>Allow pod internet access</span>
              <p style={s.help}>Allow outbound internet traffic through the configured hub routing.</p>
            </div>
            <Switch checked={oke.podInternetAccess !== false} onChange={(checked) => setOke({ podInternetAccess: checked })} ariaLabel="Allow pod internet access" />
          </div>
          <div style={local.switchRow}>
            <div style={{ minWidth: 0 }}>
              <span style={s.label}>Allow pod spoke connectivity</span>
              <p style={s.help}>Attach a peering NSG allowing traffic to and from the peer CIDRs listed below. Internet access can still allow outbound spoke traffic when this is off.</p>
            </div>
            <Switch checked={oke.podSpokeAccess === true} onChange={(checked) => setOke({ podSpokeAccess: checked })} ariaLabel="Allow pod spoke connectivity" />
          </div>
        </div>
      </fieldset>}

      {(oke.workerSpokeAccess === true || (oke.cniType === 'native' && oke.podSpokeAccess === true) || errors('peerVcnCidrs').length > 0) && <fieldset style={local.group}>
        <legend style={s.subHead}>Peering</legend>
        <fieldset style={local.group}>
          <legend style={s.label}>Peer VCN CIDR blocks</legend>
          <p style={{ ...s.help, marginBottom: 12 }}>Only these CIDRs are permitted by the peering NSG. Attach it using the worker or pod spoke-connectivity switch. External networks also require DRG routes and peering configured separately.</p>
          <div style={{ ...s.tableHead, gridTemplateColumns: 'minmax(0, 1fr) 44px' }}>
            <span>CIDR</span><span />
          </div>
          {(oke.peerVcnCidrs ?? []).map((cidr, index) => <div key={index} style={local.cidrRow}>
            <ValidatedInput
              id={`${platform.id}-peer-${index}`}
              aria-label={`Peer VCN CIDR ${index + 1}`}
              style={s.rowInput}
              autoFocus={cidr === ''}
              value={cidr}
              error={!parseCidr(cidr) || cidr === '0.0.0.0/0' ? 'Enter a peer IPv4 CIDR; 0.0.0.0/0 is not allowed.' : null}
              onChange={(event) => setOke({ peerVcnCidrs: (oke.peerVcnCidrs ?? []).map((value, i) => i === index ? event.target.value : value) })}
            />
            <DeleteButton
              label={`Remove peer CIDR ${index + 1}`}
              style={local.cidrAction}
              onClick={() => setOke({ peerVcnCidrs: (oke.peerVcnCidrs ?? []).filter((_, i) => i !== index) })}
            />
          </div>)}
          <FieldError id={`${platform.id}-peers-error`} error={errors('peerVcnCidrs')} />
          {(oke.peerVcnCidrs ?? []).length === 0 && <p style={{ ...s.help, marginTop: 8 }}>No peer CIDRs selected. No peering NSG will be created or attached.</p>}
          <button type="button" style={{ ...s.addBtn, marginTop: 12 }} onClick={() => setOke({ peerVcnCidrs: [...oke.peerVcnCidrs ?? [], ''] })}>Add peer CIDR block</button>
        </fieldset>
      </fieldset>}

      <fieldset className="oke-features-group" style={local.group}>
        <legend style={s.subHead}>Optional features</legend>
        <div className="oke-feature-grid" style={local.grid}>
          <div style={local.switchRow}>
            <span style={local.switchLabel}>
              <span>Allow public load balancers</span>
              <InfoButton title="Public load balancers"><p>Creates the Hub frontend networking and IAM prerequisites. OCI creates a load balancer only when a Kubernetes Service requests one.</p></InfoButton>
            </span>
            <Switch checked={oke.publicLoadBalancer} onChange={(checked) => setOke({ publicLoadBalancer: checked })} ariaLabel="Allow public load balancers" />
          </div>
          <div style={local.switchRow}>
            <span style={local.switchLabel}>
              <span>Enable File Storage support</span>
              <InfoButton title="File Storage support"><p>Creates FSS networking and IAM prerequisites. Configure file systems, mount targets and Kubernetes storage objects separately.</p></InfoButton>
            </span>
            <Switch checked={oke.createFss} onChange={(checked) => setOke({ createFss: checked })} ariaLabel="Enable File Storage support" />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
