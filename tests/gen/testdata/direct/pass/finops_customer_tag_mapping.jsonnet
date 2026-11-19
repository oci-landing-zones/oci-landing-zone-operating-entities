// Standalone FinOps copies share customer mappings while preserving shared scopes and topology.
// contains: "finops_customer_tag_mapping": true
local customize = import 'addons/oci-finops/finops-setup/customize_tags.jsonnet';
local config = import 'tests/addons/testdata/finops_qa.jsonnet';
local remove_tags = (import 'gen/lib/cost_tags.libsonnet').apply;
local disabled_config = { cost_governance: { enable_tags: false } };
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local qa = customize(config, 'qa');
local shared = customize(config, 'shared');
local disabled = customize(config + { cost_governance: { enable_tags: false } }, 'qa');
local maps(value) =
  if std.type(value) == 'array' then std.flattenArrays([maps(item) for item in value])
  else if std.type(value) != 'object' then []
  else std.flattenArrays([
    if std.member(['defined_tags', 'default_defined_tags'], key) then [value[key]] else maps(value[key])
    for key in std.objectFields(value)
  ]);
local network = qa['finops_network.auto.tfvars.json'];
local network_maps = maps(network);
assert std.length(network_maps) == 31;
assert std.length([tags for tags in network_maps if tags[prefix + 'environment'] == 'qa']) == 9;
assert std.length([tags for tags in network_maps if tags[prefix + 'environment'] == 'shared']) == 22;
assert std.length(maps(qa['finops_iam.auto.tfvars.json'])) == 13;
assert std.foldl(function(ok, tags)
  ok && tags[prefix + 'owner'] == 'qa.owner@example.test' &&
    tags[prefix + 'cost-center'] == (if tags[prefix + 'environment'] == 'shared' then 'SHARED' else 'QA_NETWORK'),
  network_maps, true);
assert std.foldl(function(ok, tags) ok && tags[prefix + 'environment'] == 'shared', maps(shared), true);
assert disabled['finops_adb.auto.tfvars.json'] == {
  enable_cost_governance_tags: false, defined_tags: {}, database_defined_tags: {},
};
assert maps(disabled['finops_network.auto.tfvars.json']) == [];
assert maps(disabled['finops_iam.auto.tfvars.json']) == [];
assert remove_tags(network, disabled_config) == remove_tags(import 'addons/oci-finops/finops-setup/finops_network.auto.tfvars.json', disabled_config);
assert remove_tags(qa['finops_iam.auto.tfvars.json'], disabled_config) == remove_tags(import 'addons/oci-finops/finops-setup/finops_iam.auto.tfvars.json', disabled_config);
local hub_drg = network.network_configuration.network_configuration_categories.shared.non_vcn_specific_gateways.dynamic_routing_gateways['DRG-FRA-LZP-HUB-KEY'];
assert hub_drg.defined_tags[prefix + 'environment'] == 'shared';
assert hub_drg.drg_attachments['DRGATT-FRA-LZP-P-FINOPS-VCN-KEY'].defined_tags[prefix + 'environment'] == 'qa';
{ finops_customer_tag_mapping: true }
