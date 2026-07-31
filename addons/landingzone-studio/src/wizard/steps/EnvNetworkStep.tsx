/**
 * EnvNetworkStep — step 3 ("Projects"). Two parts:
 *   1. Projects — named compartments dropped into one/all/a subset of the
 *      environments. Add via a name + "Apply to" dropdown; Edit opens inline
 *      environment checkboxes so a project can target any subset.
 *   2. The spoke (project) network inside each environment compartment — one
 *      collapsible panel per environment, reusing the hub's VCN + routing editors.
 *
 * Everything writes into the canonical model (model.projects + each
 * Environment.network); the diagram and JSON derive from it.
 */

import { useState, type CSSProperties } from 'react';
import { useWizard } from '../wizardContext';
import { envNetworkDefaults, envRoutingDefaults } from '../../model/defaults';
import { oracle } from '../../theme';
import { getHubKind, resolveHubName } from '../../services/hubKinds';
import type { EnvNetworkConfig, ProjectConfig, VcnRouting } from '../../model/types';
import { VcnEditor, RoutingEditor } from './HubNetworkStep';
import { s } from './networkEditorStyles';
import DeleteButton from '../../components/DeleteButton';
import EditButton from '../../components/EditButton';
import SaveButton from '../../components/SaveButton';
import CancelButton from '../../components/CancelButton';

const local: Record<string, CSSProperties> = {
  // Fixed action column (not `auto`) so the header and every row share identical
  // column widths — otherwise the empty header cell and the icon-filled row cells
  // resolve different `auto` widths and the Environments column drifts out of line.
  // Sized for two 34px icon buttons (Edit+Delete in view, Save+Cancel in edit).
  projGrid:   { display: 'grid', gridTemplateColumns: '1fr 1.5fr 84px', gap: 12, alignItems: 'center' },
  allBadge:   { display: 'inline-block', padding: '3px 14px', fontSize: 12.5, fontWeight: 700, color: oracle.compYellowBorder, background: oracle.compYellowFill, border: `1px solid ${oracle.compYellowBorder}`, borderRadius: 999 },
  envPill:    { display: 'inline-block', padding: '3px 10px', fontSize: 12, fontWeight: 600, color: oracle.textMuted, background: oracle.surfaceAlt, border: `1px solid ${oracle.border}`, borderRadius: 999 },
  pillWrap:   { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  rowActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  chip:       { padding: '5px 12px', fontSize: 12.5, fontWeight: 700, border: `1px solid ${oracle.borderStrong}`, borderRadius: 999, background: oracle.surface, color: oracle.text, cursor: 'pointer' },
  chipActive: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.red },
  projName:   { fontWeight: 700, color: oracle.ink, fontSize: 14 },
};

/** Environments badge for a project: a yellow "All", a "none", or one pill per env. */
function EnvBadge({ environments }: { environments: 'all' | string[] }) {
  // The outer span is the grid cell (it may stretch); the pills inside size to content.
  return (
    <span style={local.pillWrap}>
      {environments === 'all'
        ? <span style={local.allBadge}>All</span>
        : environments.length === 0
          ? <span style={{ ...local.envPill, color: '#b3261e' }}>none</span>
          : environments.map((e) => <span key={e} style={local.envPill}>{e}</span>)}
    </span>
  );
}

/** Next free "project-N" name — counts past the highest existing project number. */
function nextProjectName(projects: ProjectConfig[]): string {
  let max = 0;
  for (const p of projects) {
    const m = p.name.trim().match(/^project-?(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `project-${max + 1}`;
}

/** Projects table + add form + inline subset editor. */
function ProjectsPanel({ projects, envNames, onChange }: {
  projects: ProjectConfig[];
  envNames: string[];
  onChange: (next: ProjectConfig[]) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newEnvs, setNewEnvs] = useState<'all' | string[]>('all');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEnvs, setEditEnvs] = useState<'all' | string[]>('all');

  const nameTaken = (name: string, ignore = -1) =>
    projects.some((p, i) => i !== ignore && p.name.trim().toLowerCase() === name.toLowerCase());
  // Blank field → use the next free "project-N" suggestion (also the placeholder).
  const suggestedName = nextProjectName(projects);
  const effectiveName = newName.trim() || suggestedName;
  const addError = nameTaken(effectiveName)
    ? 'A project with this name already exists'
    : (newEnvs !== 'all' && newEnvs.length === 0) ? 'Select at least one environment'
    : null;

  function add() {
    if (addError) return;
    onChange([...projects, { name: effectiveName, environments: newEnvs }]);
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
    if (editIdx === null) return;
    onChange(projects.map((p, idx) => idx === editIdx ? { name: editName.trim() || 'project', environments: editEnvs } : p));
    setEditIdx(null);
  }
  function toggleEnv(env: string) {
    setEditEnvs((prev) => prev === 'all' ? [env] : prev.includes(env) ? prev.filter((x) => x !== env) : [...prev, env]);
  }

  return (
    <section style={s.panel}>
      <div style={s.accent} />
      <div style={s.body}>
        <div style={s.title}>Projects</div>

        <div style={{ ...s.tableHead, ...local.projGrid }}>
          <span>Project</span>
          <span>Environments</span>
          <span />
        </div>
        {projects.length === 0 && <div style={s.empty}>No projects yet — add one below.</div>}
        {projects.map((p, i) => (
          <div key={i} style={{ ...s.row, ...local.projGrid }}>
            {editIdx === i ? (
              <>
                <input aria-label="Project name" style={s.rowInput} value={editName} onChange={(e) => setEditName(e.target.value)} />
                <div style={local.pillWrap}>
                  <button type="button" style={editEnvs === 'all' ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => setEditEnvs('all')}>All</button>
                  {envNames.map((n) => {
                    const active = editEnvs !== 'all' && editEnvs.includes(n);
                    return (
                      <button key={n} type="button" style={active ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => toggleEnv(n)}>{n}</button>
                    );
                  })}
                </div>
                <div style={local.rowActions}>
                  <SaveButton label="Save project" onClick={saveEdit} />
                  <CancelButton label="Cancel edit" onClick={() => setEditIdx(null)} />
                </div>
              </>
            ) : (
              <>
                <span style={local.projName}>{p.name}</span>
                <EnvBadge environments={p.environments} />
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
                <input
                  id="new-project-name"
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
              <div style={{ ...local.pillWrap, marginTop: 2 }} role="group" aria-label="Apply project to environments">
                <button type="button" style={newEnvs === 'all' ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => setNewEnvs('all')}>All</button>
                {envNames.map((n) => {
                  const active = newEnvs !== 'all' && newEnvs.includes(n);
                  return (
                    <button key={n} type="button" style={active ? { ...local.chip, ...local.chipActive } : local.chip} onClick={() => toggleNewEnv(n)}>{n}</button>
                  );
                })}
              </div>
            </div>
          </div>
          {addError && <div style={{ ...s.errText, marginTop: 8 }}>{addError}</div>}
        </div>
      </div>
    </section>
  );
}

export default function EnvNetworkStep() {
  const { model, setField } = useWizard();
  const kind = getHubKind(model.network.hubKind);
  // <region> / <lze> tokens resolve live from Step 1 / Step 2.
  const tokens = { region: model.foundation.regionShortName, lze: model.presentation.landingZone };
  const lzName = model.presentation.landingZone.trim().replace(/^cmp-/, '') || 'landingzone';
  const envNames = model.environments.map((e) => e.name.trim()).filter(Boolean);
  const [envOpen, setEnvOpen] = useState<Record<number, boolean>>({}); // collapsed by default

  /** Stale in-memory records may predate Environment.network / .routing — always fall back to defaults. */
  function envNetwork(i: number): EnvNetworkConfig {
    const net = model.environments[i].network ?? envNetworkDefaults(i);
    return { ...net, routing: net.routing ?? envRoutingDefaults() };
  }
  function patchEnvNetwork(i: number, patch: Partial<EnvNetworkConfig>) {
    const current = envNetwork(i);
    setField('environments', model.environments.map((env, idx) => idx === i
      ? { ...env, network: { ...current, ...patch } }
      : env));
  }
  function patchEnvRouting(i: number, patch: Partial<VcnRouting>) {
    patchEnvNetwork(i, { routing: { ...envNetwork(i).routing, ...patch } });
  }

  // Spoke networks only make sense once an implemented hub kind is chosen in step 2.
  if (!kind?.implemented) {
    return (
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Projects</div>
          <div style={{ ...s.empty, borderTop: `1px dashed ${oracle.border}`, borderRadius: 6 }}>
            Choose an implemented hub model in step 2 first — the environment (spoke) networks and projects build on it.
          </div>
        </div>
      </section>
    );
  }

  return (
    <div style={s.col}>
      <ProjectsPanel projects={model.projects} envNames={envNames} onChange={(next) => setField('projects', next)} />

      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Environments</div>
          {model.environments.length === 0 ? (
            <div style={{ ...s.empty, borderTop: `1px dashed ${oracle.border}`, borderRadius: 6 }}>
              No environments yet — add them in step 1, then their spoke networks appear here.
            </div>
          ) : (
            <div style={{ border: `1px solid ${oracle.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {model.environments.map((env, i) => {
                const envName = env.name.trim() || `env${i + 1}`;
                const envTokens = { ...tokens, env: envName };
                const net = envNetwork(i);
                const open = envOpen[i] ?? false;
                return (
                  <div key={i} style={{ borderTop: i > 0 ? `1px solid ${oracle.border}` : undefined }}>
                    <button
                      type="button"
                      style={s.envHead}
                      aria-expanded={open}
                      onClick={() => setEnvOpen((prev) => ({ ...prev, [i]: !open }))}
                    >
                      <span style={s.envHeadTitle}>Environment network — {envName}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={s.envHeadSub}>{resolveHubName('vcn-<region>-<env>-projects', envTokens)} · {net.vcnCidr}</span>
                        <span style={{ fontSize: 13, color: oracle.ink }}>{open ? '▾' : '▸'}</span>
                      </span>
                    </button>
                    {open && (
                      <div style={{ padding: '0 20px 20px' }}>
                        <div style={s.derivedNote}>
                          {resolveHubName('vcn-<region>-<env>-projects', envTokens)} · inside cmp-{lzName}-{envName}-network
                        </div>
                        <VcnEditor
                          idPrefix={`env-${i}`}
                          tokens={envTokens}
                          vcnCidr={net.vcnCidr}
                          subnets={net.subnets}
                          emptyNote="No subnets in this environment — add one below."
                          onApply={(patch) => patchEnvNetwork(i, patch)}
                        />

                        <RoutingEditor
                          idPrefix={`env-${i}`}
                          isHub={false}
                          routing={net.routing}
                          tokens={envTokens}
                          onRouting={(patch) => patchEnvRouting(i, patch)}
                        />
                      </div>
                    )}
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
