import { useState } from 'react';
import type { LzModel } from '../model/types';
import type { DrDesignDraft } from '../services/disasterRecoveryDesign';
import { drOcvsNetworkError } from '../services/disasterRecoveryNetwork';
import { ocvsDefaultSubnets } from '../services/platforms';
import { oracle } from '../theme';

export default function DisasterRecoveryOcvsNetworkEditor({ model, draft, platformId, environmentName, cidr, onApply }: {
  model: LzModel; draft: DrDesignDraft; platformId: string; environmentName: string; cidr: string; onApply: (cidr: string) => void;
}) {
  const [value, setValue] = useState(cidr);
  const error = drOcvsNetworkError(model, draft, platformId, value.trim());
  const id = `dr-ocvs-cidr-${platformId}`;
  return <div style={{ marginTop: 16 }}>
    <label htmlFor={id} style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 700 }}>VCN CIDR</label>
    <input id={id} aria-label={`OCVS ${environmentName} DR VCN CIDR`} value={value} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      style={{ boxSizing: 'border-box', width: '100%', padding: '9px 11px', font: 'inherit', fontSize: 14, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text }}
      onChange={(event) => setValue(event.target.value)} onBlur={() => { if (!error) onApply(value.trim()); }} />
    {!error && <details style={{ marginTop: 16 }}>
      <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Subnets in this VCN</summary>
      {ocvsDefaultSubnets(value.trim()).map((subnet) => <p key={subnet.name} style={{ fontSize: 14 }}>Provisioning subnet: <strong>{subnet.cidr}</strong></p>)}
    </details>}
    {error && <p id={`${id}-error`} style={{ margin: '12px 0', color: oracle.redDark, fontSize: 12.5, lineHeight: 1.6 }}>{error}</p>}
  </div>;
}
