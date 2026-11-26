import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HubNetworkStep, { VcnEditor } from './HubNetworkStep';
import { WizardProvider } from '../wizardContext';
import { emptyLzModel } from '../../model/defaults';
import { emptyHybridConnectivity } from '../../services/hybridConnectivity';
import { HUB_KINDS, OPTIONAL_HUB_SUBNETS, hubKindDefaults } from '../../services/hubKinds';

it('uses shared inline feedback for connectivity errors', () => {
  const model = emptyLzModel();
  model.hybridConnectivity = emptyHybridConnectivity();
  model.hybridConnectivity.fast_connect_virtual_circuits.primary = { type: 'PRIVATE', remote_cidrs: [] };
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
  expect(html).toContain('id="hub-connectivity-errors" class="field-error" aria-live="polite"');
  expect(html).toContain('FastConnect primary: enter at least one remote CIDR.');
});

it('gives RPC, VPN and FastConnect independent, initially collapsed panels', () => {
  const model = emptyLzModel();
  model.remotePeeringConnections = [{ id: 'rpc', name: 'peer', role: 'acceptor', remoteCidrs: [], peerRegionName: '' }];
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
  const toggles = [...html.matchAll(/<button[^>]*class="connectivity-service-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
  expect(toggles).toHaveLength(3);
  expect(new Set(toggles.map(([, id]) => id)).size).toBe(3);
  expect(toggles[0][2]).toContain('Remote peering connection (RPC)');
  expect(toggles[0][2]).toContain('1 connection');
  expect(toggles[1][2]).toContain('VPN');
  expect(toggles[2][2]).toContain('FastConnect');
  for (const [, id] of toggles) expect(html).toContain(`id="${id}" hidden=""`);
  expect(html).toContain('Add remote connection');
});

describe('VCN subnet validation', () => {
  it.each(HUB_KINDS)('keeps $label subnet keys fixed while allowing CIDR edits', ({ id }) => {
    const model = emptyLzModel();
    model.network = { hubKind: id, ...hubKindDefaults(id) };
    const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
    model.network.subnets.forEach((subnet, index) => {
      const nameInput = html.match(new RegExp(`<input[^>]*aria-label="Subnet ${index + 1} name"[^>]*>`))?.[0];
      expect(nameInput).toContain(`value="${subnet.name}"`);
      expect(nameInput).toContain('readOnly=""');
      const cidrInput = html.match(new RegExp(`<input[^>]*aria-label="Subnet ${index + 1} CIDR"[^>]*>`))?.[0];
      expect(cidrInput).toContain(`value="${subnet.cidr}"`);
      expect(cidrInput).not.toMatch(/readOnly|disabled/);
      if (OPTIONAL_HUB_SUBNETS.includes(subnet.name)) expect(html).toContain(`aria-label="Delete subnet ${subnet.name}"`);
      else expect(html).not.toContain(`aria-label="Delete subnet ${subnet.name}"`);
    });
    expect(html).toContain('Add custom subnet');
    expect(html).toContain('Hub subnet names are fixed.');
  });

  it('keeps custom subnet controls available for unrestricted networks', () => {
    const html = renderToStaticMarkup(<VcnEditor idPrefix="custom" vcnCidr="10.0.0.0/21" emptyNote="" onApply={() => {}}
      subnets={[{ name: 'app', cidr: '10.0.0.0/24' }]} />);
    const nameInput = html.match(/<input[^>]*aria-label="Subnet 1 name"[^>]*>/)?.[0];
    expect(nameInput).toContain('value="app"');
    expect(nameInput).not.toMatch(/readOnly|disabled/);
    expect(html).toContain('aria-label="Delete subnet app"');
    expect(html).toContain('Add custom subnet');
  });

  it('keeps managed subnets read-only while leaving the VCN editable', () => {
    const html = renderToStaticMarkup(<VcnEditor idPrefix="managed" vcnCidr="10.0.0.0/20" emptyNote="" onApply={() => {}} readOnlySubnets
      subnets={[{ name: 'workers', cidr: '10.0.8.0/23' }]} />);
    const vcnInput = html.match(/<input[^>]*id="managed-vcn-cidr"[^>]*>/)?.[0];
    expect(vcnInput).toContain('value="10.0.0.0/20"');
    expect(vcnInput).not.toContain('readOnly');
    expect(vcnInput).not.toContain('disabled');
    expect(html).toContain('workers');
    expect(html).toContain('10.0.8.0/23');
    expect(html).not.toContain('aria-label="Subnet 1 name"');
    expect(html).not.toContain('aria-label="Subnet 1 CIDR"');
    expect(html).not.toContain('Delete subnet');
    expect(html).not.toContain('Add custom subnet');
  });

  it('associates an invalid VCN range with its visible error', () => {
    const html = renderToStaticMarkup(<VcnEditor idPrefix="invalid" vcnCidr="invalid" subnets={[]} emptyNote="" onApply={() => {}} />);
    expect(html).toMatch(/id="invalid-vcn-cidr"[^>]*aria-invalid="true"[^>]*aria-describedby="invalid-vcn-error"/);
    expect(html).toContain('id="invalid-vcn-error"');
  });
  it('suggests an available in-range CIDR when a subnet is outside the VCN', () => {
    const html = renderToStaticMarkup(<VcnEditor idPrefix="test" vcnCidr="10.0.0.0/21" emptyNote="" onApply={() => {}}
      subnets={[{ name: 'outside', cidr: '192.168.1.0/24' }, { name: 'used', cidr: '10.0.0.0/24' }]} />);
    expect(html).toContain('Outside the VCN (10.0.0.0/21)');
    expect(html).toContain('Use 10.0.1.0/24');
    expect(html).toContain('aria-invalid="true"');
  });

  it('explains when the VCN is full instead of suggesting an overlapping block', () => {
    const html = renderToStaticMarkup(<VcnEditor idPrefix="full" vcnCidr="10.0.0.0/24" emptyNote="" onApply={() => {}}
      subnets={[{ name: 'outside', cidr: '192.168.1.0/24' }, { name: 'used', cidr: '10.0.0.0/24' }]} />);
    expect(html).toContain('No free subnet range remains in this VCN.');
    expect(html).not.toContain('>Use ');
  });
});
