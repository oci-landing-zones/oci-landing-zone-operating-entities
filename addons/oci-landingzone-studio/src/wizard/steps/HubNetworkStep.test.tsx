import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HubNetworkStep, { VcnEditor } from './HubNetworkStep';
import { WizardProvider } from '../wizardContext';
import { emptyLzModel } from '../../model/defaults';
import { emptyHybridConnectivity } from '../../services/hybridConnectivity';

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
