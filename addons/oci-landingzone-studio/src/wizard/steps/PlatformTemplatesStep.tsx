/**
 * PlatformTemplatesStep — step 4 ("Platforms"). Two parts:
 *   1. Optional shared platforms — repeatable, removable Custom or Exadata entries.
 *   2. Environment platforms — VCN-bearing compartments dropped into one/all/a
 *      subset of the environments. Pick a supported type (OKE, Custom, or
 *      Exadata), name it, choose placement for Custom or Exadata. OKE creates
 *      one independent card per environment and defaults to the generator-owned
 *      small profile and exposes its cluster settings; Custom starts empty. Each
 *      platform shows a generated per-environment table (its VCN per env) with a
 *      per-env override.
 *
 * Everything writes into the canonical model (model.sharedPlatforms + model.platforms);
 * the diagram and JSON derive from it.
 */

import { createOkeEntries } from '../../services/okePlacements';
import { useState, type CSSProperties } from 'react';
import { useWizard } from '../wizardContext';
import { oracle } from '../../theme';
import { getHubKind } from '../../services/hubKinds';
import { addExadataPlatform, configuredVcnCidrs } from '../../services/exadata';
import { exadataReadiness } from '../../services/platformReadiness';
import type { PlatformConfig, PlatformType, SharedPlatformConfig, Subnet } from '../../model/types';
import {
  PLATFORM_TYPES, OKE_PROFILE_PREFIX, okeProfileCidrError, setOkeEnvironmentCidr, applyPlatformPatch, resetPlatformEnvironment, newPlatform, newSharedPlatform, okeDefaultParams, okeProfileSubnets, placementsOverlap, platformEnvInstances, platformInEnv, platformTypeMeta,
} from '../../services/platforms';
import { VcnEditor } from './HubNetworkStep';
import { s } from './networkEditorStyles';
import DeleteButton from '../../components/DeleteButton';
import OkeSettingsFields from '../../components/OkeSettingsFields';
import ExadataStep from './ExadataStep';
import FieldError, { ErrorNotice } from '../../components/FieldError';
import InfoButton from '../../components/InfoButton';
import ValidatedInput from '../../components/ValidatedInput';
import { configKeyError, fieldErrorProps } from '../../services/fieldErrors';

type ExadataType = 'exacc' | 'exacs';
type AddPlatformType = PlatformType | ExadataType;
const EXADATA_TYPES: ExadataType[] = ['exacc', 'exacs'];

function isExadataType(type: AddPlatformType): type is ExadataType {
  return type === 'exacc' || type === 'exacs';
}

const local: Record<string, CSSProperties> = {
  chip:       { padding: '5px 12px', fontSize: 12.5, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 999, background: oracle.surface, color: oracle.text, cursor: 'pointer' },
  chipActive: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.red },
  pillWrap:   { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  typeBadge:  { display: 'inline-block', padding: '2px 9px', fontSize: 11, fontWeight: 800, color: '#fff', background: oracle.cidrBlue, borderRadius: 999, letterSpacing: 0.2 },
  card:       { border: `1px solid ${oracle.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  cardHead:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: oracle.surfaceAlt, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' },
  cardName:   { fontSize: 15, fontWeight: 800, color: oracle.ink },
  cardBody:   { padding: '4px 16px 18px' },
  note:       s.intro,
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

/** One optional shared platform card. */
function SharedPlatformPanel({ platform, open, onToggle, onChange, onDelete }: {
  platform: SharedPlatformConfig;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<SharedPlatformConfig>) => void;
  onDelete: () => void;
}) {
  const { model, vcnErrors } = useWizard();
  const { key, vcnCidr, subnets } = platform;
  // The generator folds this name into an OCI DNS label capped at 15 chars
  // (`vcn` + region + `lz` + `sh` + name), leaving 5 with a 3-char region.
  const nameErr = configKeyError(key, model.sharedPlatforms.filter((other) => other.id !== platform.id).map((other) => other.key), 5);
  const conflicts = vcnErrors[`shared:${platform.id}`] ?? [];
  return (
    <div style={local.card}>
      <button type="button" style={local.cardHead} onClick={onToggle} aria-expanded={open}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{open ? '▾' : '▸'}</span>
          <span style={local.cardName}>{key}</span>
          <span style={local.typeBadge}>Custom</span>
        </span>
        <span style={local.fieldHint}>{vcnCidr}</span>
      </button>
      {open && <div style={local.cardBody}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}>
          <DeleteButton label={`Delete shared platform ${key}`} onClick={onDelete} />
        </div>

        <label style={s.label} htmlFor={`shared-platform-${platform.id}-key`}>Platform name</label>
        <ValidatedInput id={`shared-platform-${platform.id}-key`} error={nameErr} style={s.input} value={key} placeholder="core" onChange={(e) => onChange({ key: e.target.value })} />
        <div style={local.fieldHint}>Used to create consistent names for this platform's OCI resources.</div>

        <VcnEditor
          idPrefix={`shared-platform-${platform.id}`}
          conflicts={conflicts}
          vcnCidr={vcnCidr}
          subnets={subnets}
          emptyNote="The shared platform needs at least one subnet — add one below."
          onApply={(patch) => onChange(patch)}
        />
      </div>}
    </div>
  );
}

/** All/subset placement chips (mirrors the projects "Apply to" control). */
function PlacementChips({ id, value, environments, onChange }: {
  id: string;
  value: 'all' | string[];
  environments: { id: string; name: string }[];
  onChange: (next: 'all' | string[]) => void;
}) {
  const error = value !== 'all' && (!value.length || value.some((env) => !environments.some((candidate) => candidate.id === env)))
    ? 'Select at least one available environment.' : null;
  function toggle(env: string) {
    onChange(value === 'all' ? [env] : value.includes(env) ? value.filter((x) => x !== env) : [...value, env]);
  }
  return (
    <div><div style={local.pillWrap} role="group" aria-label="Platform placement" {...fieldErrorProps(`${id}-placement-error`, error)}>
      <button type="button" style={value === 'all' ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => onChange('all')}>All</button>
      {environments.map((env) => {
        const active = value !== 'all' && value.includes(env.id);
        return <button key={env.id} type="button" style={active ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => toggle(env.id)}>{env.name}</button>;
      })}
    </div><FieldError id={`${id}-placement-error`} error={error} /></div>
  );
}

/** The generated per-environment table for one platform, with a per-env override editor. */
function PerEnvTable({ platform, environments, onPlatform }: {
  platform: PlatformConfig;
  environments: { id: string; name: string }[];
  onPlatform: (patch: Partial<PlatformConfig>) => void;
}) {
  const { model, vcnErrors: conflicts } = useWizard();
  const [editEnv, setEditEnv] = useState<string | null>(null);
  const instances = platformEnvInstances(platform, environments);
  const profileOwned = platform.type === 'oke_simple' && !!platform.okeParams?.clusterSize;

  function setOverride(env: string, patch: { vcnCidr?: string; subnets?: Subnet[] }) {
    const cur = platform.overrides?.[env] ?? {};
    onPlatform({ overrides: { ...platform.overrides, [env]: { ...cur, ...patch } } });
  }
  function resetOverride(env: string) {
    const next = resetPlatformEnvironment(platform, env, environments, configuredVcnCidrs(model));
    onPlatform({ overrides: next.overrides });
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
                  {profileOwned ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><ValidatedInput
                    id={`platform-${platform.id}-${inst.id}-vcn`}
                    aria-label={`${platform.key} ${inst.name} VCN CIDR`}
                    style={s.rowInput}
                    value={inst.vcnCidr.split('/')[0]}
                    error={okeProfileCidrError(inst.vcnCidr, platform.okeParams!.clusterSize!)}
                    onChange={(event) => onPlatform(setOkeEnvironmentCidr(platform, environments, inst.id, `${event.target.value.split('/')[0].trim()}/${OKE_PROFILE_PREFIX[platform.okeParams!.clusterSize!]}`))}
                  /><span aria-label="Profile prefix">/{OKE_PROFILE_PREFIX[platform.okeParams!.clusterSize!]}</span></div> : inst.vcnCidr}
                  <FieldError id={`platform-${platform.id}-${inst.id}-conflict`} error={conflicts[`platform:${platform.id}:${inst.id}`]} />
                  {inst.overridden && !profileOwned && <span style={local.overrideTag}>override</span>}
                </td>
                <td style={local.genTd}>{inst.subnets.length === 0 ? 'auto' : `${inst.subnets.length} subnet${inst.subnets.length === 1 ? '' : 's'}`}</td>
                <td style={{ ...local.genTd, textAlign: 'right' }}>
                  {profileOwned ? (
                    <span style={local.fieldHint}>Automatic subnets</span>
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
              conflicts={conflicts[`platform:${platform.id}:${editEnv}`]}
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
export function PlatformCard({ platform, environments, open, onToggle, onPlatform, onDelete }: {
  platform: PlatformConfig;
  environments: { id: string; name: string }[];
  open: boolean;
  onToggle: () => void;
  onPlatform: (patch: Partial<PlatformConfig>) => void;
  onDelete: () => void;
}) {
  const { model, vcnErrors: conflicts } = useWizard();
  const meta = platformTypeMeta(platform.type);
  const peers = model.platforms.filter((other) => other.id !== platform.id && placementsOverlap(platform.environments, other.environments));
  const keyError = configKeyError(platform.key, peers.map((other) => other.key), 3);
  const baseConflicts = platformEnvInstances(platform, environments).filter((instance) => instance.vcnCidr === platform.vcnCidr).flatMap((instance) => conflicts[`platform:${platform.id}:${instance.id}`] ?? []);
  const isOke = platform.type === 'oke_simple';
  const oke = platform.okeParams ?? okeDefaultParams(model.network);

  return (
    <div style={local.card}>
      <button type="button" style={local.cardHead} onClick={onToggle} aria-expanded={open}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: oracle.ink }}>{open ? '▾' : '▸'}</span>
          <span style={local.cardName}>{platform.key}</span>
          <span style={local.typeBadge}>{meta.label}</span>
        </span>
        <span style={{ fontSize: 12.5, color: oracle.textMuted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {isOke ? environments.find((env) => platformInEnv(platform, env.id))?.name ?? 'Environment unavailable' : platform.environments === 'all' ? 'all envs' : `${platform.environments.length} env${platform.environments.length === 1 ? '' : 's'}`} · {platform.vcnCidr}
        </span>
      </button>

      {open && (
        <div style={local.cardBody}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Placement</label>
              {isOke ? <button type="button" aria-label="OKE environment" aria-pressed="true" aria-disabled="true" style={{ ...local.chip, ...local.chipActive, cursor: 'default' }}>{environments.find((env) => platformInEnv(platform, env.id))?.name ?? 'Environment unavailable'}</button> : <PlacementChips id={platform.id} value={platform.environments} environments={environments} onChange={(next) => onPlatform({ environments: next })} />}
            </div>
            <DeleteButton label={`Delete platform ${platform.key}`} onClick={onDelete} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label} htmlFor={`${platform.id}-key`}>Platform name</label>
            <ValidatedInput id={`${platform.id}-key`} error={keyError} style={s.rowInput} value={platform.key} maxLength={3} onChange={(e) => onPlatform({ key: e.target.value })} />
            <div style={local.fieldHint}>Up to 3 characters. Used in generated resource names to keep OCI Network Firewall address-list names within their 28-character limit.</div>
          </div>

          {isOke && <OkeSettingsFields platform={platform} onPlatform={onPlatform} />}

          <div style={{ marginTop: 6 }}>
            <label style={s.label}>Platform VCN &amp; subnets</label>
            {isOke && oke.clusterSize ? (
              <div style={{ ...s.subCard, marginTop: 0 }}>
                <div style={s.subHead}>{oke.clusterSize} network profile · {platform.vcnCidr}</div>
                <div style={local.fieldHint}>Edit this cluster’s VCN CIDR below. The profile fixes its prefix and calculates subnets automatically. Select Manual subnets to customize individual subnets.</div>
                <div style={local.subnetGrid} role="list" aria-label="Network profile subnet allocation">
                  {okeProfileSubnets(platform.vcnCidr, oke.clusterSize, oke.cniType, oke.createFss).map((sn) => (
                    <div key={sn.name} style={local.subnetCell} role="listitem">
                      <span style={local.subnetName}>{sn.name.replace('-', ' ')}</span>
                      <code style={local.subnetCidr}>{sn.cidr}</code>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <VcnEditor
                idPrefix={`plat-${platform.id}`}
                conflicts={baseConflicts}
                vcnCidr={platform.vcnCidr}
                subnets={platform.subnets}
                emptyNote={isOke ? 'Define the required OKE subnet roles for the selected CNI shape.' : 'No subnets yet — add one below with +.'}
                onApply={(patch) => onPlatform(patch)}
              />
            )}
          </div>

          {(!isOke || oke.clusterSize) && <div style={{ marginTop: 18 }}>
            <label style={s.label}>{isOke ? 'Environment network' : 'Per-environment settings'}</label>
            <PerEnvTable platform={platform} environments={environments} onPlatform={onPlatform} />
          </div>}
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
  const [newSharedType, setNewSharedType] = useState<Exclude<AddPlatformType, 'oke_simple'>>('custom');
  const [newType, setNewType] = useState<AddPlatformType>('oke_simple');
  const [newName, setNewName] = useState('');
  const [openExadata, setOpenExadata] = useState<string | null>(null);
  const sharedExadata = EXADATA_TYPES.filter((type) => model.exadata[type].enabled
    && (type === 'exacc' ? model.exadata.exacc.shared : model.exadata.exacs.infrastructure === 'shared'));
  const environmentExadata = EXADATA_TYPES.filter((type) => model.exadata[type].enabled
    && (!sharedExadata.includes(type) || model.exadata[type].database === 'per_environment'
      || (type === 'exacc' && model.exadata.exacc.database === undefined && model.exadata.exacc.environments.length > 0)));
  const sharedTypeAdded = isExadataType(newSharedType) && model.exadata[newSharedType].enabled;
  const environmentTypeAdded = (isExadataType(newType) && model.exadata[newType].enabled) || (newType === 'oke_simple' && environments.length === 0);

  function addExadata(type: ExadataType, shared: boolean) {
    setField('exadata', addExadataPlatform(model, type, shared));
    setOpenExadata(`${shared ? 'shared' : 'environment'}:${type}`);
  }

  function renderExadata(type: ExadataType, placement: 'shared' | 'environment') {
    const id = `${placement}:${type}`;
    const open = openExadata === id;
    const { status, errors } = exadataReadiness(model, type);
    return (
      <div key={type} style={local.card}>
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12, background: oracle.surfaceAlt }}>
          <button type="button" style={{ ...local.cardHead, flex: 1, minWidth: 0 }} onClick={() => setOpenExadata(open ? null : id)} aria-expanded={open} aria-label={`${type.toUpperCase()} ${placement} platform`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{open ? '▾' : '▸'}</span>
              <span style={local.cardName}>{type.toUpperCase()}</span>
            </span>
            <span style={{ ...local.fieldHint, color: errors.length ? oracle.redDark : oracle.textMuted }}>{status}</span>
          </button>
          <DeleteButton label={`Delete ${type.toUpperCase()} platform from landing zone`} onClick={() => {
            setField(`exadata.${type}.enabled`, false);
            setOpenExadata(null);
          }} />
        </div>
        {open && <div style={local.cardBody}>
          {errors.length > 0 && <details style={{ padding: '10px 4px', fontSize: 13 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Review {errors.length} issues across {type.toUpperCase()} platforms</summary>
            <ErrorNotice><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></ErrorNotice>
          </details>}
          <ExadataStep type={type} placement={placement} />
        </div>}
      </div>
    );
  }

  function setPlatforms(next: PlatformConfig[]) { setField('platforms', next); }
  function setSharedPlatforms(next: SharedPlatformConfig[]) { setField('sharedPlatforms', next); }
  function updateSharedPlatform(id: string, patch: Partial<SharedPlatformConfig>) {
    setSharedPlatforms(model.sharedPlatforms.map((platform) => platform.id === id ? { ...platform, ...patch } : platform));
  }
  function addSharedPlatform() {
    if (isExadataType(newSharedType)) {
      addExadata(newSharedType, true);
      return;
    }
    const occupied = configuredVcnCidrs(model);
    const platform = newSharedPlatform(newSharedType, model.sharedPlatforms, occupied);
    setSharedPlatforms([...model.sharedPlatforms, platform]);
    setOpenSharedId(platform.id);
  }
  function updatePlatform(id: string, patch: Partial<PlatformConfig>) {
    setPlatforms(model.platforms.map((p) => (p.id === id
      ? applyPlatformPatch(p, patch, environments, configuredVcnCidrs(model)) : p)));
  }
  function delPlatform(id: string) { setPlatforms(model.platforms.filter((p) => p.id !== id)); }
  function addPlatform() {
    if (isExadataType(newType)) {
      addExadata(newType, false);
      return;
    }
    if (newType === 'oke_simple') {
      const entries = createOkeEntries(model, configuredVcnCidrs(model), newName);
      setPlatforms([...model.platforms, ...entries]);
      setOpenId(entries[0]?.id ?? null);
      setNewName('');
      return;
    }
    const created = newPlatform(newType, model.platforms, environments, configuredVcnCidrs(model), model.network);
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
          <h2 style={s.title}>Platforms</h2>
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
          <div className="studio-info-heading"><h2 style={s.title}>Shared platforms</h2>
            <InfoButton title="Shared platforms"><p>Use a shared platform for services that several environments use. It has one shared placement rather than a separate copy in each environment.</p><p>Custom platforms have a shared VCN. Exadata networks depend on the infrastructure and database placement you select. A design can contain shared platforms without any environments.</p></InfoButton>
          </div>
          <p style={local.note}>Use shared platforms for services used by multiple environments. Add only the services your landing zone needs.</p>
          {model.sharedPlatforms.length === 0 && sharedExadata.length === 0 && (
            <p style={{ ...s.help, marginBottom: 16 }}>No shared platforms configured.</p>
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
          {sharedExadata.map((type) => renderExadata(type, 'shared'))}
          <div style={s.subCard}>
            <h3 style={s.subHead}>Add shared platform</h3>
            <div className="platform-add-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={s.addLabel} htmlFor="new-shared-platform-type">Type</label>
                <select id="new-shared-platform-type" value={newSharedType} onChange={(e) => setNewSharedType(e.target.value as Exclude<AddPlatformType, 'oke_simple'>)}>
                  <option value="custom">Custom network</option>
                  {EXADATA_TYPES.map((type) => <option key={type} value={type} disabled={model.exadata[type].enabled}>{type.toUpperCase()}{model.exadata[type].enabled ? ' (added)' : ''}</option>)}
                </select>
              </div>
              <button type="button" style={sharedTypeAdded ? { ...s.addBtn, ...s.addBtnDisabled } : s.addBtn} disabled={sharedTypeAdded} onClick={addSharedPlatform}>Add shared platform</button>
            </div>
          </div>
        </div>
      </section>

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div className="studio-info-heading"><h2 style={s.title}>Environment platforms</h2>
            <InfoButton title="Environment platforms"><p>Place a workload platform in all environments or select individual environments. Each selected environment gets its own platform resources.</p><p>The placement table shows the resulting networks. Use an environment override when that instance needs a different address range; Reset restores its derived settings.</p></InfoButton>
          </div>
          <p style={local.note}>Adding OKE creates one independent cluster entry per active environment. Custom platforms can span multiple environments.</p>

          {model.platforms.length === 0 && environmentExadata.length === 0 && (
            <p style={{ ...s.help, marginBottom: 16 }}>No environment platforms configured.</p>
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
          {environmentExadata.map((type) => renderExadata(type, 'environment'))}

          <div style={s.subCard}>
            <div style={s.subHead}>Add platform</div>
            <div className="platform-add-row" style={{ display: 'grid', gridTemplateColumns: isExadataType(newType) ? '1fr auto' : '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={s.addLabel} htmlFor="new-platform-type">Type</label>
                <select id="new-platform-type" value={newType} onChange={(e) => setNewType(e.target.value as AddPlatformType)}>
                  {PLATFORM_TYPES.map((t) => (
                    <option key={t.type} value={t.type} disabled={!t.deployable}>
                      {t.label}{t.note ? ` (${t.note})` : ''}
                    </option>
                  ))}
                  {EXADATA_TYPES.map((type) => <option key={type} value={type} disabled={model.exadata[type].enabled}>{type.toUpperCase()}{model.exadata[type].enabled ? ' (added)' : ''}</option>)}
                </select>
              </div>
              {!isExadataType(newType) && <div>
                <label style={s.addLabel} htmlFor="new-platform-name">Name</label>
                <input
                  id="new-platform-name"
                  style={s.rowInput}
                  placeholder={newType === 'oke_simple' ? 'oke' : 'cus'}
                  value={newName}
                  maxLength={3}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addPlatform(); }}
                />
              </div>}
              <button type="button" style={environmentTypeAdded ? { ...s.addBtn, ...s.addBtnDisabled } : s.addBtn} disabled={environmentTypeAdded} onClick={addPlatform}>{newType === 'oke_simple' ? 'Add OKE clusters' : 'Add platform'}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
