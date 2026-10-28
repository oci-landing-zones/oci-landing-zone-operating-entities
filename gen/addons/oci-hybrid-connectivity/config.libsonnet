// Validates the released Networking v0.9.0 hybrid connectivity input surface.
// normalize(raw) -> normalized connectivity; remote_cidrs(config) -> unique routes.
local v = import '../../lib/validation.libsonnet';
local cidrs = import '../../lib/cidrs.libsonnet';
local collections = import '../../lib/collections.libsonnet';
local ipsec_options = import 'ipsec-options.json';

local get(o, k, fallback=null) = if std.objectHas(o, k) && o[k] != null then o[k] else fallback;
local object(o, label, keys) = v.allowed_keys(v.object(o, label), label, keys);
local text(value, label) =
  assert std.type(value) == 'string' && std.length(value) > 0 : label + ' must be a non-empty string';
  value;
local named_map(raw, label, render) =
  local values = v.object(raw, label);
  local names = std.objectFields(values);
  local segments = [std.strReplace(name, '_', '-') for name in names];
  assert std.length(collections.unique(segments)) == std.length(names) : label + ' names collide after normalization';
  {
    [name]:
      assert std.length(name) > 0 && std.length(name) <= 40 && collections.all([
        std.member(std.stringChars('abcdefghijklmnopqrstuvwxyz0123456789-_'), c)
        for c in std.stringChars(name)
      ]) : label + ' names must contain lowercase letters, numbers, hyphens or underscores (1-40 characters)';
      render(values[name], label + '.' + name)
    for name in names
  };
local cidr_list(raw, label) = [
  cidrs.validate(label, value)
  for value in v.array(raw, label, require_non_empty=true)
];
local ip(value, label) = cidrs.parse(label, text(value, label) + '/32').base_int;
local asn(value, label) =
  local s = if std.type(value) == 'number' then std.toString(value) else value;
  local number = cidrs.parse_decimal(label, s);
  assert number >= 1 && number <= 4294967294 && number != 65534 : label + ' must be a valid customer ASN (65534 is reserved by OCI)';
  s;
local interface(value, label, min_prefix) =
  local parts = std.split(text(value, label), '/');
  assert std.length(parts) == 2 : label + ' must be an IPv4 interface address with prefix';
  local address = ip(parts[0], label);
  local prefix = cidrs.parse_decimal(label, parts[1]);
  assert prefix >= min_prefix && prefix <= 31 : label + ' has an unsupported interface prefix';
  { address: address, prefix: prefix, base: std.floor(address / cidrs.block_size(prefix)) };
local pair(o, customer, oracle, label, min_prefix) =
  local a = get(o, customer);
  local b = get(o, oracle);
  assert (a == null) == (b == null) : label + ' requires both customer and Oracle interface addresses';
  if a == null then true else
    local x = interface(a, label + '.' + customer, min_prefix);
    local y = interface(b, label + '.' + oracle, min_prefix);
    assert x.prefix == y.prefix && x.base == y.base && x.address != y.address :
      label + ' interface addresses must be different hosts in the same subnet';
    assert x.prefix != 30 || (x.address % 4 != 0 && x.address % 4 != 3 && y.address % 4 != 0 && y.address % 4 != 3) :
      label + ' interface addresses cannot use network or broadcast addresses';
    true;
local secret(value, label, vpn=false) =
  local s = text(value, label);
  assert !vpn || std.startsWith(s, 'ocid1.vaultsecret.') || collections.all([
    std.member(std.stringChars('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '), c)
    for c in std.stringChars(s)
  ]) : label + ' must use letters, numbers and spaces, or reference an existing Vault secret';
  s;
local phase(raw, label, one) =
  local options = ipsec_options[if one then 'phase_one_details' else 'phase_two_details'];
  local string_keys = std.objectFields(options);
  local bool_keys = if one then ['is_custom_phase_one_config'] else ['is_custom_phase_two_config', 'is_pfs_enabled'];
  local o = object(raw, label, string_keys + bool_keys + ['lifetime']);
  assert collections.all([
    assert std.member(options[k], o[k]) : label + '.' + k + ' must be one of: ' + std.join(', ', options[k]);
    true
    for k in string_keys if get(o, k) != null
  ]);
  assert collections.all([std.type(o[k]) == 'boolean' for k in bool_keys if get(o, k) != null]) : label + ' flags must be booleans';
  assert get(o, 'lifetime') == null || (std.type(o.lifetime) == 'number' && o.lifetime > 0) : label + ' lifetime must be positive';
  o;
local tunnel(raw, label) =
  local o = object(raw, label, ['routing', 'bgp_session_info', 'shared_secret', 'ike_version', 'phase_one_details', 'phase_two_details']);
  local routing = get(o, 'routing');
  assert std.member(['STATIC', 'BGP'], routing) : label + '.routing must be STATIC or BGP';
  local bgp = get(o, 'bgp_session_info', {});
  local checked = object(bgp, label + '.bgp_session_info', ['customer_bgp_asn', 'customer_interface_ip', 'oracle_interface_ip']);
  assert routing != 'BGP' || (get(checked, 'customer_bgp_asn') != null && get(checked, 'customer_interface_ip') != null) : label + ' BGP requires ASN and interface addresses';
  assert routing != 'STATIC' || get(checked, 'customer_bgp_asn') == null : label + ' static routing must omit customer_bgp_asn';
  assert pair(checked, 'customer_interface_ip', 'oracle_interface_ip', label, 30);
  assert collections.all([
    local address = interface(checked[k], label + '.' + k, 30).address;
    address < ip(range[0], label) || address > ip(range[1], label)
    for k in ['customer_interface_ip', 'oracle_interface_ip'] if get(checked, k) != null
    for range in [
      ['169.254.10.0', '169.254.19.255'],
      ['169.254.100.0', '169.254.109.255'],
      ['169.254.192.0', '169.254.201.255'],
    ]
  ]) : label + ' inside-tunnel addresses use an OCI-reserved range; see the OCI VPN setup guide';
  assert get(o, 'ike_version', 'V2') == 'V1' || get(o, 'ike_version', 'V2') == 'V2' : label + '.ike_version must be V1 or V2';
  o + {
    ike_version: get(o, 'ike_version', 'V2'),
    [if std.length(std.objectFields(checked)) > 0 then 'bgp_session_info']:
      checked + { [if get(checked, 'customer_bgp_asn') != null then 'customer_bgp_asn']: asn(checked.customer_bgp_asn, label) },
    [if get(o, 'shared_secret') != null then 'shared_secret']: secret(o.shared_secret, label + '.shared_secret', vpn=true),
    [if get(o, 'phase_one_details') != null then 'phase_one_details']: phase(o.phase_one_details, label + '.phase_one_details', true),
    [if get(o, 'phase_two_details') != null then 'phase_two_details']: phase(o.phase_two_details, label + '.phase_two_details', false),
  };
local mapping(raw, label) =
  local o = object(raw, label, ['bgp_md5auth_key', 'cross_connect_or_cross_connect_group_id', 'customer_bgp_peering_ip', 'oracle_bgp_peering_ip', 'vlan']);
  assert get(o, 'cross_connect_or_cross_connect_group_id') == null || std.startsWith(text(o.cross_connect_or_cross_connect_group_id, label), 'ocid1.crossconnect') : label + ' requires a cross-connect or group OCID';
  assert pair(o, 'customer_bgp_peering_ip', 'oracle_bgp_peering_ip', label, 28);
  assert get(o, 'vlan') == null || (cidrs.parse_decimal(label + '.vlan', std.toString(o.vlan)) >= 100 && cidrs.parse_decimal(label + '.vlan', std.toString(o.vlan)) <= 4094) : label + '.vlan must be 100-4094';
  o + { [if get(o, 'bgp_md5auth_key') != null then 'bgp_md5auth_key']: secret(o.bgp_md5auth_key, label + '.bgp_md5auth_key') };

{
  normalize(raw)::
    local root = object(raw, 'hybrid_connectivity', ['customer_premises_equipments', 'ipsecs', 'fast_connect_virtual_circuits', 'cross_connect_groups']);
    local cpes = named_map(get(root, 'customer_premises_equipments', {}), 'hybrid_connectivity.customer_premises_equipments', function(raw, label)
      local o = object(raw, label, ['ip_address', 'cpe_device_shape_id', 'cpe_device_shape_vendor_name']);
      assert ip(v.required(o, 'ip_address', label + '.ip_address'), label) > 0;
      assert get(o, 'cpe_device_shape_id') == null || get(o, 'cpe_device_shape_vendor_name') == null : label + ' must choose cpe_device_shape_id or cpe_device_shape_vendor_name, not both';
      assert collections.all([
        local value = text(o[k], label + '.' + k);
        std.length(std.stripChars(value, ' \t\r\n')) > 0
        for k in ['cpe_device_shape_id', 'cpe_device_shape_vendor_name'] if get(o, k) != null
      ]) : label + ' device shape ID/vendor must be nonblank strings';
      o
    );
    local vpns = named_map(get(root, 'ipsecs', {}), 'hybrid_connectivity.ipsecs', function(raw, label)
      local o = object(raw, label, ['cpe_id', 'cpe_key', 'remote_cidrs', 'tunnels_management', 'cpe_local_identifier', 'cpe_local_identifier_type']);
      assert (get(o, 'cpe_id') != null) != (get(o, 'cpe_key') != null) : label + ' requires exactly one of cpe_id or cpe_key';
      assert get(o, 'cpe_key') == null || std.objectHas(cpes, o.cpe_key) : label + ' references an unknown CPE';
      assert get(o, 'cpe_id') == null || std.startsWith(text(o.cpe_id, label), 'ocid1.cpe.') : label + '.cpe_id must be a CPE OCID';
      assert get(o, 'cpe_local_identifier_type') == null || std.member(['IP_ADDRESS', 'HOSTNAME'], o.cpe_local_identifier_type) : label + '.cpe_local_identifier_type must be IP_ADDRESS or HOSTNAME';
      assert get(o, 'cpe_local_identifier_type') != 'HOSTNAME' || (
        std.type(get(o, 'cpe_local_identifier')) == 'string' && std.length(std.stripChars(o.cpe_local_identifier, ' \t\r\n')) > 0
      ) : label + '.cpe_local_identifier is required when cpe_local_identifier_type is HOSTNAME';
      local tunnels = object(v.required(o, 'tunnels_management', label + '.tunnels_management'), label + '.tunnels_management', ['tunnel_1', 'tunnel_2']);
      o + {
        remote_cidrs: cidr_list(v.required(o, 'remote_cidrs', label + '.remote_cidrs'), label + '.remote_cidrs'),
        tunnels_management: {
          [k]: tunnel(v.required(tunnels, k, label + '.' + k), label + '.' + k)
          for k in ['tunnel_1', 'tunnel_2']
        },
      }
    );
    local circuits = named_map(get(root, 'fast_connect_virtual_circuits', {}), 'hybrid_connectivity.fast_connect_virtual_circuits', function(raw, label)
      local o = object(raw, label, ['type', 'remote_cidrs', 'bandwidth_shape_name', 'bgp_admin_state', 'cross_connect_mappings', 'customer_asn', 'ip_mtu', 'is_bfd_enabled', 'provider_service_id', 'provider_service_key_name', 'provision_fc_virtual_circuit']);
      assert get(o, 'type') == 'PRIVATE' : label + ': only private FastConnect circuits are supported; set type to PRIVATE';
      assert !std.objectHas(o, 'bandwidth_shape_name') || (
        local parts = std.split(text(o.bandwidth_shape_name, label + '.bandwidth_shape_name'), ' ');
        std.length(parts) == 2 && parts[1] == 'Gbps'
        && cidrs.is_canonical_decimal_string(parts[0])
        && cidrs.parse_decimal(label + '.bandwidth_shape_name', parts[0]) > 0
      ) : label + '.bandwidth_shape_name must be a positive integer followed by " Gbps", for example "20 Gbps"';
      local mappings = named_map(get(o, 'cross_connect_mappings', {}), label + '.cross_connect_mappings', mapping);
      assert get(o, 'provider_service_id') != null || std.length([m for m in std.objectValues(mappings) if get(m, 'cross_connect_or_cross_connect_group_id') != null]) > 0 : label + ' requires a provider service OCID or existing cross-connect OCID';
      assert get(o, 'provider_service_id') == null || std.startsWith(text(o.provider_service_id, label), 'ocid1.') : label + '.provider_service_id must be an OCID';
      assert get(o, 'is_bfd_enabled') == null || std.type(o.is_bfd_enabled) == 'boolean' : label + '.is_bfd_enabled must be boolean';
      assert std.type(get(o, 'provision_fc_virtual_circuit', true)) == 'boolean' : label + '.provision_fc_virtual_circuit must be boolean';
      o + {
        remote_cidrs: cidr_list(v.required(o, 'remote_cidrs', label + '.remote_cidrs'), label + '.remote_cidrs'),
        [if get(o, 'customer_asn') != null then 'customer_asn']: asn(o.customer_asn, label + '.customer_asn'),
        cross_connect_mappings: mappings,
        provision_fc_virtual_circuit: get(o, 'provision_fc_virtual_circuit', true),
        show_available_fc_virtual_circuit_providers: false,
      }
    );
    local groups = named_map(get(root, 'cross_connect_groups', {}), 'hybrid_connectivity.cross_connect_groups', function(raw, label)
      local o = object(raw, label, ['customer_reference_name', 'cross_connects']);
      o + { cross_connects: named_map(get(o, 'cross_connects', {}), label + '.cross_connects', function(raw, label)
        local c = object(raw, label, ['location_name', 'port_speed_shape_name', 'customer_reference_name', 'far_cross_connect_or_cross_connect_group_id', 'near_cross_connect_or_cross_connect_group_id']);
        assert text(v.required(c, 'location_name', label), label) != '';
        assert text(v.required(c, 'port_speed_shape_name', label), label) != '';
        c
      ) }
    );
    { customer_premises_equipments: cpes, ipsecs: vpns, fast_connect_virtual_circuits: circuits, cross_connect_groups: groups },

  remote_cidrs(config):: collections.unique(std.flattenArrays([
    c.remote_cidrs
    for c in std.objectValues(config.ipsecs) + std.objectValues(config.fast_connect_virtual_circuits)
    if get(c, 'remote_cidrs') != null && get(c, 'provision_fc_virtual_circuit', true)
  ])),
}
