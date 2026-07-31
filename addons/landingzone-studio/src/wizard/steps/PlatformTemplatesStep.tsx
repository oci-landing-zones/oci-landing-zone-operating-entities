/**
 * PlatformTemplatesStep — step 4 ("Platforms"). Two parts:
 *   1. Shared platform — a compartment + VCN that lives OUTSIDE every environment
 *      (always present). A name, a VCN CIDR with the same base-range selector the
 *      network steps use, and at least one subnet (the generator insists).
 *   2. Environment platforms — VCN-bearing compartments dropped into one/all/a
 *      subset of the environments. Pick a type (OKE Simple / Custom; ExaCC/ExaCS
 *      are roadmap), name it, choose placement. OKE seeds four mandatory subnets
 *      and exposes its cluster settings; Custom starts empty. Each platform shows
 *      a generated per-environment table (its VCN per env) with a per-env override.
 *
 * Everything writes into the canonical model (model.sharedPlatform + model.platforms);
 * the diagram and JSON derive from it.
 */

import { useState, type CSSProperties } from 'react';
import { useWizard } from '../wizardContext';
import { oracle } from '../../theme';
import { getHubKind } from '../../services/hubKinds';
import type { PlatformConfig, PlatformType, SharedPlatformConfig, Subnet } from '../../model/types';
import {
  PLATFORM_TYPES, newPlatform, okeDefaultParams, platformEnvInstances, platformTypeMeta,
} from '../../services/platforms';
import { VcnEditor } from './HubNetworkStep';
import { s } from './networkEditorStyles';
import DeleteButton from '../../components/DeleteButton';

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
  okeGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 4 },
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

/** Name + base-range pills + VCN CIDR + subnet table for the always-present shared platform. */
function SharedPlatformPanel({ platform, onChange }: {
  platform: SharedPlatformConfig;
  onChange: (patch: Partial<SharedPlatformConfig>) => void;
}) {
  const { name, vcnCidr, subnets } = platform;
  // The generator folds this name into an OCI DNS label capped at 15 chars
  // (`vcn` + region + `lz` + `sh` + name), leaving 5 with a 3-char region.
  const nameErr = name.trim().length > 5 ? 'Keep it to 5 characters — it goes into a 15-char OCI DNS label.' : '';
  return (
    <section style={s.panel}>
      <div style={s.accent} />
      <div style={s.body}>
        <div style={s.title}>Shared platform</div>
        <div style={local.note}>
          A compartment with its own VCN that lives <strong>outside</strong> every environment — always present.
          Give it a VCN CIDR that doesn&apos;t overlap the hub or any environment network.
        </div>

        <label style={s.label} htmlFor="shared-platform-name">VCN name</label>
        <div style={local.prefixWrap}>
          <span style={local.prefix}>vcn-</span>
          <input
            id="shared-platform-name"
            style={{ ...s.input, border: 'none', borderRadius: 0 }}
            value={name}
            placeholder="core"
            onChange={(e) => onChange({ name: e.target.value.replace(/^vcn-/, '') })}
          />
        </div>
        {nameErr && <div style={s.errText}>{nameErr}</div>}

        {/* VcnEditor owns the base-range pills, the VCN CIDR field and the subnet
            table. The generator asserts every platform VCN declares a subnet. */}
        <VcnEditor
          idPrefix="shared-platform"
          tokens={{ region: '', lze: '' }}
          vcnCidr={vcnCidr}
          subnets={subnets}
          emptyNote="The shared platform needs at least one subnet — add one below."
          onApply={(patch) => onChange(patch)}
        />
      </div>
    </section>
  );
}

/** All/subset placement chips (mirrors the projects "Apply to" control). */
function PlacementChips({ value, envNames, onChange }: {
  value: 'all' | string[];
  envNames: string[];
  onChange: (next: 'all' | string[]) => void;
}) {
  function toggle(env: string) {
    onChange(value === 'all' ? [env] : value.includes(env) ? value.filter((x) => x !== env) : [...value, env]);
  }
  return (
    <div style={local.pillWrap} role="group" aria-label="Platform placement">
      <button type="button" style={value === 'all' ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => onChange('all')}>All</button>
      {envNames.map((n) => {
        const active = value !== 'all' && value.includes(n);
        return <button key={n} type="button" style={active ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => toggle(n)}>{n}</button>;
      })}
    </div>
  );
}

/** The generated per-environment table for one platform, with a per-env override editor. */
function PerEnvTable({ platform, environments, onPlatform }: {
  platform: PlatformConfig;
  environments: { name: string }[];
  onPlatform: (patch: Partial<PlatformConfig>) => void;
}) {
  const [editEnv, setEditEnv] = useState<string | null>(null);
  const instances = platformEnvInstances(platform, environments);

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
            <tr key={inst.name}>
              <td style={local.genTd}>{inst.name}</td>
              <td style={local.genTd}>
                {inst.vcnCidr}
                {inst.overridden && <span style={local.overrideTag}>override</span>}
              </td>
              <td style={local.genTd}>{inst.subnets.length === 0 ? 'auto' : `${inst.subnets.length} subnet${inst.subnets.length === 1 ? '' : 's'}`}</td>
              <td style={{ ...local.genTd, textAlign: 'right' }}>
                <button type="button" style={local.linkBtn} onClick={() => setEditEnv(editEnv === inst.name ? null : inst.name)}>
                  {editEnv === inst.name ? 'Close' : 'Edit'}
                </button>
                {inst.overridden && <button type="button" style={{ ...local.linkBtn, color: oracle.red, marginLeft: 12 }} onClick={() => resetOverride(inst.name)}>Reset</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editEnv && (() => {
        const inst = instances.find((x) => x.name === editEnv);
        if (!inst) return null;
        return (
          <div style={{ ...s.subCard, marginTop: 14 }}>
            <div style={s.subHead}>Override — {editEnv}</div>
            <VcnEditor
              idPrefix={`plat-${platform.id}-ov-${editEnv}`}
              tokens={{ region: '', lze: '' }}
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
function PlatformCard({ platform, environments, envNames, open, onToggle, onPlatform, onDelete }: {
  platform: PlatformConfig;
  environments: { name: string }[];
  envNames: string[];
  open: boolean;
  onToggle: () => void;
  onPlatform: (patch: Partial<PlatformConfig>) => void;
  onDelete: () => void;
}) {
  const meta = platformTypeMeta(platform.type);
  const isOke = platform.type === 'oke_simple';
  const oke = platform.okeParams ?? okeDefaultParams();
  function setOke(patch: Partial<typeof oke>) { onPlatform({ okeParams: { ...oke, ...patch } }); }

  return (
    <div style={local.card}>
      <button type="button" style={local.cardHead} onClick={onToggle} aria-expanded={open}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: oracle.ink }}>{open ? '▾' : '▸'}</span>
          <span style={local.cardName}>{platform.name}</span>
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
              <PlacementChips value={platform.environments} envNames={envNames} onChange={(next) => onPlatform({ environments: next })} />
            </div>
            <DeleteButton label={`Delete platform ${platform.name}`} onClick={onDelete} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={s.label} htmlFor={`${platform.id}-vcn-name`}>VCN name</label>
              <div style={local.prefixWrap}>
                <span style={local.prefix}>vcn-</span>
                <input
                  id={`${platform.id}-vcn-name`}
                  style={local.prefixInput}
                  value={(platform.vcnName || `vcn-${platform.id}`).replace(/^vcn-/, '')}
                  placeholder={platform.id}
                  onChange={(e) => onPlatform({ vcnName: `vcn-${e.target.value.replace(/^vcn-/, '')}` })}
                />
              </div>
            </div>
            <div>
              <label style={s.label} htmlFor={`${platform.id}-attach-name`}>DRG attachment name</label>
              <input
                id={`${platform.id}-attach-name`}
                style={{ ...s.rowInput, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                value={platform.attachmentName || `vcn-${platform.id}-<env>-attach`}
                onChange={(e) => onPlatform({ attachmentName: e.target.value })}
              />
              <div style={local.fieldHint}>&lt;env&gt; resolves to each environment name.</div>
            </div>
          </div>

          {isOke && (
            <div style={s.subCard}>
              <div style={s.subHead}>OKE settings</div>
              <div style={local.okeGrid}>
                <div>
                  <label style={s.addLabel} htmlFor={`${platform.id}-k8s`}>K8s version</label>
                  <input id={`${platform.id}-k8s`} style={s.rowInput} value={oke.kubernetesVersion} onChange={(e) => setOke({ kubernetesVersion: e.target.value })} />
                </div>
                <div>
                  <label style={s.addLabel} htmlFor={`${platform.id}-svc`}>Services CIDR</label>
                  <input id={`${platform.id}-svc`} style={s.rowInput} value={oke.servicesCidr} onChange={(e) => setOke({ servicesCidr: e.target.value })} />
                </div>
                <div>
                  <label style={s.addLabel} htmlFor={`${platform.id}-api`}>API allowed CIDR</label>
                  <input id={`${platform.id}-api`} style={s.rowInput} value={oke.apiAllowedCidrs.join(', ')} onChange={(e) => setOke({ apiAllowedCidrs: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label style={s.addLabel} htmlFor={`${platform.id}-img`}>Worker image</label>
                  <input id={`${platform.id}-img`} style={s.rowInput} value={oke.workerImage} onChange={(e) => setOke({ workerImage: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 6 }}>
            <label style={s.label}>Platform VCN &amp; subnets</label>
            <VcnEditor
              idPrefix={`plat-${platform.id}`}
              tokens={{ region: '', lze: '' }}
              vcnCidr={platform.vcnCidr}
              subnets={platform.subnets}
              emptyNote={isOke ? 'No subnets — OKE seeds its defaults.' : 'No subnets yet — add one below with +.'}
              onApply={(patch) => onPlatform(patch)}
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={s.label}>Generated per-environment settings</label>
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
  const envNames = model.environments.map((e) => e.name.trim()).filter(Boolean);
  const environments = model.environments.map((e, i) => ({ name: e.name.trim() || `env${i + 1}` }));

  const [openId, setOpenId] = useState<string | null>(null);
  const [newType, setNewType] = useState<PlatformType>('oke_simple');
  const [newName, setNewName] = useState('');

  function setPlatforms(next: PlatformConfig[]) { setField('platforms', next); }
  function updatePlatform(id: string, patch: Partial<PlatformConfig>) {
    setPlatforms(model.platforms.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function delPlatform(id: string) { setPlatforms(model.platforms.filter((p) => p.id !== id)); }
  function addPlatform() {
    const created = newPlatform(newType, model.platforms);
    const name = newName.trim() || created.name;
    const platform = { ...created, name };
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
      <SharedPlatformPanel
        platform={model.sharedPlatform}
        onChange={(patch) => setField('sharedPlatform', { ...model.sharedPlatform, ...patch })}
      />

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Environment platforms</div>
          <div style={local.note}>
            A platform is a compartment with its own VCN, dropped inside one or more environments
            (unlike a project, which has no network). Each environment it lands in gets its own VCN.
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
              envNames={envNames}
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
