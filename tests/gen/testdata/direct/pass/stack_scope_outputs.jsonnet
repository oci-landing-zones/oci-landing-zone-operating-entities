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
local finops_config = {
  cis_level: 1,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  cost_governance: {
    require_tag_values: true, tag_resource_labels: true, owner_email: 'owner@example.com',
    cost_center_assignments: { CC12345: {} },
  },
};
local finops = generate(finops_config);
local legacy = generate(finops_config + { cost_governance: { tag_resource_labels: false } });
local disabled_dr = generate(finops_config + {
  stack_scope: 'regional',
  cost_governance: { enable_tags: false, require_tag_values: false, tag_resource_labels: false },
});
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local final = finops['governance.json'];
local baseline = (import 'gen/landing_zone.libsonnet')(finops_config).governance;
assert !std.objectHas(finops, 'governance_pre.json');
assert final == baseline;
assert std.foldl(function(ok, namespace)
  ok && !std.objectHas(namespace, 'defined_tags') &&
    std.foldl(function(untagged, tag) untagged && !std.objectHas(tag, 'defined_tags'), std.objectValues(namespace.tags), true),
  std.objectValues(final.tags_configuration.namespaces), true);
assert std.length(std.objectFields(final.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags)) == 6;
assert finops['iam.json'].compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].defined_tags[prefix + 'owner'] == 'owner@example.com';
assert !std.objectHas(legacy, 'governance_pre.json');
assert !std.objectHas(legacy['governance.json'].tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'], 'defined_tags');
assert !std.objectHas(disabled_dr, 'iam.json') && !std.objectHas(disabled_dr, 'governance.json') && !std.objectHas(disabled_dr, 'governance_pre.json');
assert std.length(std.findSubstr('tagns-lz-cost-governance', std.manifestJson(disabled_dr['security_cis1.json']))) == 0;
local expected_regional = [
  'network.json',
  'network_backends.json',
  'observability_cis2.json',
  'security_cis2.json',
];

{
  complete_is_backward_compatible:
    implicit_complete == explicit_complete,
  regional_is_allow_listed:
    std.sort(std.objectFields(regional)) == std.sort(expected_regional) &&
    !std.objectHas(regional['security_cis2.json'], 'cloud_guard_configuration') &&
    !std.objectHas(regional['security_cis2.json'], 'security_zones_configuration') &&
    std.objectHas(regional['security_cis2.json'], 'vaults_configuration') &&
    !std.objectHas(
      regional['observability_cis2.json'],
      'home_region_events_configuration'
    ),
  regional_hub_c_keeps_backends:
    std.objectHas(regional, 'network_backends.json'),
}
