import { useId, type CSSProperties } from 'react';
import { useWizard } from '../wizardContext';
import type { ExaccDesign, ExacsDesign, ExadataNotifications } from '../../model/types';
import { oracle } from '../../theme';
import { exadataEntries, exadataProjectTopicEnvironments } from '../../services/exadata';
import { s as form } from './networkEditorStyles';
import FieldError from '../../components/FieldError';
import ValidatedInput from '../../components/ValidatedInput';
import { fieldErrorProps } from '../../services/fieldErrors';
import { notificationEmailError } from '../../services/notificationEmails';
import { exacsVcnError } from '../../services/exadata';

type PlatformPlacement = 'shared' | 'environment';

const styles: Record<string, CSSProperties> = {
  card: { border: `1px solid ${oracle.border}`, borderTop: `3px solid ${oracle.red}`, borderRadius: 8, background: oracle.surface, padding: 20 },
  title: { fontSize: 16, fontWeight: 800, color: oracle.ink, marginBottom: 4 },
  hint: { ...form.help, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginTop: 14 },
  field: { display: 'grid', gap: 6, fontSize: 13, lineHeight: 1.4, fontWeight: 600, color: oracle.text },
  value: { fontSize: 13, fontWeight: 400 },
  input: { ...form.input, minWidth: 0 },
  option: { display: 'flex', gap: 9, alignItems: 'center', fontSize: 13, color: oracle.text, lineHeight: 1.4 },
  group: { minWidth: 0, border: `1px solid ${oracle.border}`, borderRadius: 6, padding: 13, marginTop: 14 },
  legend: { fontSize: 12.5, fontWeight: 800, color: oracle.ink, padding: '0 5px' },
  options: { display: 'grid', gap: 8, marginTop: 4 },
  warning: { border: `1px solid ${oracle.red}`, background: oracle.redTint, color: oracle.redDark, padding: '10px 12px', borderRadius: 6, fontSize: 12.5, lineHeight: 1.5 },
};

function NotificationFields({ value, onChange, prefix, useCase, placement, projectEnvironments, environmentEnvironments }: {
  value: ExadataNotifications;
  onChange: (next: ExadataNotifications) => void;
  prefix: string;
  useCase: 1 | 2 | 3;
  placement: PlatformPlacement;
  projectEnvironments: Array<{ id: string; name: string }>;
  environmentEnvironments: Array<{ id: string; name: string }>;
}) {
  const exacs = prefix === 'exacs';
  const linkedEnvironment = useCase === 2 && placement === 'environment';
  const singleRecipient = value.useSingleRecipient ?? Boolean(value.default);
  if (linkedEnvironment && singleRecipient) return <fieldset style={styles.group}>
    <legend style={styles.legend}>Notification recipients</legend>
    <p style={styles.hint}>Uses the email configured in Shared Platforms for all {prefix.toUpperCase()} notifications.{exacs ? ' ExaCS network events and alarms use the One-OE Network recipient in Foundation.' : ''}</p>
    <div style={styles.value}>{value.default || 'Set notification emails in Shared Platforms.'}</div>
    <FieldError id={`${prefix}-linked-notification-error`} error={notificationEmailError(value.default)} />
  </fieldset>;
  const infraEvents = exacs ? (useCase === 1 ? 63 : 36) : (useCase === 1 ? 46 : 32);
  const environmentInfraEvents = exacs ? (useCase === 2 ? 27 : 48) : (useCase === 2 ? 14 : 31);
  const fields: Array<{ key: 'dbWorkloads' | 'infraWorkloads'; label: string; help: string; visible: boolean }> = [
    { key: 'dbWorkloads', label: 'Shared DBA team emails', help: '57 database events (backups, DB homes, restore, maintenance). 3 database/cluster alarm definitions are disabled by default.', visible: useCase === 1 },
    { key: 'infraWorkloads', label: 'Shared infrastructure team emails', help: `${infraEvents} events for operator access${useCase === 1 ? ', Exadata infrastructure, and VMC/AVMC' : ' and Exadata infrastructure'}. ${useCase === 1 ? '4 VMC alarm definitions are disabled by default.' : 'This infrastructure-only scope has no VMC alarms.'}`, visible: useCase !== 3 && !linkedEnvironment },
  ];
  return (
    <fieldset style={styles.group}>
      <legend style={styles.legend}>Notification recipients</legend>
      <div style={styles.hint}>Separate multiple addresses with commas. {linkedEnvironment
        ? 'Configure recipients for the selected environments. Shared infrastructure recipients and the option to use one email are managed in Shared Platforms.'
        : 'Fill each visible topic, or use one email for all Exadata notifications.'}{exacs ? ' ExaCS network events and alarms use the One-OE Network recipient in Foundation.' : ''}</div>
      {!singleRecipient && <div style={styles.grid}>
        {fields.filter(({ visible }) => visible).map(({ key, label, help }) => (
          <div key={key} style={styles.field}>
            <label htmlFor={`${prefix}-${key}`}>{label} *</label>
            <ValidatedInput id={`${prefix}-${key}`} error={notificationEmailError(value[key])} inputMode="email" type="text" style={styles.input} value={value[key] ?? ''}
              required helpId={`${prefix}-${key}-help`}
              placeholder="team@example.com" onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
            <span id={`${prefix}-${key}-help`} style={{ color: oracle.textMuted, fontSize: 12, fontWeight: 400, lineHeight: 1.45 }}>{help}</span>
          </div>
        ))}
        {environmentEnvironments.flatMap((env) => ([
          { key: 'environmentInfraEmails' as const, team: 'Infrastructure team',
            help: `${environmentInfraEvents} infrastructure and VMC event types. 4 VMC alarm definitions are disabled by default.` },
          { key: 'environmentDbEmails' as const, team: 'DBA team',
            help: '57 database event types. 3 database/cluster alarm definitions are disabled by default.' },
        ]).map(({ key, team, help }) => (
          <div key={`${env.id}-${key}`} style={styles.field}>
            <label htmlFor={`${prefix}-${key}-${env.id}`}>{env.name} {team} emails *</label>
            <ValidatedInput id={`${prefix}-${key}-${env.id}`} error={notificationEmailError(value[key]?.[env.id])} inputMode="email" type="text" style={styles.input}
              required helpId={`${prefix}-${key}-${env.id}-help`}
              value={value[key]?.[env.id] ?? ''} placeholder="team@example.com"
              onChange={(event) => onChange({ ...value, [key]: { ...value[key], [env.id]: event.target.value } })} />
            <span id={`${prefix}-${key}-${env.id}-help`} style={{ color: oracle.textMuted, fontSize: 12, fontWeight: 400, lineHeight: 1.45 }}>{help}</span>
          </div>
        )))}
        {projectEnvironments.map((env) => (
          <div key={env.id} style={styles.field}>
            <label htmlFor={`${prefix}-projects-${env.id}`}>{env.name} Autonomous project DBA emails *</label>
            <ValidatedInput id={`${prefix}-projects-${env.id}`} error={notificationEmailError(value.projectEmails ? value.projectEmails[env.id] : value.projects)} inputMode="email" type="text" style={styles.input}
              required helpId={`${prefix}-projects-${env.id}-help`}
              value={(value.projectEmails ? value.projectEmails[env.id] : value.projects) ?? ''} placeholder="team@example.com"
              onChange={(event) => onChange({ ...value, projectEmails: {
                ...Object.fromEntries(projectEnvironments.map((candidate) => [candidate.id, value.projectEmails?.[candidate.id] ?? value.projects ?? ''])),
                [env.id]: event.target.value,
              } })} />
            <span id={`${prefix}-projects-${env.id}-help`} style={{ color: oracle.textMuted, fontSize: 12, fontWeight: 400, lineHeight: 1.45 }}>
              Separate {env.name} project topic: 57 database event types from each selected Autonomous project DB compartment.
            </span>
          </div>
        ))}
      </div>}
      {!linkedEnvironment && <label style={{ ...styles.option, marginTop: 18, fontWeight: 700 }}>
        <input type="checkbox" checked={singleRecipient} onChange={(event) => onChange({ ...value, useSingleRecipient: event.target.checked })} />
        Use the same recipients for all topics
      </label>}
      {useCase === 2 && placement === 'shared' && <p style={{ ...styles.hint, marginTop: 10 }}>The single-email option applies to both shared infrastructure and linked environment platforms. Configure per-topic environment recipients in Environment Platforms.</p>}
      {singleRecipient && <div style={{ ...styles.field, marginTop: 14 }}>
        <label htmlFor={`${prefix}-default`}>Notification emails *</label>
        <ValidatedInput id={`${prefix}-default`} error={notificationEmailError(value.default)} inputMode="email" type="text" style={styles.input} value={value.default}
          required helpId={`${prefix}-default-help`}
          placeholder="ops@example.com" onChange={(event) => onChange({ ...value, default: event.target.value })} />
        <span id={`${prefix}-default-help`} style={{ color: oracle.textMuted, fontSize: 12, fontWeight: 400, lineHeight: 1.45 }}>Sends this extension's infrastructure, DBA, and Autonomous project notifications to the same recipients.</span>
      </div>}
    </fieldset>
  );
}

function EnvironmentChoices({ selected, onChange, legend }: {
  selected: string[];
  onChange: (next: string[]) => void;
  legend: string;
}) {
  const { model } = useWizard();
  const errorId = useId();
  const error = !selected.length || selected.some((id) => !model.environments.some((env) => env.id === id)) ? 'Select at least one available environment.' : null;
  return (
    <fieldset style={styles.group} {...fieldErrorProps(errorId, error)}>
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
      <FieldError id={errorId} error={error} />
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
  const errorId = useId();
  const error = service === 'none' ? 'Select at least one database service.' : null;
  return <fieldset style={styles.group} {...fieldErrorProps(errorId, error)}>
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
    <FieldError id={errorId} error={error} />
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

function ExaccSection({ placement }: { placement: PlatformPlacement }) {
  const { model, setField } = useWizard();
  const value = model.exadata.exacc;
  const update = (patch: Partial<ExaccDesign>) => setField('exadata.exacc', { ...value, ...patch });
  const database = value.database ?? (!value.shared || value.environments.length ? 'per_environment' : 'shared');
  const useCase = value.shared ? (database === 'shared' ? 1 : 2) : 3;
  const databaseHere = placement === 'environment' || useCase === 1;
  const linkedEnvironment = placement === 'environment' && useCase === 2;
  const service = value.service ?? ((value.autonomous ?? Object.values(value.projectDb).some((ids) => ids.length > 0)) ? 'both' : 'vmc');
  const autonomous = service === 'autonomous' || service === 'both';
  return (
    <section style={styles.card} aria-labelledby="exacc-heading">
      <h2 id="exacc-heading" style={styles.title}>ExaDB-C@C (EXACC)</h2>
      <p style={styles.hint}>Adds Exadata Cloud@Customer compartments, IAM, and observability. This extension does not create a VCN or subnets.</p>
      {value.enabled && <>
        <div style={styles.grid}>
          <div style={styles.field}>
            {linkedEnvironment ? 'Infrastructure source' : 'Infrastructure placement'}
            <span style={styles.value}>{linkedEnvironment ? 'Shared Platforms' : value.shared ? 'Shared across environments' : 'Dedicated per environment'}</span>
          </div>
          {placement === 'shared' ? <label style={styles.field} htmlFor="exacc-database">
            VMC placement
            <select id="exacc-database" value={database} onChange={(event) => update({
              database: event.target.value as ExaccDesign['database'],
              environments: event.target.value === 'per_environment' && !value.environments.length
                ? model.environments.map((env) => env.id) : value.environments,
            })}>
              {value.shared && <option value="shared">Shared with infrastructure</option>}
              <option value="per_environment">Dedicated per environment</option>
            </select>
          </label> : <div style={styles.field}>
            VMC placement
            <span style={styles.value}>Dedicated per environment</span>
          </div>}
        </div>
        {placement === 'environment' && value.shared && <p style={{ ...styles.hint, marginTop: 12 }}>Infrastructure is managed in Shared Platforms.</p>}
        <UseCaseSummary type="EXACC" selected={useCase} />
        {!databaseHere && <p style={{ ...styles.hint, marginTop: 12 }}>Configure VMC/AVMC services, environments, and Autonomous project tiers in Environment Platforms.</p>}
        {databaseHere && database === 'per_environment' && <EnvironmentChoices selected={value.environments}
          onChange={(environments) => update({ environments })} legend="Environments with VMC placement" />}
        {databaseHere && <DatabaseServiceChoices service={service} onChange={(next) => update({ service: next,
          projectDb: next === 'autonomous' || next === 'both' ? value.projectDb : {} })} />}
        {databaseHere && autonomous && <ProjectChoices type="EXACC" selected={value.projectDb} onChange={(projectDb) => update({ projectDb })}
          environments={useCase === 1 ? model.environments.map((env) => env.id) : value.environments} />}
        <NotificationFields prefix="exacc" value={value.notifications} onChange={(notifications) => update({ notifications })}
          useCase={useCase} placement={placement} projectEnvironments={databaseHere ? exadataProjectTopicEnvironments(model, 'exacc', useCase, autonomous) : []}
          environmentEnvironments={placement === 'environment' ? model.environments.filter((env) => value.environments.includes(env.id)) : []} />
      </>}
    </section>
  );
}

function ExacsSection({ placement }: { placement: PlatformPlacement }) {
  const { model, setField, vcnErrors: conflicts } = useWizard();
  const value = model.exadata.exacs;
  const update = (patch: Partial<ExacsDesign>) => setField('exadata.exacs', { ...value, ...patch });
  const useCase = value.infrastructure === 'per_environment' ? 3 : value.database === 'per_environment' ? 2 : 1;
  const databaseHere = placement === 'environment' || useCase === 1;
  const linkedEnvironment = placement === 'environment' && useCase === 2;
  const projectEnvs = useCase === 1 ? model.environments.map((env) => env.id) : value.environments;
  return (
    <section style={styles.card} aria-labelledby="exacs-heading">
      <h2 id="exacs-heading" style={styles.title}>ExaDB-D / ExaCS (EXACS)</h2>
      <p style={styles.hint}>Infrastructure placement follows the platform panel. A shared infrastructure-only platform has no network; each AVMC/VMC placement needs a VCN with generated db and backup subnets.</p>
      {value.enabled && <>
        <div style={styles.grid}>
          <div style={styles.field}>
            {linkedEnvironment ? 'Infrastructure source' : 'Exadata infrastructure'}
            <span style={styles.value}>{linkedEnvironment ? 'Shared Platforms' : value.infrastructure === 'shared' ? 'Shared across environments' : 'Dedicated per environment'}</span>
          </div>
          {placement === 'shared' ? <label style={styles.field} htmlFor="exacs-database">
            VMC placement
            <select id="exacs-database" value={value.database} onChange={(event) => {
              const database = event.target.value as ExacsDesign['database'];
              update({ database,
                environments: database === 'per_environment' && !value.environments.length ? model.environments.map((env) => env.id) : value.environments });
            }}>
              {value.infrastructure === 'shared' && <option value="shared">Shared with infrastructure</option>}
              <option value="per_environment">Dedicated per environment</option>
            </select>
          </label> : <div style={styles.field}>
            VMC placement
            <span style={styles.value}>Dedicated per environment</span>
          </div>}
        </div>
        {placement === 'environment' && value.infrastructure === 'shared' && <p style={{ ...styles.hint, marginTop: 12 }}>Infrastructure is managed in Shared Platforms.</p>}
        <UseCaseSummary type="EXACS" selected={useCase} />
        {!databaseHere && <p style={{ ...styles.hint, marginTop: 12 }}>Shared infrastructure has no network. Configure VMC/AVMC services, environments, networks, and Autonomous project tiers in Environment Platforms.</p>}
        {databaseHere && <DatabaseServiceChoices service={value.service} onChange={(next) => update({ service: next,
          projectDb: next === 'autonomous' || next === 'both' ? value.projectDb : {} })} />}
        {databaseHere && (useCase === 1 ? (
          <div style={styles.grid}>
            <div style={styles.field}><label htmlFor="exacs-shared-vcn">Shared AVMC/VMC VCN CIDR</label>
              <ValidatedInput id="exacs-shared-vcn" error={exacsVcnError(value.sharedVcnCidr) || conflicts['exadata:exacs:shared']} style={styles.input} value={value.sharedVcnCidr}
                onChange={(event) => update({ sharedVcnCidr: event.target.value })} />
            </div>
          </div>
        ) : <>
          <EnvironmentChoices selected={value.environments} onChange={(environments) => update({ environments })}
            legend="Environments with AVMC/VMC networks" />
          <div style={styles.grid}>
            {model.environments.filter((env) => value.environments.includes(env.id)).map((env) => (
              <div key={env.id} style={styles.field}>
                <label htmlFor={`exacs-vcn-${env.id}`}>{env.name} AVMC/VMC VCN CIDR</label>
                <ValidatedInput id={`exacs-vcn-${env.id}`} error={exacsVcnError(value.environmentVcnCidrs[env.id] ?? exadataEntries(model).environments[env.id]?.exacs.network?.vcn ?? '') || conflicts[`exadata:exacs:${env.id}`]} style={styles.input}
                  value={value.environmentVcnCidrs[env.id] ?? exadataEntries(model).environments[env.id]?.exacs.network?.vcn ?? ''}
                  onChange={(event) => update({ environmentVcnCidrs: { ...value.environmentVcnCidrs, [env.id]: event.target.value } })} />
              </div>
            ))}
          </div>
        </>)}
        {databaseHere && (value.service === 'autonomous' || value.service === 'both') && <ProjectChoices type="EXACS" selected={value.projectDb} onChange={(projectDb) => update({ projectDb })}
          environments={projectEnvs} />}
        <NotificationFields prefix="exacs" value={value.notifications} onChange={(notifications) => update({ notifications })}
          useCase={useCase} placement={placement} projectEnvironments={databaseHere ? exadataProjectTopicEnvironments(model, 'exacs', useCase, value.service === 'autonomous' || value.service === 'both') : []}
          environmentEnvironments={placement === 'environment' ? model.environments.filter((env) => value.environments.includes(env.id)) : []} />
      </>}
    </section>
  );
}

export default function ExadataStep({ type, placement }: { type: 'exacc' | 'exacs'; placement: PlatformPlacement }) {
  return type === 'exacc' ? <ExaccSection placement={placement} /> : <ExacsSection placement={placement} />;
}
