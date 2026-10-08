import type { CSSProperties } from 'react';
import { useWizard } from '../wizardContext';
import type { ExaccDesign, ExacsDesign, ExadataNotifications } from '../../model/types';
import { oracle } from '../../theme';
import { defaultExacsEnvCidr, validateExadataModel } from '../../services/exadata';

const styles: Record<string, CSSProperties> = {
  card: { border: `1px solid ${oracle.border}`, borderTop: `3px solid ${oracle.red}`, borderRadius: 8, background: oracle.surface, padding: 20 },
  title: { fontSize: 16, fontWeight: 800, color: oracle.ink, marginBottom: 4 },
  hint: { fontSize: 12.5, color: oracle.textMuted, lineHeight: 1.55, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 },
  field: { display: 'grid', gap: 5, fontSize: 12.5, fontWeight: 700, color: oracle.text },
  input: { minWidth: 0, width: '100%', padding: '9px 10px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 5, background: oracle.surface, color: oracle.text, fontSize: 13 },
  option: { display: 'flex', gap: 9, alignItems: 'center', fontSize: 13, color: oracle.text, lineHeight: 1.4 },
  group: { border: `1px solid ${oracle.border}`, borderRadius: 6, padding: 13, marginTop: 14 },
  legend: { fontSize: 12.5, fontWeight: 800, color: oracle.ink, padding: '0 5px' },
  options: { display: 'grid', gap: 8, marginTop: 4 },
  warning: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.redDark, padding: '10px 12px', borderRadius: 6, fontSize: 12.5, lineHeight: 1.5 },
};

function NotificationFields({ value, onChange, prefix, useCase, autonomous }: {
  value: ExadataNotifications;
  onChange: (next: ExadataNotifications) => void;
  prefix: string;
  useCase: 1 | 2 | 3;
  autonomous: boolean;
}) {
  const exacs = prefix === 'exacs';
  const singleRecipient = value.useSingleRecipient ?? Boolean(value.default);
  const infraEvents = exacs ? (useCase === 1 ? 63 : 36) : (useCase === 1 ? 46 : 32);
  const environmentEvents = exacs ? (useCase === 2 ? 84 : 105) : (useCase === 2 ? 71 : 88);
  const fields: Array<{ key: 'dbWorkloads' | 'infraWorkloads' | 'projects'; label: string; help: string; visible: boolean }> = [
    { key: 'dbWorkloads', label: 'Shared database workload emails', help: '57 database events (backups, DB homes, restore, maintenance). Three database/cluster alarm definitions are disabled by default.', visible: useCase === 1 },
    { key: 'infraWorkloads', label: 'Shared infrastructure emails', help: `${infraEvents} events for operator access${useCase === 1 ? ', Exadata infrastructure, and VMC/AVMC' : ' and Exadata infrastructure'}. ${useCase === 1 ? 'Four VMC alarm definitions are disabled by default.' : 'This infrastructure-only scope has no VMC alarms.'}`, visible: useCase !== 3 },
    { key: 'projects', label: 'Environment and project emails', help: useCase === 1
      ? '57 database event types from each selected Autonomous project DB compartment.'
      : `${environmentEvents} platform event types in each selected environment${autonomous ? ', plus 57 database event types from each selected Autonomous project DB compartment' : ''}. Seven platform alarm definitions are disabled by default.`, visible: useCase !== 1 || autonomous },
  ];
  return (
    <fieldset style={styles.group}>
      <legend style={styles.legend}>Notification recipients</legend>
      <div style={styles.hint}>Separate multiple addresses with commas. Fill each visible topic, or use one email for all Exadata notifications.{exacs ? ' ExaCS network events and alarms use the One-OE Network recipient in Foundation.' : ''}</div>
      {!singleRecipient && <div style={styles.grid}>
        {fields.filter(({ visible }) => visible).map(({ key, label, help }) => (
          <label key={key} style={styles.field} htmlFor={`${prefix}-${key}`}>
            {label} *
            <input id={`${prefix}-${key}`} type="text" style={styles.input} value={value[key] ?? ''}
              placeholder="team@example.com" onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
            <span style={{ color: oracle.textMuted, fontSize: 12, fontWeight: 400, lineHeight: 1.45 }}>{help}</span>
          </label>
        ))}
      </div>}
      <label style={{ ...styles.option, marginTop: 18, fontWeight: 700 }}>
        <input type="checkbox" checked={singleRecipient} onChange={(event) => onChange({ ...value, useSingleRecipient: event.target.checked })} />
        Use one email for all notifications
      </label>
      {singleRecipient && <label style={{ ...styles.field, marginTop: 14 }} htmlFor={`${prefix}-default`}>
        Notification emails *
        <input id={`${prefix}-default`} type="text" style={styles.input} value={value.default}
          placeholder="ops@example.com" onChange={(event) => onChange({ ...value, default: event.target.value })} />
        <span style={{ color: oracle.textMuted, fontSize: 12, fontWeight: 400, lineHeight: 1.45 }}>Sends this extension's database, infrastructure, and project notifications to the same recipients.</span>
      </label>}
    </fieldset>
  );
}

function EnvironmentChoices({ selected, onChange, legend }: {
  selected: string[];
  onChange: (next: string[]) => void;
  legend: string;
}) {
  const { model } = useWizard();
  return (
    <fieldset style={styles.group}>
      <legend style={styles.legend}>{legend}</legend>
      <div style={styles.options}>
        {model.environments.map((env) => (
          <label key={env.id} style={styles.option}>
            <input type="checkbox" checked={selected.includes(env.id)} onChange={(event) => onChange(event.target.checked
              ? [...selected, env.id] : selected.filter((id) => id !== env.id))} />
            {env.name || 'Unnamed environment'}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function UseCaseSummary({ type, selected }: {
  type: 'EXACC' | 'EXACS';
  selected: 1 | 2 | 3 | null;
}) {
  const cases = [
    { id: 1, name: 'UC1 · Shared', description: type === 'EXACC'
      ? 'The Exadata infrastructure and VMC/AVMC database layer sit in one shared platform scope for all environments. Studio prepares shared compartments, IAM and observability; it does not create a VCN for Cloud@Customer. If Autonomous is enabled, selected projects can have their own database compartments.'
      : 'The Exadata infrastructure and VMC/AVMC database layer sit in one shared platform scope. Studio prepares a shared VCN with database and backup subnets, plus shared IAM and observability. If Autonomous is enabled, selected projects can have separate database compartments.' },
    { id: 2, name: 'UC2 · Hybrid', description: type === 'EXACC'
      ? 'One shared infrastructure scope serves the selected environments. Each environment gets its own VMC/AVMC database platform scope, with separate access and operational notifications. Cloud@Customer does not add an OCI VCN; optional Autonomous project tiers belong to the selected environment.'
      : 'One shared infrastructure scope serves the selected environments. Each environment gets its own VMC/AVMC database platform and VCN, with database and backup subnets. The shared infrastructure scope has no VCN; optional Autonomous project tiers stay in their environment.' },
    { id: 3, name: 'UC3 · Dedicated', description: type === 'EXACC'
      ? 'Each selected environment gets its own Exadata infrastructure and VMC/AVMC database platform scope. Studio prepares separate compartments, IAM and observability for those scopes, without an OCI VCN. Optional Autonomous project tiers can be assigned within each environment.'
      : 'Each selected environment gets its own Exadata infrastructure and VMC/AVMC database platform scope. Studio prepares a VCN with database and backup subnets for each selected environment, along with scoped IAM and observability. Optional Autonomous project tiers remain environment-specific.' },
  ] as const;
  const current = cases.find(({ id }) => id === selected);
  const guide = `https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/workload-extensions/${type.toLowerCase()}/${type.toLowerCase()}_use_cases/readme.md`;
  return <div role="status" style={{ ...styles.group, lineHeight: 1.5, fontSize: 13 }}>
    <strong>{current ? `${type}: ${current.name}` : `${type}: Select at least one placement`}</strong>
    {current && <div style={{ color: oracle.textMuted }}>{current.description}</div>}
    <a href={guide} target="_blank" rel="noopener noreferrer"
      style={{ display: 'inline-block', marginTop: 8, color: oracle.redDark, fontWeight: 700 }}>
      Read the full {type} use case guide on GitHub ↗
    </a>
  </div>;
}

type DatabaseService = 'none' | 'vmc' | 'autonomous' | 'both';

function DatabaseServiceChoices({ service, onChange }: {
  service: DatabaseService;
  onChange: (next: DatabaseService) => void;
}) {
  return <fieldset style={styles.group}>
    <legend style={styles.legend}>Database services</legend>
    <div style={styles.options}>
      <label style={styles.option}>
        <input type="checkbox" checked={service === 'vmc' || service === 'both'}
          onChange={(event) => onChange(event.target.checked
            ? (service === 'autonomous' ? 'both' : 'vmc')
            : (service === 'both' ? 'autonomous' : 'none'))} />
        Include Exadata Database Service (VMC)
      </label>
      <label style={styles.option}>
        <input type="checkbox" checked={service === 'autonomous' || service === 'both'}
          onChange={(event) => onChange(event.target.checked
            ? (service === 'vmc' ? 'both' : 'autonomous')
            : (service === 'both' ? 'vmc' : 'none'))} />
        Include Autonomous Database Dedicated (AVMC)
      </label>
    </div>
  </fieldset>;
}

function ProjectChoices({ type, selected, onChange, environments }: {
  type: 'EXACC' | 'EXACS';
  selected: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
  environments: string[];
}) {
  const { model } = useWizard();
  return (
    <fieldset style={styles.group}>
      <legend style={styles.legend}>Autonomous database project tiers</legend>
      <div style={styles.hint}>Choose only projects that need a database compartment. This does not create an extra project network.</div>
      {!environments.length && <div style={styles.hint}>Select an environment above to choose its project tiers.</div>}
      {!model.projects.length && <div style={styles.hint}>Add a project in step 3 to configure a database tier.</div>}
      {model.environments.filter((env) => environments.includes(env.id)).map((env) => {
        const eligible = model.projects.filter((project) => project.environments === 'all' || project.environments.includes(env.id));
        if (!eligible.length) return null;
        return (
          <div key={env.id} style={{ marginTop: 9 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 5 }}>{env.name}</div>
            <div style={styles.options}>
              {eligible.map((project) => (
                <label key={project.id} style={styles.option}>
                  <input type="checkbox" aria-label={`${type} database tier for ${project.name} in ${env.name}`}
                    checked={(selected[env.id] ?? []).includes(project.id)}
                    onChange={(event) => {
                      const old = selected[env.id] ?? [];
                      onChange({ ...selected, [env.id]: event.target.checked
                        ? [...old, project.id] : old.filter((id) => id !== project.id) });
                    }} />
                  {project.name}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}

function ExaccSection() {
  const { model, setField } = useWizard();
  const value = model.exadata.exacc;
  const update = (patch: Partial<ExaccDesign>) => setField('exadata.exacc', { ...value, ...patch });
  const database = value.database ?? (!value.shared || value.environments.length ? 'per_environment' : 'shared');
  const useCase = value.shared ? (database === 'shared' ? 1 : 2) : 3;
  const service = value.service ?? ((value.autonomous ?? Object.values(value.projectDb).some((ids) => ids.length > 0)) ? 'both' : 'vmc');
  const autonomous = service === 'autonomous' || service === 'both';
  return (
    <section style={styles.card} aria-labelledby="exacc-heading">
      <h2 id="exacc-heading" style={styles.title}>ExaDB-C@C (EXACC)</h2>
      <p style={styles.hint}>Adds Exadata Cloud@Customer compartments, IAM, and observability. This extension does not create a VCN or subnets.</p>
      <label style={styles.option}>
        <input type="checkbox" checked={value.enabled} onChange={(event) => update({
          enabled: event.target.checked,
        })} />
        Include EXACC in this landing zone
      </label>
      {value.enabled && <>
        <div style={styles.grid}>
          <label style={styles.field} htmlFor="exacc-infrastructure">
            Infrastructure placement
            <select id="exacc-infrastructure" style={styles.input} value={value.shared ? 'shared' : 'per_environment'}
              onChange={(event) => update({ shared: event.target.value === 'shared',
                database: event.target.value === 'per_environment' ? 'per_environment' : database,
                environments: event.target.value === 'per_environment' && !value.environments.length
                  ? model.environments.map((env) => env.id) : value.environments })}>
              <option value="shared">Shared across environments</option>
              <option value="per_environment">Dedicated per environment</option>
            </select>
          </label>
          <label style={styles.field} htmlFor="exacc-database">
            VMC placement
            <select id="exacc-database" style={styles.input} value={database} onChange={(event) => update({
              database: event.target.value as ExaccDesign['database'],
              environments: event.target.value === 'per_environment' && !value.environments.length
                ? model.environments.map((env) => env.id) : value.environments,
            })}>
              {value.shared && <option value="shared">Shared with infrastructure</option>}
              <option value="per_environment">Dedicated per environment</option>
            </select>
          </label>
        </div>
        <UseCaseSummary type="EXACC" selected={useCase} />
        {database === 'per_environment' && <EnvironmentChoices selected={value.environments}
          onChange={(environments) => update({ environments })} legend="Environments with VMC placement" />}
        <DatabaseServiceChoices service={service} onChange={(next) => update({ service: next,
          projectDb: next === 'autonomous' || next === 'both' ? value.projectDb : {} })} />
        {autonomous && <ProjectChoices type="EXACC" selected={value.projectDb} onChange={(projectDb) => update({ projectDb })}
          environments={useCase === 1 ? model.environments.map((env) => env.id) : value.environments} />}
        <NotificationFields prefix="exacc" value={value.notifications} onChange={(notifications) => update({ notifications })}
          useCase={useCase} autonomous={autonomous} />
      </>}
    </section>
  );
}

function ExacsSection() {
  const { model, setField } = useWizard();
  const value = model.exadata.exacs;
  const update = (patch: Partial<ExacsDesign>) => setField('exadata.exacs', { ...value, ...patch });
  const useCase = value.infrastructure === 'per_environment' ? 3 : value.database === 'per_environment' ? 2 : 1;
  const projectEnvs = useCase === 1 ? model.environments.map((env) => env.id) : value.environments;
  return (
    <section style={styles.card} aria-labelledby="exacs-heading">
      <h2 id="exacs-heading" style={styles.title}>ExaDB-D / ExaCS (EXACS)</h2>
      <p style={styles.hint}>Choose where Exadata infrastructure and AVMC/VMC database networks live. A shared infrastructure-only platform has no network; each AVMC/VMC placement needs a VCN with generated db and backup subnets.</p>
      <label style={styles.option}>
        <input type="checkbox" checked={value.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
        Include EXACS in this landing zone
      </label>
      {value.enabled && <>
        <div style={styles.grid}>
          <label style={styles.field} htmlFor="exacs-infrastructure">
            Exadata infrastructure
            <select id="exacs-infrastructure" style={styles.input} value={value.infrastructure} onChange={(event) => {
              const infrastructure = event.target.value as ExacsDesign['infrastructure'];
              update({ infrastructure,
                database: infrastructure === 'per_environment' ? 'per_environment' : value.database,
                environments: infrastructure === 'per_environment' && !value.environments.length ? model.environments.map((env) => env.id) : value.environments });
            }}>
              <option value="shared">Shared across environments</option>
              <option value="per_environment">Dedicated per environment</option>
            </select>
          </label>
          <label style={styles.field} htmlFor="exacs-database">
            VMC placement
            <select id="exacs-database" style={styles.input} value={value.database} onChange={(event) => {
              const database = event.target.value as ExacsDesign['database'];
              update({ database,
                environments: database === 'per_environment' && !value.environments.length ? model.environments.map((env) => env.id) : value.environments });
            }}>
              {value.infrastructure === 'shared' && <option value="shared">Shared with infrastructure</option>}
              <option value="per_environment">Dedicated per environment</option>
            </select>
          </label>
        </div>
        <UseCaseSummary type="EXACS" selected={useCase} />
        <DatabaseServiceChoices service={value.service} onChange={(next) => update({ service: next,
          projectDb: next === 'autonomous' || next === 'both' ? value.projectDb : {} })} />
        {useCase === 1 ? (
          <div style={styles.grid}>
            <label style={styles.field} htmlFor="exacs-shared-vcn">Shared AVMC/VMC VCN CIDR
              <input id="exacs-shared-vcn" style={styles.input} value={value.sharedVcnCidr}
                onChange={(event) => update({ sharedVcnCidr: event.target.value })} />
            </label>
          </div>
        ) : <>
          <EnvironmentChoices selected={value.environments} onChange={(environments) => update({ environments })}
            legend="Environments with AVMC/VMC networks" />
          <div style={styles.grid}>
            {model.environments.filter((env) => value.environments.includes(env.id)).map((env) => (
              <label key={env.id} style={styles.field} htmlFor={`exacs-vcn-${env.id}`}>
                {env.name} AVMC/VMC VCN CIDR
                <input id={`exacs-vcn-${env.id}`} style={styles.input}
                  value={value.environmentVcnCidrs[env.id] ?? defaultExacsEnvCidr(model.environments.findIndex((candidate) => candidate.id === env.id))}
                  onChange={(event) => update({ environmentVcnCidrs: { ...value.environmentVcnCidrs, [env.id]: event.target.value } })} />
              </label>
            ))}
          </div>
          {useCase === 2 && <p style={{ ...styles.hint, marginTop: 10 }}>Shared infrastructure is compartment-only. No CIDR is reserved for it.</p>}
        </>}
        {(value.service === 'autonomous' || value.service === 'both') && <ProjectChoices type="EXACS" selected={value.projectDb} onChange={(projectDb) => update({ projectDb })}
          environments={projectEnvs} />}
        <NotificationFields prefix="exacs" value={value.notifications} onChange={(notifications) => update({ notifications })}
          useCase={useCase} autonomous={value.service === 'autonomous' || value.service === 'both'} />
      </>}
    </section>
  );
}

export default function ExadataStep() {
  const { model } = useWizard();
  const errors = validateExadataModel(model);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <ExaccSection />
      <ExacsSection />
      {errors.length > 0 && <div role="alert" style={styles.warning}>
        <strong>Resolve before generating:</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
      </div>}
    </div>
  );
}
