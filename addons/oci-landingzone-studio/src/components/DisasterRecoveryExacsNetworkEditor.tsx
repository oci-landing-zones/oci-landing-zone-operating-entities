import { useRef, useState, type CSSProperties } from 'react';
import type { EnvNetworkConfig, LzModel, Subnet } from '../model/types';
import type { DrDesignDraft } from '../services/disasterRecoveryDesign';
import { drExacsNetworkError } from '../services/disasterRecoveryNetwork';
import { oracle } from '../theme';
import { exacsPreviewSubnets } from '../services/exadata';
import { parseCidr, shiftCidr, validateSubnetCidr, validateVcnCidr } from '../services/cidr';

const inputStyle: CSSProperties = { boxSizing: 'border-box', width: '100%', padding: '9px 11px', font: 'inherit', fontSize: 14, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text };

export default function DisasterRecoveryExacsNetworkEditor({ model, draft, platformId, environmentName, cidr, subnets: initialSubnets, onApply }: {
  model: LzModel; draft: DrDesignDraft; platformId: string; environmentName: string; cidr: string; subnets?: Subnet[]; onApply: (network: EnvNetworkConfig) => void;
}) {
  const [value, setValue] = useState(cidr);
  const [subnets, setSubnets] = useState(() => initialSubnets ?? exacsPreviewSubnets(cidr));
  const lastValidVcn = useRef(validateVcnCidr(cidr) ? null : cidr);
  const error = drExacsNetworkError(model, draft, platformId, value.trim(), subnets);
  const id = `dr-exacs-cidr-${platformId}`;
  function saveNetwork() {
    if (!error) onApply({ vcnCidr: value.trim(), subnets });
  }
  function changeVcn(next: string) {
    if (!validateVcnCidr(next)) {
      if (lastValidVcn.current) {
        const delta = parseCidr(next)!.start - parseCidr(lastValidVcn.current)!.start;
        if (delta) setSubnets((current) => current.map((subnet) => ({ ...subnet, cidr: shiftCidr(subnet.cidr, delta) ?? subnet.cidr })));
      } else if (!subnets.length) setSubnets(exacsPreviewSubnets(next));
      lastValidVcn.current = next;
    }
    setValue(next);
  }
  return <div style={{ marginTop: 16 }}>
    <label htmlFor={id} style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 700 }}>VCN CIDR</label>
    <input id={id} aria-label={`EXACS ${environmentName} DR VCN CIDR`} value={value} aria-invalid={!!error} aria-describedby={`${id}-help`}
      style={inputStyle} onChange={(event) => changeVcn(event.target.value)} onBlur={saveNetwork} />
    <details open style={{ marginTop: 16 }}>
      <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Subnets in this VCN</summary>
      {subnets.map((subnet, index) => {
        const subnetError = validateSubnetCidr(subnet.cidr, value, subnets.filter((_, other) => other !== index));
        const subnetId = `${id}-${subnet.name}`;
        return <div key={subnet.name} style={{ marginTop: 12 }}>
          <label htmlFor={subnetId} style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{subnet.name === 'db' ? 'Database subnet CIDR' : 'Backup subnet CIDR'}</label>
          <input id={subnetId} aria-label={`EXACS ${environmentName} DR ${subnet.name} subnet CIDR`} value={subnet.cidr} style={inputStyle} aria-invalid={!!subnetError}
            aria-describedby={subnetError ? `${subnetId}-error` : undefined} onChange={(event) => setSubnets((current) => current.map((item, other) => index === other ? { ...item, cidr: event.target.value } : item))} onBlur={saveNetwork} />
          {subnetError && <p id={`${subnetId}-error`} style={{ margin: '6px 0 0', fontSize: 12.5, color: oracle.redDark }}>{subnetError}</p>}
        </div>;
      })}
    </details>
    <p id={`${id}-help`} style={{ margin: '12px 0', color: error ? oracle.redDark : oracle.textMuted, fontSize: 12.5, lineHeight: 1.6 }}>{error ?? 'Valid changes are saved when you leave a field. Moving the VCN keeps subnet sizes and relative offsets.'}</p>
  </div>;
}
