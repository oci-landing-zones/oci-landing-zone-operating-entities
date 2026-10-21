import { useState, type CSSProperties } from 'react';
import type { EnvNetworkConfig, LzModel } from '../model/types';
import type { DrDesignDraft } from '../services/disasterRecoveryDesign';
import Switch from './Switch';
import DeleteButton from './DeleteButton';
import DisasterRecoveryEnvironmentNetworkEditor from './DisasterRecoveryEnvironmentNetworkEditor';
import { oracle } from '../theme';
import { generatorNames } from '../services/generatorNaming';

const cell: CSSProperties = { padding: '12px 10px', textAlign: 'left', verticalAlign: 'top', borderBottom: `1px solid ${oracle.border}`, fontSize: 14 };
const input: CSSProperties = { boxSizing: 'border-box', width: '100%', minWidth: 0, padding: '9px 11px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, font: 'inherit', fontSize: 14, color: oracle.text, background: oracle.surface };
const help: CSSProperties = { fontSize: 12.5, lineHeight: 1.6, color: oracle.textMuted, margin: '0 0 16px' };

function NetworkDetails({ network }: { network?: EnvNetworkConfig }) {
  if (!network) return <p style={{ ...help, margin: '8px 0 0' }}>DR CIDR pending</p>;
  return <details style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
    <summary style={{ cursor: 'pointer', overflowWrap: 'anywhere' }}>VCN <strong>{network.vcnCidr || 'Not set'}</strong></summary>
    <details style={{ marginTop: 10, paddingLeft: 12, borderLeft: `1px solid ${oracle.borderStrong}` }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Subnets in this VCN</summary>
      <dl style={{ margin: '8px 0 0' }}>{network.subnets.map((subnet) => <div key={subnet.name} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '4px 12px', marginTop: 6 }}>
        <dt style={{ color: oracle.textMuted }}>{subnet.name}</dt><dd style={{ margin: 0 }}>{subnet.cidr}</dd>
      </div>)}</dl>
    </details>
  </details>;
}

export default function DisasterRecoveryEnvironments({ model, draft, onChange }: {
  model: LzModel; draft?: DrDesignDraft; onChange?: (draft: DrDesignDraft) => void;
}) {
  const [choice, setChoice] = useState('');
  const [newSecure, setNewSecure] = useState<boolean | null>(null);
  const isDr = !!draft;
  const environments = isDr ? model.environments.filter((env) => draft.projectNetworkIds.includes(`projects:${env.id}`)) : model.environments;
  const available = model.environments.filter((env) => env.network.vcnCidr.trim() && !draft?.projectNetworkIds.includes(`projects:${env.id}`));
  const selected = available.find((env) => env.id === choice) ?? available[0];
  const secure = newSecure ?? selected?.securityZone ?? false;
  function add() {
    if (!draft || !onChange || !selected) return;
    onChange({ ...draft, projectNetworkIds: [...draft.projectNetworkIds, `projects:${selected.id}`], environmentSecurityZones: { ...draft.environmentSecurityZones, [selected.id]: secure }, environmentAdded: { ...draft.environmentAdded, [selected.id]: false } });
    setChoice('');
    setNewSecure(null);
  }
  return <>
    <p style={help}>An environment is an isolated stage of your workload, such as development or production. A Security Zone applies stricter OCI controls; confirm it permits every service you plan to use.</p>
    <div style={{ overflowX: 'auto' }}>
      <table aria-label={isDr ? 'DR environments' : 'Home environments'} style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead style={{ background: oracle.surfaceAlt }}><tr>
          <th scope="col" style={{ ...cell, fontSize: 12, color: oracle.textMuted }}>Name</th>
          <th scope="col" style={{ ...cell, fontSize: 12, color: oracle.textMuted, width: 100 }}>Security zone</th>
          {isDr && <th scope="col" style={{ ...cell, fontSize: 12, color: oracle.textMuted, width: 58 }}>Actions</th>}
        </tr></thead>
        <tbody>{environments.map((env) => {
          const securityZone = draft?.environmentSecurityZones?.[env.id] ?? env.securityZone;
          const projects = model.projects.filter((project) => project.environments === 'all' || project.environments.includes(env.id));
          const environmentName = draft?.environmentNames?.[env.id] ?? env.name;
          const environmentError = !environmentName.trim() ? 'Enter an environment name.' : environments.some((other) => other.id !== env.id && (draft?.environmentNames?.[other.id] ?? other.name).trim().toLowerCase() === environmentName.trim().toLowerCase()) ? 'This environment name is already used in DR.' : null;
          const confirmed = !!draft?.environmentAdded?.[env.id];
          const projectValues = projects.map((project) => (draft?.projectNames?.[env.id]?.[project.id] ?? project.name).trim().toLowerCase());
          const projectError = projectValues.some((value) => !value) || new Set(projectValues).size !== projectValues.length ? 'Enter a unique name for each project.' : null;
          return <tr key={env.id}>
            <td style={{ ...cell, overflowWrap: 'anywhere' }}>
              {draft && onChange && !confirmed ? <>
                <label htmlFor={`dr-environment-name-${env.id}`} style={{ display: 'block', fontSize: 12.5, color: oracle.textMuted, marginBottom: 6 }}>Home: {env.name}</label>
                <input id={`dr-environment-name-${env.id}`} style={input} aria-label={`DR environment name for ${env.name}`} value={environmentName} aria-invalid={!!environmentError}
                  aria-describedby={`dr-environment-name-${env.id}-help`} onChange={(event) => onChange({ ...draft, environmentNames: { ...draft.environmentNames, [env.id]: event.target.value } })} />
                <p id={`dr-environment-name-${env.id}-help`} style={{ ...help, color: environmentError ? oracle.redDark : oracle.textMuted, margin: '6px 0 0' }}>{environmentError ?? `Compartment: ${generatorNames.environmentCompartment(environmentName.trim())}`}</p>
              </> : <><strong>{environmentName}</strong><p style={{ ...help, margin: '6px 0 0' }}>Compartment: {generatorNames.environmentCompartment(environmentName.trim())}</p></>}
              {!!projects.length && (draft && onChange && !confirmed ? <fieldset style={{ margin: '12px 0', padding: 0, border: 0, minWidth: 0 }}>
                <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Projects</legend>
                {projects.map((project) => {
                  const value = draft.projectNames?.[env.id]?.[project.id] ?? project.name;
                  const id = `dr-project-${env.id}-${project.id}`;
                  const error = !value.trim() ? 'Enter a project name.' : projects.some((other) => other.id !== project.id && (draft.projectNames?.[env.id]?.[other.id] ?? other.name).trim().toLowerCase() === value.trim().toLowerCase()) ? 'This project name is already used in this environment.' : null;
                  return <div key={project.id} style={{ marginTop: 8 }}>
                    <label htmlFor={id} style={{ display: 'block', fontSize: 12.5, color: oracle.textMuted, marginBottom: 6 }}>Home: {project.name}</label>
                    <input id={id} style={input} aria-label={`DR project name for ${project.name} in ${env.name}`} value={value} aria-invalid={!!error} aria-describedby={`${id}-help`}
                      onChange={(event) => onChange({ ...draft, projectNames: { ...draft.projectNames, [env.id]: { ...draft.projectNames?.[env.id], [project.id]: event.target.value } } })} />
                    <p id={`${id}-help`} style={{ ...help, color: error ? oracle.redDark : oracle.textMuted, margin: '6px 0 0' }}>{error ?? `Compartment: ${generatorNames.environmentProjectCompartment(environmentName.trim(), value.trim())}`}</p>
                  </div>;
                })}
              </fieldset> : <div style={{ marginTop: 10 }}><span style={{ fontSize: 13, fontWeight: 700 }}>Projects</span>{projects.map((project) => {
                const projectName = draft?.projectNames?.[env.id]?.[project.id] ?? project.name;
                return <div key={project.id} style={{ marginTop: 6 }}><span style={{ fontSize: 13 }}>{projectName}</span><p style={{ ...help, margin: '4px 0 0' }}>Compartment: {generatorNames.environmentProjectCompartment(environmentName.trim(), projectName.trim())}</p></div>;
              })}</div>)}
              <NetworkDetails network={isDr ? draft.projectNetworks?.[`projects:${env.id}`] : env.network} />
              {draft && onChange && !confirmed && <DisasterRecoveryEnvironmentNetworkEditor model={model} draft={draft} environmentId={env.id} name={env.name} source={env.network}
                confirmationError={environmentError || projectError}
                network={draft.projectNetworks?.[`projects:${env.id}`]}
                onApply={(network) => onChange({ ...draft, projectNetworks: { ...draft.projectNetworks, [`projects:${env.id}`]: network }, environmentAdded: { ...draft.environmentAdded, [env.id]: true } })} />}
            </td>
            <td style={cell}>{draft && onChange && !confirmed ? <Switch checked={securityZone} label={securityZone ? 'On' : 'Off'} ariaLabel={`DR security zone for ${env.name}`}
              onChange={(value) => onChange({ ...draft, environmentSecurityZones: { ...draft.environmentSecurityZones, [env.id]: value } })} />
              : <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, background: securityZone ? oracle.greenFill : oracle.surface, color: securityZone ? oracle.greenDark : oracle.textMuted, fontWeight: 700, fontSize: 13 }}>{securityZone ? 'On' : 'Off'}</span>}</td>
            {draft && onChange && <td style={cell}>
              {confirmed && <button type="button" aria-label={`Edit ${environmentName} environment`} style={{ display: 'block', whiteSpace: 'nowrap', padding: 0, marginBottom: 12, border: 0, background: 'transparent', color: oracle.redDark, font: 'inherit', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onChange({ ...draft, environmentAdded: { ...draft.environmentAdded, [env.id]: false } })}>Edit env</button>}
              <DeleteButton label={`Remove ${env.name} from DR`} onClick={() => onChange({ ...draft, projectNetworkIds: draft.projectNetworkIds.filter((id) => id !== `projects:${env.id}`) })} />
            </td>}
          </tr>;
        })}</tbody>
      </table>
    </div>
    {!environments.length && <p style={{ ...help, marginTop: 12 }}>No environments selected.</p>}
    {draft && onChange && <>
      <p style={{ ...help, marginTop: 14 }}>Only prod is selected by default, using 10.0.200.0/21 in DR. Additional environments can be selected from the home configuration.</p>
      {!!available.length && <fieldset style={{ margin: '20px 0 0', padding: 0, border: 0, minWidth: 0 }}>
        <legend style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Add environment</legend>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <select aria-label="Home environment to add to DR" style={{ ...input, flex: '1 1 150px' }} value={selected?.id ?? ''} onChange={(event) => { setChoice(event.target.value); setNewSecure(null); }}>
            {available.map((env) => <option key={env.id} value={env.id}>{env.name}</option>)}
          </select>
          <Switch checked={secure} onChange={setNewSecure} label={secure ? 'On' : 'Off'} ariaLabel="Security zone for environment added to DR" />
          <button type="button" style={{ padding: '9px 18px', border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: oracle.surface, fontWeight: 700, fontSize: 14, cursor: 'pointer' }} onClick={add}>Add</button>
        </div>
      </fieldset>}
    </>}
  </>;
}
