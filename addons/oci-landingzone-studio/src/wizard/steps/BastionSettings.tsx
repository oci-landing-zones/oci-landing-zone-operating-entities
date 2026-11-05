import { useWizard } from '../wizardContext';
import Switch from '../../components/Switch';
import FieldError from '../../components/FieldError';
import InfoButton from '../../components/InfoButton';
import { fieldErrorProps } from '../../services/fieldErrors';
import { BASTION_DOCUMENTATION_URL, bastionAllowlistError, bastionDurationError, defaultBastion } from '../../services/bastion';
import type { BastionConfig } from '../../model/types';
import { s } from './networkEditorStyles';

export default function BastionSettings() {
  const { model, setField } = useWizard();
  const bastion = model.bastion ?? defaultBastion();
  const allowlistError = bastion.enabled ? bastionAllowlistError(bastion) : null;
  const durationError = bastion.enabled ? bastionDurationError(bastion) : null;
  const update = (patch: Partial<BastionConfig>) => setField('bastion', { ...bastion, ...patch });

  return (
    <section style={s.panel} aria-labelledby="foundation-bastion-title">
      <div style={s.accent} />
      <div style={s.body}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div className="studio-info-heading">
            <h2 id="foundation-bastion-title" style={s.title}>OCI Bastion</h2>
            <InfoButton title="OCI Bastion">
              <p>Studio places one Bastion in the shared security compartment and hub management subnet. The service remains deployed until you remove it.</p>
              <p>After deployment, create a dynamic port forwarding (SOCKS5) session. DNS and SOCKS5 support are enabled so supported clients can connect using private hostnames.</p>
              <p>Oracle documents access within the Bastion&apos;s VCN. Validate routed access to spoke VCNs in your topology before use.</p>
              <p><a className="guide-link" href={BASTION_DOCUMENTATION_URL} target="_blank" rel="noreferrer">Connect through OCI Bastion</a></p>
            </InfoButton>
          </div>
          <Switch checked={bastion.enabled} onChange={(enabled) => update({ enabled })} label={bastion.enabled ? 'On' : 'Off'} ariaLabel="Enable OCI Bastion" />
        </div>
        <p id="foundation-bastion-intro" style={s.intro}>Access private databases and virtual machines through OCI Bastion. Studio includes the service in your deployment files. You create temporary access sessions after deployment.</p>
        {bastion.enabled && <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={s.label} htmlFor="lz-bastion-client-cidrs">Allowed public IPv4 ranges (CIDR)</label>
            <textarea id="lz-bastion-client-cidrs" style={{ ...s.input, minHeight: 92, resize: 'vertical' }} rows={3}
              value={bastion.clientCidrs} onChange={(event) => update({ clientCidrs: event.target.value })}
              placeholder="203.0.113.10/32"
              {...fieldErrorProps('lz-bastion-client-cidrs-error', allowlistError, 'lz-bastion-client-cidrs-help')} />
            <p id="lz-bastion-client-cidrs-help" style={s.help}>Use the approved public IPv4 address OCI sees from your workstation or corporate internet gateway. Enter 1 to 20 ranges in CIDR notation, separated by commas or new lines.</p>
            <FieldError id="lz-bastion-client-cidrs-error" error={allowlistError} />
          </div>
          <div>
            <label style={s.label} htmlFor="lz-bastion-session-duration">Maximum session duration (minutes)</label>
            <input id="lz-bastion-session-duration" style={s.input} type="number" min={30} max={180} step={1}
              value={bastion.maxSessionTtlInSeconds ? bastion.maxSessionTtlInSeconds / 60 : ''}
              onChange={(event) => update({ maxSessionTtlInSeconds: Number(event.target.value) * 60 })}
              {...fieldErrorProps('lz-bastion-session-duration-error', durationError, 'lz-bastion-session-duration-help')} />
            <p id="lz-bastion-session-duration-help" style={s.help}>Limit how long each access session can stay open. Choose 30 to 180 minutes; the default is 60.</p>
            <FieldError id="lz-bastion-session-duration-error" error={durationError} />
          </div>
        </div>}
      </div>
    </section>
  );
}
