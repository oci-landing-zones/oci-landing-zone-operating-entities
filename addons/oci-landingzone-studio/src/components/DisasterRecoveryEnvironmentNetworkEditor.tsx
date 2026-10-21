import { useState } from 'react';
import type { EnvNetworkConfig, LzModel } from '../model/types';
import type { DrDesignDraft } from '../services/disasterRecoveryDesign';
import { drEnvironmentNetworkError, rebaseDrEnvironmentNetwork } from '../services/disasterRecoveryNetwork';
import { oracle } from '../theme';

export default function DisasterRecoveryEnvironmentNetworkEditor({ model, draft, environmentId, name, source, network, onApply, confirmationError }: {
  model: LzModel; draft: DrDesignDraft; environmentId: string; name: string; source: EnvNetworkConfig; network?: EnvNetworkConfig; onApply: (network: EnvNetworkConfig) => void; confirmationError?: string | null;
}) {
  const [value, setValue] = useState(network?.vcnCidr ?? '');
  const rebased = rebaseDrEnvironmentNetwork(network ?? source, value.trim());
  const error = confirmationError || drEnvironmentNetworkError(model, draft, `projects:${environmentId}`, rebased);
  const id = `dr-environment-cidr-${environmentId}`;
  return <div style={{ marginTop: 12 }}>
    <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>DR VCN CIDR</label>
    <input id={id} aria-label={`DR VCN CIDR for ${name}`} value={value} placeholder="e.g. 10.0.208.0/21" aria-invalid={!!value && !!error} aria-describedby={`${id}-help`}
      style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, padding: '9px 11px', border: `1px solid ${value && error ? oracle.redDark : oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, font: 'inherit', fontSize: 14 }}
      onChange={(event) => setValue(event.target.value)} />
    <p id={`${id}-help`} style={{ fontSize: 12.5, lineHeight: 1.6, color: value && error ? oracle.redDark : oracle.textMuted, margin: '8px 0' }}>{value && error ? error : 'Subnets move with the VCN range, keeping their sizes and relative offsets.'}</p>
    <button type="button" disabled={!!error} style={{ padding: '8px 12px', border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: oracle.surface, fontSize: 13, fontWeight: 700, cursor: error ? 'default' : 'pointer', opacity: error ? 0.5 : 1 }} onClick={() => onApply(rebased)}>Add Env</button>
  </div>;
}
