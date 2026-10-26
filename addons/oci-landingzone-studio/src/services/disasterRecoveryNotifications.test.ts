import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { createDrDraft } from './disasterRecoveryDesign';
import { drPlatformNotificationScopes } from './disasterRecoveryNotifications';

describe('DR platform observability', () => {
  it('inherits selected shared and production EXACS recipients, preserving independent DR edits', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.database = 'per_environment';
    model.exadata.exacs.environments = model.environments.map((env) => env.id);
    model.exadata.exacs.notifications = { ...model.exadata.exacs.notifications, default: 'home@example.com', useSingleRecipient: true };
    const shared = 'extension:shared:exacs';
    const prod = `extension:environment:${model.environments[0].id}:exacs`;
    const draft = { ...createDrDraft(model), platformIds: [shared, prod] };
    const scopes = drPlatformNotificationScopes(model, draft);
    expect(scopes.map((scope) => scope.title)).toEqual(['EXACS · Shared', 'EXACS · Prod']);
    expect(scopes.every((scope) => scope.fields[0].value === 'home@example.com')).toBe(true);
    const edited = drPlatformNotificationScopes(model, { ...draft, platformNotificationEmails: { [prod]: { default: 'dr@example.com' } } });
    expect(edited[1].fields[0].value).toBe('dr@example.com');
    expect(edited[0].fields[0].value).toBe('home@example.com');
    expect(model.exadata.exacs.notifications.default).toBe('home@example.com');
  });
  it('shows only the selected environment’s database topic in a hybrid EXACS scope', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.database = 'per_environment';
    model.exadata.exacs.environments = model.environments.map((env) => env.id);
    model.exadata.exacs.notifications = { ...model.exadata.exacs.notifications, useSingleRecipient: false, infraWorkloads: 'infra@example.com', environmentDbEmails: { [model.environments[0].id]: 'prod@example.com', [model.environments[1].id]: 'preprod@example.com' } };
    const scopes = drPlatformNotificationScopes(model, { ...createDrDraft(model), platformIds: [`extension:environment:${model.environments[0].id}:exacs`] });
    expect(scopes[0].fields.find((field) => field.key === 'environment_db')?.value).toBe('prod@example.com');
    expect(scopes[0].fields.some((field) => field.key === 'environment_infra')).toBe(false);
    expect(JSON.stringify(scopes)).not.toContain('preprod@example.com');
  });
});
