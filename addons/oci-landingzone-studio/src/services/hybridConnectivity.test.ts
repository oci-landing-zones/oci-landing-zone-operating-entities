import { beforeEach, describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import type { VpnConfig, VpnTunnel } from '../model/hybridConnectivity';
import { buildConfig, serializeConfig } from './lzConfig';
import { createDrLZ, createLZ, getLZ, getOutputs, saveDisasterRecoveryLZ, saveLZ, saveOutputs } from './lzStore';
import { createDrDraft } from './disasterRecoveryDesign';
import { bandwidthShapeError, bgpMd5KeyError, emptyHybridConnectivity, newVpn, stripInlineSecrets, validateHybridConnectivity, validateHybridRoutes, vpnIdentityError, vpnSharedSecretError } from './hybridConnectivity';

function design() {
  const model = emptyLzModel();
  model.hybridConnectivity = emptyHybridConnectivity();
  model.hybridConnectivity.customer_premises_equipments.office = { ip_address: '203.0.113.10' };
  const vpn = newVpn('office');
  vpn.remote_cidrs = ['172.20.0.0/16'];
  vpn.tunnels_management.tunnel_1.secretMode = 'inline';
  vpn.tunnels_management.tunnel_1.shared_secret = 'SyntheticSessionSecret123';
  model.hybridConnectivity.ipsecs.office = vpn;
  return model;
}

beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  } } });
});

describe('FastConnect bandwidth format', () => {
  it.each([undefined, '', '1 Gbps', '20 Gbps', '400 Gbps'])('accepts %s without asserting provider availability', (value) => {
    expect(bandwidthShapeError(value)).toBeUndefined();
  });

  it.each(['0 Gbps', '01 Gbps', '1.5 Gbps', '-1 Gbps', '1', '100 Mbps', 'fast', ' 1 Gbps', '1 Gbps ', '1 gbps'])('rejects noncanonical bandwidth %s', (value) => {
    expect(bandwidthShapeError(value)).toBe('Use a positive whole-number bandwidth, for example 1 Gbps.');
  });

  it('includes bandwidth errors in full validation without treating them as route errors', () => {
    const model = design();
    const circuit = model.hybridConnectivity!.fast_connect_virtual_circuits.link = {
      type: 'PRIVATE' as const, remote_cidrs: ['172.20.0.0/16'], bandwidth_shape_name: '100 Mbps',
    };
    expect(validateHybridRoutes(model)).toEqual([]);
    expect(validateHybridConnectivity(model)).toEqual(['FastConnect link bandwidth: Use a positive whole-number bandwidth, for example 1 Gbps.']);
    circuit.bandwidth_shape_name = '20 Gbps';
    expect(validateHybridConnectivity(model)).toEqual([]);
  });

  it('omits an imported blank bandwidth when exporting without changing the model', () => {
    const model = design();
    const circuit = model.hybridConnectivity!.fast_connect_virtual_circuits.link = {
      type: 'PRIVATE' as const, remote_cidrs: ['172.20.0.0/16'], bandwidth_shape_name: '',
    };
    expect(validateHybridConnectivity(model)).toEqual([]);
    expect(buildConfig(model).hybrid_connectivity?.fast_connect_virtual_circuits.link).not.toHaveProperty('bandwidth_shape_name');
    expect(circuit.bandwidth_shape_name).toBe('');
  });
});

describe('hybrid connectivity secrets', () => {
  it.each<[VpnConfig['cpe_local_identifier_type'], string | undefined, boolean]>([
    [undefined, undefined, false],
    ['IP_ADDRESS', undefined, false],
    ['IP_ADDRESS', '203.0.113.10', false],
    ['HOSTNAME', 'vpn.example.com', false],
    ['HOSTNAME', undefined, true],
    ['HOSTNAME', '', true],
    ['HOSTNAME', '   ', true],
  ])('requires a custom identity only for hostname type %s / %s', (cpe_local_identifier_type, cpe_local_identifier, invalid) => {
    const model = design();
    const vpn = model.hybridConnectivity!.ipsecs.office;
    Object.assign(vpn, { cpe_local_identifier_type, cpe_local_identifier });
    const error = 'Enter the hostname your router sends as its IKE identity.';
    expect(vpnIdentityError(vpn)).toBe(invalid ? error : undefined);
    expect(validateHybridConnectivity(model)).toEqual(invalid ? [`VPN office: ${error}`] : []);
  });

  it.each<[VpnTunnel['secretMode'], string | undefined, string | undefined]>([
    ['inline', undefined, 'Re-enter the pre-shared key. Studio clears entered keys when you reopen a design.'],
    ['inline', 'invalid-key!', 'Use only letters, numbers and spaces in the pre-shared key.'],
    ['inline', 'ocid1.vaultsecret.oc1..example', 'Select Existing Vault secret OCID for a Vault secret reference.'],
    ['vault', undefined, 'Enter an existing Vault secret OCID beginning with ocid1.vaultsecret.'],
    ['vault', 'LiteralKey', 'Enter an existing Vault secret OCID beginning with ocid1.vaultsecret.'],
    ['vault', 'ocid1.vaultsecret.oc1..example', undefined],
    ['inline', 'Valid Key 123', undefined],
    ['oci', undefined, undefined],
  ])('explains how to correct a VPN key in %s mode', (secretMode, shared_secret, error) => {
    expect(vpnSharedSecretError({ routing: 'STATIC', secretMode, shared_secret })).toBe(error);
  });

  it('requires a BGP MD5 key only when inline authentication is selected', () => {
    expect(bgpMd5KeyError({ bgp_md5auth_mode: 'inline' })).toBe('Re-enter the BGP MD5 key. Studio clears entered keys when you reopen a design.');
    expect(bgpMd5KeyError({ bgp_md5auth_mode: 'inline', bgp_md5auth_key: 'entered-key' })).toBeUndefined();
    expect(bgpMd5KeyError({ bgp_md5auth_mode: 'none' })).toBeUndefined();
  });

  it('separates route errors from field errors and uses readable tunnel names', () => {
    const model = design();
    const vpn = model.hybridConnectivity!.ipsecs.office;
    vpn.remote_cidrs = ['invalid'];
    vpn.tunnels_management.tunnel_1.shared_secret = '';
    vpn.tunnels_management.tunnel_2.secretMode = 'vault';
    model.hybridConnectivity!.fast_connect_virtual_circuits.link = {
      type: 'PRIVATE', remote_cidrs: ['172.21.0.0/16'],
      cross_connect_mappings: { primary: { bgp_md5auth_mode: 'inline' } },
    };
    expect(validateHybridRoutes(model)).toEqual(['office: enter a valid remote IPv4 CIDR.']);
    expect(validateHybridConnectivity(model)).toEqual([
      `VPN office Tunnel 1: ${vpnSharedSecretError(vpn.tunnels_management.tunnel_1)}`,
      `VPN office Tunnel 2: ${vpnSharedSecretError(vpn.tunnels_management.tunnel_2)}`,
      'FastConnect link BGP mapping primary: Re-enter the BGP MD5 key. Studio clears entered keys when you reopen a design.',
      ...validateHybridRoutes(model),
    ]);
    expect(validateHybridConnectivity(emptyLzModel())).toEqual([]);
  });

  it('keeps identical backup routes valid and rejects partially overlapping routes', () => {
    const model = design();
    const circuit = model.hybridConnectivity!.fast_connect_virtual_circuits.link = { type: 'PRIVATE' as const, remote_cidrs: ['172.20.0.0/16'] };
    expect(validateHybridRoutes(model)).toEqual([]);
    circuit.remote_cidrs = ['172.20.1.0/24'];
    expect(validateHybridRoutes(model)).toEqual(['Remote CIDRs overlap partially; use identical prefixes for backup paths.']);
    circuit.remote_cidrs = [];
    expect(validateHybridRoutes(model)).toEqual(['FastConnect link: enter at least one remote CIDR.']);
  });

  it('exports inline values through native fields but masks previews', () => {
    const model = design();
    const config = buildConfig(model);
    expect(config.hybrid_connectivity?.ipsecs.office.tunnels_management.tunnel_1.shared_secret).toBe('SyntheticSessionSecret123');
    expect(serializeConfig(model)).toContain('SyntheticSessionSecret123');
    expect(serializeConfig(model, 1, true)).not.toContain('hybrid_connectivity');
    expect(serializeConfig(model, 2, true)).toContain('hybrid_connectivity');
    expect(serializeConfig(model, Infinity, true)).not.toContain('SyntheticSessionSecret123');
    expect(JSON.stringify(config)).not.toContain('secretMode');
  });

  it('preserves inline mode while clearing values on every save and reload', () => {
    const model = design();
    const created = createLZ('Private design', model).record!;
    expect(created.model.hybridConnectivity?.ipsecs.office.tunnels_management.tunnel_1.shared_secret).toBe('SyntheticSessionSecret123');
    const loaded = getLZ(created.id)!.model;
    expect(loaded.hybridConnectivity?.ipsecs.office.tunnels_management.tunnel_1.secretMode).toBe('inline');
    expect(JSON.stringify(loaded)).not.toContain('SyntheticSessionSecret123');
    expect(validateHybridConnectivity(loaded).join(' ')).toMatch(/re-enter/i);
    saveLZ(created.id, model);
    expect(JSON.stringify(getLZ(created.id))).not.toContain('SyntheticSessionSecret123');
  });

  it('never caches outputs containing a literal secret, even for an old saved model', () => {
    const created = createLZ().record!;
    saveOutputs(created.id, { config: 'source', files: { 'network.json': JSON.stringify({ shared_secret: 'SyntheticSessionSecret123' }) } });
    expect(getOutputs(created.id)).toBeNull();
    saveOutputs(created.id, { config: 'source', files: { 'network.json': '{}' } });
    expect(getOutputs(created.id)).not.toBeNull();
    saveLZ(created.id, design());
    expect(getOutputs(created.id)).toBeNull();
  });

  it('keeps secrets out of linked and legacy combined DR records', () => {
    const model = design();
    const home = createLZ('Home', model).record!;
    const dr = createDrLZ(home.id).record!;
    expect(dr).toBeDefined();
    expect(saveLZ(dr.id, model).ok).toBe(true);
    const combined = saveDisasterRecoveryLZ({ name: 'Combined', model, draft: createDrDraft(model), sourceLabel: 'Home' }).record!;
    for (const record of [home, dr, combined]) {
      expect(window.localStorage.getItem(`lzng.lz.${record.id}`)).not.toContain('SyntheticSessionSecret123');
      expect(JSON.stringify(getLZ(record.id))).not.toContain('SyntheticSessionSecret123');
    }
  });

  it('retains existing Vault references but clears FastConnect authentication', () => {
    const model = design();
    const tunnel = model.hybridConnectivity!.ipsecs.office.tunnels_management.tunnel_2;
    tunnel.secretMode = 'vault';
    tunnel.shared_secret = 'ocid1.vaultsecret.oc1..example';
    model.hybridConnectivity!.fast_connect_virtual_circuits.link = {
      type: 'PRIVATE', remote_cidrs: ['172.20.0.0/16'], provider_service_id: 'ocid1.providerservice.oc1..example',
      cross_connect_mappings: { primary: { bgp_md5auth_mode: 'inline', bgp_md5auth_key: 'synthetic-md5-secret' } },
    };
    const saved = stripInlineSecrets(model);
    expect(saved.hybridConnectivity?.ipsecs.office.tunnels_management.tunnel_2.shared_secret).toBe(tunnel.shared_secret);
    expect(JSON.stringify(saved)).not.toContain('synthetic-md5-secret');
    expect(validateHybridConnectivity(saved).join(' ')).toMatch(/re-enter/i);
  });
});
