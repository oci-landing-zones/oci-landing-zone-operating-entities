/**
 * FoundationStep — step 1 inputs: realm / region / region short name, plus the
 * environments table (name + Security Zone toggle). Writes straight into the
 * canonical model via the wizard context; the diagram and JSON re-derive.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWizard } from '../wizardContext';
import Switch from '../../components/Switch';
import DeleteButton from '../../components/DeleteButton';
import FieldError from '../../components/FieldError';
import InfoButton from '../../components/InfoButton';
import { configKeyError, fieldErrorProps } from '../../services/fieldErrors';
import { createModelId, envNetworkDefaults } from '../../model/defaults';
import { configuredVcnCidrs } from '../../services/exadata';
import { customDefaultSubnets } from '../../services/platforms';
import { environmentPlatformCidr } from '../../services/oneOeCidrs';
import { notificationEmailError } from '../../services/notificationEmails';
import { oracle } from '../../theme';
import {
  findRegion, getDefaultRegionForRealm, getRegionsForRealm, REALM_OPTIONS, regionShortNameError,
} from '../../services/regions';
import type { Environment, FoundationConfig, OneOeNotifications } from '../../model/types';
import { s as form } from './networkEditorStyles';

const s: Record<string, React.CSSProperties> = {
  col:     form.col,
  panel:   form.panel,
  accent:  { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' },
  body:    { padding: 20 },
  title:   form.title,
  help:    form.help,
  twoCol:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  locationGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 14 },
  topicRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: 16, alignItems: 'start', padding: '14px 0', borderTop: `1px solid ${oracle.border}` },
  label:   form.label,
  input:   form.input,
  field:   { marginBottom: 14 },

  tableHead: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 112px 64px', gap: 12, alignItems: 'center', padding: '10px 12px', background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: '6px 6px 0 0', fontSize: 12, fontWeight: 600, color: oracle.textMuted },
  row:     { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 112px 64px', gap: 12, alignItems: 'center', padding: '10px 12px', borderLeft: `1px solid ${oracle.border}`, borderRight: `1px solid ${oracle.border}`, borderBottom: `1px solid ${oracle.border}` },
  rowInput:form.rowInput,
  empty:   { padding: '16px 12px', border: `1px dashed ${oracle.border}`, borderTop: 'none', color: oracle.textMuted, fontSize: 13 },

  addRow:  { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 112px 64px', gap: 12, alignItems: 'center', padding: '0 12px', borderLeft: '1px solid transparent', borderRight: '1px solid transparent' },
  addBtn:  { ...form.addBtn, padding: '9px 8px' },
  addLabel:{ ...form.label, margin: '20px 12px 8px' },
};

const topicHelp: Record<Exclude<keyof OneOeNotifications, 'default' | 'useSingleRecipient'>, string> = {
  cloudguard: 'Cloud Guard findings and status changes.',
  iam: 'Changes to users, groups, identity providers and policies.',
  network: 'Network events and alarms, including load balancers and network interfaces.',
  security: 'Security events and alarms for audit and infrastructure resources.',
};

export default function FoundationStep({ name, onNameChange, onNameBlur, nameError }: {
  name: string;
  onNameChange: (name: string) => void;
  onNameBlur: () => void;
  nameError?: string | null;
}) {
  const { model, setField, homeSource } = useWizard();
  const f = model.foundation;
  const regional = f.stackScope === 'regional';
  const singleRecipient = f.notifications?.useSingleRecipient ?? Boolean(f.notifications?.default);
  const envs = model.environments;
  const environmentGrid = regional ? { gridTemplateColumns: 'minmax(0, 1fr) 64px' } : {};

  const [newName, setNewName] = useState('');
  const [newSecure, setNewSecure] = useState(false);

  const regionOptions = getRegionsForRealm(f.realm);
  const regionError = !findRegion(f.realm, f.region) ? 'Select a region in this realm.' : null;
  const shortNameError = regionShortNameError(f.regionShortName);
  const homeRegionError = regional && (!findRegion(f.realm, f.homeRegion ?? '') || f.homeRegion === f.region)
    ? 'Select a Home Region different from the DR region.' : null;
  const newNameError = newName.trim() ? configKeyError(newName, envs.map((env) => env.name)) : null;

  function setFoundation(patch: Partial<FoundationConfig>) {
    setField('foundation', { ...f, ...patch });
  }
  function setDeploymentType(stackScope: 'complete' | 'regional') {
    const region = stackScope === 'complete' && !f.region ? getDefaultRegionForRealm(f.realm) : undefined;
    setFoundation({ stackScope,
      ...(region ? { region: region.id, regionShortName: region.shortName } : {}) });
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
    setFoundation({ realm, region: regional ? '' : def?.id ?? '', regionShortName: regional ? '' : def?.shortName ?? '',
      homeRegion: undefined, drRegion: undefined });
  }
  function onRegion(region: string) {
    const r = findRegion(f.realm, region);
    setFoundation({ region, regionShortName: r?.shortName ?? '',
      ...(region === f.drRegion ? { drRegion: undefined } : {}) });
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
    if (!name || newNameError) return;
    const occupied = configuredVcnCidrs(model);
    const network = envNetworkDefaults(envs.length, name, occupied);
    const id = createModelId('environment');
    if (network.vcnCidr) occupied.push(network.vcnCidr);
    setField('platforms', model.platforms.map((platform) => {
      if (platform.type === 'oke_simple' || platform.environments !== 'all') return platform;
      const vcnCidr = environmentPlatformCidr(name, occupied);
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
          <h2 style={s.title}>Foundation</h2>
          <p style={form.intro}>Choose the deployment type, OCI location and security baseline.</p>
          <div style={s.field}>
            <label style={s.label} htmlFor="saved-lz-name">Design name</label>
            <input
              id="saved-lz-name"
              style={s.input}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onNameBlur}
              aria-invalid={!!nameError}
              aria-describedby={`saved-lz-name-help${nameError ? ' saved-lz-name-error' : ''}`}
            />
            <div id="saved-lz-name-help" style={{ ...s.help, marginTop: 6 }}>Used for saved designs and download filenames. OCI resource names are generated separately.</div>
            <FieldError id="saved-lz-name-error" error={nameError} />
          </div>
          <div style={s.twoCol} className="foundation-two-col">
            <div>
              <label style={s.label} htmlFor="lz-realm">Realm</label>
              <select id="lz-realm" value={f.realm} disabled={!!homeSource} onChange={(e) => onRealm(e.target.value)} aria-describedby="lz-realm-help">
                {REALM_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <div id="lz-realm-help" style={{ ...s.help, marginTop: 6 }}>Use the realm that contains your tenancy.</div>
            </div>
            <div>
              <div className="studio-info-heading"><label style={s.label} htmlFor="lz-cis-level">CIS benchmark level</label>
                <InfoButton title="CIS benchmark level"><p>Both levels use the landing zone's security baseline. Level 2 also prepares customer-managed encryption keys.</p><p>Choose the level required by your organization. Review the generated security settings before deployment.</p></InfoButton>
              </div>
              <select
                id="lz-cis-level"
                value={f.cisLevel}
                onChange={(e) => setFoundation({ cisLevel: Number(e.target.value) as 1 | 2 })}
                aria-describedby="lz-cis-level-help"
              >
                <option value={2}>Level 2</option>
                <option value={1}>Level 1</option>
              </select>
              <div id="lz-cis-level-help" style={{ ...s.help, marginTop: 6 }}>Level 2 adds customer-managed encryption keys to the Level 1 security baseline.</div>
            </div>
          </div>
          <div style={{ ...s.field, marginTop: 14 }}>
            <div className="studio-info-heading"><label style={s.label} htmlFor="lz-deployment-type">Deployment type</label>
              <InfoButton title="Deployment type"><p><strong>Home Region</strong> creates compartments, IAM and governance, along with resources in the selected region.</p><p><strong>DR</strong> creates recovery resources in another region and reuses the Home Region's compartments, IAM and governance. Use matching environment names. Review lists the required Home Region dependency outputs.</p><p>Changing this field keeps the inputs already in your design. It does not deploy or copy running resources.</p></InfoButton>
            </div>
            <select id="lz-deployment-type" value={f.stackScope ?? 'complete'} disabled={!!homeSource} onChange={(event) => setDeploymentType(event.target.value as 'complete' | 'regional')} aria-describedby="lz-deployment-type-help">
              <option value="complete">Home Region</option>
              <option value="regional">DR</option>
            </select>
            <div id="lz-deployment-type-help" style={{ ...s.help, marginTop: 6 }}>{regional
              ? 'DR creates recovery resources in another region. It reuses the compartments, IAM and governance from your Home Region deployment.'
              : 'Home Region creates compartments, IAM and governance, plus resources in the selected region.'}</div>
          </div>
          <div style={s.locationGrid} className="foundation-location-grid">
            <div>
              <label style={s.label} htmlFor="lz-region">{regional ? 'DR region' : 'Region'}</label>
              <select id="lz-region" {...fieldErrorProps('lz-region-error', regionError)} value={f.region} onChange={(e) => onRegion(e.target.value)}>
                {regional && <option value="">Select region</option>}
                {regionOptions.filter((region) => !regional || region.id !== f.homeRegion).map((r) => (
                  <option key={r.id} value={r.id}>{r.id}</option>
                ))}
              </select>
              <FieldError id="lz-region-error" error={regionError} />
            </div>
            <div>
              <label style={s.label} htmlFor="lz-region-short-name">Region short name</label>
              <input id="lz-region-short-name" style={s.input} value={f.regionShortName}
                onChange={(event) => setFoundation({ regionShortName: event.target.value })}
                {...fieldErrorProps('lz-region-short-name-error', shortNameError)} maxLength={3} placeholder="e.g. fra" />
              <FieldError id="lz-region-short-name-error" error={shortNameError} />
            </div>
            <div>
              <label style={s.label} htmlFor={regional ? 'lz-home-region' : 'lz-dr-region'}>{regional ? 'Home Region' : 'DR region'}</label>
              {regional ? <><select id="lz-home-region" {...fieldErrorProps('lz-home-region-error', homeRegionError)} disabled={!!homeSource} value={f.homeRegion ?? ''} onChange={(event) => setFoundation({ homeRegion: event.target.value })}>
                <option value="">Select region</option>
                {regionOptions.filter((region) => region.id !== f.region).map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
              </select><FieldError id="lz-home-region-error" error={homeRegionError} /></> : <select id="lz-dr-region" value={f.drRegion ?? ''} onChange={(event) => setFoundation({ drRegion: event.target.value || undefined })} aria-describedby="lz-dr-region-help">
                <option value="">No DR region</option>
                {regionOptions.filter((region) => region.id !== f.region).map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
              </select>}
            </div>
          </div>
          {!regional && <p id="lz-dr-region-help" style={s.help}>Selecting a DR region allows its Object Storage service to use this landing zone's encryption keys. Create the DR deployment separately.</p>}
        </div>
      </section>

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div className="studio-info-heading"><h2 style={s.title}>{regional ? 'Home Region environments' : 'Environments'}</h2>
            {regional ? <InfoButton title="Home Region environments"><p>These environments are expected to be deployed in the Home Region. DR reuses their existing compartments, IAM and governance.</p><p>{homeSource ? 'Environment names and membership sync from the Home Region design. Edit them there.' : 'Use the same environment names as your Home Region deployment.'}</p></InfoButton>
              : <InfoButton title="Environments and Security Zones"><p>Environments separate stages such as production and development. Projects and workload platforms are placed within the environments you select.</p><p>A Security Zone applies additional restrictions to an environment. Check that those restrictions suit its workloads before enabling it.</p><p>You can remove every environment to design a hub with shared services only.</p></InfoButton>}
          </div>
          {homeSource ? <>
            <p id="foundation-environments-help" style={form.intro}>{homeSource.model
              ? <>Environments sync automatically from <strong>{homeSource.name}</strong>. Edit them in the Home Region design.</>
              : 'The Home Region design is unavailable. These environments are from the last saved version. Restore the Home Region design to resume syncing and saving.'}</p>
            {homeSource.model && <Link to={`/lz/${encodeURIComponent(homeSource.id)}`} target="_blank" rel="noopener noreferrer"
              aria-label="Open Home Region (opens in a new tab)"
              style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '8px 14px', marginBottom: 14, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, color: oracle.ink, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Open Home Region</Link>}
            {envs.length ? <ul aria-label="Environments synced from Home Region" style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: `1px solid ${oracle.border}` }}>
              {envs.map((env) => <li key={env.id} style={{ padding: '12px 0', borderBottom: `1px solid ${oracle.border}`, fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{env.name}</li>)}
            </ul> : <p style={s.help}>No environments in the Home Region design. Hub and shared services only.</p>}
          </> : <>
          <p id="foundation-environments-help" style={form.intro}>{regional
            ? 'Use the same environment names as your Home Region deployment.'
            : 'Separate stages such as production and development. A Security Zone enforces stricter controls on an environment. You can rename or remove the defaults, including all environments.'}</p>

          <div style={{ ...s.tableHead, ...environmentGrid }} className={regional ? undefined : 'foundation-environment-grid'}>
            <span>{regional ? 'Environment' : 'Name'}</span>
            {!regional && <span>Security zone</span>}
            <span>Actions</span>
          </div>
          {envs.length === 0 && <div style={s.empty}>{regional
            ? 'No Home Region environments. Hub and shared services only.'
            : 'Hub and shared services only. Environments are optional.'}</div>}
          {envs.map((env, i) => (
            <div key={i} style={{ ...s.row, ...environmentGrid }} className={regional ? undefined : 'foundation-environment-grid'}>
              <div><input
                aria-label={`Environment ${i + 1} name`}
                {...fieldErrorProps(`environment-${env.id}-error`, configKeyError(env.name, envs.filter((_, index) => index !== i).map((other) => other.name)), regional ? 'foundation-environments-help' : undefined)}
                style={s.rowInput}
                value={env.name}
                onChange={(e) => updateEnv(i, { name: e.target.value })}
              /><FieldError id={`environment-${env.id}-error`} error={configKeyError(env.name, envs.filter((_, index) => index !== i).map((other) => other.name))} /></div>
              {!regional && <Switch
                checked={env.securityZone}
                onChange={(v) => updateEnv(i, { securityZone: v })}
                label={env.securityZone ? 'On' : 'Off'}
                ariaLabel={`Security zone for ${env.name || `environment ${i + 1}`}`}
              />}
              <DeleteButton label={regional ? `Remove ${env.name || `environment ${i + 1}`} from DR` : `Delete environment ${env.name || i + 1}`} onClick={() => deleteEnv(i)} />
            </div>
          ))}

          {!regional && <p style={{ ...s.help, marginTop: 12 }}>Network ranges are assigned automatically. You can change them in Projects.</p>}
          <label style={s.addLabel} htmlFor="new-environment-name">Add environment</label>
          <div style={{ ...s.addRow, ...environmentGrid }} className={regional ? undefined : 'foundation-add-grid'}>
            <div><input
              aria-label="New environment name"
              id="new-environment-name"
              {...fieldErrorProps('new-environment-error', newNameError, regional ? 'foundation-environments-help' : undefined)}
              style={s.rowInput}
              placeholder={regional ? 'e.g. prod' : 'e.g. staging'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addEnv(); }}
            /><FieldError id="new-environment-error" error={newNameError} /></div>
            {!regional && <Switch checked={newSecure} onChange={setNewSecure} label={newSecure ? 'On' : 'Off'} ariaLabel="Security zone for new environment" />}
            <button type="button" style={newNameError ? { ...s.addBtn, ...form.addBtnDisabled } : s.addBtn} disabled={!!newNameError} onClick={addEnv}>Add</button>
          </div>
          </>}
          {regional && <details style={{ ...s.help, marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', padding: '12px 0', minHeight: 44 }}>How DR uses these environments</summary>
            <p>DR networks and platforms use the matching compartments from your Home Region. IAM permissions and Security Zones are managed there. {homeSource ? 'Configure DR networks and platforms in the following steps.' : 'Changes here affect only this DR design.'}</p>
          </details>}
        </div>
      </section>

      <section style={s.panel} aria-labelledby="foundation-observability-title">
        <div style={s.accent} />
        <div style={s.body}>
          <h2 id="foundation-observability-title" style={s.title}>Notifications</h2>
          <p style={form.intro}>Choose who receives events and alarms. Enter email addresses separated by commas.</p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: oracle.ink }}>
              <input type="checkbox" checked={singleRecipient} onChange={(e) => setSingleRecipient(e.target.checked)} />
              Use the same recipients for all topics
            </label>
            <div style={{ ...s.help, marginTop: 6 }}>{regional ? 'Network and Security topics.' : 'Cloud Guard, IAM, Network and Security topics.'}</div>
          </div>
          {!singleRecipient && <div>
            {([
              ['cloudguard', 'Cloud Guard events'],
              ['iam', 'IAM events'],
              ['network', 'Network events and alarms'],
              ['security', 'Security events and alarms'],
            ] as const).filter(([topic]) => !regional || topic === 'network' || topic === 'security').map(([topic, label]) => (
              <div key={topic} style={s.topicRow} className="foundation-observability-row">
                <div>
                  <label style={s.label} htmlFor={`lz-observability-${topic}`}>{label}</label>
                  <input id={`lz-observability-${topic}`} style={s.input} type="text" inputMode="email"
                    required aria-invalid={!!notificationEmailError(f.notifications?.[topic])}
                    placeholder="team@example.com" value={f.notifications?.[topic] ?? ''}
                    onChange={(e) => setNotification(topic, e.target.value)} aria-describedby={`lz-observability-${topic}-help${notificationEmailError(f.notifications?.[topic]) ? ` lz-observability-${topic}-error` : ''}`} />
                  <FieldError id={`lz-observability-${topic}-error`} error={notificationEmailError(f.notifications?.[topic])} />
                </div>
                <div id={`lz-observability-${topic}-help`} style={s.help}>{topicHelp[topic]}</div>
              </div>
            ))}
          </div>}
          {singleRecipient && <div style={{ ...s.field, marginTop: 16, marginBottom: 0 }}>
            <label style={s.label} htmlFor="lz-observability-default">Notification emails</label>
            <input id="lz-observability-default" style={s.input} type="text" inputMode="email"
              required aria-invalid={!!notificationEmailError(f.notifications?.default)} aria-describedby={notificationEmailError(f.notifications?.default) ? 'lz-observability-default-error' : undefined}
              placeholder="ops@example.com" value={f.notifications?.default ?? ''}
              onChange={(e) => setNotification('default', e.target.value)} />
            <FieldError id="lz-observability-default-error" error={notificationEmailError(f.notifications?.default)} />
          </div>}
        </div>
      </section>
    </div>
  );
}
