import { useRef, type CSSProperties } from 'react';
import type { LzModel, PlatformConfig } from '../model/types';
import type { DrDesignDraft } from '../services/disasterRecoveryDesign';
import { drOkeErrors, drOkePlatform, drOkeSubnets } from '../services/disasterRecoveryOke';
import { rebaseDrEnvironmentNetwork } from '../services/disasterRecoveryNetwork';
import { validateVcnCidr } from '../services/cidr';
import { oracle } from '../theme';
import OkeSettingsFields from './OkeSettingsFields';
import { DisasterRecoveryPlatformDetails } from './DisasterRecoverySourceDetails';

const field: CSSProperties = { display: 'block', margin: '12px 0 8px', fontSize: 14, fontWeight: 700 };
const input: CSSProperties = { boxSizing: 'border-box', width: '100%', padding: '9px 11px', font: 'inherit', fontSize: 14, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text };

export default function DisasterRecoveryOkePlatform({ model, draft, platformId, environmentId, onChange }: {
  model: LzModel; draft: DrDesignDraft; platformId: string; environmentId: string; onChange: (draft: DrDesignDraft) => void;
}) {
  const platform = drOkePlatform(model, draft, platformId);
  const env = model.environments.find((item) => item.id === environmentId);
  const lastValidCidr = useRef(platform?.vcnCidr);
  if (!platform || !env) return null;
  const id = `dr-oke-${platformId}`;
  const errors = drOkeErrors(model, draft, platformId, platform);
  const subnets = drOkeSubnets(platform);
  function update(patch: Partial<PlatformConfig>) {
    const next = { ...platform!, ...patch };
    if (patch.vcnCidr && !validateVcnCidr(patch.vcnCidr)) lastValidCidr.current = patch.vcnCidr;
    onChange({ ...draft,
      platformOkeParams: { ...draft.platformOkeParams, [platformId]: next.okeParams! },
      platformVcnCidrs: { ...draft.platformVcnCidrs, [platformId]: next.vcnCidr },
      platformSubnets: { ...draft.platformSubnets, [platformId]: next.subnets },
    });
  }
  return <DisasterRecoveryPlatformDetails model={model} platformId={platformId} environmentId={environmentId} vcnCidr={platform.vcnCidr}
    networkEditor={<>
      <label htmlFor={`${id}-vcn`} style={field}>VCN CIDR</label>
      <input id={`${id}-vcn`} aria-label={`OKE ${env.name} DR VCN CIDR`} style={input} value={platform.vcnCidr}
        aria-invalid={!!errors.length} aria-describedby={errors.length ? `${id}-errors` : undefined}
        onChange={(event) => {
          const vcnCidr = event.target.value;
          if (validateVcnCidr(vcnCidr)) update({ vcnCidr });
          else {
            const network = rebaseDrEnvironmentNetwork({ vcnCidr: lastValidCidr.current ?? platform.vcnCidr, subnets: platform.subnets }, vcnCidr);
            update({ vcnCidr, subnets: network.subnets });
          }
        }} />
      <details style={{ marginTop: 16 }}>
        <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Subnets in this VCN</summary>
        {subnets.map((subnet, index) => <div key={subnet.name}>
          <label htmlFor={`${id}-${subnet.name}`} style={field}>{subnet.name} subnet CIDR</label>
          <input id={`${id}-${subnet.name}`} aria-label={`OKE ${env.name} DR ${subnet.name} subnet CIDR`} style={input} value={subnet.cidr} readOnly={!!platform.okeParams?.clusterSize}
            onChange={(event) => update({ subnets: subnets.map((item, other) => other === index ? { ...item, cidr: event.target.value } : item) })} />
        </div>)}
      </details>
      {!!errors.length && <ul id={`${id}-errors`} style={{ fontSize: 13, lineHeight: 1.6, color: oracle.redDark }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
    </>}
    settingsEditor={<details style={{ marginTop: 20 }} aria-label="DR OKE cluster settings">
      <summary style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>OKE cluster configuration</summary>
      <OkeSettingsFields platform={{ ...platform, id }} onPlatform={update} />
    </details>} />;
}
