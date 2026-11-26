import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { emptyLzModel } from '../../model/defaults';
import type { GeneratedResourceInventory } from '../../services/generatedResources';
import type { LzModel } from '../../model/types';
import { WizardProvider } from '../wizardContext';
import IamStep from './IamStep';

function render(model: LzModel, identityInventory?: GeneratedResourceInventory) {
  return renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><IamStep identityInventory={identityInventory} /></WizardProvider></MemoryRouter>);
}

describe('IAM environments', () => {
  it('shows Identity domains before Environments using generated domain names and group counts', () => {
    const model = emptyLzModel();
    model.foundation.identityDomainName = 'generated-common-domain';
    const html = render(model, { compartments: [], groups: [
      { id: 'identitydomain:common', kind: 'identitydomain', compartmentKey: 'TENANCY-ROOT', items: [
        { key: 'domain', name: 'generated-common-domain' }, { key: 'group1', name: 'network-admins' }, { key: 'group2', name: 'security-admins' },
      ] },
    ] });
    expect(html).toContain('Identity domains');
    expect(html.indexOf('Identity domains')).toBeLessThan(html.indexOf('>Environments<'));
    expect(html).toContain('generated-common-domain');
    expect(html).toContain('2 groups');
    expect(html).toContain('aria-label="Groups in generated-common-domain"');
    expect(html).toContain('<li>network-admins</li>');
    expect(html).toContain('<li>security-admins</li>');
    expect(html).not.toContain('id_lz_common');
    expect(html).toContain('Home and Primary Studio configuration');
  });

  it('does not invent identity domains when the generated preview is unavailable', () => {
    const html = render(emptyLzModel());
    expect(html).toContain('Identity domains');
    expect(html).toContain('Complete the configuration to preview its identity domains.');
    expect(html).toContain('id="iam-identity-domain-name"');
    expect(html).toContain('value="id_lz_common"');
    expect(html).not.toContain('aria-label="Generated identity domains"');
  });

  it('offers a domain name field and reports invalid names', () => {
    const model = emptyLzModel();
    model.foundation.identityDomainName = 'customer-domain';
    expect(render(model)).toMatch(/<input[^>]*id="iam-identity-domain-name"[^>]*value="customer-domain"/);
    model.foundation.identityDomainName = "invalid'name";
    expect(render(model)).toMatch(/<input[^>]*id="iam-identity-domain-name"[^>]*aria-invalid="true"/);
  });

  it('inherits the domain name as read-only in linked Secondary configurations', () => {
    const home = emptyLzModel();
    home.foundation.identityDomainName = 'home-domain';
    const dr = structuredClone(home);
    dr.foundation.stackScope = 'regional';
    dr.foundation.identityDomainName = 'outdated-domain';
    const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={dr} homeSource={{ id: 'home', model: home }}><IamStep /></WizardProvider></MemoryRouter>);
    expect(html).toMatch(/<input[^>]*id="iam-identity-domain-name"[^>]*readOnly=""[^>]*value="home-domain"/i);
  });

  it('offers environment editing without region fields', () => {
    const html = render(emptyLzModel());
    expect(html).toContain('Environment 1 name');
    expect(html).toContain('New environment name');
    expect(html).not.toContain('id="lz-region"');
  });
  it('locks linked DR environments and opens their Primary deployment design in a new tab', () => {
    const home = emptyLzModel();
    const dr = structuredClone(home);
    dr.foundation.stackScope = 'regional';
    const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={dr} homeSource={{ id: 'saved-home', name: 'Primary design', model: home }}>
      <IamStep />
    </WizardProvider></MemoryRouter>);
    expect(html).toContain('Environments sync automatically from');
    expect(html).toContain('Primary deployment environments');
    expect(html).toContain('These environments are expected to be deployed in the primary deployment.');
    expect(html).toContain('Primary design');
    expect(html).toContain('Environments synced from primary deployment');
    expect(html).not.toContain('New environment name');
    expect(html).not.toContain('Remove prod from DR');
    expect(html).not.toContain('Environment 1 name');
    const homeLink = html.match(/<a\b[^>]*>Open primary deployment<\/a>/)?.[0];
    expect(homeLink).toContain('href="/lz/saved-home"');
    expect(homeLink).toContain('target="_blank"');
    expect(homeLink).toContain('rel="noopener noreferrer"');
  });

  it('preserves the locked environment snapshot when the primary deployment design is unavailable', () => {
    const dr = emptyLzModel();
    dr.foundation.stackScope = 'regional';
    const html = renderToStaticMarkup(<WizardProvider initialModel={dr} homeSource={{ id: 'missing-home' }}>
      <IamStep />
    </WizardProvider>);
    expect(html).toContain('Primary deployment design is unavailable');
    expect(html).toContain('prod');
    expect(html).not.toContain('href="/lz/missing-home"');
    expect(html).not.toContain('New environment name');
  });

  it('explains DR environment matching and leaves deployment prerequisites to Review', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    model.foundation.notifications!.useSingleRecipient = false;
    const html = render(model);
    expect(html).toContain('Primary deployment environments');
    expect(html).toContain('aria-label="About Primary deployment environments"');
    expect(html).toContain('These environments are expected to be deployed in the primary deployment.');
    expect(html).toContain('Use the same environment names as your primary deployment.');
    expect(html).toMatch(/<details[^>]*><summary[^>]*>How DR uses these environments<\/summary>/);
    expect(html.split('Tags y Budgets')[0]).not.toMatch(/<details[^>]*\bopen/);
    expect(html).toContain('compartments from your primary deployment.');
    expect(html).toContain('Changes here affect only this DR design.');
    expect(html).not.toContain('Home-owned');
    expect(html).not.toContain('Home controls');
    expect(html).not.toContain('aria-label="Security zone for');
    expect(render(emptyLzModel())).not.toContain('aria-label="Security zone for');
    expect(html).toContain('Primary deployment');
    expect(html).not.toContain('Home stack owns matching compartments');
    model.environments = [];
    expect(render(model)).toContain('No Primary deployment environments. Hub and shared services only.');
    expect(html).not.toContain('id="lz-observability-cloudguard"');
    expect(html).not.toContain('id="lz-observability-iam"');
    expect(html).not.toContain('id="lz-observability-network"');
  });
});
