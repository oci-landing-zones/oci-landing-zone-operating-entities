import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { emptyLzModel } from '../../model/defaults';
import type { FastConnectConfig } from '../../model/hybridConnectivity';
import { emptyHybridConnectivity, newVpn } from '../../services/hybridConnectivity';
import { providerServicesForRegion } from '../../services/connectivityCatalog';
import { WizardProvider } from '../wizardContext';
import ConnectivityEditor from './ConnectivityEditor';
import HubNetworkStep from './HubNetworkStep';

it('explains the setup order before customers add resources', () => {
  const render = (kind: 'vpn' | 'fastconnect') => renderToStaticMarkup(
    <WizardProvider initialModel={emptyLzModel()}><ConnectivityEditor kind={kind} /></WizardProvider>,
  );
  const vpn = render('vpn');
  expect(vpn).toContain('aria-label="VPN setup guide"');
  expect(vpn).toMatch(/Register your equipment\.[\s\S]*Add a VPN connection\.[\s\S]*Configure both tunnels\./);
  expect(vpn).toContain('This creates its record in OCI using the Other device type; your network team configures the device itself.');
  const fc = render('fastconnect');
  expect(fc).toContain('aria-label="FastConnect setup guide"');
  expect(fc).toMatch(/Confirm the connection details\.[\s\S]*Add a circuit\.[\s\S]*Configure BGP\./);
  for (const html of [vpn, fc]) {
    expect(html).toContain('Downloading files does not establish connectivity.');
    expect(html).toContain('In Review, download the files for your Terraform deployment.');
  }
});

it('adapts visible guidance to tunnel routing, key source and provider peering', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  const tunnel = (hybrid.ipsecs.office = newVpn('office')).tunnels_management.tunnel_1;
  const render = (kind: 'vpn' | 'fastconnect') => renderToStaticMarkup(
    <WizardProvider initialModel={model}><ConnectivityEditor kind={kind} /></WizardProvider>,
  );
  expect(render('vpn')).toContain('Your network team must configure return routes on the router.');
  expect(render('vpn')).not.toContain('Inside-tunnel IPs are the two ends of the BGP session');
  expect(render('vpn')).toContain('This choice does not reset an existing key.');
  tunnel.routing = 'BGP';
  tunnel.secretMode = 'vault';
  expect(render('vpn')).toContain('Inside-tunnel IPs are the two ends of the BGP session');
  expect(render('vpn')).toContain('The LZ Vault can host it; this form does not create the secret.');
  const circuit = hybrid.fast_connect_virtual_circuits.primary = {
    type: 'PRIVATE' as const, provider_service_id: 'ocid1.providerservice.oc1..example', cross_connect_mappings: { primary: {} },
  };
  expect(render('fastconnect')).toContain('Use the peering details supplied for your partner service.');
  expect(render('fastconnect')).toContain('these are BGP interface IPs, not the remote networks.');
  circuit.provider_service_id = '';
  const unselected = render('fastconnect');
  expect(unselected).toContain('Use the peering details supplied for your partner service.');
  expect(unselected).toContain('these are BGP interface IPs, not the remote networks.');
  expect(unselected).not.toContain('Direct / physical connection');
  expect(unselected).not.toContain('Leave empty for a direct physical connection.');
  expect(unselected).not.toContain('<option value="PUBLIC"');
  expect(unselected).not.toMatch(/<label[^>]*>Peering<\/label>/);
  expect(unselected).not.toContain('Owned public IPv4 prefixes');
  expect(unselected).not.toContain('Routing policy (comma-separated)');
});

it('uses provider OCID entry unless verified IDs exist for the selected location', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  hybrid.customer_premises_equipments.office = { ip_address: '203.0.113.10' };
  Object.assign(hybrid.customer_premises_equipments.office, { cpe_device_shape_vendor_name: 'Fortinet', cpe_device_shape_id: 'old-shape' });
  const circuit: FastConnectConfig = hybrid.fast_connect_virtual_circuits.primary = { type: 'PRIVATE' };
  const render = (kind: 'vpn' | 'fastconnect') => renderToStaticMarkup(
    <WizardProvider initialModel={model}><ConnectivityEditor kind={kind} /></WizardProvider>,
  );
  expect(render('vpn')).not.toContain('Device vendor');
  expect(render('vpn')).not.toContain('<option value="Fortinet"');
  expect(render('vpn')).not.toContain('Device shape ID');
  expect(render('vpn')).not.toContain('old-shape');
  expect(render('vpn')).toContain('value="203.0.113.10"');
  model.foundation.realm = 'oc19';
  model.foundation.region = 'eu-frankfurt-2';
  const manual = render('fastconnect');
  expect(manual).not.toMatch(/<label[^>]*>Provider service<\/label>/);
  expect(manual).toMatch(/<label[^>]*>Provider service OCID<\/label>/);
  expect(manual).not.toContain('Known choices for');
  expect(manual).not.toContain('reviewed 2026-10-15');

  model.foundation.realm = 'oc1';
  model.foundation.region = 'eu-frankfurt-1';
  const { ocid, label } = providerServicesForRegion('oc1', 'eu-frankfurt-1').find((s) => s.label === 'Equinix / Fabric')!;
  circuit.provider_service_id = ocid;
  const verified = render('fastconnect');
  expect(verified).toContain(`<option value="${ocid}" selected="">${label}</option>`);
  expect(verified).not.toContain('Known choices for');
  expect(verified).not.toContain('Saved:');
  expect(verified).toContain('Select a provider service from the list, or enter its OCID');
  model.foundation.realm = 'oc19';
  model.foundation.region = 'eu-frankfurt-2';
  const elsewhere = render('fastconnect');
  expect(elsewhere).not.toContain(`<option value="${ocid}"`);
  expect(elsewhere).toContain(`value="${ocid}"`);
  expect(elsewhere).toContain('belongs to another location');
});

it('keeps services separate and describes every editable field, including conditional fields', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  hybrid.customer_premises_equipments.office = { ip_address: '203.0.113.10' };
  const vpn = hybrid.ipsecs.office = newVpn('');
  vpn.tunnels_management.tunnel_1 = {
    routing: 'BGP', secretMode: 'inline', shared_secret: 'SessionExampleKey',
    phase_one_details: { is_custom_phase_one_config: true },
    phase_two_details: { is_custom_phase_two_config: true },
  };
  vpn.tunnels_management.tunnel_2 = { routing: 'STATIC', secretMode: 'vault' };
  hybrid.fast_connect_virtual_circuits.private = {
    type: 'PRIVATE', cross_connect_mappings: { primary: {
      bgp_md5auth_mode: 'inline', vlan: '100', cross_connect_or_cross_connect_group_id: 'ocid1.crossconnectgroup.oc1..existing',
    } },
  };
  hybrid.cross_connect_groups.primary = { cross_connects: { port: { location_name: '', port_speed_shape_name: '' } } };

  const render = (kind: 'vpn' | 'fastconnect') => renderToStaticMarkup(
    <WizardProvider initialModel={model}><ConnectivityEditor kind={kind} /></WizardProvider>,
  );
  const before = JSON.stringify(model);
  const vpnHtml = render('vpn');
  const fcHtml = render('fastconnect');
  expect(vpnHtml).toContain('Customer tunnel IP/prefix');
  expect(vpnHtml).toContain('Vault secret OCID');
  expect(vpnHtml).not.toContain('FastConnect circuits');
  expect(fcHtml).toContain('Customer BGP IP/prefix');
  expect(fcHtml).toContain('BGP MD5 key (session only)');
  expect(fcHtml).not.toContain('Cross-connect and VLAN');
  expect(fcHtml).not.toContain('Cross-connect/group OCID');
  expect(fcHtml).not.toContain('Physical FastConnect preparation');
  expect(fcHtml).not.toContain('Add cross-connect group');
  expect(fcHtml).not.toContain('ocid1.crossconnectgroup.oc1..existing');
  expect(fcHtml).not.toMatch(/<label[^>]*>VLAN<\/label>/);
  expect(JSON.stringify(model)).toBe(before);
  expect(fcHtml).not.toContain('Customer VPN equipment');

  for (const html of [vpnHtml, fcHtml]) {
    const controls = [...html.matchAll(/<(?:input|select)\b[^>]*>/g)].map(([tag]) => tag);
    expect(controls.length).toBeGreaterThan(10);
    const ids = controls.map((tag) => {
      const id = tag.match(/aria-describedby="([^"]+)"/)?.[1].split(' ')[0];
      expect(id).toBeDefined();
      expect(html).toContain(`id="${id}" popover="auto" role="dialog"`);
      return id;
    });
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).toContain('<strong>Example:</strong>');
    expect(html).toContain('class="studio-info-button"');
    expect(html).toContain('class="studio-info-popover"');
    expect(html).not.toContain('field-help-trigger');
    expect(html).toContain('href="https://docs.oracle.com/');
    expect([...html.matchAll(/<div[^>]*role="dialog"[\s\S]*?<\/div>/g)].join('')).not.toContain('SessionExampleKey');
  }
  expect(vpnHtml).toContain('aria-label="CPE name"');
  expect(vpnHtml).toContain('Connection settings');
  expect(vpnHtml).toContain('IPSec tunnels');
  expect(vpnHtml).toContain('Router identity');
  const tunnels = [...vpnHtml.matchAll(/<details class="connectivity-disclosure connectivity-tunnel"([^>]*)>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>/g)];
  expect(tunnels).toHaveLength(2);
  for (const [, attributes] of tunnels) expect(attributes).not.toMatch(/\bopen=/);
  expect(tunnels[0][2]).toContain('Tunnel 1');
  expect(tunnels[0][2]).toContain('BGP');
  expect(tunnels[1][2]).toContain('Tunnel 2');
  expect(tunnels[1][2]).toContain('Static');
  expect(fcHtml).toContain('Add BGP mapping to FastConnect private');
  expect(fcHtml).toContain('aria-label="BGP mapping name for FastConnect private"');
  expect(fcHtml).not.toContain('Known choices for');
  expect(fcHtml).toContain('oci network fast-connect-provider-service list');
  expect(fcHtml).toContain('--compartment-id &lt;tenancy-ocid&gt;');
  expect(fcHtml).not.toContain('--auth');
  expect(fcHtml).toContain('Use lowercase letters, numbers, hyphens or underscores. Up to 40 characters.');
});

it('shows algorithm overrides only for enabled custom proposals and retains their values', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  const vpn = hybrid.ipsecs.office = newVpn('office');
  vpn.tunnels_management.tunnel_1.phase_one_details = {
    is_custom_phase_one_config: false, custom_authentication_algorithm: 'SHA2_384',
  };
  const render = () => renderToStaticMarkup(
    <WizardProvider initialModel={model}><ConnectivityEditor kind="vpn" /></WizardProvider>,
  );
  expect(render()).not.toContain('aria-label="Phase 1 authentication algorithm"');
  vpn.tunnels_management.tunnel_1.phase_one_details.is_custom_phase_one_config = true;
  const html = render();
  expect(html).toContain('aria-label="Phase 1 authentication algorithm"');
  expect(html).toContain('value="SHA2_384"');
  expect(html).not.toContain('aria-label="Phase 2 authentication algorithm"');
});

it('explains each phase and keeps automatic and custom proposal settings independent', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  const tunnel = (hybrid.ipsecs.office = newVpn('office')).tunnels_management.tunnel_1;
  tunnel.phase_one_details = { is_custom_phase_one_config: false, lifetime: 28800 };
  tunnel.phase_two_details = {
    is_custom_phase_two_config: true, custom_encryption_algorithm: 'AES_256_GCM',
    dh_group: 'GROUP20', is_pfs_enabled: true, lifetime: 3600,
  };
  const before = JSON.stringify(tunnel);
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><ConnectivityEditor kind="vpn" /></WizardProvider>);
  const phases = [...html.matchAll(/<fieldset class="connectivity-phase"[^>]*>([\s\S]*?)<\/fieldset>/g)].map(([, content]) => content);
  expect(phases).toHaveLength(4);
  expect(phases[0]).toContain('Phase 1: IKE');
  expect(phases[0]).toContain('Authenticates the VPN peers and protects the negotiation channel.');
  expect(phases[0]).toContain('aria-label="Phase 1 automatic proposals"');
  expect(phases[0]).not.toContain('aria-label="Phase 1 encryption algorithm"');
  expect(phases[1]).toContain('Phase 2: IPSec');
  expect(phases[1]).toContain('Protects the application traffic carried by the tunnel.');
  expect(phases[1]).toContain('<option value="AES_256_GCM" selected="">');
  expect(phases[1]).toContain('<option value="GROUP20" selected="">');
  expect(phases[1]).not.toContain('aria-label="Phase 2 automatic proposals"');
  expect(JSON.stringify(tunnel)).toBe(before);
});

it('lists phase-specific proposal options and keeps invalid imported values visible for correction', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  const tunnel = (hybrid.ipsecs.office = newVpn('office')).tunnels_management.tunnel_1;
  tunnel.phase_one_details = { is_custom_phase_one_config: true };
  tunnel.phase_two_details = { is_custom_phase_two_config: true };
  const render = () => renderToStaticMarkup(<WizardProvider initialModel={model}><ConnectivityEditor kind="vpn" /></WizardProvider>);
  const html = render();
  const choices = (label: string) => {
    const select = html.match(new RegExp(`<select[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)</select>`))?.[1];
    expect(select).toBeDefined();
    return [...select!.matchAll(/<option value="([^"]*)"/g)].map(([, value]) => value);
  };
  expect(choices('Phase 1 authentication algorithm')).toEqual(['', 'SHA2_384', 'SHA2_256', 'SHA1_96']);
  expect(choices('Phase 2 authentication algorithm')).toEqual(['', 'HMAC_SHA2_256_128', 'HMAC_SHA1_128']);
  expect(choices('Phase 1 encryption algorithm')).toEqual(['', 'AES_256_CBC', 'AES_192_CBC', 'AES_128_CBC']);
  expect(choices('Phase 2 encryption algorithm')).toEqual(['', 'AES_256_GCM', 'AES_192_GCM', 'AES_128_GCM', 'AES_256_CBC', 'AES_192_CBC', 'AES_128_CBC']);
  for (const phase of ['Phase 1', 'Phase 2']) expect(choices(`${phase} DH group`)).toEqual(['', 'GROUP2', 'GROUP5', 'GROUP14', 'GROUP19', 'GROUP20', 'GROUP24']);
  tunnel.phase_one_details.custom_authentication_algorithm = 'HMAC_SHA2_256_128';
  const invalid = render();
  expect(invalid).toContain('Unsupported value: HMAC_SHA2_256_128');
  expect(invalid).toMatch(/<select[^>]*aria-label="Phase 1 authentication algorithm"[^>]*aria-invalid="true"/);
  expect(invalid).toContain('Choose a supported value from the list.');
  expect(invalid).toMatch(/class="field-error" aria-live="polite"><div>Choose a supported value from the list\./);
});

it('shows automatic proposals and inherited PFS without writing algorithm overrides', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  const tunnel = (hybrid.ipsecs.office = newVpn('office')).tunnels_management.tunnel_1;
  const before = JSON.stringify(model);
  const render = () => renderToStaticMarkup(<WizardProvider initialModel={model}><ConnectivityEditor kind="vpn" /></WizardProvider>);
  const html = render();
  expect(html).toContain('aria-label="Phase 1 automatic proposals"');
  expect(html).toContain('aria-label="Phase 2 automatic proposals"');
  expect(html).toContain('SHA2_384, SHA2_256, SHA1_96');
  expect(html).toContain('AES_256_CBC, AES_192_CBC, AES_128_CBC');
  expect(html).toContain('GROUP2, GROUP5, GROUP14, GROUP19, GROUP20');
  expect(html).toContain('<option value="oci" selected="">Enabled (OCI setting)</option>');
  expect(html).toContain('The negotiated algorithms are known after connection.');
  expect(html).not.toContain('OCI default');
  expect(JSON.stringify(model)).toBe(before);
  tunnel.phase_two_details = { is_pfs_enabled: false };
  expect(render()).toContain('<option value="false" selected="">Disabled</option>');
  expect(render()).toContain('Not used: PFS is disabled.');
});

it('explains the identity fallback and identifies a missing hostname inline', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  const vpn = hybrid.ipsecs.office = newVpn('office');
  const render = () => renderToStaticMarkup(<WizardProvider initialModel={model}><ConnectivityEditor kind="vpn" /></WizardProvider>);
  expect(render()).toContain('Uses CPE public IP');
  vpn.cpe_local_identifier_type = 'HOSTNAME';
  expect(render()).toContain('Hostname required');
  expect(render()).toContain('Enter the hostname your router sends as its IKE identity.');
  vpn.cpe_local_identifier = 'vpn.example.com';
  expect(render()).toContain('Custom identity');
  expect(render()).not.toContain('Hostname required');
});

it('summarizes configured connections and keeps collapsed service contents mounted', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  hybrid.customer_premises_equipments.office = { ip_address: '203.0.113.10' };
  hybrid.ipsecs.office = newVpn('office');
  hybrid.fast_connect_virtual_circuits.primary = { type: 'PRIVATE' };
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
  expect(html).toContain('1 VPN · 1 CPE');
  expect(html).toContain('1 circuit');
  expect(html).toMatch(/id="[^"]+-vpn" hidden=""/);
  expect(html).toMatch(/id="[^"]+-fastconnect" hidden=""/);
  expect(html).toContain('aria-label="VPN office"');
  expect(html).toContain('aria-label="FastConnect primary"');
});

it('places a missing session key warning beside its field and flags the affected tunnel', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  const vpn = hybrid.ipsecs.office = newVpn('office');
  vpn.tunnels_management.tunnel_1.secretMode = 'inline';
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
  const field = html.match(/<input[^>]*aria-invalid="true"[^>]*type="password"[^>]*>/)?.[0];
  expect(field).toBeDefined();
  const noteId = field?.match(/aria-describedby="[^"]+ ([^"]+)"/)?.[1];
  expect(noteId).toBeDefined();
  expect(html).toContain(`id="${noteId}"`);
  expect(html).toContain(`id="${noteId}" class="field-error" aria-live="polite"`);
  expect(html).toContain('Re-enter the pre-shared key. Studio clears entered keys when you reopen a design.');
  expect(html).toContain('Key needs attention');
  expect(html).not.toContain('VPN office Tunnel 1:');
  expect(html).not.toContain('tunnel_1:');
});

it('offers common bandwidth choices and preserves custom or invalid imported values for correction', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  hybrid.fast_connect_virtual_circuits.primary = { type: 'PRIVATE', bandwidth_shape_name: '20 Gbps' };
  const render = () => renderToStaticMarkup(<WizardProvider initialModel={model}><ConnectivityEditor kind="fastconnect" /></WizardProvider>);
  const html = render();
  expect(html).toContain('Provisioned bandwidth');
  expect(html).toContain('<option value="1 Gbps">1 Gbps</option>');
  expect(html).toContain('<option value="10 Gbps">10 Gbps</option>');
  expect(html).toContain('<option value="100 Gbps">100 Gbps</option>');
  expect(html).toContain('<option value="custom" selected="">Other bandwidth</option>');
  expect(html).toContain('value="20 Gbps"');
  hybrid.fast_connect_virtual_circuits.primary.bandwidth_shape_name = 'invalid';
  expect(render()).toContain('value="invalid"');
  expect(render()).toContain('Use a positive whole-number bandwidth, for example 1 Gbps.');
});
