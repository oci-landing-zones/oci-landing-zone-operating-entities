import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { LzModel, HubKind } from '../model/types';
import { createDrHubNetwork, defaultDrPlatformCidrs, drNetworkOptions, drRegionOptions, type DrDesignDraft, type DrNetworkOption } from '../services/disasterRecoveryDesign';
import { HUB_KINDS, getHubKind } from '../services/hubKinds';
import { oracle } from '../theme';
import DisasterRecoverySourceDetails, { DisasterRecoveryCommonDetails, DisasterRecoveryPlatformDetails, DisasterRecoveryExacsVmcDetails, DisasterRecoveryRegionDetails, DisasterRecoverySharedInfrastructureDetails, type SourceDetailsPart } from './DisasterRecoverySourceDetails';
import DisasterRecoveryNetworkDiagram from './DisasterRecoveryNetworkDiagram';
import DisasterRecoveryHubEditor from './DisasterRecoveryHubEditor';
import DisasterRecoveryEnvironments from './DisasterRecoveryEnvironments';
import { generatorNames } from '../services/generatorNaming';
import DisasterRecoveryObservability from './DisasterRecoveryObservability';
import DisasterRecoveryIncludeButton from './DisasterRecoveryIncludeButton';
import DisasterRecoveryExacsNetworkEditor from './DisasterRecoveryExacsNetworkEditor';
import DisasterRecoveryOcvsNetworkEditor from './DisasterRecoveryOcvsNetworkEditor';
import DisasterRecoveryOcvsSettingsEditor from './DisasterRecoveryOcvsSettingsEditor';
import DisasterRecoveryOkePlatform from './DisasterRecoveryOkePlatform';
import { drPlatformNotificationScopes } from '../services/disasterRecoveryNotifications';

const input: CSSProperties = { boxSizing: 'border-box', width: '100%', padding: '10px 12px', font: 'inherit', fontSize: 14, color: oracle.text, background: oracle.surface, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4 };
const label: CSSProperties = { display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 };
const help: CSSProperties = { fontSize: 13, color: oracle.textMuted, lineHeight: 1.6, margin: '8px 0 0' };
const section: CSSProperties = { borderTop: `1px solid ${oracle.border}`, paddingTop: 20, marginTop: 24 };

function NetworkChoices({ options, selected, onChange, title, hint, targetCidrs, renderOption }: {
  options: DrNetworkOption[]; selected: string[]; onChange: (ids: string[]) => void; title: string; hint: string; targetCidrs?: Record<string, string>; renderOption?: (option: DrNetworkOption) => ReactNode;
}) {
  return <fieldset style={{ border: 0, padding: 0, margin: '20px 0 0', minWidth: 0 }}>
    <legend style={{ fontSize: 15, fontWeight: 700, padding: 0 }}>{title}</legend>
    <p style={help}>{hint}</p>
    {!options.length && <p style={help}>No matching networks or platforms in the home configuration.</p>}
    {options.map((option) => <div key={option.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: `1px solid ${oracle.border}`, fontSize: 14, lineHeight: 1.6 }}>
      <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
        {renderOption?.(option) ?? <>
        <strong>{option.scope} · {option.name}</strong>
        {option.type !== 'One-OE' && <span style={{ display: 'block', color: oracle.textMuted }}>{option.type}</span>}
        {option.note && <span style={{ display: 'block', color: oracle.textMuted }}>{option.note}</span>}
        {targetCidrs && option.vcnCidr && selected.includes(option.id) && <span style={{ display: 'block', fontWeight: 700 }}>{targetCidrs[option.id] ? `DR VCN: ${targetCidrs[option.id]}` : 'DR CIDR pending'}</span>}
        {!option.available && <span style={{ display: 'block', color: oracle.textMuted }}>Complete this platform in the home design before selecting it.</span>}
        </>}
      </div>
      <DisasterRecoveryIncludeButton included={selected.includes(option.id)} resourceName={`${option.type} ${option.scope} platform`} disabled={!option.available}
        onClick={() => onChange(selected.includes(option.id) ? selected.filter((id) => id !== option.id) : [...selected, option.id])} />
    </div>)}
  </fieldset>;
}

function Comparison({ home, dr, regionHeading = false, drAction }: { home: ReactNode; dr: ReactNode; regionHeading?: boolean; drAction?: ReactNode }) {
  return <div className="studio-dr-configuration-grid">
    <section className="studio-dr-panel studio-dr-home" aria-label="Home region">
      {regionHeading ? <h4 className="studio-dr-panel-heading" style={{ fontSize: 18 }}>Home region</h4> : <h6 className="studio-dr-panel-heading" style={{ fontSize: 14 }}>Home region</h6>}
      {home}
    </section>
    <section className="studio-dr-panel studio-dr-target" aria-label="DR region">
      {regionHeading ? <h4 className="studio-dr-panel-heading" style={{ fontSize: 18 }}>DR region{drAction}</h4> : <h6 className="studio-dr-panel-heading" style={{ fontSize: 14 }}>DR region</h6>}
      {dr}
    </section>
  </div>;
}

export default function DisasterRecoveryConfiguration({ name, model, sourceLabel, draft, onChange }: {
  name: string; model: LzModel; sourceLabel: string; draft: DrDesignDraft; onChange: (draft: DrDesignDraft) => void;
}) {
  const networks = useMemo(() => drNetworkOptions(model), [model]);
  const optionalPlatforms = networks.platforms.filter((platform) => !platform.inheritedInfrastructure);
  const hasInheritedInfrastructure = networks.platforms.some((platform) => platform.inheritedInfrastructure);
  const platformVcnCidrs = { ...defaultDrPlatformCidrs(model, draft), ...draft.platformVcnCidrs };
  for (const [id, cidr] of Object.entries(defaultDrPlatformCidrs(model, draft))) {
    if (cidr === '10.0.240.0/21' && platformVcnCidrs[id] === '10.0.240.0/22') platformVcnCidrs[id] = cidr;
  }
  const [regionChoice, setRegionChoice] = useState(draft.region);
  const regions = drRegionOptions(model);
  const region = regions.find((item) => item.id === draft.region);
  const homeDetails = (part: SourceDetailsPart) => <DisasterRecoverySourceDetails name={name} model={model} sourceLabel={sourceLabel} showCommonDetails={false} part={part} />;
  return <>
    <style>{`
      .studio-dr-configuration-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: stretch; }
      .studio-dr-panel { min-width: 0; padding: 20px; border: 1px solid ${oracle.border}; border-radius: 12px; background: ${oracle.surface}; }
      .studio-dr-home { background: ${oracle.surfaceAlt}; }
      .studio-dr-panel-heading { margin: -20px -20px 20px; padding: 14px 20px; border-bottom: 1px solid ${oracle.border}; border-radius: 11px 11px 0 0; color: ${oracle.ink}; }
      .studio-dr-target > .studio-dr-panel-heading { background: ${oracle.redTint}; color: ${oracle.redDark}; }
      .studio-dr-common { padding: 20px; border: 1px solid ${oracle.border}; border-radius: 12px; background: ${oracle.surfaceAlt}; }
      .studio-dr-common > div { max-width: 760px; }
      @media (max-width: 760px) {
        .studio-dr-configuration-grid { grid-template-columns: minmax(0, 1fr); }
      }
    `}</style>
    <section className="studio-dr-common" aria-label="Landing Zone details">
      <div><DisasterRecoveryCommonDetails name={name} model={model} sourceLabel={sourceLabel} /></div>
    </section>
    <section aria-labelledby="dr-regions-title" style={section}>
      <h3 id="dr-regions-title" style={{ margin: '0 0 20px', fontSize: 22 }}>Regions</h3>
      <Comparison regionHeading home={homeDetails('regions')}
        drAction={draft.regionConfirmed && region ? <button type="button" style={{ float: 'right', padding: 0, border: 0, background: 'transparent', color: oracle.redDark, font: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setRegionChoice(draft.region); onChange({ ...draft, regionConfirmed: false }); }}>Edit region</button> : undefined}
        dr={draft.regionConfirmed && region ? <DisasterRecoveryRegionDetails label="DR region" region={region.id} shortName={region.shortName} /> : <>
        <label htmlFor="dr-target-region" style={label}>Disaster Recovery region</label>
        <p id="dr-target-region-help" style={{ ...help, margin: '0 0 12px' }}>Choose a different region in {model.foundation.realm}, the same realm as the home region.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <select id="dr-target-region" style={{ ...input, minWidth: 0, flex: 1 }} value={regionChoice} aria-describedby="dr-target-region-help" onChange={(event) => setRegionChoice(event.target.value)}>
          <option value="">Select a DR region</option>
          {regions.map((item) => <option key={item.id} value={item.id}>{item.id} ({item.shortName.toUpperCase()})</option>)}
        </select>
        <button type="button" disabled={!regionChoice} style={{ padding: '10px 16px', border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: oracle.surface, font: 'inherit', fontSize: 14, fontWeight: 700, cursor: regionChoice ? 'pointer' : 'default', opacity: regionChoice ? 1 : 0.5 }} onClick={() => onChange({ ...draft, region: regionChoice, regionConfirmed: true })}>Select</button>
        </div>
      </>} />
    </section>
    <section aria-labelledby="dr-network-title" style={section}>
      <h3 id="dr-network-title" style={{ margin: '0 0 20px', fontSize: 22 }}>Network</h3>
      <section aria-labelledby="dr-one-oe-title">
        <h4 id="dr-one-oe-title" style={{ margin: '0 0 20px', fontSize: 18 }}>One-OE blueprint</h4>
        <Comparison home={<>
          <section aria-label="Home Hub">
            <h5 style={{ margin: '0 0 16px', fontSize: 16 }}>Hub</h5>
            {homeDetails('hub')}
          </section>
          <section aria-label="Home Projects VCNs" style={section}>
            <h5 style={{ margin: '0 0 16px', fontSize: 16 }}>Environments</h5>
            <DisasterRecoveryEnvironments model={model} />
          </section>
        </>} dr={<>
          <section aria-label="DR Hub">
            <h5 style={{ margin: '0 0 16px', fontSize: 16 }}>Hub
              {draft.hubAdded && <button type="button" style={{ float: 'right', padding: 0, border: 0, background: 'transparent', color: oracle.redDark, font: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onChange({ ...draft, hubAdded: false })}>Edit hub</button>}
            </h5>
            {draft.hubAdded && draft.hubNetwork ? <DisasterRecoverySourceDetails name={name} sourceLabel={sourceLabel} part="hub" showCommonDetails={false}
              model={{ ...model, network: { ...draft.hubNetwork, hubKind: draft.hubKind } }} /> : <>
            <label htmlFor="dr-target-hub" style={label}>DR hub</label>
            <select id="dr-target-hub" style={input} value={draft.hubKind} aria-describedby="dr-target-hub-help" onChange={(event) => {
              const hubKind = event.target.value as HubKind;
              onChange({ ...draft, hubKind, ...(draft.hubNetwork ? { hubNetwork: createDrHubNetwork(hubKind, draft.hubNetwork) } : {}) });
            }}>
              {HUB_KINDS.filter((hub) => hub.implemented).map((hub) => <option key={hub.id} value={hub.id}>{hub.label}</option>)}
            </select>
            <p id="dr-target-hub-help" style={help}>{getHubKind(draft.hubKind)?.description}</p>
            {draft.hubNetwork ? <DisasterRecoveryHubEditor network={draft.hubNetwork} onChange={(hubNetwork) => onChange({ ...draft, hubNetwork })} onAdd={() => onChange({ ...draft, hubAdded: true })} />
              : <button type="button" style={{ marginTop: 16, padding: '9px 16px', border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: oracle.surface, font: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={() => onChange({ ...draft, hubNetwork: createDrHubNetwork(draft.hubKind) })}>Configure hub</button>}
            </>}
          </section>
          <section aria-label="DR Projects VCNs" style={section}>
            <h5 style={{ margin: '0 0 16px', fontSize: 16 }}>Environments</h5>
            <DisasterRecoveryEnvironments model={model} draft={draft} onChange={onChange} />
          </section>
        </>} />
      </section>
      <section aria-labelledby="dr-rpc-title" style={section}>
        <h4 id="dr-rpc-title" style={{ margin: '0 0 12px', fontSize: 18 }}>RPC</h4>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ ...label, marginBottom: 12 }}>Configure an RPC between the Home and DR DRGs?</legend>
          <p id="dr-rpc-help" style={{ ...help, margin: '0 0 16px' }}>A Remote Peering Connection links the two regional DRGs for private connectivity between the Home and DR networks.</p>
          <div style={{ display: 'flex', gap: 24, marginBottom: draft.rpcEnabled ? 20 : 0 }}>
            {[{ label: 'No', value: false }, { label: 'Yes', value: true }].map((option) => <label key={option.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="radio" name="dr-rpc-enabled" value={String(option.value)} checked={!!draft.rpcEnabled === option.value} aria-describedby="dr-rpc-help" onChange={() => onChange({ ...draft, rpcEnabled: option.value })} />
              {option.label}
            </label>)}
          </div>
        </fieldset>
        {draft.rpcEnabled && <Comparison home={<>
          <DisasterRecoveryRegionDetails label="Home region" region={model.foundation.region} shortName={model.foundation.regionShortName} />
          <p style={{ ...help, marginTop: 16 }}>DRG: <strong style={{ color: oracle.text }}>{generatorNames.hubDrg(model.foundation.regionShortName)}</strong></p>
        </>} dr={region ? <>
          <DisasterRecoveryRegionDetails label="DR region" region={region.id} shortName={region.shortName} />
          <p style={{ ...help, marginTop: 16 }}>DRG: <strong style={{ color: oracle.text }}>{generatorNames.hubDrg(region.shortName)}</strong></p>
        </> : <p style={help}>Select a DR region to identify its DRG.</p>} />}
      </section>
      <section aria-labelledby="dr-platforms-title" style={section}>
        <h4 id="dr-platforms-title" style={{ margin: '0 0 20px', fontSize: 18 }}>Workload Extensions (Platforms)</h4>
        {networks.platforms.length ? <Comparison home={homeDetails('platforms')} dr={<>
          {hasInheritedInfrastructure && <section aria-label="DR inherited shared infrastructure">
            <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>Shared platforms</h3>
            <p style={{ ...help, margin: '0 0 12px' }}>Shared compartments inherited from Home. These values are read-only.</p>
            <DisasterRecoverySharedInfrastructureDetails model={model} selectedIds={draft.platformIds}
              onToggle={(id) => onChange({ ...draft, platformIds: draft.platformIds.includes(id) ? draft.platformIds.filter((item) => item !== id) : [...draft.platformIds, id] })} />
          </section>}
          {!!optionalPlatforms.length && <NetworkChoices title="Environment platforms" hint="Include platforms already present in the home configuration."
            renderOption={(option) => option.type === 'EXACS' && option.environmentId ? <DisasterRecoveryExacsVmcDetails model={model} environmentId={option.environmentId} vcnCidr={platformVcnCidrs[option.id]}
              networkEditor={<DisasterRecoveryExacsNetworkEditor model={model} draft={draft} platformId={option.id} environmentName={option.scope} cidr={platformVcnCidrs[option.id] ?? ''} subnets={draft.platformSubnets?.[option.id]}
                onApply={(network) => onChange({ ...draft, platformVcnCidrs: { ...platformVcnCidrs, [option.id]: network.vcnCidr }, platformSubnets: { ...draft.platformSubnets, [option.id]: network.subnets } })} />} /> : option.type === 'OCVS' ? <DisasterRecoveryPlatformDetails model={model} platformId={option.id} environmentId={option.environmentId} vcnCidr={platformVcnCidrs[option.id] ?? ''}
              settingsEditor={<DisasterRecoveryOcvsSettingsEditor model={model} draft={draft} platformId={option.id} environmentId={option.environmentId} onChange={onChange} />}
              networkEditor={<DisasterRecoveryOcvsNetworkEditor model={model} draft={draft} platformId={option.id} environmentName={option.scope} cidr={platformVcnCidrs[option.id] ?? ''}
                onApply={(cidr) => onChange({ ...draft, platformVcnCidrs: { ...platformVcnCidrs, [option.id]: cidr } })} />} /> : option.type === 'OKE' && option.environmentId ? <DisasterRecoveryOkePlatform model={model} draft={draft} platformId={option.id} environmentId={option.environmentId} onChange={onChange} /> : null}
            targetCidrs={platformVcnCidrs} options={optionalPlatforms} selected={draft.platformIds} onChange={(ids) => onChange({ ...draft, platformIds: ids, platformVcnCidrs })} />}
        </>} />
          : <p style={help}>No platforms configured.</p>}
      </section>
      <DisasterRecoveryNetworkDiagram model={model} draft={draft} />
      <p style={{ ...help, marginTop: 24 }}>Home CIDRs are shown for reference. DR projects and platforms address ranges will be configured separately.</p>
    </section>
    <section aria-labelledby="dr-observability-title" style={section}>
      <h3 id="dr-observability-title" style={{ margin: '0 0 20px', fontSize: 22 }}>Observability</h3>
      <Comparison home={homeDetails('notifications')} dr={<DisasterRecoveryObservability
        notifications={draft.notifications ?? { default: '', cloudguard: '', iam: '', network: '', security: '', ...model.foundation.notifications }}
        platformScopes={drPlatformNotificationScopes(model, draft)}
        onPlatformChange={(id, key, value) => onChange({ ...draft, platformNotificationEmails: { ...draft.platformNotificationEmails, [id]: { ...draft.platformNotificationEmails?.[id], [key]: value } } })}
        onChange={(notifications) => onChange({ ...draft, notifications })} />} />
    </section>
  </>;
}
