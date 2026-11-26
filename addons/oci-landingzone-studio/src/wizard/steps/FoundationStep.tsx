/**
 * FoundationStep — step 1 inputs: realm / Home, Primary and Secondary regions. Writes straight into the
 * canonical model via the wizard context; the diagram and JSON re-derive.
 */

import React, { useState } from 'react';
import { useWizard } from '../wizardContext';
import FieldError from '../../components/FieldError';
import InfoButton from '../../components/InfoButton';
import { fieldErrorProps } from '../../services/fieldErrors';
import { oracle } from '../../theme';
import {
  findRegion, getDefaultRegionForRealm, getRegionsForRealm, REALM_OPTIONS,
} from '../../services/regions';
import { foundationDeploymentStacks } from '../../services/deploymentTopology';
import type { FoundationConfig } from '../../model/types';
import { s as form } from './networkEditorStyles';

const s: Record<string, React.CSSProperties> = {
  col:     form.col,
  panel:   form.panel,
  accent:  { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' },
  body:    { padding: 20 },
  title:   form.title,
  sectionHeading: { ...form.docH, margin: '0 0 12px' },
  sectionDivider: { marginTop: 20, paddingTop: 16, borderTop: `1px solid ${oracle.border}` },
  help:    form.help,
  locationGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: 14, marginBottom: 14 },
  label:   form.label,
  regionLabelRow: { display: 'flex', alignItems: 'center', gap: 4, minHeight: 32, marginBottom: 6 },
  input:   form.input,
  field:   { marginBottom: 14 },

};

function RegionReferenceLink({ region }: { region: 'Home' | 'Primary' }) {
  return <a className="guide-link" href={`${import.meta.env.BASE_URL}reference/regions`} target="_blank" rel="noopener noreferrer"
    aria-label={`View region reference for ${region} region (opens in a new tab)`} title="View region reference"
    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, flexShrink: 0, borderRadius: 4 }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </a>;
}

export default function FoundationStep({ name, onNameChange, onNameBlur, nameError, primaryDesigns = [], onUsePrimary, onConfigureSecondary, deploymentError }: {
  name: string;
  onNameChange: (name: string) => void;
  onNameBlur: () => void;
  nameError?: string | null;
  primaryDesigns?: { id: string; name: string; realm: string; region: string; secondaryRegion?: string }[];
  onUsePrimary?: (id: string, secondaryRegion: string) => void;
  onConfigureSecondary?: () => void;
  deploymentError?: string | null;
}) {
  const { model, setField, homeSource } = useWizard();
  const f = model.foundation;
  const regional = f.stackScope === 'regional';

  const [choosePrimary, setChoosePrimary] = useState(false);
  const [primaryId, setPrimaryId] = useState('');
  const [existingSecondaryRegion, setExistingSecondaryRegion] = useState('');
  const selectedPrimary = primaryDesigns.find((primary) => primary.id === primaryId);
  const selectedSecondaryRegion = existingSecondaryRegion || selectedPrimary?.secondaryRegion || '';
  const deploymentType = regional || choosePrimary ? 'secondary-existing' : f.deploymentMode ?? (f.drRegion ? 'primary-secondary' : 'primary-only');

  const regionOptions = getRegionsForRealm(f.realm);
  const tenancyHomeRegion = homeSource?.model?.foundation.tenancyHomeRegion ?? f.tenancyHomeRegion ?? '';
  const tenancyHomeRegionError = !tenancyHomeRegion ? 'Select a tenancy home region.'
    : !findRegion(f.realm, tenancyHomeRegion) ? 'Select a tenancy home region in this realm.' : null;
  const regionError = !f.region ? (regional ? 'Select a secondary region.' : 'Select a primary region.')
    : !findRegion(f.realm, f.region) ? 'Select a region in this realm.' : null;
  const homeRegionError = regional && (!findRegion(f.realm, f.homeRegion ?? '') || f.homeRegion === f.region)
    ? 'Select a primary region different from the DR region.' : null;
  const secondaryRegionError = !f.drRegion ? 'Select a secondary region.'
    : !findRegion(f.realm, f.drRegion) || f.drRegion === f.region ? 'Select a secondary region in this realm, different from the Primary region.' : null;

  const hasSecondary = regional || deploymentType === 'primary-secondary';
  const summaryReady = !tenancyHomeRegionError && !regionError
    && (regional ? !homeRegionError : !hasSecondary || !secondaryRegionError);
  const configurationCount = hasSecondary ? 2 : 1;
  const stackCount = foundationDeploymentStacks({ ...f, tenancyHomeRegion,
    drRegion: hasSecondary && !regional ? f.drRegion : undefined }).length;
  const deploymentSummary = summaryReady
    ? `${configurationCount} Studio configuration${configurationCount === 1 ? '' : 's'} · ${stackCount} deployment stack${stackCount === 1 ? '' : 's'}`
    : null;

  function setFoundation(patch: Partial<FoundationConfig>) {
    setField('foundation', { ...f, ...patch });
  }
  function onDeploymentType(value: string) {
    setChoosePrimary(value === 'secondary-existing');
    if (value === 'secondary-existing') return;
    const region = regional ? findRegion(f.realm, f.homeRegion ?? '') ?? getDefaultRegionForRealm(f.realm) : findRegion(f.realm, f.region);
    setFoundation({ stackScope: 'complete', deploymentMode: value as 'primary-only' | 'primary-secondary',
      ...(region ? { region: region.id, regionShortName: region.shortName } : {}),
      homeRegion: undefined, drRegion: value === 'primary-only' ? undefined : regional ? f.region : f.drRegion });
  }
  function onRealm(realm: string) {
    setFoundation({ realm, region: '', regionShortName: '',
      homeRegion: undefined, drRegion: undefined, tenancyHomeRegion: undefined });
  }
  function onRegion(region: string) {
    const r = findRegion(f.realm, region);
    setFoundation({ region, regionShortName: r?.shortName ?? '',
      ...(region === f.drRegion ? { drRegion: undefined } : {}) });
  }

  const deploymentSelector = <select id="lz-deployment-type" disabled={!!homeSource} value={deploymentType} onChange={(event) => onDeploymentType(event.target.value)} aria-describedby="lz-deployment-type-help">
    <option value="primary-only">Only Primary</option>
    <option value="primary-secondary">Primary + Secondary</option>
    {(regional || choosePrimary) && <option value="secondary-existing" hidden>Secondary (DR)</option>}
  </select>;

  if (choosePrimary && !homeSource) return <div className="studio-foundation-step" style={s.col}><section style={s.panel}><div style={s.body}>
    <h2 style={s.title}>Foundation</h2>
    <label style={s.label} htmlFor="lz-deployment-type">Deployment type</label>
    {deploymentSelector}
    <p id="lz-deployment-type-help" style={s.help}>Choose a saved Home and Primary Studio configuration. Studio will open a separate linked Secondary (DR) Studio configuration and retain this configuration.</p>
    <label style={{ ...s.label, marginTop: 16 }} htmlFor="lz-existing-primary">Existing primary</label>
    <select id="lz-existing-primary" value={primaryId} onChange={(event) => { setPrimaryId(event.target.value); setExistingSecondaryRegion(''); }}>
      <option value="">Select a saved Primary Studio configuration</option>
      {primaryDesigns.map((design) => <option key={design.id} value={design.id}>{design.name}</option>)}
    </select>
    {selectedPrimary && <>
      <label style={{ ...s.label, marginTop: 16 }} htmlFor="lz-existing-secondary-region">Secondary region (input 3)</label>
      <select id="lz-existing-secondary-region" value={selectedSecondaryRegion} onChange={(event) => setExistingSecondaryRegion(event.target.value)}>
        <option value="">Select secondary deployment region</option>
        {getRegionsForRealm(selectedPrimary.realm).filter((region) => region.id !== selectedPrimary.region).map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
      </select>
      <p style={s.help}>Studio updates the Home and Primary Studio configuration for this Secondary region. If its deployment stacks already exist, review and apply the updated deployment files before deploying Secondary.</p>
    </>}
    {!primaryDesigns.length && <p style={s.help}>Create or import a Home and Primary Studio configuration first.</p>}
    <button type="button" style={{ ...form.addBtn, marginTop: 14 }} disabled={!primaryId || !selectedSecondaryRegion || !onUsePrimary} onClick={() => onUsePrimary?.(primaryId, selectedSecondaryRegion)}>Configure secondary deployment</button>
    <FieldError id="lz-deployment-error" error={deploymentError} />
  </div></section></div>;

  return (
    <div className="studio-foundation-step" style={s.col}>
      <section style={s.panel} aria-labelledby="lz-general-title">
        <div style={s.accent} />
        <div style={s.body}>
            <h2 id="lz-general-title" style={s.title}>General</h2>
            <div style={s.field}>
              <label style={s.label} htmlFor="saved-lz-name">Configuration name</label>
              <input
                id="saved-lz-name"
                style={s.input}
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={onNameBlur}
                aria-invalid={!!nameError}
                aria-describedby={`saved-lz-name-help${nameError ? ' saved-lz-name-error' : ''}`}
              />
              <div id="saved-lz-name-help" style={{ ...s.help, marginTop: 6 }}>Used to identify this Studio configuration and name downloaded files. OCI resource names are generated separately.</div>
              <FieldError id="saved-lz-name-error" error={nameError} />
            </div>
            <div>
              <div>
                <label style={s.label} htmlFor="lz-realm">Realm</label>
                <select id="lz-realm" value={f.realm} disabled={!!homeSource} onChange={(e) => onRealm(e.target.value)} aria-describedby="lz-realm-help">
                  {REALM_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <div id="lz-realm-help" style={{ ...s.help, marginTop: 6 }}>Use the realm that contains your tenancy.</div>
              </div>
            </div>
        </div>
      </section>
      <section style={s.panel} aria-labelledby="lz-deployment-title">
        <div style={s.accent} />
        <div style={s.body}>
            <h2 id="lz-deployment-title" style={s.title}>Deployment</h2>
            <p style={form.intro}>Review the deployment type, then choose the OCI location.</p>
            <div style={s.field}>
              <div className="studio-info-heading"><label style={s.label} htmlFor="lz-deployment-type">Deployment type</label>
                <InfoButton title="Deployment type"><p>The <strong>Home and Primary Studio configuration</strong> defines compartments, IAM, governance and regional resources. Its deployment files support one or two deployment stacks, depending on whether Home and Primary share a region.</p><p>The <strong>Secondary (DR) Studio configuration</strong> defines recovery resources in another region and reuses the compartments, IAM and governance from Home and Primary. Use matching environment names. Review lists the deployment files and runtime dependencies required by the Secondary deployment stack.</p><p>Choose Only Primary to configure Home and Primary, or Primary + Secondary to add a linked Secondary (DR) Studio configuration.</p></InfoButton>
              </div>
              {deploymentSelector}
              <div id="lz-deployment-type-help" style={{ ...s.help, marginTop: 6 }}>{regional
                ? 'The Secondary (DR) Studio configuration reuses the compartments, IAM and governance defined in the Home and Primary Studio configuration.'
                : deploymentType === 'primary-secondary' ? 'Complete Home and Primary in this Studio configuration, then finish Secondary (DR) in its linked Studio configuration.' : 'Configure Home and Primary in this Studio configuration. Its deployment files include compartments, IAM, governance and regional resources.'}</div>
            </div>
            {regional && !homeSource && <button type="button" style={{ ...form.addBtn, marginTop: 12 }} onClick={() => setChoosePrimary(true)}>Choose saved primary</button>}
            <div style={s.locationGrid} className="foundation-location-grid">
              <div>
                <div style={s.regionLabelRow}>
                  <label style={{ ...s.label, marginBottom: 0 }} htmlFor="lz-tenancy-home-region">Home region (input 1)</label>
                  <RegionReferenceLink region="Home" />
                </div>
                <select id="lz-tenancy-home-region" required value={tenancyHomeRegion} disabled={!!homeSource}
                  onChange={(event) => setFoundation({ tenancyHomeRegion: event.target.value || undefined })}
                  {...fieldErrorProps('lz-tenancy-home-region-error', tenancyHomeRegionError, 'lz-region-help')}>
                  <option value="">Select tenancy home region</option>
                  {regionOptions.map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
                </select>
                <FieldError id="lz-tenancy-home-region-error" error={tenancyHomeRegionError} />
              </div>
              <div>
                <div style={s.regionLabelRow}>
                  <label style={{ ...s.label, marginBottom: 0 }} htmlFor={regional ? 'lz-home-region' : 'lz-region'}>Primary region (input 2)</label>
                  <RegionReferenceLink region="Primary" />
                </div>
                {regional ? <><select id="lz-home-region" required {...fieldErrorProps('lz-home-region-error', homeRegionError, 'lz-region-help')} disabled={!!homeSource} value={f.homeRegion ?? ''} onChange={(event) => setFoundation({ homeRegion: event.target.value })}>
                  <option value="">Select primary region</option>
                  {regionOptions.filter((region) => region.id !== f.region).map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
                </select><FieldError id="lz-home-region-error" error={homeRegionError} /></> : <><select id="lz-region" required {...fieldErrorProps('lz-region-error', regionError, 'lz-region-help')} value={f.region} onChange={(event) => onRegion(event.target.value)}>
                  <option value="">Select primary region</option>
                  {regionOptions.map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
                </select><FieldError id="lz-region-error" error={regionError} /></>}
              </div>
              {(regional || deploymentType === 'primary-secondary') && <div>
                <div style={s.regionLabelRow}>
                  <label style={{ ...s.label, marginBottom: 0 }} htmlFor={regional ? 'lz-region' : 'lz-dr-region'}>Secondary region (input 3)</label>
                </div>
                {regional ? <><select id="lz-region" required {...fieldErrorProps('lz-region-error', regionError)} value={f.region} onChange={(event) => onRegion(event.target.value)}>
                  <option value="">Select secondary region</option>
                  {regionOptions.filter((region) => region.id !== f.homeRegion).map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
                </select><FieldError id="lz-region-error" error={regionError} /></> : <><select id="lz-dr-region" required value={f.drRegion ?? ''} onChange={(event) => setFoundation({ drRegion: event.target.value || undefined })}
                  {...fieldErrorProps('lz-dr-region-error', secondaryRegionError, 'lz-dr-region-help')}>
                  <option value="">Select secondary region</option>
                  {regionOptions.filter((region) => region.id !== f.region).map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
                </select><FieldError id="lz-dr-region-error" error={secondaryRegionError} /></>}
              </div>}
            </div>
            {deploymentSummary && <p role="status" aria-label="Deployment summary" style={{ ...s.help, color: oracle.ink, marginBottom: 14 }}>
              <strong>{deploymentSummary}</strong>
            </p>}
            <p id="lz-region-help" style={s.help}>
              <strong>Home region:</strong> Your tenancy's Home region, where global resources are managed.<br />
              <strong>Primary region:</strong> The region where this landing zone's regional resources are deployed. Home and Primary may be the same region.
              {(regional || deploymentType === 'primary-secondary') && <><br /><strong>Secondary region:</strong> The region where disaster recovery resources are deployed. It must be different from the Primary region.</>}
            </p>
          {!regional && deploymentType === 'primary-secondary' && (
            <section aria-labelledby="lz-dr-configuration-title" style={s.sectionDivider}>
              <h3 id="lz-dr-configuration-title" style={s.sectionHeading}>Disaster recovery</h3>
              <p id="lz-dr-region-help" style={s.help}>Requires <strong>two linked Studio configurations</strong>, each with its own deployment files.</p>
              <ol style={{ margin: '14px 0', paddingLeft: 20, display: 'grid', gap: 14, fontSize: 13, lineHeight: 1.5 }}>
                <li>
                  <strong>Complete Home and Primary</strong>
                  <p style={{ ...s.help, marginTop: 4 }}>Complete this Studio configuration before continuing to Secondary.</p>
                </li>
                <li>
                  <strong>Configure Secondary (DR)</strong>
                  <p style={{ ...s.help, marginTop: 4 }}>Create or open the linked Secondary (DR) Studio configuration and complete its settings.</p>
                  <button type="button" style={{ ...form.addBtn, marginTop: 8 }} disabled={!!secondaryRegionError || !onConfigureSecondary} onClick={onConfigureSecondary}>Configure secondary deployment</button>
                </li>
              </ol>
              <p style={s.help}>You can also access Secondary from "Your Landing Zones" using <strong>Create DR</strong> or <strong>Edit DR</strong>.</p>
            </section>
          )}
          <FieldError id="lz-deployment-error" error={deploymentError} />

        </div>
      </section>

    </div>
  );
}
