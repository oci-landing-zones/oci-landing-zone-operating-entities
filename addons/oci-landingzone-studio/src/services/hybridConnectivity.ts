import type { CrossConnectMapping, HybridConnectivity, VpnConfig, VpnTunnel } from '../model/hybridConnectivity';
import type { LzModel } from '../model/types';
import { parseCidr, overlaps } from './cidr';
import { providerSelectionError } from './connectivityCatalog';

export function emptyHybridConnectivity(): HybridConnectivity {
  return { customer_premises_equipments: {}, ipsecs: {}, fast_connect_virtual_circuits: {}, cross_connect_groups: {} };
}

export function newVpn(cpe: string): VpnConfig {
  return {
    cpe_key: cpe, remote_cidrs: [],
    tunnels_management: {
      tunnel_1: { routing: 'STATIC', ike_version: 'V2', secretMode: 'oci' },
      tunnel_2: { routing: 'STATIC', ike_version: 'V2', secretMode: 'oci' },
    },
  };
}

export function vpnCpeNodeId(vpn: VpnConfig): string {
  return vpn.cpe_key ? `hybrid-cpe-${vpn.cpe_key}` : `hybrid-cpe-existing:${vpn.cpe_id ?? ''}`;
}

const literal = (value: unknown) => typeof value === 'string' && value.length > 0 && !value.startsWith('ocid1.vaultsecret.');

/** Also checks rendered outputs at the persistence boundary, independently of UI mode. */
export function containsInlineSecrets(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    (key === 'secretMode' && child === 'inline')
    || (key === 'bgp_md5auth_mode' && child === 'inline')
    || (key === 'shared_secret' && literal(child))
    || (key === 'bgp_md5auth_key' && typeof child === 'string' && child.length > 0)
    || containsInlineSecrets(child));
}

/** Retain the required mode so a reload cannot silently disable authentication. */
export function stripInlineSecrets(model: LzModel, replacement = ''): LzModel {
  if (!model.hybridConnectivity) return model;
  const hybrid = structuredClone(model.hybridConnectivity);
  for (const vpn of Object.values(hybrid.ipsecs)) {
    for (const tunnel of Object.values(vpn.tunnels_management)) {
      if (tunnel.secretMode === 'inline' || literal(tunnel.shared_secret)) {
        tunnel.secretMode = 'inline';
        tunnel.shared_secret = replacement;
      }
    }
  }
  for (const circuit of Object.values(hybrid.fast_connect_virtual_circuits)) {
    if (circuit.provider_service_id === '') delete circuit.provider_service_id;
    for (const mapping of Object.values(circuit.cross_connect_mappings ?? {})) {
      if (mapping.bgp_md5auth_mode === 'inline' || mapping.bgp_md5auth_key) {
        mapping.bgp_md5auth_mode = 'inline';
        mapping.bgp_md5auth_key = replacement;
      }
    }
  }
  return { ...model, hybridConnectivity: hybrid };
}

export function hybridConfig(model: LzModel): HybridConnectivity | undefined {
  if (!model.hybridConnectivity) return undefined;
  const hybrid = structuredClone(model.hybridConnectivity);
  if (Object.values(hybrid).every((entries) => Object.keys(entries).length === 0)) return undefined;
  for (const [name, cpe] of Object.entries(hybrid.customer_premises_equipments)) {
    hybrid.customer_premises_equipments[name] = { ip_address: cpe.ip_address };
  }
  for (const vpn of Object.values(hybrid.ipsecs)) {
    for (const tunnel of Object.values(vpn.tunnels_management)) {
      if (tunnel.secretMode === 'oci') delete tunnel.shared_secret;
      delete tunnel.secretMode;
    }
  }
  for (const circuit of Object.values(hybrid.fast_connect_virtual_circuits)) {
    if (circuit.bandwidth_shape_name === '') delete circuit.bandwidth_shape_name;
    if (circuit.provider_service_id === '') delete circuit.provider_service_id;
    for (const mapping of Object.values(circuit.cross_connect_mappings ?? {})) {
      if (mapping.bgp_md5auth_mode === 'none') delete mapping.bgp_md5auth_key;
      delete mapping.bgp_md5auth_mode;
    }
  }
  return hybrid;
}

export interface HybridRoute {
  id: string;
  name: string;
  type: 'VPN' | 'FastConnect';
  cidrs: string[];
}

export function hybridRoutes(model: LzModel): HybridRoute[] {
  const h = model.hybridConnectivity;
  if (!h) return [];
  return [
    ...Object.entries(h.ipsecs).map(([name, vpn]) => ({ id: `hybrid-vpn-${name}`, name, type: 'VPN' as const, cidrs: vpn.remote_cidrs })),
    ...Object.entries(h.fast_connect_virtual_circuits)
      .filter(([, c]) => c.type === 'PRIVATE' && c.provision_fc_virtual_circuit !== false)
      .map(([name, c]) => ({ id: `hybrid-fc-${name}`, name, type: 'FastConnect' as const, cidrs: c.remote_cidrs ?? [] })),
  ];
}

export function vpnSharedSecretError(tunnel: VpnTunnel): string | undefined {
  if (tunnel.secretMode === 'inline') {
    if (!tunnel.shared_secret) return 'Re-enter the pre-shared key. Studio clears entered keys when you reopen a design.';
    if (tunnel.shared_secret.startsWith('ocid1.vaultsecret.')) return 'Select Existing Vault secret OCID for a Vault secret reference.';
    if (!/^[a-zA-Z0-9 ]+$/.test(tunnel.shared_secret)) return 'Use only letters, numbers and spaces in the pre-shared key.';
  }
  if (tunnel.secretMode === 'vault' && !tunnel.shared_secret?.startsWith('ocid1.vaultsecret.')) return 'Enter an existing Vault secret OCID beginning with ocid1.vaultsecret.';
}

export function vpnIdentityError(vpn: VpnConfig): string | undefined {
  if (vpn.cpe_local_identifier_type === 'HOSTNAME' && !vpn.cpe_local_identifier?.trim()) return 'Enter the hostname your router sends as its IKE identity.';
}

export function bgpMd5KeyError(mapping: CrossConnectMapping): string | undefined {
  if (mapping.bgp_md5auth_mode === 'inline' && !mapping.bgp_md5auth_key) return 'Re-enter the BGP MD5 key. Studio clears entered keys when you reopen a design.';
}

export function bandwidthShapeError(value?: string): string | undefined {
  if (value && !/^[1-9][0-9]* Gbps$/.test(value)) return 'Use a positive whole-number bandwidth, for example 1 Gbps.';
}

export function validateHybridConnectivity(model: LzModel): string[] {
  const h = model.hybridConnectivity;
  if (!h) return [];
  const errors: string[] = [];
  for (const [name, vpn] of Object.entries(h.ipsecs)) {
    const identityError = vpnIdentityError(vpn);
    if (identityError) errors.push(`VPN ${name}: ${identityError}`);
    for (const [key, tunnel] of Object.entries(vpn.tunnels_management)) {
      const error = vpnSharedSecretError(tunnel);
      if (error) errors.push(`VPN ${name} ${key === 'tunnel_1' ? 'Tunnel 1' : 'Tunnel 2'}: ${error}`);
    }
  }
  for (const [name, c] of Object.entries(h.fast_connect_virtual_circuits)) {
    const providerError = providerSelectionError(c, model.foundation.realm, model.foundation.region);
    if (providerError) errors.push(`FastConnect ${name}: ${providerError}`);
    const bandwidthError = bandwidthShapeError(c.bandwidth_shape_name);
    if (bandwidthError) errors.push(`FastConnect ${name} bandwidth: ${bandwidthError}`);
    for (const [key, m] of Object.entries(c.cross_connect_mappings ?? {})) {
      const error = bgpMd5KeyError(m);
      if (error) errors.push(`FastConnect ${name} BGP mapping ${key}: ${error}`);
    }
  }
  return [...errors, ...validateHybridRoutes(model)];
}

export function validateHybridRoutes(model: LzModel): string[] {
  const errors: string[] = [];
  for (const [name, circuit] of Object.entries(model.hybridConnectivity?.fast_connect_virtual_circuits ?? {})) {
    if (circuit.type !== 'PRIVATE') errors.push(`FastConnect ${name}: only private FastConnect circuits are supported. Remove this circuit from the design.`);
  }
  const connections = hybridRoutes(model);
  const routes = connections.flatMap((r) => r.cidrs.map((cidr) => ({ name: r.name, cidr })));
  for (const r of connections) if (r.cidrs.length === 0) errors.push(`${r.type} ${r.name}: enter at least one remote CIDR.`);
  for (const r of routes) if (!parseCidr(r.cidr)) errors.push(`${r.name}: enter a valid remote IPv4 CIDR.`);
  const unique = [...new Set(routes.map((r) => r.cidr))].filter((c) => parseCidr(c));
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) if (overlaps(unique[i], unique[j])) errors.push('Remote CIDRs overlap partially; use identical prefixes for backup paths.');
  }
  return errors;
}
