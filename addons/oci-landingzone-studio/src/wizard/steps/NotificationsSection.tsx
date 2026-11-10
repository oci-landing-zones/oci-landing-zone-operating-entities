import type { CSSProperties } from 'react';
import { useWizard } from '../wizardContext';
import FieldError from '../../components/FieldError';
import { notificationEmailError } from '../../services/notificationEmails';
import type { FoundationConfig, OneOeNotifications } from '../../model/types';
import { oracle } from '../../theme';
import { s as form } from './networkEditorStyles';

const s: Record<string, CSSProperties> = {
  panel: form.panel, body: { padding: 20 }, title: form.title,
  accent: { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' },
  field: { marginBottom: 14 }, label: form.label, input: form.input, help: form.help,
  topicRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: 16, alignItems: 'start', padding: '14px 0', borderTop: `1px solid ${oracle.border}` },
};

const topicHelp: Record<Exclude<keyof OneOeNotifications, 'default' | 'useSingleRecipient'>, string> = {
  cloudguard: 'Cloud Guard findings and status changes.',
  iam: 'Changes to users, groups, identity providers and policies.',
  network: 'Network events and alarms, including load balancers and network interfaces.',
  security: 'Security events and alarms for audit and infrastructure resources.',
};

export default function NotificationsSection() {
  const { model, setField } = useWizard();
  const f = model.foundation;
  const regional = f.stackScope === 'regional';
  const singleRecipient = f.notifications?.useSingleRecipient ?? Boolean(f.notifications?.default);
  function setFoundation(patch: Partial<FoundationConfig>) { setField('foundation', { ...f, ...patch }); }
  function setNotification(topic: keyof OneOeNotifications, value: string) {
    setFoundation({ notifications: {
      default: '', cloudguard: '', iam: '', network: '', security: '',
      ...f.notifications,
      [topic]: value,
    } });
  }
  function setSingleRecipient(checked: boolean) {
    setFoundation({ notifications: {
      default: '', cloudguard: '', iam: '', network: '', security: '',
      ...f.notifications,
      useSingleRecipient: checked,
    } });
  }
  return (
      <section style={s.panel} aria-labelledby="foundation-observability-title">
        <div style={s.accent} />
        <div style={s.body}>
          <h2 id="foundation-observability-title" style={s.title}>Observability Notifications (Events &amp; alarms)</h2>
          <p style={form.intro}>Choose who receives events and alarms. Enter email addresses separated by commas.</p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: oracle.ink }}>
              <input type="checkbox" checked={singleRecipient} onChange={(e) => setSingleRecipient(e.target.checked)} />
              Use the same recipients for all topics
            </label>
            <div style={{ ...s.help, marginTop: 6 }}>{regional ? 'Network and Security topics.' : 'Cloud Guard, IAM, Network and Security topics.'}</div>
          </div>
          {!singleRecipient && <div>
            {([
              ['cloudguard', 'Cloud Guard events'],
              ['iam', 'IAM events'],
              ['network', 'Network events and alarms'],
              ['security', 'Security events and alarms'],
            ] as const).filter(([topic]) => !regional || topic === 'network' || topic === 'security').map(([topic, label]) => (
              <div key={topic} style={s.topicRow} className="foundation-observability-row">
                <div>
                  <label style={s.label} htmlFor={`lz-observability-${topic}`}>{label}</label>
                  <input id={`lz-observability-${topic}`} style={s.input} type="text" inputMode="email"
                    required aria-invalid={!!notificationEmailError(f.notifications?.[topic])}
                    placeholder="team@example.com" value={f.notifications?.[topic] ?? ''}
                    onChange={(e) => setNotification(topic, e.target.value)} aria-describedby={`lz-observability-${topic}-help${notificationEmailError(f.notifications?.[topic]) ? ` lz-observability-${topic}-error` : ''}`} />
                  <FieldError id={`lz-observability-${topic}-error`} error={notificationEmailError(f.notifications?.[topic])} />
                </div>
                <div id={`lz-observability-${topic}-help`} style={s.help}>{topicHelp[topic]}</div>
              </div>
            ))}
          </div>}
          {singleRecipient && <div style={{ ...s.field, marginTop: 16, marginBottom: 0 }}>
            <label style={s.label} htmlFor="lz-observability-default">Notification emails</label>
            <input id="lz-observability-default" style={s.input} type="text" inputMode="email"
              required aria-invalid={!!notificationEmailError(f.notifications?.default)} aria-describedby={notificationEmailError(f.notifications?.default) ? 'lz-observability-default-error' : undefined}
              placeholder="ops@example.com" value={f.notifications?.default ?? ''}
              onChange={(e) => setNotification('default', e.target.value)} />
            <FieldError id="lz-observability-default-error" error={notificationEmailError(f.notifications?.default)} />
          </div>}
        </div>
      </section>
  );
}
