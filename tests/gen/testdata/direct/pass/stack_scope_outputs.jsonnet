// Stack scope controls output ownership without changing resource construction.
// contains: "complete_is_backward_compatible": true
// contains: "regional_is_allow_listed": true
// contains: "regional_hub_c_keeps_backends": true
local defaults = import 'gen/defaults.libsonnet';
local generate = import 'gen/landing_zone_multi.jsonnet';

local implicit_complete = generate(defaults.hub_c);
local explicit_complete = generate(defaults.hub_c { stack_scope: 'complete' });
local regional = generate(defaults.hub_c {
  region: 'uk-london-1',
  region_short_name: 'lhr',
  stack_scope: 'regional',
});
local expected_regional = [
  'network.json',
  'network_backends.json',
  'network_pre.json',
  'observability_cis2.json',
  'observability_cis2_pre.json',
  'security_cis2.json',
];

{
  complete_is_backward_compatible:
    implicit_complete == explicit_complete,
  regional_is_allow_listed:
    std.sort(std.objectFields(regional)) == std.sort(expected_regional) &&
    !std.objectHas(regional['security_cis2.json'], 'cloud_guard_configuration') &&
    !std.objectHas(regional['security_cis2.json'], 'security_zones_configuration') &&
    !std.objectHas(regional['security_cis2.json'], 'vaults_configuration') &&
    !std.objectHas(
      regional['observability_cis2.json'],
      'home_region_events_configuration'
    ),
  regional_hub_c_keeps_backends:
    std.objectHas(regional, 'network_backends.json'),
}
