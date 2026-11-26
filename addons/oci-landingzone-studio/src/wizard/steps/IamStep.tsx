import { DEFAULT_IDENTITY_DOMAIN_NAME, identityDomainNameError } from '../../services/identityDomains';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWizard } from '../wizardContext';
import DeleteButton from '../../components/DeleteButton';
import FieldError from '../../components/FieldError';
import InfoButton from '../../components/InfoButton';
import { configKeyError, fieldErrorProps } from '../../services/fieldErrors';
import { createModelId, envNetworkDefaults } from '../../model/defaults';
import { configuredVcnCidrs } from '../../services/exadata';
import { customDefaultSubnets } from '../../services/platforms';
import { environmentPlatformCidr } from '../../services/oneOeCidrs';
import { oracle } from '../../theme';
import type { GeneratedResourceInventory } from '../../services/generatedResources';
import type { Environment } from '../../model/types';
import { s as form } from './networkEditorStyles';

const s: Record<string, React.CSSProperties> = {
  col: form.col, panel: form.panel, accent: form.accent, body: form.body, title: form.title, help: form.help,
  row:     { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 64px', gap: 12, alignItems: 'center', padding: '6px 0' },
  rowInput:form.rowInput,
  empty:   { padding: '16px 12px', border: `1px dashed ${oracle.border}`, color: oracle.textMuted, fontSize: 13 },

  addRow:  { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 64px', gap: 12, alignItems: 'center', padding: 0 },
  addBtn:  { ...form.addBtn, padding: '9px 8px' },
  addLabel:{ ...form.label, margin: '20px 0 8px' },
};

export default function IamStep({ identityInventory, identityDomainsLoading = false }: {
  identityInventory?: GeneratedResourceInventory;
  identityDomainsLoading?: boolean;
}) {
  const { model, setField, homeSource } = useWizard();
  const regional = model.foundation.stackScope === 'regional';
  const identityFoundation = regional && homeSource?.model ? homeSource.model.foundation : model.foundation;
  const identityDomainName = identityFoundation.identityDomainName ?? DEFAULT_IDENTITY_DOMAIN_NAME;
  const identityDomainError = identityDomainNameError(identityDomainName);
  const envs = model.environments;
  const identityDomains = identityInventory?.groups.filter((group) => group.kind === 'identitydomain' && group.items.length > 0);
  const [identityAdvancedOpen, setIdentityAdvancedOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const newNameError = newName.trim() ? configKeyError(newName, envs.map((env) => env.name)) : null;

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
    setEnvs([...envs, { id, name, securityZone: false, network }]);
    setNewName('');
  }

  return <div className="studio-iam-step" style={s.col}>
      <section style={s.panel} aria-labelledby="iam-identity-domains-title">
        <div style={s.accent} />
        <div style={s.body}>
          <h2 id="iam-identity-domains-title" style={s.title}>Identity domains</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 8 }}>
            <p aria-label="Configured identity domain" style={{ margin: 0, minWidth: 0, fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{identityDomainName}</p>
            <button type="button" aria-expanded={identityAdvancedOpen} aria-controls="iam-identity-domains-advanced"
              onClick={() => setIdentityAdvancedOpen((open) => !open)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, minHeight: 44, padding: '10px 0 10px 12px', border: 0, background: 'transparent', color: oracle.ink, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ transform: identityAdvancedOpen ? 'rotate(90deg)' : undefined }}><path d="m9 5 7 7-7 7" /></svg>
              Advanced
            </button>
          </div>
          <p style={{ ...s.help, margin: '0 0 8px' }}>{regional
            ? 'This additional identity domain is created by the Home and Primary deployment and reused by Secondary (DR).'
            : 'This additional identity domain is created by default when you deploy the landing zone.'} Use this domain for federation with your organization's identity provider. Configure federation separately after deployment.</p>
          <p style={{ ...s.help, margin: '0 0 8px' }}>{regional
            ? 'You can change this name under Advanced in the Home and Primary Studio configuration.'
            : 'You can change this name under Advanced.'}</p>
          <div id="iam-identity-domains-advanced" hidden={!identityAdvancedOpen} style={{ marginTop: 12, paddingTop: 16, borderTop: `1px solid ${oracle.border}` }}>
            <p style={form.intro}>{regional
              ? 'Identity domains are managed in the Home and Primary Studio configuration. Secondary (DR) reuses them.'
              : 'Identity domains and their IAM groups are defined in the Home and Primary Studio configuration.'}</p>
            <label style={form.label} htmlFor="iam-identity-domain-name">Identity domain name</label>
            <input id="iam-identity-domain-name" style={form.input} required maxLength={100} readOnly={regional}
              {...fieldErrorProps('iam-identity-domain-name-error', identityDomainError, 'iam-identity-domain-name-help')}
              value={identityDomainName}
              onChange={(event) => setField('foundation', { ...model.foundation, identityDomainName: event.target.value })} />
            <p id="iam-identity-domain-name-help" style={{ ...s.help, marginTop: 6, marginBottom: 14 }}>{regional
              ? 'The name is inherited from the Home and Primary Studio configuration.'
              : 'Display name used by the domain and its IAM policies. Use up to 100 letters, numbers, hyphens, periods, or underscores. OCI assigns the domain OCID during deployment.'}</p>
            <FieldError id="iam-identity-domain-name-error" error={identityDomainError} />
            {identityDomains ? identityDomains.length > 0 ? <ul aria-label="Generated identity domains" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {identityDomains.map((domain) => <li key={domain.id} style={{ padding: '12px 0', borderTop: `1px solid ${oracle.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <strong style={{ fontSize: 14, overflowWrap: 'anywhere', minWidth: 0 }}>{domain.items[0].name}</strong>
                  <span style={{ ...s.help, flex: '0 0 auto' }}>{`${domain.items.length - 1} group${domain.items.length === 2 ? '' : 's'}`}</span>
                </div>
                {domain.items.length > 1 ? <ul aria-label={`Groups in ${domain.items[0].name}`} style={{ margin: '12px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                  {domain.items.slice(1).map((group) => <li key={group.key}>{group.name}</li>)}
                </ul> : <p style={{ ...s.help, marginTop: 8 }}>No groups in this domain.</p>}
              </li>)}
            </ul> : <p style={s.help}>No identity domains in this configuration.</p>
              : <p role="status" style={s.help}>{identityDomainsLoading ? 'Preparing identity domains...'
                : regional ? 'Open the Home and Primary Studio configuration to review its identity domains.'
                : 'Complete the configuration to preview its identity domains.'}</p>}
          </div>
        </div>
      </section>
      <section style={s.panel} aria-labelledby="iam-environments-title">
        <div style={s.accent} />
        <div style={s.body}>
          <div className="studio-info-heading"><h2 id="iam-environments-title" style={s.title}>{regional ? 'Primary deployment environments' : 'Environments'}</h2>
            {regional ? <InfoButton title="Primary deployment environments"><p>These environments are expected to be deployed in the primary deployment. DR reuses their existing compartments, IAM and governance.</p><p>{homeSource ? 'Environment names and membership sync from the primary deployment design. Edit them there.' : 'Use the same environment names as your primary deployment.'}</p></InfoButton>
              : <InfoButton title="Environments"><p>Environments separate stages such as production and development. Projects and workload platforms are placed within the environments you select.</p><p>You can remove every environment to design a hub with shared services only.</p></InfoButton>}
          </div>
          {homeSource ? <>
            <p id="foundation-environments-help" style={form.intro}>{homeSource.model
              ? <>Environments sync automatically from <strong>{homeSource.name}</strong>. Edit them in the primary deployment design.</>
              : 'The Primary deployment design is unavailable. These environments are from the last saved version. Restore the primary deployment design to resume syncing and saving.'}</p>
            {homeSource.model && <Link to={`/lz/${encodeURIComponent(homeSource.id)}`} target="_blank" rel="noopener noreferrer"
              aria-label="Open primary deployment (opens in a new tab)"
              style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '8px 14px', marginBottom: 14, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, color: oracle.ink, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Open primary deployment</Link>}
            {envs.length ? <ul aria-label="Environments synced from primary deployment" style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: `1px solid ${oracle.border}` }}>
              {envs.map((env) => <li key={env.id} style={{ padding: '12px 0', borderBottom: `1px solid ${oracle.border}`, fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{env.name}</li>)}
            </ul> : <p style={s.help}>No environments in the primary deployment design. Hub and shared services only.</p>}
          </> : <>
          {regional && <p id="foundation-environments-help" style={form.intro}>Use the same environment names as your primary deployment.</p>}

          {envs.length === 0 && <div style={s.empty}>{regional
            ? 'No Primary deployment environments. Hub and shared services only.'
            : 'Hub and shared services only. Environments are optional.'}</div>}
          {envs.map((env, i) => (
            <div key={i} style={s.row} className="foundation-environment-grid">
              <div><input
                aria-label={`Environment ${i + 1} name`}
                {...fieldErrorProps(`environment-${env.id}-error`, configKeyError(env.name, envs.filter((_, index) => index !== i).map((other) => other.name)), regional ? 'foundation-environments-help' : undefined)}
                style={s.rowInput}
                value={env.name}
                onChange={(e) => updateEnv(i, { name: e.target.value })}
              /><FieldError id={`environment-${env.id}-error`} error={configKeyError(env.name, envs.filter((_, index) => index !== i).map((other) => other.name))} /></div>
              <DeleteButton label={regional ? `Remove ${env.name || `environment ${i + 1}`} from DR` : `Delete environment ${env.name || i + 1}`} onClick={() => deleteEnv(i)} />
            </div>
          ))}

          {!regional && <p style={{ ...s.help, marginTop: 12 }}>Network ranges are assigned automatically. You can change them in Projects.</p>}
          <label style={s.addLabel} htmlFor="new-environment-name">Add environment</label>
          <div style={s.addRow} className="foundation-add-grid">
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
            <button type="button" style={newNameError ? { ...s.addBtn, ...form.addBtnDisabled } : s.addBtn} disabled={!!newNameError} onClick={addEnv}>Add</button>
          </div>
          </>}
          {regional && <details style={{ ...s.help, marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', padding: '12px 0', minHeight: 44 }}>How DR uses these environments</summary>
            <p>DR networks and platforms use the matching compartments from your primary deployment. IAM permissions and Security Zones are managed there. {homeSource ? 'Configure DR networks and platforms in the following steps.' : 'Changes here affect only this DR design.'}</p>
          </details>}
        </div>
      </section>
  </div>;
}
