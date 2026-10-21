import type { OneOeNotifications } from '../model/types';
import { notificationEmailError } from '../services/notificationEmails';
import { oracle } from '../theme';
import type { DrPlatformNotificationScope } from '../services/disasterRecoveryNotifications';

const topics = [
  ['cloudguard', 'Cloud Guard events'], ['iam', 'IAM events'],
  ['network', 'Network events and alarms'], ['security', 'Security events and alarms'],
] as const;

export default function DisasterRecoveryObservability({ notifications, onChange, platformScopes = [], onPlatformChange }: {
  notifications: OneOeNotifications; onChange: (notifications: OneOeNotifications) => void;
  platformScopes?: DrPlatformNotificationScope[]; onPlatformChange?: (id: string, key: string, value: string) => void;
}) {
  const single = notifications.useSingleRecipient ?? Boolean(notifications.default);
  const fields = single ? [['default', 'Notification emails']] as const : topics;
  return <>
    <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.6, color: oracle.textMuted }}>Notification email addresses are required. Use the same recipients for all four topics, or configure each topic separately. Separate multiple addresses with commas.</p>
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
      <input type="checkbox" checked={single} onChange={(event) => onChange({ ...notifications, useSingleRecipient: event.target.checked })} />
      Use one email for all notifications
    </label>
    <p style={{ margin: '8px 0 20px', fontSize: 13, lineHeight: 1.6, color: oracle.textMuted }}>Uses the same recipients for Cloud Guard, IAM, Network and Security.</p>
    {fields.map(([topic, label]) => {
      const error = notificationEmailError(notifications[topic]);
      const id = `dr-observability-${topic}`;
      return <div key={topic} style={{ marginTop: 16 }}>
        <label htmlFor={id} style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{label}</label>
        <input id={id} type="text" inputMode="email" required value={notifications[topic]} placeholder="team@example.com" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          style={{ boxSizing: 'border-box', width: '100%', padding: '9px 11px', font: 'inherit', fontSize: 14, border: `1px solid ${error ? oracle.redDark : oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text }}
          onChange={(event) => onChange({ ...notifications, [topic]: event.target.value })} />
        {error && <p id={`${id}-error`} role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: oracle.redDark }}>{error}</p>}
      </div>;
    })}
    {!!platformScopes.length && <section aria-label="DR platform notification recipients" style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${oracle.border}` }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 17 }}>Platform notification recipients</h4>
      {platformScopes.map((scope) => <details key={scope.id} style={{ marginTop: 16 }}>
        <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{scope.title}</summary>
        {scope.fields.map((field) => {
          const error = notificationEmailError(field.value);
          const id = `dr-platform-notifications-${scope.id}-${field.key}`;
          return <div key={field.key} style={{ marginTop: 16 }}>
            <label htmlFor={id} style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{field.label}</label>
            <input id={id} type="text" inputMode="email" required aria-label={`${scope.title} DR ${field.label}`} value={field.value} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
              style={{ boxSizing: 'border-box', width: '100%', padding: '9px 11px', font: 'inherit', fontSize: 14, border: `1px solid ${error ? oracle.redDark : oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text }}
              onChange={(event) => onPlatformChange?.(scope.id, field.key, event.target.value)} />
            {error && <p id={`${id}-error`} role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: oracle.redDark }}>{error}</p>}
          </div>;
        })}
      </details>)}
    </section>}
  </>;
}
