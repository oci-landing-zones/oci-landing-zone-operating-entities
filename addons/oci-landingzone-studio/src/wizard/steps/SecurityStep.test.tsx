import { afterEach, describe, expect, it, vi } from 'vitest';
import { Children, isValidElement, type ReactNode, type ChangeEvent } from 'react';
import * as wizardContext from '../wizardContext';
import Switch from '../../components/Switch';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { emptyLzModel } from '../../model/defaults';
import type { LzModel } from '../../model/types';
import { WizardProvider, type HomeRegionSource } from '../wizardContext';
import SecurityStep from './SecurityStep';

function render(model: LzModel, homeSource?: HomeRegionSource) {
  return renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model} homeSource={homeSource}>
    <SecurityStep />
  </WizardProvider></MemoryRouter>);
}

afterEach(() => vi.restoreAllMocks());

function renderControls(): ReactNode {
  let tree: ReactNode;
  function Capture() {
    tree = SecurityStep();
    return tree;
  }
  renderToStaticMarkup(<MemoryRouter><Capture /></MemoryRouter>);
  return tree;
}


function findControl(node: ReactNode, predicate: (props: Record<string, unknown>, type: unknown) => boolean): Record<string, unknown> | undefined {
  let found: Record<string, unknown> | undefined;
  Children.forEach(node, (child) => {
    if (found || !isValidElement<Record<string, unknown>>(child)) return;
    found = predicate(child.props, child.type) ? child.props : findControl(child.props.children as ReactNode, predicate);
  });
  return found;
}

describe('Security settings', () => {
  it('starts with Recipe 01 only and additional zones under collapsed Advanced controls', () => {
    const model = emptyLzModel();
    expect(model.foundation.sharedNetworkSecurityZone).toBe(false);
    const html = render(model);
    expect(html).toMatch(/<div[^>]*id="lz-security-zones-advanced"[^>]*hidden=""/);
    expect(html).toContain('aria-expanded="false" aria-controls="lz-security-zones-advanced"');
    expect(html).toContain('Advanced');
    expect(html).not.toContain('Recipe 02 — Shared network');
    expect(html).toContain('Recipe 02 — prod');
    expect(html).toContain('Recipe 02 — preprod');
    expect(html).not.toContain('aria-label="Security zone for shared network"');
  });

  it.each([true, undefined])('preserves legacy shared-network ownership without an editable control (%s)', (value) => {
    const model = emptyLzModel();
    model.foundation.sharedNetworkSecurityZone = value;
    const html = render(model);
    expect(html).toContain('Legacy shared-network Security Zone');
    expect(html).not.toContain('Recipe 02 — Shared network');
    expect(html).not.toContain('aria-label="Security zone for shared network"');
    expect(model.foundation.sharedNetworkSecurityZone).toBe(value);
    expect(html).toMatch(/<div[^>]*id="lz-security-zones-advanced"[^>]*hidden=""/);
  });

  it.each([1, 2] as const)('defaults Recipe 01 to baseline CIS %s and places Cloud Guard after zones', (level) => {
    const model = emptyLzModel();
    model.foundation.cisLevel = level;
    const html = render(model);
    expect(html).toContain(`Recipe 01 — CIS Level ${level}`);
    expect(html).toMatch(/role="switch" aria-checked="true" aria-label="Enable Recipe 01 Security Zone"/);
    expect(html).not.toContain('id="lz-recipe1-cis-level"');
    expect(html.indexOf('id="security-zones-title"')).toBeLessThan(html.indexOf('id="security-cloud-guard-title"'));
  });

  it('toggles Recipe 01 without changing the baseline or additional zones', () => {
    const model = emptyLzModel();
    const setField = vi.fn();
    vi.spyOn(wizardContext, 'useWizard').mockReturnValue({ model, setField, reset: vi.fn(), vcnErrors: {} });
    const control = findControl(renderControls(), (props, type) => type === Switch && props.ariaLabel === 'Enable Recipe 01 Security Zone');
    (control!.onChange as (enabled: boolean) => void)(false);
    expect(setField).toHaveBeenCalledWith('foundation', { ...model.foundation, landingZoneSecurityZone: false });
    expect(model.environments.every((env) => !env.securityZone)).toBe(true);
  });

  it('uses the baseline when an older saved design has an independent recipe level', () => {
    const model = emptyLzModel();
    model.foundation.cisLevel = 2;
    model.foundation.securityZoneRecipe1CisLevel = 1;
    const html = render(model);
    expect(html).toContain('Recipe 01 — CIS Level 2');
    expect(html).not.toContain('Use baseline level');
  });

  it('enables Cloud Guard by default and requests external confirmation when excluded', () => {
    const model = emptyLzModel();
    expect(render(model)).toMatch(/role="switch" aria-checked="true" aria-label="Enable Cloud Guard"/);
    model.foundation.cloudGuardEnabled = false;
    const html = render(model);
    expect(html).toContain('id="existing-cloud-guard"');
    expect(html).toContain('Cloud Guard is already enabled');
    model.foundation.stackScope = 'regional';
    expect(render(model)).not.toContain('aria-label="Enable Cloud Guard"');
    expect(render(model)).toContain('Cloud Guard is managed by the primary deployment');
  });

  it('updates the saved CIS field and only the selected environment zone', () => {
    const model = emptyLzModel();
    const original = structuredClone(model);
    const setField = vi.fn();
    vi.spyOn(wizardContext, 'useWizard').mockReturnValue({ model, setField, reset: vi.fn(), vcnErrors: {} });
    const tree = renderControls();
    const cis = findControl(tree, (props) => props.id === 'lz-cis-level');
    (cis?.onChange as (event: ChangeEvent<HTMLSelectElement>) => void)({ target: { value: '1' } } as ChangeEvent<HTMLSelectElement>);
    expect(setField).toHaveBeenCalledWith('foundation', { ...model.foundation, cisLevel: 1 });
    const zone = findControl(tree, (props, type) => type === Switch && props.ariaLabel === 'Security zone for prod');
    (zone?.onChange as (enabled: boolean) => void)(true);
    expect(setField).toHaveBeenLastCalledWith('environments', [
      { ...model.environments[0], securityZone: true }, ...model.environments.slice(1),
    ]);
    expect(model).toEqual(original);
  });

  it('offers Bastion in Security, disabled by default', () => {
    const html = render(emptyLzModel());
    expect(html).toContain('aria-label="Enable OCI Bastion"');
    expect(html).not.toContain('id="lz-bastion-client-cidrs"');
  });

  it('shows enabled Bastion settings with accessible errors and the access guide', () => {
    const model = emptyLzModel();
    Object.assign(model, { bastion: { enabled: true, clientCidrs: '0.0.0.0/0', maxSessionTtlInSeconds: 3600 } });
    const html = render(model);
    expect(html).toContain('id="lz-bastion-client-cidrs"');
    expect(html).toContain('id="lz-bastion-session-duration"');
    expect(html).toContain('lz-bastion-client-cidrs-error');
    expect(html).toContain('hub management subnet');
    expect(html).toContain('aria-label="About OCI Bastion"');
    expect(html).toContain('popover="auto"');
    expect(html).toContain('Oracle documents access within the Bastion&#x27;s VCN.');
    expect(html).toContain('The service remains deployed until you remove it.');
    expect(html).toContain('approved public IPv4 address OCI sees from your workstation or corporate internet gateway');
    expect(html).toContain('Limit how long each access session can stay open.');
    const intro = html.match(/<p id="foundation-bastion-intro"[^>]*>(.*?)<\/p>/)?.[1];
    expect(intro).toContain('Access private databases and virtual machines');
    expect(intro).toContain('Studio includes the service in your deployment files.');
    expect(intro).not.toContain('SOCKS5');
    expect(html).toContain('/addons/oci-bastion/README.md');
  });


  it.each([1, 2] as const)('preserves the saved CIS level %s and environment zone choices', (cisLevel) => {
    const model = emptyLzModel();
    model.foundation.cisLevel = cisLevel;
    model.environments[0].securityZone = true;
    model.environments[1].securityZone = false;
    const original = structuredClone(model);
    const html = render(model);
    expect(html).toContain(`<option value="${cisLevel}" selected="">`);
    expect(html).toMatch(/role="switch" aria-checked="true" aria-label="Security zone for prod"/);
    expect(html).toMatch(/role="switch" aria-checked="false" aria-label="Security zone for preprod"/);
    expect(html).not.toContain('Environment 1 name');
    expect(model).toEqual(original);
  });

  it('explains how to add environments for an empty design', () => {
    const model = emptyLzModel();
    model.environments = [];
    expect(render(model)).toContain('Add environments in IAM to configure Security Zones.');
  });

  it('shows Home zone choices as read-only in linked DR', () => {
    const home = emptyLzModel();
    home.environments[0].securityZone = true;
    const dr = emptyLzModel();
    dr.foundation.stackScope = 'regional';
    const html = render(dr, { id: 'saved-home', name: 'Primary', model: home });
    expect(html).toContain('Security Zones are managed by the primary deployment');
    expect(html).not.toContain('aria-label="Security zone for');
    expect(html).toContain('prod');
    expect(html).toContain('On');
    expect(html).toContain('href="/lz/saved-home"');
    expect(html).toContain('target="_blank"');
  });

  it('keeps standalone DR zones read-only without a Home link', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    const html = render(model);
    expect(html).toContain('Security Zones are managed by the primary deployment');
    expect(html).not.toContain('aria-label="Security zone for');
    expect(html).not.toContain('Open primary deployment');
  });

  it('retains zone status when the linked Home design is unavailable', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    model.environments[0].securityZone = true;
    const html = render(model, { id: 'missing' });
    expect(html).toContain('Primary deployment design is unavailable');
    expect(html).toContain('prod');
    expect(html).not.toContain('href="/lz/missing"');
    expect(html).not.toContain('aria-label="Security zone for');
  });
});

it('places VSS below Cloud Guard, enabled by default, and lets it be excluded independently', () => {
  const model = emptyLzModel();
  const html = render(model);
  expect(html).toContain('Vulnerability Scanning (VSS)');
  expect(html.indexOf('id="security-vss-title"')).toBeGreaterThan(html.indexOf('id="security-cloud-guard-title"'));
  expect(html.indexOf('id="security-vss-title"')).toBeLessThan(html.indexOf('id="foundation-bastion-title"'));
  expect(html).toMatch(/role="switch" aria-checked="true" aria-label="Enable Vulnerability Scanning"/);
  const setField = vi.fn();
  vi.spyOn(wizardContext, 'useWizard').mockReturnValue({ model, setField, reset: vi.fn(), vcnErrors: {} });
  const control = findControl(renderControls(), (props, type) => type === Switch && props.ariaLabel === 'Enable Vulnerability Scanning');
  (control!.onChange as (enabled: boolean) => void)(false);
  expect(setField).toHaveBeenCalledWith('foundation', { ...model.foundation, vulnerabilityScanningEnabled: false });
});

it('allows the regional deployment to configure its own VSS selection', () => {
  const model = emptyLzModel(); model.foundation.stackScope = 'regional';
  const html = render(model);
  expect(html).toContain('aria-label="Enable Vulnerability Scanning"');
});

it('shows linked DR VSS as inherited from Primary without an independent switch', () => {
  const primary = emptyLzModel(); primary.foundation.vulnerabilityScanningEnabled = false;
  const dr = emptyLzModel(); dr.foundation.stackScope = 'regional';
  const html = render(dr, { id: 'primary', model: primary });
  expect(html).toContain('VSS is inherited from the Primary configuration');
  expect(html).not.toContain('aria-label="Enable Vulnerability Scanning"');
  const section = html.match(/<section[^>]*aria-labelledby="security-vss-title"[\s\S]*?<\/section>/)?.[0];
  expect(section).toContain('Off');
});
