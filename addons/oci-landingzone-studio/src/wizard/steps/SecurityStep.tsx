import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWizard } from '../wizardContext';
import FieldError from '../../components/FieldError';
import { validateCloudGuard } from '../../services/cloudGuard';
import Switch from '../../components/Switch';
import InfoButton from '../../components/InfoButton';
import BastionSettings from './BastionSettings';
import { s } from './networkEditorStyles';
import { oracle } from '../../theme';

export default function SecurityStep() {
  const { model, setField, homeSource } = useWizard();
  const [zonesAdvancedOpen, setZonesAdvancedOpen] = useState(false);
  const f = model.foundation;
  const regional = f.stackScope === 'regional';
  const recipe1Foundation = regional && homeSource?.model ? homeSource.model.foundation : f;
  const sharedNetworkZone = recipe1Foundation.sharedNetworkSecurityZone !== false;
  const cloudGuardError = validateCloudGuard(model)[0] ?? null;

  return (
    <div style={s.col}>
      <section style={s.panel} aria-labelledby="security-baseline-title">
        <div style={s.accent} />
        <div style={s.body}>
          <h2 id="security-baseline-title" style={s.title}>Security baseline</h2>
          <p style={s.intro}>Choose the CIS level, configure private access and review Security Zones for each environment.</p>
          <div>
            <div className="studio-info-heading"><label style={s.label} htmlFor="lz-cis-level">CIS benchmark level</label>
              <InfoButton title="CIS benchmark level">
                <p><strong>Level 1 — Standard baseline.</strong> Reduces the attack surface with lower operational complexity. Studio includes the common IAM, network, security and monitoring controls without generating customer-managed encryption keys.</p>
                <p><strong>Level 2 — Stronger protection.</strong> Adds stricter controls and, in Studio, Vaults and customer-managed encryption keys for applicable resources. Your team must manage key access, rotation and recovery, and check workload compatibility.</p>
                <p><strong>How to choose:</strong> Prefer Level 2 when stronger protection or your organization’s requirements call for it and your team can operate the keys. Choose Level 1 when your organization accepts the less restrictive baseline in exchange for simpler operations. Validate the deployed configuration against the required benchmark.</p>
                <p><a className="guide-link" href="https://www.cisecurity.org/cis-benchmarks/cis-benchmarks-faq" target="_blank" rel="noreferrer">About CIS benchmark profiles</a></p>
              </InfoButton>
            </div>
            <select
              id="lz-cis-level"
              value={f.cisLevel}
              onChange={(e) => setField('foundation', { ...f, cisLevel: Number(e.target.value) as 1 | 2 })}
            >
              <option value={2}>Level 2</option>
              <option value={1}>Level 1</option>
            </select>
          </div>
        </div>
      </section>

      <section style={s.panel} aria-labelledby="security-zones-title">
        <div style={s.accent} />
        <div style={s.body}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 8 }}>
            <div className="studio-info-heading" style={{ marginBottom: 0 }}>
              <h2 id="security-zones-title" style={{ ...s.title, marginBottom: 0 }}>Security Zones</h2>
              <InfoButton title="Security Zones">
                <p><strong>Recipe 01</strong> applies to cmp-landingzone and its subcompartments. It is enabled by default and always uses the CIS level selected in Security baseline. Turn it off to omit this recipe and its zone; encryption and the baseline level stay unchanged.</p>
                <p><strong>Advanced</strong> lets you enable Recipe 02 for the shared network and Recipe 03 for selected environments. These additional zones are disabled by default in new designs.</p>
                <p>Manage these settings in the Home and Primary Studio configuration, and environment names in IAM.</p>
              </InfoButton>
            </div>
            <button type="button" aria-expanded={zonesAdvancedOpen} aria-controls="lz-security-zones-advanced"
              onClick={() => setZonesAdvancedOpen((open) => !open)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, minHeight: 44, padding: '10px 0 10px 12px', border: 0, background: 'transparent', color: oracle.ink, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ transform: zonesAdvancedOpen ? 'rotate(90deg)' : undefined }}><path d="m9 5 7 7-7 7" /></svg>
              Advanced
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '8px 0' }}>
            <h3 style={{ ...s.docH, margin: 0 }}>Recipe 01 — CIS Level {recipe1Foundation.cisLevel}</h3>
            {regional ? <span style={{ ...s.help, flex: '0 0 auto' }}>{recipe1Foundation.landingZoneSecurityZone !== false ? 'On' : 'Off'}</span> : <Switch
              checked={f.landingZoneSecurityZone !== false} ariaLabel="Enable Recipe 01 Security Zone" label={f.landingZoneSecurityZone !== false ? 'On' : 'Off'}
              onChange={(landingZoneSecurityZone) => setField('foundation', { ...f, landingZoneSecurityZone })} />}
          </div>
          {regional && <p style={{ ...s.help, marginTop: 6 }}>Security Zones are managed by the primary deployment. Change these settings in the primary deployment design.</p>}
          {regional && homeSource && !homeSource.model && <p style={s.help}>The Primary deployment design is unavailable. These Security Zone settings are from the last saved version.</p>}
          {regional && homeSource?.model && <Link to={`/lz/${encodeURIComponent(homeSource.id)}`} target="_blank" rel="noopener noreferrer"
            aria-label="Open primary deployment (opens in a new tab)" className="guide-link">Open primary deployment</Link>}
          <div id="lz-security-zones-advanced" hidden={!zonesAdvancedOpen} style={{ marginTop: 14 }}>
            <p style={s.help}>Optional additional Security Zones use their own recipes.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', marginTop: 10, borderTop: `1px solid ${oracle.border}` }}>
              <div>
                <h3 style={{ ...s.docH, margin: 0 }}>Recipe 02 — Shared network</h3>
                <p style={s.help}>Apply a separate Security Zone to cmp-lz-network.</p>
              </div>
              {regional ? <span style={{ ...s.help, flex: '0 0 auto' }}>{sharedNetworkZone ? 'On' : 'Off'}</span> : <Switch
                checked={sharedNetworkZone} ariaLabel="Security zone for shared network" label={sharedNetworkZone ? 'On' : 'Off'}
                onChange={(sharedNetworkSecurityZone) => setField('foundation', { ...f, sharedNetworkSecurityZone })} />}
            </div>
            {model.environments.length ? <ul aria-label="Environment Security Zones" style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>
              {model.environments.map((env, index) => <li key={env.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderTop: `1px solid ${oracle.border}` }}>
                <span style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere', minWidth: 0 }}>{`Recipe 03 — ${env.name || `Environment ${index + 1}`}`}</span>
                {regional ? <span style={{ ...s.help, flex: '0 0 auto' }}>{env.securityZone ? 'On' : 'Off'}</span> : <Switch
                  checked={env.securityZone}
                  onChange={(securityZone) => setField('environments', model.environments.map((current) => current.id === env.id ? { ...current, securityZone } : current))}
                  label={env.securityZone ? 'On' : 'Off'}
                  ariaLabel={`Security zone for ${env.name || `environment ${index + 1}`}`}
                />}
              </li>)}
            </ul> : <p style={s.help}>{regional ? 'No environments in the primary deployment design.' : 'Add environments in IAM to configure Security Zones.'}</p>}
          </div>
        </div>
      </section>

      <section style={s.panel} aria-labelledby="security-cloud-guard-title">
        <div style={s.accent} />
        <div style={s.body}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div className="studio-info-heading">
              <h2 id="security-cloud-guard-title" style={s.title}>Cloud Guard</h2>
              <InfoButton title="Cloud Guard">
                <p>Oracle Cloud Guard monitors your OCI security posture, detecting resource misconfigurations and risky activity across subscribed regions. It provides security findings and recommendations to help your team investigate and resolve issues.</p>
                <p><strong>No additional service charge:</strong> configuration and activity monitoring for supported OCI services is free in a paid OCI tenancy.</p>
                <p><a className="guide-link" href="https://www.oracle.com/security/cloud-security/cloud-guard/" target="_blank" rel="noreferrer">Explore Oracle Cloud Guard</a></p>
              </InfoButton>
            </div>
            {!regional && <Switch checked={f.cloudGuardEnabled !== false} ariaLabel="Enable Cloud Guard"
              label={f.cloudGuardEnabled !== false ? 'On' : 'Off'}
              onChange={(cloudGuardEnabled) => setField('foundation', { ...f, cloudGuardEnabled, cloudGuardExistingConfirmed: false })} />}
          </div>
          <p style={s.intro}>{regional ? 'Cloud Guard is managed by the primary deployment. Configure it in the primary deployment design.'
            : 'Include Cloud Guard to monitor security risks in your tenancy. Exclude it when it is already managed outside this deployment.'}</p>
          {!regional && f.cloudGuardEnabled === false && <>
            <label htmlFor="existing-cloud-guard" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
              <input id="existing-cloud-guard" type="checkbox" checked={f.cloudGuardExistingConfirmed === true}
                aria-describedby={`existing-cloud-guard-help${cloudGuardError ? ' existing-cloud-guard-error' : ''}`}
                aria-invalid={!!cloudGuardError}
                onChange={(event) => setField('foundation', { ...f, cloudGuardExistingConfirmed: event.target.checked })} />
              Cloud Guard is already enabled in this tenancy and managed outside this deployment.
            </label>
            <p id="existing-cloud-guard-help" style={{ ...s.help, marginTop: 8 }}>Security Zones require Cloud Guard, including the landing zone baseline zones. This choice omits Cloud Guard configuration and its dedicated event rule and notification topic from the generated files. Review the Terraform plan when updating an existing deployment.</p>
            <FieldError id="existing-cloud-guard-error" error={cloudGuardError} />
          </>}
        </div>
      </section>

      <BastionSettings />
    </div>
  );
}
