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
  const f = model.foundation;
  const regional = f.stackScope === 'regional';
  const recipe1Foundation = regional && homeSource?.model ? homeSource.model.foundation : f;
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
              <InfoButton title="CIS benchmark level"><p>Both levels use the landing zone's security baseline. Level 2 also prepares customer-managed encryption keys.</p><p>Choose the level required by your organization. Review the generated security settings before deployment.</p></InfoButton>
            </div>
            <select
              id="lz-cis-level"
              value={f.cisLevel}
              onChange={(e) => setField('foundation', { ...f, cisLevel: Number(e.target.value) as 1 | 2 })}
              aria-describedby="lz-cis-level-help"
            >
              <option value={2}>Level 2</option>
              <option value={1}>Level 1</option>
            </select>
            <div id="lz-cis-level-help" style={{ ...s.help, marginTop: 6 }}>Level 2 adds customer-managed encryption keys to the Level 1 security baseline.</div>
          </div>
        </div>
      </section>

      <section style={s.panel} aria-labelledby="security-zones-title">
        <div style={s.accent} />
        <div style={s.body}>
          <div className="studio-info-heading">
            <h2 id="security-zones-title" style={s.title}>Security Zones</h2>
            <InfoButton title="Security Zones"><p>A Security Zone applies additional restrictions to an environment. Check that those restrictions suit its workloads before enabling it.</p><p>Environment names are managed in Foundation. Security Zones are created and managed by the Home Region deployment.</p></InfoButton>
          </div>
          <p style={s.intro}>{regional
            ? 'Security Zones are managed in the Home Region. Configure them in the Home Region design.'
            : 'Apply stricter security controls to the environments that need them.'}</p>
          <label style={s.label} htmlFor="lz-recipe1-cis-level">Recipe 01 — CIS level</label>
          <select id="lz-recipe1-cis-level" disabled={regional}
            value={recipe1Foundation.securityZoneRecipe1CisLevel ?? recipe1Foundation.cisLevel}
            aria-describedby="lz-recipe1-cis-help"
            onChange={(event) => setField('foundation', { ...f, securityZoneRecipe1CisLevel: Number(event.target.value) as 1 | 2 })}>
            <option value={1}>CIS Level 1</option>
            <option value={2}>CIS Level 2</option>
          </select>
          <p id="lz-recipe1-cis-help" style={{ ...s.help, marginTop: 6 }}>{regional
            ? 'Recipe 01 is managed in the Home Region design.'
            : 'Recipe 01 follows Security baseline until you choose another level. This changes Recipe 01 restrictions; encryption and other recipes keep the baseline level.'}</p>
          {!regional && f.securityZoneRecipe1CisLevel !== undefined && <button type="button" style={s.addBtn}
            id="lz-recipe1-use-baseline"
            onClick={() => { const { securityZoneRecipe1CisLevel: _level, ...foundation } = f; setField('foundation', foundation); }}>Use baseline level (CIS {f.cisLevel})</button>}
          {regional && homeSource && !homeSource.model && <p style={s.help}>The Home Region design is unavailable. These Security Zone settings are from the last saved version.</p>}
          {regional && homeSource?.model && <Link to={`/lz/${encodeURIComponent(homeSource.id)}`} target="_blank" rel="noopener noreferrer"
            aria-label="Open Home Region (opens in a new tab)" className="guide-link">Open Home Region</Link>}
          {model.environments.length ? <ul aria-label="Environment Security Zones" style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>
            {model.environments.map((env, index) => <li key={env.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderTop: `1px solid ${oracle.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere', minWidth: 0 }}>{env.name || `Environment ${index + 1}`}</span>
              {regional ? <span style={{ ...s.help, flex: '0 0 auto' }}>{env.securityZone ? 'On' : 'Off'}</span> : <Switch
                checked={env.securityZone}
                onChange={(securityZone) => setField('environments', model.environments.map((current) => current.id === env.id ? { ...current, securityZone } : current))}
                label={env.securityZone ? 'On' : 'Off'}
                ariaLabel={`Security zone for ${env.name || `environment ${index + 1}`}`}
              />}
            </li>)}
          </ul> : <p style={s.help}>{regional ? 'No environments in the Home Region design.' : 'Add environments in Foundation to configure Security Zones.'}</p>}
        </div>
      </section>

      <section style={s.panel} aria-labelledby="security-cloud-guard-title">
        <div style={s.accent} />
        <div style={s.body}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <h2 id="security-cloud-guard-title" style={s.title}>Cloud Guard</h2>
            {!regional && <Switch checked={f.cloudGuardEnabled !== false} ariaLabel="Enable Cloud Guard"
              label={f.cloudGuardEnabled !== false ? 'On' : 'Off'}
              onChange={(cloudGuardEnabled) => setField('foundation', { ...f, cloudGuardEnabled, cloudGuardExistingConfirmed: false })} />}
          </div>
          <p style={s.intro}>{regional ? 'Cloud Guard is managed in the Home Region. Configure it in the Home Region design.'
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
