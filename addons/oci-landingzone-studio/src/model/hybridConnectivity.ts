export { default as ipsecPhaseOptions } from '../../../../gen/addons/oci-hybrid-connectivity/ipsec-options.json';

export interface CpeConfig {
  ip_address: string;
  cpe_device_shape_id?: string;
  cpe_device_shape_vendor_name?: string;
}

export interface VpnTunnel {
  routing: 'STATIC' | 'BGP';
  ike_version?: 'V1' | 'V2';
  secretMode?: 'oci' | 'vault' | 'inline';
  shared_secret?: string;
  bgp_session_info?: { customer_bgp_asn?: string; customer_interface_ip?: string; oracle_interface_ip?: string };
  phase_one_details?: Record<string, string | number | boolean>;
  phase_two_details?: Record<string, string | number | boolean>;
}

export interface VpnConfig {
  cpe_key?: string;
  cpe_id?: string;
  remote_cidrs: string[];
  cpe_local_identifier?: string;
  cpe_local_identifier_type?: string;
  tunnels_management: { tunnel_1: VpnTunnel; tunnel_2: VpnTunnel };
}

export interface CrossConnectMapping {
  cross_connect_or_cross_connect_group_id?: string;
  customer_bgp_peering_ip?: string;
  oracle_bgp_peering_ip?: string;
  vlan?: string;
  bgp_md5auth_mode?: 'none' | 'inline';
  bgp_md5auth_key?: string;
}

export interface FastConnectConfig {
  type: 'PRIVATE';
  remote_cidrs?: string[];
  provider_service_id?: string;
  provider_service_key_name?: string;
  bandwidth_shape_name?: string;
  customer_asn?: string;
  cross_connect_mappings?: Record<string, CrossConnectMapping>;
  ip_mtu?: number;
  is_bfd_enabled?: boolean;
  bgp_admin_state?: 'ENABLED' | 'DISABLED';
  provision_fc_virtual_circuit?: boolean;
}

export interface CrossConnectConfig {
  location_name: string;
  port_speed_shape_name: string;
  customer_reference_name?: string;
  far_cross_connect_or_cross_connect_group_id?: string;
  near_cross_connect_or_cross_connect_group_id?: string;
}

export interface HybridConnectivity {
  customer_premises_equipments: Record<string, CpeConfig>;
  ipsecs: Record<string, VpnConfig>;
  fast_connect_virtual_circuits: Record<string, FastConnectConfig>;
  cross_connect_groups: Record<string, { customer_reference_name?: string; cross_connects: Record<string, CrossConnectConfig> }>;
}
