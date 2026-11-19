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
local bootstrap = finops['governance_pre.json'];
local final = finops['governance.json'];
assert bootstrap.budgets_configuration == final.budgets_configuration;
assert std.foldl(function(ok, key)
  local original = bootstrap.tags_configuration.namespaces[key];
  local namespace = final.tags_configuration.namespaces[key];
  ok && !std.objectHas(original, 'defined_tags') &&
    std.foldl(function(untagged, tag) untagged && !std.objectHas(tag, 'defined_tags'), std.objectValues(original.tags), true) &&
    std.foldl(function(tagged, resource)
      tagged && resource.defined_tags[prefix + 'platform'] == 'governance' &&
      resource.defined_tags[prefix + 'environment'] == 'shared' &&
      resource.defined_tags[prefix + 'project'] == 'notapplicable' &&
      resource.defined_tags[prefix + 'owner'] == 'owner@example.com' &&
      resource.defined_tags[prefix + 'cost-center'] == 'CC12345',
      [namespace] + std.objectValues(namespace.tags), true),
  std.objectFields(final.tags_configuration.namespaces), true);
assert !std.objectHas(legacy, 'governance_pre.json');
assert !std.objectHas(legacy['governance.json'].tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'], 'defined_tags');
assert !std.objectHas(disabled_dr, 'iam.json') && !std.objectHas(disabled_dr, 'governance.json') && !std.objectHas(disabled_dr, 'governance_pre.json');
assert std.length(std.findSubstr('tagns-lz-cost-governance', std.manifestJson(disabled_dr['security_cis1.json']))) == 0;
local expected_regional = [
  'network.json',
  'network_backends.json',
  'observability_cis2.json',
  'security_cis2.json',
  'security_cis2_pre.json',
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
