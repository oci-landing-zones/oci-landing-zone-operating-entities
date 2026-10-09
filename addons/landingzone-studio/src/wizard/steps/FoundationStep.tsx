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
import { configuredVcnCidrs } from '../../services/exadata';
import { customDefaultSubnets } from '../../services/platforms';
import { environmentPlatformCidr } from '../../services/oneOeCidrs';
import { oracle } from '../../theme';
import {
  findRegion, getDefaultRegionForRealm, getRegionsForRealm, REALM_OPTIONS,
} from '../../services/regions';
import type { Environment, FoundationConfig, OneOeNotifications } from '../../model/types';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

const s: Record<string, React.CSSProperties> = {
  col:     { display: 'grid', gap: 20 },
  panel:   { border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surface, boxShadow: '0 1px 2px rgba(32,31,28,0.04)' },
  accent:  { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' },
  body:    { padding: 20 },
  title:   { fontSize: 15, fontWeight: 700, marginBottom: 16, color: oracle.ink },
  twoCol:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  topicRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: 16, alignItems: 'start', padding: '14px 0', borderTop: `1px solid ${oracle.border}` },
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

const topicHelp: Record<Exclude<keyof OneOeNotifications, 'default' | 'useSingleRecipient'>, string> = {
  cloudguard: '6 Cloud Guard event types: problems detected, dismissed or remediated, announcements, status changes, and problem thresholds.',
  iam: '21 IAM event types: changes to identity providers, groups, policies, users, and passwords.',
  network: '43 event types per network scope. The published prod/preprod blueprint also routes 36 network alarms for load balancers and VNICs here. ExaCS uses this Network topic too.',
  security: '6 notification-subscription event types per security scope, plus 16 published alarms for audit connectors, delivery failures, compute, and block volumes.',
};

export default function FoundationStep({ name, onNameChange, onNameBlur, nameError }: {
  name: string;
  onNameChange: (name: string) => void;
  onNameBlur: () => void;
  nameError?: string | null;
}) {
  const { model, setField } = useWizard();
  const f = model.foundation;
  const singleRecipient = f.notifications?.useSingleRecipient ?? Boolean(f.notifications?.default);
  const envs = model.environments;

  const [newName, setNewName] = useState('');
  const [newSecure, setNewSecure] = useState(false);

  const regionOptions = getRegionsForRealm(f.realm);

  function setFoundation(patch: Partial<FoundationConfig>) {
    setField('foundation', { ...f, ...patch });
  }
  function setNotification(topic: keyof OneOeNotifications, value: string) {
    setFoundation({ notifications: {
      default: '', cloudguard: '', iam: '', network: '', security: '',
      ...f.notifications,
      [topic]: value,
    } });
  }
  function setSingleRecipient(checked: boolean) {
    setFoundation({ notifications: {
      default: '', cloudguard: '', iam: '', network: '', security: '',
      ...f.notifications,
      useSingleRecipient: checked,
    } });
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
    const occupied = configuredVcnCidrs(model);
    const network = envNetworkDefaults(envs.length, name, occupied);
    const id = createModelId('environment');
    if (network.vcnCidr) occupied.push(network.vcnCidr);
    setField('platforms', model.platforms.map((platform) => {
      if (platform.type === 'oke_simple' || platform.environments !== 'all') return platform;
      const vcnCidr = environmentPlatformCidr(platform.type, name, occupied);
      if (vcnCidr) occupied.push(vcnCidr);
      return { ...platform, overrides: { ...platform.overrides, [id]: {
        vcnCidr, ...(platform.type === 'custom' ? { subnets: customDefaultSubnets(vcnCidr) } : {}),
      } } };
    }));
    setEnvs([...envs, { id, name, securityZone: newSecure, network }]);
    setNewName('');
    setNewSecure(false);
  }

  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Foundation</div>
          <div style={{ ...s.help, marginTop: -8, marginBottom: 16 }}>Set the OCI location, security baseline, and environments for this landing zone.</div>
          <div style={s.field}>
            <label style={s.label} htmlFor="saved-lz-name">Design name</label>
            <input
              id="saved-lz-name"
              style={{ ...s.input, border: `1px solid ${nameError ? '#9f1d1d' : oracle.borderStrong}` }}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onNameBlur}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'saved-lz-name-error' : undefined}
            />
            <div style={{ marginTop: 5, color: oracle.textMuted, fontSize: 12 }}>Stored in this browser and used for download filenames. It does not change OCI resource names.</div>
            {nameError && <div id="saved-lz-name-error" role="alert" style={s.error}>{nameError}</div>}
          </div>
          <div style={s.twoCol} className="foundation-two-col">
            <div>
              <label style={s.label} htmlFor="lz-realm">Realm</label>
              <select id="lz-realm" style={s.select} value={f.realm} onChange={(e) => onRealm(e.target.value)} aria-describedby="lz-realm-help">
                {REALM_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <div id="lz-realm-help" style={{ marginTop: 5, color: oracle.textMuted, fontSize: 12 }}>Use OC1 for commercial OCI. Select another realm only when your tenancy uses a sovereign or isolated cloud.</div>
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
            An environment is an isolated stage of your workload, such as development or production. A Security Zone applies stricter OCI controls; confirm it permits every service you plan to use.
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

          <p style={s.help}>Named prod, preprod, dr, dev and uat environments use their One-OE reservations. Other environments share free /21 blocks in 10.1.192.0/18. If the pool is exhausted, enter a CIDR manually in the network step.</p>
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

      <section style={s.panel} aria-labelledby="foundation-observability-title">
        <div style={s.accent} />
        <div style={s.body}>
          <div id="foundation-observability-title" style={s.title}>Observability</div>
          <div style={{ color: oracle.textMuted, fontSize: 12.5, lineHeight: 1.5, margin: '-8px 0 14px' }}>
            Choose email recipients for the four One-OE notification topics. Separate multiple addresses with commas. If all fields are blank, generated files retain the published example address.
          </div>
          {!singleRecipient && <div>
            {([
              ['cloudguard', 'Cloud Guard events'],
              ['iam', 'IAM events'],
              ['network', 'Network events and alarms'],
              ['security', 'Security events and alarms'],
            ] as const).map(([topic, label]) => (
              <div key={topic} style={s.topicRow} className="foundation-observability-row">
                <div>
                  <label style={s.label} htmlFor={`lz-observability-${topic}`}>{label}</label>
                  <input id={`lz-observability-${topic}`} style={s.input} type="text" inputMode="email"
                    placeholder="team@example.com" value={f.notifications?.[topic] ?? ''}
                    onChange={(e) => setNotification(topic, e.target.value)} aria-describedby={`lz-observability-${topic}-help`} />
                </div>
                <div id={`lz-observability-${topic}-help`} style={{ color: oracle.textMuted, fontSize: 12, lineHeight: 1.5 }}>{topicHelp[topic]}</div>
              </div>
            ))}
          </div>}
          <div style={{ borderTop: `1px solid ${oracle.border}`, paddingTop: 16, marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: oracle.ink }}>
              <input type="checkbox" checked={singleRecipient} onChange={(e) => setSingleRecipient(e.target.checked)} />
              Use one email for all notifications
            </label>
            <div style={{ marginTop: 5, color: oracle.textMuted, fontSize: 12 }}>Uses the same recipients for Cloud Guard, IAM, Network and Security.</div>
          </div>
          {singleRecipient && <div style={{ ...s.field, marginTop: 16, marginBottom: 0 }}>
            <label style={s.label} htmlFor="lz-observability-default">Notification emails</label>
            <input id="lz-observability-default" style={s.input} type="text" inputMode="email"
              placeholder="ops@example.com" value={f.notifications?.default ?? ''}
              onChange={(e) => setNotification('default', e.target.value)} />
          </div>}
        </div>
      </section>
    </div>
  );
}
