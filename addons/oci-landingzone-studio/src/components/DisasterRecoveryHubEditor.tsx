import { useEffect, useRef, type CSSProperties } from 'react';
import type { DrDesignDraft } from '../services/disasterRecoveryDesign';
import { parseCidr, shiftCidr, validateSubnetCidr, validateVcnCidr } from '../services/cidr';
import { oracle } from '../theme';

type HubNetwork = NonNullable<DrDesignDraft['hubNetwork']>;
const input: CSSProperties = { boxSizing: 'border-box', width: '100%', minWidth: 0, padding: '9px 12px', font: 'inherit', fontSize: 14, color: oracle.text, background: oracle.surface, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4 };
const errorStyle: CSSProperties = { color: oracle.redDark, fontSize: 13, lineHeight: 1.5, margin: '6px 0 0' };

export default function DisasterRecoveryHubEditor({ network, onChange, onAdd }: { network: HubNetwork; onChange: (network: HubNetwork) => void; onAdd: () => void }) {
  const vcnError = validateVcnCidr(network.hubVcnCidr);
  const invalid = !!vcnError || network.subnets.some((subnet, index) => validateSubnetCidr(subnet.cidr, network.hubVcnCidr, network.subnets.filter((_, other) => other !== index)));
  const lastValid = useRef(vcnError ? null : network.hubVcnCidr);
  useEffect(() => { if (!vcnError) lastValid.current = network.hubVcnCidr; }, [network.hubVcnCidr, vcnError]);
  function changeVcn(value: string) {
    const previous = lastValid.current;
    const delta = previous && !validateVcnCidr(value) ? parseCidr(value)!.start - parseCidr(previous)!.start : 0;
    onChange({ hubVcnCidr: value, subnets: network.subnets.map((subnet) => ({ ...subnet, cidr: delta ? shiftCidr(subnet.cidr, delta) ?? subnet.cidr : subnet.cidr })) });
  }
  return <section aria-label="DR hub VCN configuration" style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${oracle.border}` }}>
    <label htmlFor="dr-hub-vcn" style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>VCN CIDR</label>
    <input id="dr-hub-vcn" style={input} value={network.hubVcnCidr} aria-invalid={!!vcnError} aria-describedby={vcnError ? 'dr-hub-vcn-error' : 'dr-hub-vcn-help'} onChange={(event) => changeVcn(event.target.value)} />
    {vcnError ? <p id="dr-hub-vcn-error" style={errorStyle}>{vcnError}</p> : <p id="dr-hub-vcn-help" style={{ fontSize: 13, color: oracle.textMuted, lineHeight: 1.6, margin: '8px 0 0' }}>Changing the VCN range moves its subnets by the same offset.</p>}
    <details open style={{ marginTop: 16 }}>
      <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Subnets in this VCN</summary>
      {network.subnets.map((subnet, index) => {
        const error = validateSubnetCidr(subnet.cidr, network.hubVcnCidr, network.subnets.filter((_, other) => other !== index));
        const id = `dr-hub-subnet-${index}`;
        return <div key={subnet.name} style={{ marginTop: 12 }}>
          <label htmlFor={id} style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>{subnet.name}</label>
          <input id={id} style={input} value={subnet.cidr} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange({ ...network, subnets: network.subnets.map((item, other) => other === index ? { ...item, cidr: event.target.value } : item) })} />
          {error && <p id={`${id}-error`} style={errorStyle}>{error}</p>}
        </div>;
      })}
    </details>
    <button type="button" disabled={invalid} style={{ marginTop: 20, padding: '9px 16px', border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: oracle.surface, font: 'inherit', fontSize: 14, fontWeight: 700, cursor: invalid ? 'default' : 'pointer', opacity: invalid ? 0.5 : 1 }} onClick={onAdd}>Add hub</button>
  </section>;
}
