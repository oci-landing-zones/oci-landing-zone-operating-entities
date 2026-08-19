/**
 * PlatformTemplatesStep — step 4 ("Platforms"). Two parts:
 *   1. Optional shared platforms — repeatable, removable Custom or OCVS entries.
 *   2. Environment platforms — VCN-bearing compartments dropped into one/all/a
 *      subset of the environments. Pick a supported type (OKE, OCVS, or
 *      Custom), name it, choose placement. OKE defaults to the generator-owned
 *      small profile and exposes its cluster settings; Custom starts empty. Each
 *      platform shows a generated per-environment table (its VCN per env) with a
 *      per-env override.
 *
 * Everything writes into the canonical model (model.sharedPlatforms + model.platforms);
 * the diagram and JSON derive from it.
 */

import { useState, type CSSProperties } from 'react';
import { useWizard } from '../wizardContext';
import { oracle } from '../../theme';
import { getHubKind } from '../../services/hubKinds';
import type { PlatformConfig, PlatformType, SharedPlatformConfig, Subnet } from '../../model/types';
import {
  PLATFORM_TYPES, newPlatform, newSharedPlatform, ocvsDefaultParams, ocvsDefaultSubnets, okeDefaultParams, okeDefaultSubnets, okeProfileSubnets, platformEnvInstances, platformTypeMeta,
} from '../../services/platforms';
import { VcnEditor } from './HubNetworkStep';
import { s } from './networkEditorStyles';
import DeleteButton from '../../components/DeleteButton';
import Switch from '../../components/Switch';

const local: Record<string, CSSProperties> = {
  chip:       { padding: '5px 12px', fontSize: 12.5, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 999, background: oracle.surface, color: oracle.text, cursor: 'pointer' },
  chipActive: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.red },
  pillWrap:   { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  typeBadge:  { display: 'inline-block', padding: '2px 9px', fontSize: 11, fontWeight: 800, color: '#fff', background: oracle.cidrBlue, borderRadius: 999, letterSpacing: 0.2 },
  card:       { border: `1px solid ${oracle.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  cardHead:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: oracle.surfaceAlt, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' },
  cardName:   { fontSize: 15, fontWeight: 800, color: oracle.ink },
  cardBody:   { padding: '4px 16px 18px' },
  note:       { fontSize: 12.5, color: oracle.textMuted, marginBottom: 14, lineHeight: 1.5 },
  okeGrid:    { display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 8, alignItems: 'start' },
  settingsFields: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px 24px' },
  group:      { border: `1px solid ${oracle.border}`, borderRadius: 6, padding: 16, background: oracle.surface, minWidth: 0 },
  groupTitle: { fontSize: 12, fontWeight: 800, color: oracle.ink, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  switchRow:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: `1px solid ${oracle.border}` },
  switchCopy: { minWidth: 0, fontSize: 14, lineHeight: 1.35 },
  featureGrid:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', columnGap: 24 },
  subnetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 12 },
  subnetCell: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '9px 11px', border: `1px solid ${oracle.border}`, borderRadius: 4, background: oracle.surface },
  subnetName: { fontSize: 11.5, fontWeight: 800, color: oracle.text, textTransform: 'uppercase', letterSpacing: 0.25 },
  subnetCidr: { fontSize: 12.5, color: oracle.cidrBlue, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'nowrap' },
  genTable:   { width: '100%', borderCollapse: 'collapse', marginTop: 6 },
  genTh:      { textAlign: 'left', fontSize: 11, fontWeight: 700, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, padding: '6px 8px', borderBottom: `1px solid ${oracle.border}` },
  genTd:      { fontSize: 12.5, padding: '7px 8px', borderBottom: `1px solid ${oracle.border}`, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: oracle.text },
  linkBtn:    { background: 'none', border: 'none', color: oracle.cidrBlue, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', padding: 0, fontFamily: 'inherit' },
  overrideTag:{ fontSize: 11, fontWeight: 700, color: oracle.red, marginLeft: 6 },
  prefixWrap: { display: 'flex', alignItems: 'stretch', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, overflow: 'hidden', background: oracle.surface },
  prefix:     { display: 'flex', alignItems: 'center', padding: '0 10px', background: oracle.surfaceAlt, borderRight: `1px solid ${oracle.border}`, fontSize: 14, fontWeight: 700, color: oracle.textMuted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  prefixInput:{ flex: 1, border: 'none', outline: 'none', padding: '8px 10px', fontSize: 14, background: 'transparent', color: oracle.text, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  fieldHint:  { fontSize: 11.5, color: oracle.textMuted, marginTop: 4 },
};

/** The currently supported one-SDDC OCVS input contract. */
function OcvsSettingsFields({ id, value, onChange }: {
  id: string;
  value: ReturnType<typeof ocvsDefaultParams>;
  onChange: (patch: Partial<ReturnType<typeof ocvsDefaultParams>>) => void;
}) {
  return (
    <div style={s.subCard}>
      <div style={s.subHead}>OCVS management cluster</div>
      <div style={local.note}>One platform creates one SDDC management cluster. An SSH public key is required. HCX is not included in this deployment package.</div>
      <div style={local.okeGrid}>
        <div><label style={s.addLabel} htmlFor={`${id}-ssh`}>SSH public key</label><input id={`${id}-ssh`} style={s.rowInput} value={value.sshAuthorizedKeys} onChange={(e) => onChange({ sshAuthorizedKeys: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-sddc`}>SDDC name</label><input id={`${id}-sddc`} style={s.rowInput} value={value.sddcDisplayName} onChange={(e) => onChange({ sddcDisplayName: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-cluster`}>Cluster name</label><input id={`${id}-cluster`} style={s.rowInput} value={value.clusterDisplayName} onChange={(e) => onChange({ clusterDisplayName: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-hosts`}>ESXi hosts</label><input id={`${id}-hosts`} type="number" min="1" style={s.rowInput} value={value.esxiHostsCount} onChange={(e) => onChange({ esxiHostsCount: Number(e.target.value) })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-vmware`}>VMware version</label><input id={`${id}-vmware`} style={s.rowInput} value={value.vmwareSoftwareVersion} onChange={(e) => onChange({ vmwareSoftwareVersion: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-ad`}>Availability domain</label><input id={`${id}-ad`} style={s.rowInput} value={value.computeAvailabilityDomain} onChange={(e) => onChange({ computeAvailabilityDomain: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-vsphere`}>vSphere type</label><input id={`${id}-vsphere`} style={s.rowInput} value={value.vsphereType} onChange={(e) => onChange({ vsphereType: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-ocpu`}>Initial host OCPUs</label><input id={`${id}-ocpu`} type="number" min="1" style={s.rowInput} value={value.initialHostOcpuCount} onChange={(e) => onChange({ initialHostOcpuCount: Number(e.target.value) })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-shape`}>Initial host shape</label><input id={`${id}-shape`} style={s.rowInput} value={value.initialHostShapeName} onChange={(e) => onChange({ initialHostShapeName: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-workload`}>Workload network CIDR</label><input id={`${id}-workload`} style={s.rowInput} value={value.workloadNetworkCidr} onChange={(e) => onChange({ workloadNetworkCidr: e.target.value })} /></div>
      </div>
    </div>
  );
}

/** One optional shared platform card. */
function SharedPlatformPanel({ platform, open, onToggle, onChange, onDelete }: {
  platform: SharedPlatformConfig;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<SharedPlatformConfig>) => void;
  onDelete: () => void;
}) {
  const { key, vcnCidr, subnets } = platform;
  const isOcvs = platform.type === 'ocvs';
  const ocvs = platform.ocvsParams ?? ocvsDefaultParams();
  // The generator folds this name into an OCI DNS label capped at 15 chars
  // (`vcn` + region + `lz` + `sh` + name), leaving 5 with a 3-char region.
  const nameLimit = isOcvs ? 3 : 5;
  const nameErr = key.trim().length > nameLimit ? `Keep it to ${nameLimit} characters — it goes into a 15-char OCI DNS label.` : '';
  return (
    <div style={local.card}>
      <button type="button" style={local.cardHead} onClick={onToggle} aria-expanded={open}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{open ? '▾' : '▸'}</span>
          <span style={local.cardName}>{key}</span>
          <span style={local.typeBadge}>{isOcvs ? 'OCVS' : 'Custom'}</span>
        </span>
        <span style={local.fieldHint}>{vcnCidr}</span>
      </button>
      {open && <div style={local.cardBody}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}>
          <DeleteButton label={`Delete shared platform ${key}`} onClick={onDelete} />
        </div>

        <label style={s.label} htmlFor={`shared-platform-${platform.id}-type`}>Platform type</label>
        <select
          id={`shared-platform-${platform.id}-type`}
          style={{ ...s.select, marginBottom: 14 }}
          value={isOcvs ? 'ocvs' : 'custom'}
          onChange={(e) => {
            const type = e.target.value as 'custom' | 'ocvs';
            onChange(type === 'ocvs'
              ? { type, key: platform.key.trim().length <= 3 ? platform.key : 'ocv', subnets: [], ocvsParams: platform.ocvsParams ?? ocvsDefaultParams() }
              : { type, subnets: platform.subnets.length ? platform.subnets : [{ name: 'core', cidr: vcnCidr.replace(/\/\d+$/, '/24') }], ocvsParams: undefined });
          }}
        >
          <option value="custom">Custom network</option>
          <option value="ocvs">OCVS management cluster</option>
        </select>

        <label style={s.label} htmlFor={`shared-platform-${platform.id}-key`}>Platform name</label>
        <input id={`shared-platform-${platform.id}-key`} style={s.input} value={key} placeholder="core" onChange={(e) => onChange({ key: e.target.value })} />
        <div style={local.fieldHint}>Used to create consistent names for this platform's OCI resources.</div>
        {nameErr && <div style={s.errText}>{nameErr}</div>}

        {isOcvs ? (
          <>
            <OcvsSettingsFields id={`shared-ocvs-${platform.id}`} value={ocvs} onChange={(patch) => onChange({ ocvsParams: { ...ocvs, ...patch } })} />
            <div style={{ ...s.subCard, marginTop: 12 }}>
              <div style={s.subHead}>OCVS platform VCN</div>
              <input id={`shared-ocvs-${platform.id}-vcn`} aria-label={`VCN CIDR for shared platform ${key}`} style={s.rowInput} value={vcnCidr} onChange={(e) => onChange({ vcnCidr: e.target.value, subnets: [] })} />
              <div style={local.fieldHint}>Use /21, /22, /23, or /24. The deployment package reserves this provisioning subnet: {ocvsDefaultSubnets(vcnCidr)[0]?.cidr ?? 'choose a supported VCN prefix'}.</div>
            </div>
          </>
        ) : (
          <VcnEditor
            idPrefix={`shared-platform-${platform.id}`}
            vcnCidr={vcnCidr}
            subnets={subnets}
            emptyNote="The shared platform needs at least one subnet — add one below."
            onApply={(patch) => onChange(patch)}
          />
        )}
      </div>}
    </div>
  );
}

/** All/subset placement chips (mirrors the projects "Apply to" control). */
function PlacementChips({ value, environments, onChange }: {
  value: 'all' | string[];
  environments: { id: string; name: string }[];
  onChange: (next: 'all' | string[]) => void;
}) {
  function toggle(env: string) {
    onChange(value === 'all' ? [env] : value.includes(env) ? value.filter((x) => x !== env) : [...value, env]);
  }
  return (
    <div style={local.pillWrap} role="group" aria-label="Platform placement">
      <button type="button" style={value === 'all' ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => onChange('all')}>All</button>
      {environments.map((env) => {
        const active = value !== 'all' && value.includes(env.id);
        return <button key={env.id} type="button" style={active ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => toggle(env.id)}>{env.name}</button>;
      })}
    </div>
  );
}

/** The generated per-environment table for one platform, with a per-env override editor. */
function PerEnvTable({ platform, environments, onPlatform }: {
  platform: PlatformConfig;
  environments: { id: string; name: string }[];
  onPlatform: (patch: Partial<PlatformConfig>) => void;
}) {
  const [editEnv, setEditEnv] = useState<string | null>(null);
  const instances = platformEnvInstances(platform, environments);
  const profileOwned = (platform.type === 'oke_simple' && !!platform.okeParams?.clusterSize) || platform.type === 'ocvs';

  function setOverride(env: string, patch: { vcnCidr?: string; subnets?: Subnet[] }) {
    const cur = platform.overrides?.[env] ?? {};
    onPlatform({ overrides: { ...platform.overrides, [env]: { ...cur, ...patch } } });
  }
  function resetOverride(env: string) {
    const next = { ...platform.overrides };
    delete next[env];
    onPlatform({ overrides: next });
    if (editEnv === env) setEditEnv(null);
  }

  if (instances.length === 0) {
    return <div style={{ ...s.empty, borderRadius: 6, borderTop: `1px dashed ${oracle.border}` }}>Not placed in any environment yet — pick a placement above.</div>;
  }

  return (
    <div>
      <div className="platform-placement-table">
        <table style={local.genTable}>
          <thead>
            <tr>
              <th style={local.genTh}>Env</th>
              <th style={local.genTh}>VCN</th>
              <th style={local.genTh}>Subnets</th>
              <th style={{ ...local.genTh, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst) => (
              <tr key={inst.id}>
                <td style={local.genTd}>{inst.name}</td>
                <td style={local.genTd}>
                  {inst.vcnCidr}
                  {inst.overridden && <span style={local.overrideTag}>override</span>}
                </td>
                <td style={local.genTd}>{inst.subnets.length === 0 ? 'auto' : `${inst.subnets.length} subnet${inst.subnets.length === 1 ? '' : 's'}`}</td>
                <td style={{ ...local.genTd, textAlign: 'right' }}>
                  {profileOwned ? (
                    inst.overridden
                      ? <button type="button" style={{ ...local.linkBtn, color: oracle.red }} onClick={() => resetOverride(inst.id)}>Reset stale override</button>
                      : <span style={local.fieldHint}>Automatic</span>
                  ) : (
                    <>
                      <button type="button" style={local.linkBtn} onClick={() => setEditEnv(editEnv === inst.id ? null : inst.id)}>
                        {editEnv === inst.id ? 'Close' : 'Edit'}
                      </button>
                      {inst.overridden && <button type="button" style={{ ...local.linkBtn, color: oracle.red, marginLeft: 12 }} onClick={() => resetOverride(inst.id)}>Reset</button>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editEnv && (() => {
        const inst = instances.find((x) => x.id === editEnv);
        if (!inst) return null;
        return (
          <div style={{ ...s.subCard, marginTop: 14 }}>
            <div style={s.subHead}>Override — {inst.name}</div>
            <VcnEditor
              idPrefix={`plat-${platform.id}-ov-${editEnv}`}
              vcnCidr={inst.vcnCidr}
              subnets={inst.subnets}
              emptyNote="No subnets — add one below, or leave empty."
              onApply={(patch) => setOverride(editEnv, patch)}
            />
          </div>
        );
      })()}
    </div>
  );
}

/** One platform card: header (name + type + placement + delete) and an expandable body. */
function PlatformCard({ platform, environments, open, onToggle, onPlatform, onDelete }: {
  platform: PlatformConfig;
  environments: { id: string; name: string }[];
  open: boolean;
  onToggle: () => void;
  onPlatform: (patch: Partial<PlatformConfig>) => void;
  onDelete: () => void;
}) {
  const meta = platformTypeMeta(platform.type);
  const isOke = platform.type === 'oke_simple';
  const isOcvs = platform.type === 'ocvs';
  const oke = platform.okeParams ?? okeDefaultParams();
  const ocvs = platform.ocvsParams ?? ocvsDefaultParams();
  function setOke(patch: Partial<typeof oke>) { onPlatform({ okeParams: { ...oke, ...patch } }); }
  function setOcvs(patch: Partial<typeof ocvs>) { onPlatform({ ocvsParams: { ...ocvs, ...patch } }); }

  return (
    <div style={local.card}>
      <button type="button" style={local.cardHead} onClick={onToggle} aria-expanded={open}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: oracle.ink }}>{open ? '▾' : '▸'}</span>
          <span style={local.cardName}>{platform.key}</span>
          <span style={local.typeBadge}>{meta.label}</span>
        </span>
        <span style={{ fontSize: 12.5, color: oracle.textMuted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {platform.environments === 'all' ? 'all envs' : `${platform.environments.length} env${platform.environments.length === 1 ? '' : 's'}`} · {platform.vcnCidr}
        </span>
      </button>

      {open && (
        <div style={local.cardBody}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Placement</label>
              <PlacementChips value={platform.environments} environments={environments} onChange={(next) => onPlatform({ environments: next })} />
            </div>
            <DeleteButton label={`Delete platform ${platform.key}`} onClick={onDelete} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label} htmlFor={`${platform.id}-key`}>Platform name</label>
            <input id={`${platform.id}-key`} style={s.rowInput} value={platform.key} onChange={(e) => onPlatform({ key: e.target.value })} />
            <div style={local.fieldHint}>Used to create consistent names for this platform's compartment, network, gateway, and DRG attachment.</div>
          </div>

          {isOke && (
            <div style={s.subCard}>
              <div style={s.subHead}>OKE settings</div>
              <div className="oke-settings-grid" style={local.okeGrid}>
                <div style={local.group}>
                  <div style={local.groupTitle}>Cluster</div>
                  <div className="oke-fields-grid" style={local.settingsFields}>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-k8s`}>Kubernetes version</label><input id={`${platform.id}-k8s`} style={s.rowInput} value={oke.kubernetesVersion} onChange={(e) => setOke({ kubernetesVersion: e.target.value })} /></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-api`}>API endpoint allowed CIDRs</label><input id={`${platform.id}-api`} style={s.rowInput} value={oke.apiAllowedCidrs.join(', ')} onChange={(e) => setOke({ apiAllowedCidrs: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></div>
                  </div>
                </div>
                <div style={local.group}>
                  <div style={local.groupTitle}>Networking</div>
                  <div className="oke-fields-grid" style={local.settingsFields}>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-svc`}>Services CIDR</label><input id={`${platform.id}-svc`} style={s.rowInput} value={oke.servicesCidr} onChange={(e) => setOke({ servicesCidr: e.target.value })} /></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-cni`}>Pod networking</label><select id={`${platform.id}-cni`} style={s.select} value={oke.cniType} onChange={(e) => {
                      const cniType = e.target.value as 'native' | 'overlay';
                      if (cniType === 'overlay') onPlatform({ subnets: platform.subnets.filter((sn) => sn.name !== 'pods') });
                      setOke({ cniType, ...(cniType === 'overlay' && !oke.podsCidr ? { podsCidr: '10.244.0.0/16' } : {}) });
                    }}><option value="native">Native VCN</option><option value="overlay">Overlay (Flannel)</option></select></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-size`}>Network profile</label><select id={`${platform.id}-size`} style={s.select} value={oke.clusterSize ?? 'manual'} onChange={(e) => {
                      const size = e.target.value === 'manual' ? undefined : e.target.value as 'small' | 'medium' | 'large';
                      if (!size) {
                        onPlatform({ subnets: okeDefaultSubnets(platform.vcnCidr).filter((sn) => oke.cniType === 'native' || sn.name !== 'pods') });
                        setOke({ clusterSize: undefined });
                        return;
                      }
                      const prefix = size === 'small' ? 20 : size === 'medium' ? 18 : 16;
                      onPlatform({ subnets: [], vcnCidr: `${platform.vcnCidr.split('/')[0]}/${prefix}` });
                      setOke({ clusterSize: size });
                    }}><option value="manual">Manual subnets</option><option value="small">Small (/20)</option><option value="medium">Medium (/18)</option><option value="large">Large (/16)</option></select></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-pods`}>Pod CIDR</label><input id={`${platform.id}-pods`} style={s.rowInput} placeholder={oke.cniType === 'overlay' ? '10.244.0.0/16' : 'Optional for native'} value={oke.podsCidr ?? ''} onChange={(e) => setOke({ podsCidr: e.target.value || undefined })} /></div>
                  </div>
                </div>
                <div style={local.group}>
                  <div style={local.groupTitle}>Workers</div>
                  <div className="oke-fields-grid" style={local.settingsFields}>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-img`}>Worker image selector</label><input id={`${platform.id}-img`} style={s.rowInput} value={oke.workerImage} onChange={(e) => setOke({ workerImage: e.target.value })} /></div>
                    <div><label style={s.addLabel} htmlFor={`${platform.id}-boot`}>Worker boot volume (GB)</label><input id={`${platform.id}-boot`} type="number" min="50" max="32768" style={s.rowInput} value={oke.workerBootVolumeSize} onChange={(e) => setOke({ workerBootVolumeSize: Number(e.target.value) })} /></div>
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
              {oke.clusterSize && <div style={local.fieldHint}>This network profile sets the subnet layout. To define subnets yourself, select Manual subnets.</div>}
            </div>
          )}

          {isOcvs && <OcvsSettingsFields id={`${platform.id}-ocvs`} value={ocvs} onChange={setOcvs} />}

          <div style={{ marginTop: 6 }}>
            <label style={s.label}>Platform VCN &amp; subnets</label>
            {isOke && oke.clusterSize ? (
              <div style={{ ...s.subCard, marginTop: 0 }}>
                <div style={s.subHead}>{oke.clusterSize} network profile · {platform.vcnCidr}</div>
                <div style={local.fieldHint}>This profile reserves the following subnets. Select Manual subnets only when you need a different address plan.</div>
                <div style={local.subnetGrid} role="list" aria-label="Network profile subnet allocation">
                  {okeProfileSubnets(platform.vcnCidr, oke.clusterSize, oke.cniType, oke.createFss).map((sn) => (
                    <div key={sn.name} style={local.subnetCell} role="listitem">
                      <span style={local.subnetName}>{sn.name.replace('-', ' ')}</span>
                      <code style={local.subnetCidr}>{sn.cidr}</code>
                    </div>
                  ))}
                </div>
              </div>
            ) : isOcvs ? (
              <div style={{ ...s.subCard, marginTop: 0 }}>
                <div style={s.subHead}>OCVS provisioning network</div>
                <input id={`${platform.id}-ocvs-vcn`} style={s.rowInput} value={platform.vcnCidr} onChange={(e) => onPlatform({ vcnCidr: e.target.value, subnets: [] })} />
                <div style={local.fieldHint}>Use /21, /22, /23, or /24. The deployment package reserves this provisioning subnet: {ocvsDefaultSubnets(platform.vcnCidr)[0]?.cidr ?? 'choose a supported VCN prefix'}.</div>
              </div>
            ) : (
              <VcnEditor
                idPrefix={`plat-${platform.id}`}
                vcnCidr={platform.vcnCidr}
                subnets={platform.subnets}
                emptyNote={isOke ? 'Define the required OKE subnet roles for the selected CNI shape.' : isOcvs ? 'OCVS requires its provisioning subnet.' : 'No subnets yet — add one below with +.'}
                onApply={(patch) => onPlatform(patch)}
              />
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={s.label}>Per-environment settings</label>
            <PerEnvTable platform={platform} environments={environments} onPlatform={onPlatform} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlatformTemplatesStep() {
  const { model, setField } = useWizard();
  const kind = getHubKind(model.network.hubKind);
  const environments = model.environments.map((e, i) => ({ id: e.id, name: e.name.trim() || `env${i + 1}` }));

  const [openId, setOpenId] = useState<string | null>(null);
  const [openSharedId, setOpenSharedId] = useState<string | null>(null);
  const [newSharedType, setNewSharedType] = useState<'custom' | 'ocvs'>('custom');
  const [newType, setNewType] = useState<PlatformType>('oke_simple');
  const [newName, setNewName] = useState('');

  function setPlatforms(next: PlatformConfig[]) { setField('platforms', next); }
  function setSharedPlatforms(next: SharedPlatformConfig[]) { setField('sharedPlatforms', next); }
  function updateSharedPlatform(id: string, patch: Partial<SharedPlatformConfig>) {
    setSharedPlatforms(model.sharedPlatforms.map((platform) => platform.id === id ? { ...platform, ...patch } : platform));
  }
  function addSharedPlatform() {
    const occupied = [
      model.network.hubVcnCidr,
      ...model.environments.map((env) => env.network.vcnCidr),
      ...model.platforms.flatMap((platform) => platformEnvInstances(platform, environments).map((instance) => instance.vcnCidr)),
    ];
    const platform = newSharedPlatform(newSharedType, model.sharedPlatforms, occupied);
    setSharedPlatforms([...model.sharedPlatforms, platform]);
    setOpenSharedId(platform.id);
  }
  function updatePlatform(id: string, patch: Partial<PlatformConfig>) {
    setPlatforms(model.platforms.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function delPlatform(id: string) { setPlatforms(model.platforms.filter((p) => p.id !== id)); }
  function addPlatform() {
    const created = newPlatform(newType, model.platforms);
    const platform = { ...created, key: newName.trim() || created.key };
    setPlatforms([...model.platforms, platform]);
    setOpenId(platform.id);
    setNewName('');
  }

  // Platforms build on the spoke layer — they need an implemented hub kind.
  if (!kind?.implemented) {
    return (
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Platforms</div>
          <div style={{ ...s.empty, borderTop: `1px dashed ${oracle.border}`, borderRadius: 6 }}>
            Choose an implemented hub model in step 2 first — platforms build on the environment networks.
          </div>
        </div>
      </section>
    );
  }

  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Shared platforms</div>
          <div style={local.note}>Optional platforms for services shared by more than one environment. Add one only when the same service must be used across environments.</div>
          {model.sharedPlatforms.length === 0 && (
            <div style={{ ...s.empty, borderRadius: 6, borderTop: `1px dashed ${oracle.border}`, marginBottom: 14 }}>No shared platforms. Add one only when a workload must be shared across environments.</div>
          )}
          {model.sharedPlatforms.map((platform) => (
            <SharedPlatformPanel
              key={platform.id}
              platform={platform}
              open={openSharedId === platform.id}
              onToggle={() => setOpenSharedId(openSharedId === platform.id ? null : platform.id)}
              onChange={(patch) => updateSharedPlatform(platform.id, patch)}
              onDelete={() => setSharedPlatforms(model.sharedPlatforms.filter((candidate) => candidate.id !== platform.id))}
            />
          ))}
          <div style={s.subCard}>
            <div style={s.subHead}>Add shared platform</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={s.addLabel} htmlFor="new-shared-platform-type">Type</label>
                <select id="new-shared-platform-type" style={s.select} value={newSharedType} onChange={(e) => setNewSharedType(e.target.value as 'custom' | 'ocvs')}>
                  <option value="custom">Custom network</option>
                  <option value="ocvs">OCVS management cluster</option>
                </select>
              </div>
              <button type="button" style={s.addBtn} onClick={addSharedPlatform}>Add shared platform</button>
            </div>
          </div>
        </div>
      </section>

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Environment platforms</div>
          <div style={local.note}>
            Add a platform when a workload needs its own network, such as an OKE or OCVS platform. Each selected environment receives a separate platform network.
          </div>

          {model.platforms.length === 0 && (
            <div style={{ ...s.empty, borderRadius: 6, borderTop: `1px dashed ${oracle.border}`, marginBottom: 14 }}>
              No platforms yet — add one below.
            </div>
          )}

          {model.platforms.map((p) => (
            <PlatformCard
              key={p.id}
              platform={p}
              environments={environments}
              open={openId === p.id}
              onToggle={() => setOpenId(openId === p.id ? null : p.id)}
              onPlatform={(patch) => updatePlatform(p.id, patch)}
              onDelete={() => delPlatform(p.id)}
            />
          ))}

          <div style={s.subCard}>
            <div style={s.subHead}>Add platform</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={s.addLabel} htmlFor="new-platform-type">Type</label>
                <select id="new-platform-type" style={s.select} value={newType} onChange={(e) => setNewType(e.target.value as PlatformType)}>
                  {PLATFORM_TYPES.map((t) => (
                    <option key={t.type} value={t.type} disabled={!t.deployable}>
                      {t.label}{t.note ? ` (${t.note})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.addLabel} htmlFor="new-platform-name">Name</label>
                <input
                  id="new-platform-name"
                  style={s.rowInput}
                  placeholder={newType === 'oke_simple' ? 'oke' : 'custom'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addPlatform(); }}
                />
              </div>
              <button type="button" style={s.addBtn} onClick={addPlatform}>Add platform</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
