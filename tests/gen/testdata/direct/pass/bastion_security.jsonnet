// Bastion is opt-in and uses stable hub dependencies in every security phase.
// contains: "verified": true
local normalize = (import 'gen/config.libsonnet').normalize;
local render = import 'gen/landing_zone.libsonnet';
local multi = import 'gen/landing_zone_multi.jsonnet';
local base = { hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } } };
local settings = { client_cidr_block_allow_list: ['203.0.113.10/32'] };
assert normalize(base).bastion == null;
assert normalize(base + { bastion: null }).bastion == null;
assert normalize(base + { bastion: settings }).bastion.max_session_ttl_in_seconds == 3600;
assert !std.objectHas(render(base).security_cis2, 'bastions_configuration');
assert std.all([
  local output = render(base + {
    hub+: { kind: kind },
    bastion: settings + { max_session_ttl_in_seconds: ttl },
  });
  local expected = {
    bastion_type: 'STANDARD',
    compartment_id: 'CMP-LZ-SECURITY-KEY',
    subnet_id: 'SN-FRA-LZ-HUB-MGMT-KEY',
    cidr_block_allow_list: settings.client_cidr_block_allow_list,
    enable_dns_proxy: true,
    max_session_ttl_in_seconds: ttl,
    name: 'bastionfralzhub',
  };
  std.all([
    local configuration = output[field].bastions_configuration;
    std.objectFields(configuration.bastions) == ['BASTION-FRA-LZ-HUB-KEY']
    && configuration.bastions['BASTION-FRA-LZ-HUB-KEY'] == expected
    && !std.objectHas(output[field], 'sessions_configuration')
    for field in ['security_cis1_pre', 'security_cis1', 'security_cis2_pre', 'security_cis2']
  ])
  for kind in ['hub_a', 'hub_b', 'hub_c', 'hub_e']
  for ttl in [1800, 10800]
]);
local regional = multi(base + { bastion: settings, stack_scope: 'regional' });
assert !std.objectHas(regional, 'iam.json');
assert std.objectHas(regional['security_cis2.json'], 'bastions_configuration');
{ verified: true }
