/**
 * EnvNetworkStep — step 3 ("Projects"). Two parts:
 *   1. Projects — named compartments dropped into one/all/a subset of the
 *      environments. Add via a name + "Apply to" dropdown; Edit opens inline
 *      environment checkboxes so a project can target any subset.
 *   2. The spoke (project) network inside each environment compartment — one
 *      collapsible panel per environment, reusing the hub's VCN editor.
 *
 * Everything writes into the canonical model (model.projects + each
 * Environment.network); the diagram and JSON derive from it.
 */

import { useState, type CSSProperties } from 'react';
import { useWizard } from '../wizardContext';
import { createModelId, envNetworkDefaults } from '../../model/defaults';
import { oracle } from '../../theme';
import { getHubKind } from '../../services/hubKinds';
import type { Environment, EnvNetworkConfig, ProjectConfig } from '../../model/types';
import { VcnEditor } from './HubNetworkStep';
import { s } from './networkEditorStyles';
import DeleteButton from '../../components/DeleteButton';
import EditButton from '../../components/EditButton';
import SaveButton from '../../components/SaveButton';
import CancelButton from '../../components/CancelButton';
import Switch from '../../components/Switch';
import FieldError from '../../components/FieldError';
import InfoButton from '../../components/InfoButton';
import ValidatedInput from '../../components/ValidatedInput';
import { configKeyError, fieldErrorProps } from '../../services/fieldErrors';
import { placementsOverlap } from '../../services/platforms';

const local: Record<string, CSSProperties> = {
  // Fixed action column (not `auto`) so the header and every row share identical
  // column widths — otherwise the empty header cell and the icon-filled row cells
  // resolve different `auto` widths and the Environments column drifts out of line.
  // Sized for two 34px icon buttons (Edit+Delete in view, Save+Cancel in edit).
  projGrid:   { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr) 84px', gap: 12, alignItems: 'center', overflowWrap: 'anywhere' },
  allBadge:   { display: 'inline-block', padding: '3px 14px', fontSize: 12.5, fontWeight: 700, color: oracle.compYellowBorder, background: oracle.compYellowFill, border: `1px solid ${oracle.compYellowBorder}`, borderRadius: 999 },
  envPill:    { display: 'inline-block', padding: '3px 10px', fontSize: 12, fontWeight: 600, color: oracle.textMuted, background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 999 },
  pillWrap:   { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  rowActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  chip:       { padding: '5px 12px', fontSize: 12.5, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 999, background: oracle.surface, color: oracle.text, cursor: 'pointer' },
  chipActive: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.red },
  projName:   { fontWeight: 700, color: oracle.ink, fontSize: 14 },
};

/** Environments badge for a project: a yellow "All", a "none", or one pill per env. */
function EnvBadge({ environments, envs }: { environments: 'all' | string[]; envs: Pick<Environment, 'id' | 'name'>[] }) {
  // The outer span is the grid cell (it may stretch); the pills inside size to content.
  return (
    <span style={local.pillWrap}>
      {environments === 'all'
        ? <span style={local.allBadge}>All</span>
        : environments.length === 0
          ? <span style={{ ...local.envPill, color: '#b3261e' }}>none</span>
          : environments.map((id) => <span key={id} style={local.envPill}>{envs.find((env) => env.id === id)?.name || 'removed'}</span>)}
    </span>
  );
}

/** Next free "projN" key — mirrors the generator default and stays DNS-safe. */
function nextProjectName(projects: ProjectConfig[]): string {
  let max = 0;
  for (const p of projects) {
    const m = p.name.trim().match(/^proj(?:ect-?)?(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `proj${max + 1}`;
}

/** Projects table + add form + inline subset editor. */
function ProjectsPanel({ projects, envs, onChange }: {
  projects: ProjectConfig[];
  envs: Pick<Environment, 'id' | 'name'>[];
  onChange: (next: ProjectConfig[]) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newEnvs, setNewEnvs] = useState<'all' | string[]>('all');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEnvs, setEditEnvs] = useState<'all' | string[]>('all');

  // Blank field → use the next free generator-aligned key (also the placeholder).
  const suggestedName = nextProjectName(projects);
  const effectiveName = newName.trim() || suggestedName;
  const addNameError = configKeyError(effectiveName, projects.filter((project) => placementsOverlap(newEnvs, project.environments)).map((project) => project.name));
  const addPlacementError = newEnvs !== 'all' && newEnvs.length === 0 ? 'Select at least one environment.' : null;
  const addError = addNameError || addPlacementError;
  const editNameError = configKeyError(editName, projects.filter((project, index) => index !== editIdx && placementsOverlap(editEnvs, project.environments)).map((project) => project.name));
  const editPlacementError = editEnvs !== 'all' && !editEnvs.length ? 'Select at least one environment.' : null;

  function add() {
    if (addError) return;
    onChange([...projects, { id: createModelId('project'), name: effectiveName, environments: newEnvs }]);
    setNewName('');
    setNewEnvs('all');
  }
  function toggleNewEnv(env: string) {
    setNewEnvs((prev) => prev === 'all' ? [env] : prev.includes(env) ? prev.filter((x) => x !== env) : [...prev, env]);
  }
  function del(i: number) { onChange(projects.filter((_, idx) => idx !== i)); }
  function startEdit(i: number) {
    setEditIdx(i);
    setEditName(projects[i].name);
    setEditEnvs(projects[i].environments);
  }
  function saveEdit() {
    if (editIdx === null || editNameError || editPlacementError) return;
    onChange(projects.map((p, idx) => idx === editIdx ? { ...p, name: editName.trim(), environments: editEnvs } : p));
    setEditIdx(null);
  }
  function toggleEnv(env: string) {
    setEditEnvs((prev) => prev === 'all' ? [env] : prev.includes(env) ? prev.filter((x) => x !== env) : [...prev, env]);
  }

  return (
    <section style={s.panel}>
      <div style={s.accent} />
      <div style={s.body}>
        <div className="studio-info-heading"><h2 style={s.title}>Projects</h2>
          <InfoButton title="Projects and environment networks"><p>A project groups application resources in the environments you select. Its placement determines where its compartments are created.</p><p>Projects in an environment share its Projects VCN. Configure that network below. Turning the VCN off keeps the environment available for projects and platforms.</p></InfoButton>
        </div>
        <p style={s.intro}>Group application resources within selected environments. Configure each environment's network separately below.</p>

        <div style={{ ...s.tableHead, ...local.projGrid, textTransform: 'none', letterSpacing: 0 }}>
          <span>Project</span>
          <span>Environments</span>
          <span />
        </div>
        {projects.length === 0 && <div style={s.empty}>No projects yet — add one below.</div>}
        {projects.map((p, i) => (
          <div key={p.id} style={{ ...s.row, ...local.projGrid }}>
            {editIdx === i ? (
              <>
                <div><ValidatedInput id={`project-${p.id}-name`} error={editNameError} aria-label="Project name" style={s.rowInput} value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                <div><div style={local.pillWrap} role="group" aria-label="Project environments" {...fieldErrorProps(`project-${p.id}-placement-error`, editPlacementError)}>
                  <button type="button" aria-pressed={editEnvs === 'all'} style={editEnvs === 'all' ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => setEditEnvs('all')}>All</button>
                  {envs.map((env) => {
                    const active = editEnvs !== 'all' && editEnvs.includes(env.id);
                    return (
                      <button key={env.id} type="button" aria-pressed={active} style={active ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => toggleEnv(env.id)}>{env.name}</button>
                    );
                  })}
                </div><FieldError id={`project-${p.id}-placement-error`} error={editPlacementError} /></div>
                <div style={local.rowActions}>
                  <SaveButton label="Save project" onClick={saveEdit} />
                  <CancelButton label="Cancel edit" onClick={() => setEditIdx(null)} />
                </div>
              </>
            ) : (
              <>
                <span style={local.projName}>{p.name}</span>
                <EnvBadge environments={p.environments} envs={envs} />
                <div style={local.rowActions}>
                  <EditButton label={`Edit project ${p.name}`} onClick={() => startEdit(i)} />
                  <DeleteButton label={`Delete project ${p.name}`} onClick={() => del(i)} />
                </div>
              </>
            )}
          </div>
        ))}

        <div style={s.subCard}>
          <div style={s.subHead}>Add project</div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={s.addLabel} htmlFor="new-project-name">Project name</label>
                <ValidatedInput
                  id="new-project-name"
                  error={addNameError}
                  style={s.rowInput}
                  placeholder={suggestedName}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
                />
              </div>
              <button
                type="button"
                style={addError ? { ...s.addBtn, marginTop: 0, ...s.addBtnDisabled } : { ...s.addBtn, marginTop: 0 }}
                disabled={!!addError}
                title={addError ?? 'Add project'}
                onClick={add}
              >
                Add project
              </button>
            </div>
            <div>
              <label style={s.addLabel}>Apply to</label>
              <div style={{ ...local.pillWrap, marginTop: 2 }} role="group" aria-label="Apply project to environments" {...fieldErrorProps('new-project-placement-error', addPlacementError)}>
                <button type="button" aria-pressed={newEnvs === 'all'} style={newEnvs === 'all' ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => setNewEnvs('all')}>All</button>
                {envs.map((env) => {
                  const active = newEnvs !== 'all' && newEnvs.includes(env.id);
                  return (
                    <button key={env.id} type="button" aria-pressed={active} style={active ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => toggleNewEnv(env.id)}>{env.name}</button>
                  );
                })}
              </div>
              <FieldError id="new-project-placement-error" error={addPlacementError} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function EnvNetworkStep() {
  const { model, setField, vcnErrors: conflicts } = useWizard();
  const kind = getHubKind(model.network.hubKind);
  const envs = model.environments.map((env, index) => ({ id: env.id, name: env.name.trim() || `env${index + 1}` }));
  const [envOpen, setEnvOpen] = useState<Record<number, boolean>>({}); // collapsed by default

  /** Stale in-memory records may predate Environment.network — always fall back to defaults. */
  function envNetwork(i: number): EnvNetworkConfig {
    return model.environments[i].network ?? envNetworkDefaults(i, model.environments[i].name);
  }
  function patchEnvNetwork(i: number, patch: Partial<EnvNetworkConfig>) {
    const current = envNetwork(i);
    setField('environments', model.environments.map((env, idx) => idx === i
      ? { ...env, network: { ...current, ...patch } }
      : env));
  }
  // Spoke networks only make sense once an implemented hub kind is chosen in step 2.
  if (!kind?.implemented) {
    return (
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <h2 style={s.title}>Projects</h2>
          <div style={{ ...s.empty, borderTop: `1px dashed ${oracle.border}`, borderRadius: 6 }}>
            Choose an implemented hub model in step 2 first — the environment (spoke) networks and projects build on it.
          </div>
        </div>
      </section>
    );
  }

  return (
    <div style={s.col}>
      {envs.length > 0 && <ProjectsPanel projects={model.projects} envs={envs} onChange={(next) => setField('projects', next)} />}

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <h2 style={s.title}>Environment networks</h2>
          <p style={s.intro}>Configure the Projects VCN for each environment. Keep its address range separate from the hub and other connected networks.</p>
          {envs.length > 0 && <details style={{ ...s.help, marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer' }}>About default address ranges</summary>
            <p style={{ marginTop: 8 }}>The prod, preprod, dr, dev and uat names use reserved ranges. Other names receive available <code>/21</code> blocks from <code>10.1.192.0/18</code>. If no block is available, enter a non-overlapping CIDR below.</p>
          </details>}
          {model.environments.length === 0 ? (
            <div style={{ ...s.empty, borderTop: `1px dashed ${oracle.border}`, borderRadius: 6 }}>
              Hub and shared services only. Continue to Platforms to add shared services, or add environments in Foundation.
            </div>
          ) : (
            <div className="environment-network-list">
              {model.environments.map((env, i) => {
                const envName = env.name.trim() || `env${i + 1}`;
                const net = envNetwork(i);
                const open = envOpen[i] ?? false;
                const enabled = env.projectNetworkEnabled !== false;
                return (
                  <div key={i} style={{ borderTop: i > 0 ? `1px solid ${oracle.border}` : undefined }}>
                    <div className="environment-network-header">
                      <button
                        type="button"
                        className="environment-network-disclosure"
                        aria-label={`Configure ${envName} network`}
                        aria-expanded={open}
                        aria-controls={`environment-network-${i}`}
                        onClick={() => setEnvOpen((prev) => ({ ...prev, [i]: !open }))}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : undefined }}>
                          <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="environment-network-heading">
                          <span style={s.envHeadTitle}>{envName}</span>
                          <span className="environment-network-summary">{!enabled ? 'VCN disabled' : open ? 'Projects VCN' : net.vcnCidr}</span>
                        </span>
                      </button>
                      <Switch checked={enabled} label={enabled ? 'On' : 'Off'} ariaLabel={`Projects VCN for ${envName}`} onChange={(checked) => setField('environments', model.environments.map((item, index) => index === i ? { ...item, projectNetworkEnabled: checked,
                        network: checked && !net.vcnCidr ? envNetworkDefaults(i, item.name) : net } : item))} />
                    </div>
                    <div id={`environment-network-${i}`} hidden={!open} className="environment-network-body">
                      {open && (!enabled ? <p style={{ ...s.help, paddingTop: 8 }}>The Projects VCN is disabled. This environment can still contain projects and platforms.</p> : <>
                        <VcnEditor
                          idPrefix={`env-${i}`}
                          conflicts={conflicts[`environment:${env.id}`]}
                          vcnCidr={net.vcnCidr}
                          subnets={net.subnets}
                          emptyNote="No subnets in this environment — add one below."
                          onApply={(patch) => patchEnvNetwork(i, patch)}
                        />
                      </>)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
