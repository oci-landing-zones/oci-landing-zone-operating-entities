/**
 * FoundationStep — step 1 inputs: realm / region / region short name, plus the
 * environments table (name + Security Zone toggle). Writes straight into the
 * canonical model via the wizard context; the diagram and JSON re-derive.
 */

import React, { useState } from 'react';
import { useWizard } from '../wizardContext';
import Switch from '../../components/Switch';
import DeleteButton from '../../components/DeleteButton';
import { createModelId, envNetworkDefaults } from '../../model/defaults';
import { oracle } from '../../theme';
import {
  findRegion, getDefaultRegionForRealm, getRegionsForRealm, REALM_OPTIONS,
} from '../../services/regions';
import type { Environment, FoundationConfig } from '../../model/types';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  col:     { display: 'grid', gap: 20 },
  panel:   { border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surface, boxShadow: '0 1px 2px rgba(32,31,28,0.04)' },
  accent:  { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' },
  body:    { padding: 20 },
  title:   { fontSize: 15, fontWeight: 700, marginBottom: 16, color: oracle.ink },
  twoCol:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label:   { display: 'block', fontSize: 12, color: oracle.textMuted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  input:   { width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, fontSize: 14, background: oracle.surface, color: oracle.text, fontFamily: FONT },
  select:  { width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, fontSize: 14, background: oracle.surface, color: oracle.text, fontFamily: FONT },
  field:   { marginBottom: 14 },
  error:   { marginTop: 5, color: '#9f1d1d', fontSize: 12 },

  tableHead: { display: 'grid', gridTemplateColumns: '1fr 150px 70px', gap: 12, alignItems: 'center', padding: '10px 12px', background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: '6px 6px 0 0', fontSize: 12, fontWeight: 700, color: oracle.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  row:     { display: 'grid', gridTemplateColumns: '1fr 150px 70px', gap: 12, alignItems: 'center', padding: '10px 12px', borderLeft: `1px solid ${oracle.border}`, borderRight: `1px solid ${oracle.border}`, borderBottom: `1px solid ${oracle.border}` },
  rowInput:{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, fontSize: 14, background: oracle.surface, color: oracle.text, fontFamily: FONT },
  empty:   { padding: '16px 12px', border: `1px dashed ${oracle.border}`, borderTop: 'none', color: oracle.textMuted, fontSize: 13 },

  addRow:  { display: 'grid', gridTemplateColumns: '1fr 150px auto', gap: 12, alignItems: 'center', marginTop: 16 },
  addBtn:  { padding: '9px 18px', fontSize: 14, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontWeight: 700 },
  addLabel:{ display: 'block', fontSize: 12, color: oracle.textMuted, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
};

export default function FoundationStep({ name, onNameChange, onNameBlur, nameError }: {
  name: string;
  onNameChange: (name: string) => void;
  onNameBlur: () => void;
  nameError?: string | null;
}) {
  const { model, setField } = useWizard();
  const f = model.foundation;
  const envs = model.environments;

  const [newName, setNewName] = useState('');
  const [newSecure, setNewSecure] = useState(false);

  const regionOptions = getRegionsForRealm(f.realm);

  function setFoundation(patch: Partial<FoundationConfig>) {
    setField('foundation', { ...f, ...patch });
  }
  function onRealm(realm: string) {
    const def = getDefaultRegionForRealm(realm);
    setFoundation({ realm, region: def?.id ?? '', regionShortName: def?.shortName ?? '' });
  }
  function onRegion(region: string) {
    const r = findRegion(f.realm, region);
    setFoundation({ region, regionShortName: r?.shortName ?? f.regionShortName });
  }

  function setEnvs(next: Environment[]) { setField('environments', next); }
  function updateEnv(i: number, patch: Partial<Environment>) {
    setEnvs(envs.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function deleteEnv(i: number) {
    const deletedId = envs[i].id;
    setField('projects', model.projects.map((project) => project.environments === 'all' ? project : {
      ...project, environments: project.environments.filter((id) => id !== deletedId),
    }));
    setField('platforms', model.platforms.map((platform) => {
      const overrides = { ...platform.overrides };
      delete overrides[deletedId];
      return {
        ...platform,
        environments: platform.environments === 'all' ? 'all' : platform.environments.filter((id) => id !== deletedId),
        overrides,
      };
    }));
    setEnvs(envs.filter((_, idx) => idx !== i));
  }
  function addEnv() {
    const name = newName.trim();
    if (!name) return;
    setEnvs([...envs, { id: createModelId('environment'), name, securityZone: newSecure, network: envNetworkDefaults(envs.length) }]);
    setNewName('');
    setNewSecure(false);
  }

  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Foundation</div>
          <div style={s.field}>
            <label style={s.label} htmlFor="saved-lz-name">Saved design name</label>
            <input
              id="saved-lz-name"
              style={{ ...s.input, border: `1px solid ${nameError ? '#9f1d1d' : oracle.borderStrong}` }}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onNameBlur}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'saved-lz-name-error' : undefined}
            />
            <div style={{ marginTop: 5, color: oracle.textMuted, fontSize: 12 }}>Stored only in this browser and used for saved records and download filenames. It does not change OCI resource names.</div>
            {nameError && <div id="saved-lz-name-error" role="alert" style={s.error}>{nameError}</div>}
          </div>
          <div style={s.twoCol} className="foundation-two-col">
            <div>
              <label style={s.label} htmlFor="lz-realm">Realm</label>
              <select id="lz-realm" style={s.select} value={f.realm} onChange={(e) => onRealm(e.target.value)}>
                {REALM_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label} htmlFor="lz-region">Region</label>
              <select id="lz-region" style={s.select} value={f.region} onChange={(e) => onRegion(e.target.value)}>
                {regionOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.id} ({r.shortName.toUpperCase()})</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ ...s.twoCol, marginTop: 14 }} className="foundation-two-col">
            <div>
              <label style={s.label} htmlFor="lz-region-short">Region short name</label>
              <input
                id="lz-region-short"
                style={s.input}
                value={f.regionShortName}
                readOnly
                aria-describedby="lz-region-short-help"
              />
              <div id="lz-region-short-help" style={{ marginTop: 5, color: oracle.textMuted, fontSize: 12 }}>Derived from the selected OCI region and included in OCI resource names.</div>
            </div>
            <div>
              <label style={s.label} htmlFor="lz-cis-level">CIS benchmark level</label>
              <select
                id="lz-cis-level"
                style={s.select}
                value={f.cisLevel}
                onChange={(e) => setFoundation({ cisLevel: Number(e.target.value) as 1 | 2 })}
                aria-describedby="lz-cis-level-help"
              >
                <option value={2}>Level 2 — CMEK required</option>
                <option value={1}>Level 1 — foundational security</option>
              </select>
              <div id="lz-cis-level-help" style={{ marginTop: 5, color: oracle.textMuted, fontSize: 12 }}>Level 2 requires customer-managed encryption keys (CMEK) for resources protected by Security Zones. Level 1 provides the foundational controls.</div>
            </div>
          </div>
        </div>
      </section>

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Environments</div>
          <div style={{ color: oracle.textMuted, fontSize: 12.5, lineHeight: 1.5, margin: '-8px 0 14px' }}>
            Security Zone applies a stricter security recipe to that environment. Confirm the recipe permits every service the environment needs before deployment.
          </div>

          <div style={s.tableHead} className="foundation-environment-grid">
            <span>Name</span>
            <span>Security zone</span>
            <span>Actions</span>
          </div>
          {envs.length === 0 && <div style={s.empty}>No environments yet — add one below.</div>}
          {envs.map((env, i) => (
            <div key={i} style={s.row} className="foundation-environment-grid">
              <input
                aria-label={`Environment ${i + 1} name`}
                style={s.rowInput}
                value={env.name}
                onChange={(e) => updateEnv(i, { name: e.target.value })}
              />
              <Switch
                checked={env.securityZone}
                onChange={(v) => updateEnv(i, { securityZone: v })}
                label={env.securityZone ? 'On' : 'Off'}
                ariaLabel={`Security zone for ${env.name || `environment ${i + 1}`}`}
              />
              <DeleteButton label={`Delete environment ${env.name || i + 1}`} onClick={() => deleteEnv(i)} />
            </div>
          ))}

          <label style={{ ...s.addLabel, marginTop: 18 }}>Add environment</label>
          <div style={s.addRow} className="foundation-add-grid">
            <input
              aria-label="New environment name"
              style={s.rowInput}
              placeholder="e.g. staging"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addEnv(); }}
            />
            <Switch checked={newSecure} onChange={setNewSecure} label={newSecure ? 'On' : 'Off'} ariaLabel="Security zone for new environment" />
            <button type="button" style={s.addBtn} onClick={addEnv}>Add</button>
          </div>
        </div>
      </section>
    </div>
  );
}
