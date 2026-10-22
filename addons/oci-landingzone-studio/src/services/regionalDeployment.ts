import { newLzModel } from '../model/defaults';
import type { LzModel } from '../model/types';
import { configuredVcnCidrs, exadataEntries, exadataNotificationSource } from './exadata';
import { findRegion } from './regions';
import type { DrDesignDraft } from './disasterRecoveryDesign';
import { drPlatformProjection } from './disasterRecoveryPlatformProjection';
import { drPlatformNotificationScopes } from './disasterRecoveryNotifications';

export function createRegionalModel(): LzModel {
  const model = newLzModel();
  model.foundation = { ...model.foundation, stackScope: 'regional', homeRegion: '', region: '', regionShortName: '', homePrerequisitesConfirmed: false };
  model.remotePeeringConnections = [];
  return model;
}

export function validateRegionalDeployment(model: LzModel): string[] {
  if (model.foundation.stackScope !== 'regional') return [];
  const { realm, region, homeRegion, homePrerequisitesConfirmed } = model.foundation;
  return [
    ...(!findRegion(realm, region) ? ['Choose a DR region.'] : []),
    ...(!homeRegion || !findRegion(realm, homeRegion) || homeRegion === region ? ['Choose a different Home region in the same realm.'] : []),
    ...(!homePrerequisitesConfirmed ? ['Confirm the Home stack owns the matching compartments, IAM and governance prerequisites.'] : []),
  ];
}

/** Keep the old Home source in the record while editing its regional design. */
export function legacyRegionalModel(home: LzModel, draft: DrDesignDraft): LzModel {
  const model = structuredClone(home);
  const region = findRegion(home.foundation.realm, draft.region);
  const projection = drPlatformProjection(home, draft);
  model.foundation = { ...home.foundation, stackScope: 'regional', homeRegion: home.foundation.region,
    region: draft.region, regionShortName: region?.shortName ?? '', drRegion: undefined,
    homePrerequisitesConfirmed: false, notifications: draft.notifications ?? home.foundation.notifications };
  model.network = { hubKind: draft.hubKind, ...(draft.hubNetwork ?? { hubVcnCidr: '', subnets: [] }) };
  const selected = new Set(draft.platformIds);
  const sourceEntries = exadataEntries(home);
  model.environments = home.environments.filter((env) => draft.projectNetworkIds.includes(`projects:${env.id}`)
    || home.platforms.some((platform) => (platform.environments === 'all' || platform.environments.includes(env.id)) && selected.has(`platform:${platform.id}:${env.id}`))
    || ['exacc', 'exacs'].some((type) => sourceEntries.environments[env.id]?.[type] && selected.has(`extension:environment:${env.id}:${type}`))).map((env) => ({ ...env,
      name: draft.environmentNames?.[env.id]?.trim() || env.name, securityZone: false,
      projectNetworkEnabled: draft.projectNetworkIds.includes(`projects:${env.id}`),
      network: draft.projectNetworks?.[`projects:${env.id}`] ?? { vcnCidr: '', subnets: [] },
    }));
  const envIds = new Set(model.environments.map((env) => env.id));
  model.projects = home.projects.flatMap((project) => model.environments.filter((env) => project.environments === 'all' || project.environments.includes(env.id))
    .map((env) => ({ ...project, id: `${project.id}:${env.id}`, name: draft.projectNames?.[env.id]?.[project.id]?.trim() || project.name, environments: [env.id] })));
  model.platforms = projection.platforms.flatMap((platform) => {
    const environments = platform.environments === 'all' ? [...envIds] : platform.environments;
    return environments.map((envId) => {
      const id = `platform:${platform.id}:${envId}`;
      if (platform.type === 'ocvs' && draft.platformSubnets?.[id]) throw new Error(`OCVS ${id}: legacy custom subnet settings cannot be preserved in the standard editor.`);
      const network = { ...platform.overrides?.[envId], vcnCidr: projection.cidrs[id] ?? '' };
      return { ...platform, id: `${platform.id}:${envId}`, environments: [envId],
        vcnCidr: network.vcnCidr, subnets: network.subnets ?? platform.subnets,
        overrides: { [envId]: network },
        ...(platform.type === 'ocvs' && draft.platformOcvsParams?.[id] ? { ocvsParams: draft.platformOcvsParams[id] } : {}),
      };
    });
  });
  model.sharedPlatforms = projection.sharedPlatforms.map((platform) => {
    const id = `shared:${platform.id}`;
    if (platform.type === 'ocvs' && draft.platformSubnets?.[id]) throw new Error(`OCVS ${id}: legacy custom subnet settings cannot be preserved in the standard editor.`);
    return { ...platform, vcnCidr: projection.cidrs[id] ?? '',
      ...(platform.type === 'ocvs' && draft.platformOcvsParams?.[id] ? { ocvsParams: draft.platformOcvsParams[id] } : {}),
    };
  });
  const notificationScopes = drPlatformNotificationScopes(home, draft);
  for (const type of ['exacc', 'exacs'] as const) {
    const design = model.exadata[type];
    if (type === 'exacc') model.exadata.exacc.database ??= !home.exadata.exacc.shared || home.exadata.exacc.environments.length ? 'per_environment' : 'shared';
    design.enabled = Boolean(selected.has(`extension:shared:${type}`) && sourceEntries.shared[type])
      || home.environments.some((env) => sourceEntries.environments[env.id]?.[type] && selected.has(`extension:environment:${env.id}:${type}`));
    design.environments = design.environments.filter((id) => envIds.has(id) && selected.has(`extension:environment:${id}:${type}`));
    const sharedDatabase = type === 'exacc' ? model.exadata.exacc.shared && design.database === 'shared'
      : model.exadata.exacs.infrastructure === 'shared' && design.database === 'shared';
    design.projectDb = Object.fromEntries(Object.entries(design.projectDb).filter(([id]) => envIds.has(id) && (sharedDatabase || design.environments.includes(id)))
      .map(([id, projects]) => [id, projects.map((project) => `${project}:${id}`)]));
    if (type === 'exacs') {
      model.exadata.exacs.sharedVcnCidr = projection.cidrs['extension:shared:exacs'] ?? '';
      model.exadata.exacs.environmentVcnCidrs = Object.fromEntries(model.exadata.exacs.environments.map((id) => [id, projection.cidrs[`extension:environment:${id}:exacs`] ?? '']));
    }
    const scopes = notificationScopes.filter((scope) => scope.id.endsWith(`:${type}`));
    const recipients = (value: string) => value.split(/[,;\n]/).map((email) => email.trim()).filter(Boolean);
    for (const scope of scopes) {
      const env = model.environments.find((env) => scope.id === `extension:environment:${env.id}:${type}`);
      for (const field of scope.fields) {
        if (field.key === 'default') continue;
        const key = { infra_workloads: 'infraWorkloads', db_workloads: 'dbWorkloads', projects: 'projects',
          environment_infra: 'environmentInfraEmails', environment_db: 'environmentDbEmails', projects_by_environment: 'projectEmails' }[field.key];
        if (key === 'infraWorkloads' || key === 'dbWorkloads' || key === 'projects') design.notifications[key] = field.value;
        else if (env && (key === 'environmentInfraEmails' || key === 'environmentDbEmails' || key === 'projectEmails')) {
          design.notifications[key] = { ...design.notifications[key], [env.id]: field.value };
        }
      }
    }
    const defaultRecipients = scopes[0]?.fields.find((field) => field.key === 'default')?.value;
    if (defaultRecipients !== undefined) {
      if (design.notifications.useSingleRecipient ?? Boolean(design.notifications.default)) {
        design.notifications.useSingleRecipient = true;
        design.notifications.default = defaultRecipients;
      }
      else design.notifications.fallbackDefault = { recipients: recipients(defaultRecipients), source: exadataNotificationSource(design.notifications) };
    }
  }
  const regionalEntries = exadataEntries(model);
  const comparable = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  for (const type of ['exacc', 'exacs'] as const) {
    const scopes = [{ id: `extension:shared:${type}`, source: sourceEntries.shared[type], actual: regionalEntries.shared[type], envId: '' },
      ...home.environments.map((env) => ({ id: `extension:environment:${env.id}:${type}`, source: sourceEntries.environments[env.id]?.[type], actual: regionalEntries.environments[env.id]?.[type], envId: env.id }))];
    for (const scope of scopes) {
      const expected = selected.has(scope.id) && scope.source ? structuredClone(scope.source) : undefined;
      if (expected?.network) {
        expected.network.vcn = (projection.cidrs[scope.id] ?? '').trim();
        if (draft.platformSubnets?.[scope.id]) Object.assign(expected.network, { subnets: Object.fromEntries(draft.platformSubnets[scope.id].map((subnet) => [subnet.name, subnet.cidr.trim()])) });
      }
      if (expected) {
        const emails = expected.extension.params.notification_emails as Record<string, unknown>;
        for (const key of ['environment_infra', 'environment_db', 'projects_by_environment']) {
          const map = emails[key] as Record<string, unknown> | undefined;
          if (map) emails[key] = Object.fromEntries(Object.entries(map).map(([name, value]) => {
            const env = home.environments.find((env) => env.name.trim() === name);
            return [env && draft.environmentNames?.[env.id]?.trim() || name, value];
          }));
        }
        for (const field of notificationScopes.find((item) => item.id === scope.id)?.fields ?? []) {
          const values = field.value.split(/[,;\n]/).map((email) => email.trim()).filter(Boolean);
          const env = model.environments.find((env) => env.id === scope.envId);
          emails[field.key] = env && ['environment_infra', 'environment_db', 'projects_by_environment'].includes(field.key) ? { [env.name.trim()]: values } : values;
        }
      }
      if (comparable(expected) !== comparable(scope.actual)) {
        const setting = !expected || !scope.actual || comparable(expected.publication_components) !== comparable(scope.actual.publication_components) ? 'publication scopes'
          : comparable(expected.network) !== comparable(scope.actual.network) ? 'network or subnet settings'
          : comparable(expected.extension.params.notification_emails) !== comparable(scope.actual.extension.params.notification_emails) ? 'notification recipients'
          : 'project database references';
        throw new Error(`${type.toUpperCase()} ${scope.id}: the legacy ${setting} cannot be preserved in the standard editor. Keep the original design and exported package.`);
      }
    }
  }
  model.remotePeeringConnections = draft.rpcEnabled ? [{ id: 'rpc-home', name: 'home', role: 'requester',
    remoteCidrs: configuredVcnCidrs(home), peerRegionName: home.foundation.region, peerId: '' }] : [];
  return structuredClone(model);
}
