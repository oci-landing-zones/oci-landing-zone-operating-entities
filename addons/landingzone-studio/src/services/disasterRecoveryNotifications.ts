import type { LzModel } from '../model/types';
import type { PlatformConfigEntry } from './lzConfig';
import type { DrDesignDraft } from './disasterRecoveryDesign';
import { exadataEntries } from './exadata';

export interface DrPlatformNotificationScope {
  id: string;
  title: string;
  fields: Array<{ key: string; label: string; value: string }>;
}

export function drPlatformNotificationScopes(model: LzModel, draft: DrDesignDraft): DrPlatformNotificationScope[] {
  const exadata = exadataEntries(model);
  const scopes: DrPlatformNotificationScope[] = [];
  const recipients = (value: unknown) => Array.isArray(value) ? value.map(String).join(', ') : '';
  function add(id: string, title: string, entry: PlatformConfigEntry, environment?: string) {
    if (!draft.platformIds.includes(id)) return;
    const emails = entry.extension?.params?.notification_emails as Record<string, unknown> | undefined;
    if (!emails) return;
    const fields = [{ key: 'default', label: 'Notification emails', value: recipients(emails.default) }];
    const addField = (key: string, label: string, value: unknown) => {
      if (Array.isArray(value)) fields.push({ key, label, value: recipients(value) });
    };
    if (!environment) {
      if (entry.publication_components?.infrastructure !== false) addField('infra_workloads', 'Infrastructure notifications', emails.infra_workloads);
      if (entry.publication_components?.database !== false) addField('db_workloads', 'Database notifications', emails.db_workloads);
    } else {
      const values = (key: string) => (emails![key] as Record<string, unknown> | undefined)?.[environment];
      if (entry.publication_components?.infrastructure !== false) addField('environment_infra', 'Infrastructure notifications', values('environment_infra'));
      if (entry.publication_components?.database !== false) addField('environment_db', 'Database notifications', values('environment_db'));
      addField('projects_by_environment', 'Project notifications', values('projects_by_environment'));
    }
    scopes.push({ id, title, fields: fields.map((field) => ({ ...field, value: draft.platformNotificationEmails?.[id]?.[field.key] ?? field.value })) });
  }
  for (const [key, entry] of Object.entries(exadata.shared)) add(`extension:shared:${key}`, `${key.toUpperCase()} · Shared`, entry);
  for (const env of model.environments) {
    for (const [key, entry] of Object.entries(exadata.environments[env.id] ?? {})) {
      const name = draft.environmentNames?.[env.id]?.trim() || env.name;
      add(`extension:environment:${env.id}:${key}`, `${key.toUpperCase()} · ${name.charAt(0).toUpperCase() + name.slice(1)}`, entry, env.name.trim());
    }
  }
  return scopes;
}
