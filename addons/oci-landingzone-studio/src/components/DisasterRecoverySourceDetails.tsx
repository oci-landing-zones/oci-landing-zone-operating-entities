import type { CSSProperties, ReactNode } from 'react';
import type { LzModel, Subnet } from '../model/types';
import { exadataEntries, exacsPreviewSubnets } from '../services/exadata';
import { buildConfig, type PlatformConfigEntry } from '../services/lzConfig';
import { ocvsDefaultSubnets, platformSubnetsForEnv, platformVcnForEnv } from '../services/platforms';
import { oracle } from '../theme';
import { generatorNames } from '../services/generatorNaming';
import DisasterRecoveryIncludeButton from './DisasterRecoveryIncludeButton';

const section: CSSProperties = { marginTop: 24, paddingTop: 20, borderTop: `1px solid ${oracle.border}` };
const title: CSSProperties = { margin: '0 0 12px', fontSize: 17, color: oracle.ink };
const text: CSSProperties = { margin: '0 0 12px', color: oracle.textMuted, fontSize: 14, lineHeight: 1.6, overflowWrap: 'anywhere' };

function Facts({ values }: { values: Array<[string, ReactNode]> }) {
  const columns = values.some(([label]) => label === 'Infrastructure compartment') ? 'minmax(110px, max-content) minmax(0, 1fr)' : 'minmax(110px, 0.45fr) minmax(0, 1fr)';
  return <dl style={{ display: 'grid', gridTemplateColumns: columns, columnGap: 16, rowGap: 8, margin: 0, fontSize: 14, lineHeight: 1.6 }}>
    {values.map(([label, value]) => <div key={label} style={{ display: 'contents' }}>
      <dt style={{ color: oracle.textMuted, whiteSpace: label === 'Infrastructure compartment' ? 'nowrap' : undefined }}>{label}</dt>
      <dd style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value}</dd>
    </div>)}
  </dl>;
}

export function DisasterRecoveryRegionDetails({ label, region, shortName }: { label: string; region: string; shortName: string }) {
  return <Facts values={[[label, region], ['Region short name', shortName]]} />;
}

const labels: Record<string, string> = {
  kubernetes_version: 'Kubernetes version', services_cidr: 'Services CIDR', pods_cidr: 'Pod CIDR',
  cni_type: 'Pod networking', cluster_size: 'Network profile', api_endpoint_allowed_cidrs: 'API endpoint allowed CIDRs',
  worker_image: 'Worker image selector', worker_boot_volume_size: 'Worker boot volume (GB)',
  create_fss: 'File Storage support', public_load_balancer: 'Public load balancers',
  ssh_authorized_keys: 'SSH authorized keys', notification_emails: 'Notification recipients',
  project_db_compartments: 'Autonomous project tiers', default: 'Default recipients',
  db_workloads: 'Database workloads', infra_workloads: 'Infrastructure workloads',
  projects_by_environment: 'Project recipients by environment', environment_infra: 'Environment infrastructure recipients',
  environment_db: 'Environment DBA recipients', split_environment_topics: 'Separate environment topics',
  sddc_display_name: 'SDDC name', cluster_display_name: 'Cluster name',
  vmware_software_version: 'VMware version', compute_availability_domain: 'Availability domain',
  esxi_hosts_count: 'ESXi hosts', vsphere_type: 'vSphere type',
  initial_host_ocpu_count: 'Initial host OCPUs', initial_host_shape_name: 'Initial host shape',
  workload_network_cidr: 'Workload network CIDR',
};
function labelFor(key: string): string {
  return labels[key] ?? key.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
function Settings({ value }: { value: Record<string, unknown> }) {
  return <dl style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
    {Object.entries(value).map(([key, item]) => <div key={key} style={{ marginBottom: 12, overflowWrap: 'anywhere' }}>
      <dt style={{ color: oracle.textMuted }}>{labelFor(key)}</dt>
      <dd style={{ margin: '4px 0 0', paddingLeft: item !== null && typeof item === 'object' && !Array.isArray(item) ? 12 : 0 }}>
        {Array.isArray(item) ? item.map(String).join(', ') || 'None'
          : item !== null && typeof item === 'object' ? <Settings value={item as Record<string, unknown>} />
            : typeof item === 'boolean' ? item ? 'Yes' : 'No' : String(item ?? 'Not set')}
      </dd>
    </div>)}
  </dl>;
}
function Subnets({ subnets, collapsible = true }: { subnets: Subnet[]; collapsible?: boolean }) {
  if (!subnets.length) return <p style={{ ...text, marginTop: 8 }}>No subnets configured.</p>;
  const contents = <div style={{ marginTop: 12 }}><Facts values={subnets.map((subnet) => [subnet.name, subnet.cidr])} /></div>;
  return collapsible ? <details style={{ marginTop: 12 }}>
    <summary style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 700, color: oracle.ink, cursor: 'pointer' }}>Subnets in this VCN</summary>
    {contents}
  </details> : contents;
}
function Platform({ name, entry, subnets, compartment, networkCompartment, summaryLabel, networkEditor, settingsEditor, incomplete = false }: { name: string; entry: PlatformConfigEntry; subnets: Subnet[]; compartment: string; networkCompartment?: string; summaryLabel?: string; networkEditor?: ReactNode; settingsEditor?: ReactNode; incomplete?: boolean }) {
  const type = entry.extension?.type;
  const displayType = type === 'oke_simple' ? 'OKE' : type ? type.toUpperCase() : 'Custom';
  const components = entry.publication_components;
  const scope = components?.database === false ? 'Infrastructure only' : components?.infrastructure === false ? 'Database only' : undefined;
  const settings = Object.fromEntries(Object.entries(entry.extension?.params ?? {}).filter(([key]) => key !== 'notification_emails'));
  const infrastructureCompartment = (type === 'exacs' || type === 'exacc') && components?.infrastructure !== false ? `${compartment}-infra` : undefined;
  return <details style={{ marginTop: 12 }}>
    <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{summaryLabel ?? (type === 'exacs' && scope === 'Infrastructure only' ? 'EXACS · Infrastructure only' : <>{type !== 'ocvs' && type !== 'oke_simple' && <>{name || 'Unnamed platform'} · </>}{displayType}{scope ? ` · ${scope}` : ''}{entry.network ? ` · ${entry.network.vcn || 'VCN not set'}` : ` · ${infrastructureCompartment || compartment} · No OCI network`}</>)}{incomplete ? ' · Incomplete platform' : ''}</summary>
    <div style={{ padding: '12px 0 4px 12px' }}>
      {incomplete && <p style={text}>Complete the platform name and VCN in the source design to review all of its settings.</p>}
      <Facts values={[
        ['Platform compartment', compartment],
        ...(entry.network && networkCompartment ? [['Network compartment', networkCompartment] as [string, ReactNode]] : []),
        ...(infrastructureCompartment ? [['Infrastructure compartment', infrastructureCompartment] as [string, ReactNode]] : []),
      ]} />
      {(settingsEditor || type === 'ocvs' || type === 'oke_simple') && <h5 style={{ margin: '24px 0 12px', fontSize: 14 }}>Network configuration</h5>}
      {entry.network && (networkEditor ?? <><Facts values={[["VCN CIDR", entry.network.vcn]]} /><Subnets subnets={subnets} /></>)}
      {settingsEditor}
      {!settingsEditor && type === 'ocvs' && <details style={{ marginTop: 20 }} aria-label="Home OCVS management cluster settings">
        <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>OCVS cluster configuration</summary>
        <div style={{ marginTop: 16 }}><Settings value={{
          ssh_authorized_keys: settings.ssh_authorized_keys,
          ...Object.fromEntries(Object.entries((settings.cluster ?? {}) as Record<string, unknown>).filter(([key]) => key !== 'is_hcx_enabled')),
        }} /></div>
      </details>}
      {!settingsEditor && type === 'oke_simple' && <details style={{ marginTop: 20 }} aria-label="Home OKE cluster settings">
        <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>OKE cluster configuration</summary>
        <div style={{ marginTop: 16 }}><Settings value={settings} /></div>
      </details>}
      {!settingsEditor && type !== 'ocvs' && type !== 'oke_simple' && !!Object.keys(settings).length && <div style={{ marginTop: 16 }}><Settings value={settings} /></div>}
    </div>
  </details>;
}

export function DisasterRecoveryCommonDetails({ name, model, sourceLabel }: { name: string; model: LzModel; sourceLabel: string }) {
  return <Facts values={[
    ['Design name', name], ['Description', model.foundation.description?.trim() || 'No description'],
    ['Source', sourceLabel], ['Realm', model.foundation.realm], ['CIS benchmark', `Level ${model.foundation.cisLevel}`],
  ]} />;
}

export function DisasterRecoverySharedInfrastructureDetails({ model, selectedIds = [], onToggle }: { model: LzModel; selectedIds?: string[]; onToggle?: (id: string) => void }) {
  return <>{Object.entries(exadataEntries(model).shared)
    .filter(([, entry]) => entry.publication_components?.database === false)
    .map(([key, entry]) => {
      const id = `extension:shared:${key}`;
      const selected = selectedIds.includes(id);
      return <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}><Platform name={key} entry={entry} compartment={generatorNames.sharedPlatformCompartment(key)} subnets={[]} /></div>
        {onToggle && <DisasterRecoveryIncludeButton included={selected} resourceName={`${key.toUpperCase()} shared infrastructure`} onClick={() => onToggle(id)} />}
      </div>;
    })}</>;
}

export function DisasterRecoveryExacsVmcDetails({ model, environmentId, vcnCidr, networkEditor, subnets }: { model: LzModel; environmentId: string; vcnCidr?: string; networkEditor?: ReactNode; subnets?: Subnet[] }) {
  const env = model.environments.find((item) => item.id === environmentId);
  const entry = exadataEntries(model).environments[environmentId]?.exacs;
  if (!env || !entry) return null;
  const service = model.exadata.exacs.service === 'autonomous' ? 'AVMC' : model.exadata.exacs.service === 'both' ? 'VMC / AVMC' : 'VMC';
  const name = env.name.charAt(0).toUpperCase() + env.name.slice(1);
  return <>
    <h4 style={{ ...title, fontSize: 15 }}>{env.name}</h4>
    <Platform name="exacs" summaryLabel={`EXACS · ${name} DR ${service}`} compartment={generatorNames.environmentPlatformCompartment(env.name, 'exacs')} networkCompartment={generatorNames.environmentChildCompartment(env.name, 'network')} networkEditor={networkEditor}
      entry={{ ...entry, network: entry.network ? { ...entry.network, vcn: vcnCidr ?? '' } : undefined }} subnets={subnets ?? (vcnCidr ? exacsPreviewSubnets(vcnCidr) : [])} />
  </>;
}

export function DisasterRecoveryPlatformDetails({ model, platformId, environmentId, vcnCidr, networkEditor, settingsEditor }: { model: LzModel; platformId: string; environmentId?: string; vcnCidr: string; networkEditor: ReactNode; settingsEditor?: ReactNode }) {
  const env = model.environments.find((item) => item.id === environmentId);
  const platform = (env ? model.platforms : model.sharedPlatforms).find((item) => platformId === (env ? `platform:${item.id}:${env.id}` : `shared:${item.id}`));
  if (!platform) return null;
  const config = buildConfig(model);
  const entry = env ? config.environments[env.name.trim()]?.platforms[platform.key.trim()] : config.shared_platforms[platform.key.trim()];
  return <>
    <h4 style={{ ...title, fontSize: 15 }}>{env?.name ?? 'Shared'}</h4>
    <Platform name={platform.key} entry={{ ...entry, extension: entry?.extension ?? { type: platform.type ?? 'custom' }, network: { vcn: vcnCidr } }}
      compartment={env ? generatorNames.environmentPlatformCompartment(env.name, platform.key) : generatorNames.sharedPlatformCompartment(platform.key)}
      networkCompartment={env ? generatorNames.environmentChildCompartment(env.name, 'network') : generatorNames.networkCompartment}
      subnets={ocvsDefaultSubnets(vcnCidr)} networkEditor={networkEditor} settingsEditor={settingsEditor} />
  </>;
}

export type SourceDetailsPart = 'all' | 'regions' | 'hub' | 'projects' | 'platforms' | 'notifications';

export default function DisasterRecoverySourceDetails({ name, model, sourceLabel, showCommonDetails = true, part = 'all' }: {
  name: string; model: LzModel; sourceLabel: string; showCommonDetails?: boolean; part?: SourceDetailsPart;
}) {
  const config = buildConfig(model);
  const exadata = exadataEntries(model);
  const foundation = model.foundation;
  const sharedCount = model.sharedPlatforms.length + Object.keys(exadata.shared).length;
  const showProjects = part === 'all' || part === 'projects';
  const showPlatforms = part === 'all' || part === 'platforms';
  const environmentPlatformCount = model.environments.reduce((count, env) => count + model.platforms.filter((platform) => platform.environments === 'all' || platform.environments.includes(env.id)).length + Object.keys(exadata.environments[env.id] ?? {}).length, 0);
  const hasEnvironmentPlatforms = environmentPlatformCount > 0;
  const sectionStyle = part === 'all' ? section : {};
  const platformNotifications = (part === 'all' || part === 'notifications') ? [
    ...Object.entries(config.shared_platforms).map(([name, entry]) => ({ name: `${name.toUpperCase()} · Shared`, value: entry.extension?.params?.notification_emails })),
    ...Object.entries(config.environments).flatMap(([env, entry]) => Object.entries(entry.platforms).map(([name, platform]) => ({ name: `${name.toUpperCase()} · ${env}`, value: platform.extension?.params?.notification_emails }))),
  ].filter((scope) => scope.value !== undefined) : [];
  return <div>
    {part === 'all' && showCommonDetails && <div style={{ marginBottom: 16 }}><DisasterRecoveryCommonDetails name={name} model={model} sourceLabel={sourceLabel} /></div>}
    {(part === 'all' || part === 'regions') && <Facts values={[
      ['Home region', foundation.region], ['Region short name', foundation.regionShortName],
      ...(part === 'all' ? [['Hub', `Hub ${model.network.hubKind.slice(-1).toUpperCase()}`] as [string, ReactNode]] : []),
    ]} />}
    {(part === 'all' || part === 'hub') && <section style={sectionStyle} aria-label="Home hub network">
      {part === 'all' && <h3 style={title}>Hub network</h3>}
      {part === 'hub' && <Facts values={[["Hub", `Hub ${model.network.hubKind.slice(-1).toUpperCase()}`]]} />}
      <section aria-label="Hub VCN and its subnets" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', alignItems: 'start', gap: 16, marginTop: 16, padding: 16, border: `1px solid ${oracle.borderStrong}`, background: oracle.surface }}>
        <dl style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          <dt style={{ color: oracle.textMuted }}>VCN CIDR</dt>
          <dd style={{ margin: '6px 0 0', overflowWrap: 'anywhere' }}><strong>{model.network.hubVcnCidr || 'Not set'}</strong></dd>
        </dl>
        <details style={{ minWidth: 0, paddingLeft: 16, borderLeft: `1px solid ${oracle.borderStrong}` }}>
          <summary style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 700, color: oracle.ink, cursor: 'pointer' }}>Subnets in this VCN</summary>
          <Subnets subnets={model.network.subnets} collapsible={false} />
        </details>
      </section>
    </section>}
    {showPlatforms && (sharedCount > 0 || part === 'all') && <section style={sectionStyle} aria-label="Home shared platforms">
      <h3 style={title}>Shared platforms ({sharedCount})</h3>
      {!sharedCount && <p style={text}>No shared platforms configured.</p>}
      {model.sharedPlatforms.map((platform) => <Platform key={platform.id} name={platform.key} compartment={generatorNames.sharedPlatformCompartment(platform.key)} networkCompartment={generatorNames.networkCompartment}
        entry={config.shared_platforms[platform.key.trim()] ?? { network: { vcn: platform.vcnCidr }, ...(platform.type === 'ocvs' ? { extension: { type: 'ocvs' } } : {}) }}
        incomplete={!config.shared_platforms[platform.key.trim()]}
        subnets={platform.type === 'ocvs' ? ocvsDefaultSubnets(platform.vcnCidr) : platform.subnets} />)}
      {Object.entries(exadata.shared).map(([key, entry]) => <Platform key={key} name={key} compartment={generatorNames.sharedPlatformCompartment(key)} networkCompartment={generatorNames.networkCompartment} entry={entry} subnets={entry.network ? exacsPreviewSubnets(entry.network.vcn) : []} />)}
    </section>}
    {(showProjects || (showPlatforms && hasEnvironmentPlatforms)) && <section style={part === 'platforms' ? { marginTop: sharedCount ? 24 : 0 } : sectionStyle} aria-label="Home environments">
      <h3 style={title}>{showProjects ? `Environments (${model.environments.length})` : `Environment platforms(${environmentPlatformCount})`}</h3>
      {!model.environments.length && <p style={text}>No environments configured.</p>}
      {model.environments.map((env, index) => {
        const projects = model.projects.filter((project) => project.environments === 'all' || project.environments.includes(env.id));
        const platforms = model.platforms.filter((platform) => platform.environments === 'all' || platform.environments.includes(env.id));
        if (!showProjects && !platforms.length && !Object.keys(exadata.environments[env.id] ?? {}).length) return null;
        return <section key={env.id} aria-label={`${env.name} configuration`} style={{ marginTop: 20 }}>
          <h4 style={{ ...title, fontSize: 15 }}>{env.name}</h4>
          {showProjects && <><Facts values={[
            ['Security Zone', env.securityZone ? 'Enabled' : 'Disabled'],
            ['Projects', projects.map((project) => project.name).join(', ') || 'None'],
            ['Projects VCN', env.network.vcnCidr || 'Not set'],
          ]} />
          <Subnets subnets={env.network.subnets} /></>}
          {showPlatforms && <>{showProjects && <h5 style={{ margin: '16px 0 4px', fontSize: 14 }}>Platforms</h5>}
          {!platforms.length && !Object.keys(exadata.environments[env.id] ?? {}).length && <p style={text}>No environment platforms configured.</p>}
          {platforms.map((platform) => <Platform key={platform.id} name={platform.key} compartment={generatorNames.environmentPlatformCompartment(env.name, platform.key)} networkCompartment={generatorNames.environmentChildCompartment(env.name, 'network')}
            entry={{ ...config.environments[env.name.trim()]?.platforms[platform.key.trim()], network: { vcn: platformVcnForEnv(platform, env.id, index) } }}
            subnets={platformSubnetsForEnv(platform, env.id, index)} />)}
          {Object.entries(exadata.environments[env.id] ?? {}).map(([key, entry]) => <Platform key={key} name={key} compartment={generatorNames.environmentPlatformCompartment(env.name, key)} networkCompartment={generatorNames.environmentChildCompartment(env.name, 'network')} entry={entry}
            summaryLabel={key === 'exacs' && entry.publication_components?.infrastructure === false ? `EXACS · ${env.name.charAt(0).toUpperCase() + env.name.slice(1)} ${model.exadata.exacs.service === 'autonomous' ? 'AVMC' : model.exadata.exacs.service === 'both' ? 'VMC / AVMC' : 'VMC'}` : undefined}
            subnets={entry.network ? exacsPreviewSubnets(entry.network.vcn) : []} />)}</>}
        </section>;
      })}
    </section>}
    {(part === 'all' || part === 'notifications') && <section style={sectionStyle} aria-label="Home notification recipients">
      <h3 style={title}>Notification recipients</h3>
      {config.notification_emails ? <Settings value={config.notification_emails} /> : <p style={text}>No notification recipients configured.</p>}
      {!!platformNotifications.length && <section style={section} aria-label="Home platform notification recipients">
        <h4 style={title}>Platform notification recipients</h4>
        {platformNotifications.map((scope) => <details key={scope.name} style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{scope.name}</summary>
          <div style={{ marginTop: 12 }}><Settings value={{ notification_emails: scope.value }} /></div>
        </details>)}
      </section>}
    </section>}
  </div>;
}
