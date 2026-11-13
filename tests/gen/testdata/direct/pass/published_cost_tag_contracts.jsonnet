// Representative published inputs keep valid cost tags, IAM role tags, and the agreed budget defaults.
// contains: "published_contracts": true
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local governance = import 'blueprints/one-oe/runtime/one-stack/oneoe_governance.json';
local definitions = governance.tags_configuration.namespaces['TAGNS-LZ-COST-GOVERNANCE-KEY'].tags;
local allowed = { [prefix + std.substr(tag.name, 7, std.length(tag.name) - 7)]: tag.valid_values for tag in std.objectValues(definitions) };
local required = std.objectFields(allowed);
local valid(tags) = std.foldl(function(ok, key) ok && std.objectHas(tags, key) && std.member(allowed[key], tags[key]), required, true);
local collections = [
  'compartments', 'children', 'groups', 'dynamic_groups', 'identity_domains', 'supplied_policies',
  'vcns', 'subnets', 'route_tables', 'security_lists', 'network_security_groups',
  'internet_gateways', 'nat_gateways', 'service_gateways', 'dynamic_routing_gateways',
  'drg_attachments', 'drg_route_tables', 'drg_route_distributions', 'l7_load_balancers',
  'network_firewalls', 'network_firewall_policies', 'nlbs', 'remote_peering_connections',
  'alarms', 'event_rules', 'log_groups', 'service_logs', 'topics', 'buckets', 'service_connectors',
  'targets', 'host_recipes', 'host_targets', 'recipes', 'security_zones', 'vaults', 'keys',
  'clusters', 'node_pools', 'worker_pools', 'virtual_node_pools',
];
local check(value, path=[]) =
  if std.type(value) == 'array' then std.foldl(function(ok, item) ok && check(item, path), value, true)
  else if std.type(value) != 'object' then true
  else
    local resource = (std.length(path) > 1 && std.member(collections, path[std.length(path) - 2])) ||
      (std.length(path) > 0 && std.member(['default_security_list', 'cluster_configuration'], path[std.length(path) - 1]));
    local node = std.length(path) > 1 && path[std.length(path) - 2] == 'worker_pools';
    (!resource || (std.objectHas(value, 'defined_tags') && valid(value.defined_tags))) &&
    (!node || (std.objectHas(value, 'node_defined_tags') && valid(value.node_defined_tags))) &&
    std.foldl(function(ok, key) ok && check(value[key], path + [key]), std.objectFields(value), true);
// Explicit imports fail when a selected artifact disappears; there is no exists-and-skip path.
local networks = [
  import 'blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.json',
  import 'blueprints/one-oe/runtime/one-stack/oneoe_network_hub_b.json',
  import 'blueprints/one-oe/runtime/one-stack/oneoe_network_hub_c.json',
  import 'blueprints/one-oe/runtime/one-stack/oneoe_network_hub_c_backends.json',
  import 'blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.json',
];
local observability = [
  import 'blueprints/one-oe/runtime/one-stack/oneoe_observability_cis1.json',
  import 'blueprints/one-oe/runtime/one-stack/oneoe_observability_cis2.json',
];
local iam = import 'blueprints/one-oe/runtime/one-stack/oneoe_iam.json';
local tbac = import 'addons/oci-tbac/oci_open_lz_one-oe_iam.auto.tfvars.json';
local finops = import 'addons/oci-finops/finops-setup/finops_network.auto.tfvars.json';
local samples = networks + observability + [
  iam,
  import 'blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.json',
  import 'blueprints/one-oe/runtime/one-stack/oneoe_security_cis2.json',
  import 'workload-extensions/exacc/multi-stack/exacc_identity_uc1.json',
  import 'workload-extensions/oke/simple/single-stack/oke.json',
  tbac, finops,
];
assert std.foldl(function(ok, doc) ok && check(doc), samples, true);
assert tbac.groups_configuration.groups['GRP-LZP-PROD-PROJ2-ADMINS'].defined_tags['tn-lzp-proj-role.proj-admin'] == 'grp-lzp-prod-proj2';
assert std.length(std.objectFields(definitions)) == 6;
assert std.foldl(function(ok, key)
  local tag = definitions[key];
  local defaults = std.objectValues(tag.tag_defaults);
  ok && std.length(defaults) == 1 && !defaults[0].is_user_required &&
    defaults[0].compartment_ids == ['CMP-LANDINGZONE-KEY'] &&
    defaults[0].default_value == (if key == 'TAG-LZ-PROJECT-KEY' then 'notapplicable' else 'tobedefined'),
  std.objectFields(definitions), true);
local budgets = governance.budgets_configuration.budgets;
local actual_targets = { [budget.target.type + ':' + budget.target.values[0]]: budget.amount for budget in std.objectValues(budgets) };
assert actual_targets == {
  ['COMPARTMENT:CMP-LANDINGZONE-KEY']: 10000,
  ['TAG:' + prefix + 'cost-center.CC12345']: 5000,
  ['TAG:' + prefix + 'business-unit.IT']: 5000,
  ['TAG:' + prefix + 'business-unit.Finance']: 5000,
  ['TAG:' + prefix + 'business-unit.Retail']: 5000,
  ['TAG:' + prefix + 'environment.prod']: 3000,
  ['TAG:' + prefix + 'environment.preprod']: 2000,
  ['TAG:' + prefix + 'project.proj1']: 500,
};
assert std.length(std.objectFields(budgets)) == 8;
assert std.foldl(function(ok, budget)
  ok && valid(budget.defined_tags) && std.length(budget.target.values) == 1 &&
    budget.defined_tags[prefix + 'environment'] == 'shared' && budget.defined_tags[prefix + 'platform'] == 'governance' &&
    budget.schedule == { reset_period: 'MONTHLY', processing_period_type: 'MONTH', day_of_month_to_begin: 1 } &&
    budget.alert_rule.threshold_metric == 'ACTUAL' && budget.alert_rule.threshold_type == 'PERCENTAGE' &&
    budget.alert_rule.threshold_value == 80 && budget.alert_rule.recipients == 'email.address@example.com',
  std.objectValues(budgets), true);
assert !std.objectHas(governance.tags_configuration, 'default_defined_tags');
assert std.foldl(function(ok, obs)
  local logging = obs.logging_configuration;
  local logs = std.objectValues(logging.service_logs);
  ok && std.length(logs) == 15 &&
    std.foldl(function(valid_log, log)
      valid_log && log.service == 'flowlogs' && log.retention_duration >= 90 &&
        std.objectHas(logging.log_groups, log.log_group_id), logs, true) &&
    std.foldl(function(compatible, network)
      local vcns = std.flattenArrays([std.objectFields(category.vcns) for category in std.objectValues(network.network_configuration.network_configuration_categories)]);
      local subnets = std.flattenArrays([std.objectFields(vcn.subnets) for category in std.objectValues(network.network_configuration.network_configuration_categories) for vcn in std.objectValues(category.vcns)]);
      compatible && std.set(vcns) == std.set([log.resource_id for log in logs if log.category == 'vcn']) &&
        std.foldl(function(found, log) found && (log.category != 'subnet' || std.member(subnets, log.resource_id)), logs, true),
      networks, true),
  observability, true);
{ published_contracts: true }
