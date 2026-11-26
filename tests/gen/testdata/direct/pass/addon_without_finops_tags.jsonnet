// Published add-ons can be adapted for Studio without FinOps while originals remain tagged.
// contains: "addon_without_finops_tags": true
local apply = (import 'gen/lib/cost_tags.libsonnet').apply;
local documents = {
  dns: import 'addons/oci-private-dns/oneoe_network_hub_a_private_dns.json',
  finops: import 'addons/oci-finops/finops-setup/finops_network.auto.tfvars.json',
  tbac: import 'addons/oci-tbac/oci_open_lz_one-oe_iam.auto.tfvars.json',
  governance: import 'blueprints/one-oe/runtime/one-stack/oneoe_governance.json',
};
local adapted = { [name]: apply(documents[name], { cost_governance: { enable_tags: false } }) for name in std.objectFields(documents) };
local prefix = 'tagns-lz-cost-governance';
local has_finops(value) =
  if std.type(value) == 'array' then std.length([item for item in value if has_finops(item)]) > 0
  else if std.type(value) != 'object' then false
  else std.length([key for key in std.objectFields(value) if std.startsWith(key, prefix) || has_finops(value[key])]) > 0;
assert std.foldl(function(ok, name)
  ok && has_finops(documents[name]) && !has_finops(adapted[name]),
  std.objectFields(documents), true);
assert !std.objectHas(adapted.governance.tags_configuration.namespaces, 'TAGNS-LZ-COST-GOVERNANCE-KEY');
assert !std.objectHas(adapted.dns.network_configuration, 'default_defined_tags');
assert adapted.dns.network_configuration.default_compartment_id == documents.dns.network_configuration.default_compartment_id;
assert std.objectFields(adapted.dns.network_configuration.network_configuration_categories['0-shared'].vcns) ==
  std.objectFields(documents.dns.network_configuration.network_configuration_categories['0-shared'].vcns);
assert adapted.tbac.groups_configuration.groups['GRP-LZP-PROD-PROJ2-ADMINS'].defined_tags['tn-lzp-proj-role.proj-admin'] == 'grp-lzp-prod-proj2';
local budgets = adapted.governance.budgets_configuration.budgets;
assert std.objectHas(budgets, 'BUDGET-LANDINGZONE-KEY');
assert budgets['BUDGET-LANDINGZONE-KEY'].amount == documents.governance.budgets_configuration.budgets['BUDGET-LANDINGZONE-KEY'].amount;
assert std.foldl(function(ok, budget) ok && budget.target.type != 'TAG', std.objectValues(budgets), true);
local tags = documents.governance.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags;
assert std.foldl(function(ok, tag)
  ok && std.foldl(function(valid, item) valid && !item.is_user_required, std.objectValues(tag.tag_defaults), true),
  std.objectValues(tags), true);
{ addon_without_finops_tags: true }
