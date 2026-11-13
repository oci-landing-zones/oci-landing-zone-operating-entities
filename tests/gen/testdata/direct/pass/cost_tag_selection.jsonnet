// Disabling FinOps strips nested cost tags while preserving authorization and unrelated metadata.
// contains: "tag_selection_contracts": true
local apply = (import 'gen/lib/cost_tags.libsonnet').apply;
local lz = import 'gen/landing_zone.libsonnet';
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local original = { [prefix + 'owner']: 'old@example.com', 'role.keep': 'admin', 'customer.team': 'platform' };
local doc = {
  oke_configuration: {
    default_defined_tags: original,
    clusters: { CLUSTER: { defined_tags: original, options: {
      service_lb_config: { defined_tags: original }, persistent_volume_config: { defined_tags: original },
    } } },
    worker_pools: { POOL: { defined_tags: original, node_defined_tags: original } },
    node_pools: { NODES: { node_config_details: { defined_tags: original } } },
  },
};
local disabled = apply(doc, { cost_governance: { enable_tags: false } });
local enabled = apply(doc, { environments: {}, cost_governance: { owner_email: 'owner@example.com' } });
local unchanged = apply(doc, { environments: {} });
local check(value, owner=null) =
  if std.type(value) == 'array' then std.foldl(function(ok, item) ok && check(item, owner), value, true)
  else if std.type(value) != 'object' then true
  else std.foldl(function(ok, key)
    local child = value[key];
    ok && (if std.member(['defined_tags', 'default_defined_tags', 'node_defined_tags'], key) then
      (!std.objectHas(child, 'role.keep') || child['role.keep'] == 'admin') &&
      (!std.objectHas(child, 'customer.team') || child['customer.team'] == 'platform') &&
      (if owner == null then !std.objectHas(child, prefix + 'owner') else child[prefix + 'owner'] == owner)
    else check(child, owner)), std.objectFields(value), true);
local governance = lz({ hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } }, cost_governance: { enable_tags: false } }).governance;
assert check(disabled);
assert check(enabled, 'owner@example.com');
assert unchanged.oke_configuration.clusters.CLUSTER.defined_tags[prefix + 'owner'] == 'old@example.com';
assert enabled.oke_configuration.clusters.CLUSTER.defined_tags['role.keep'] == 'admin';
assert enabled.oke_configuration.worker_pools.POOL.node_defined_tags['role.keep'] == 'admin';
assert disabled.oke_configuration.clusters.CLUSTER.defined_tags == { 'role.keep': 'admin', 'customer.team': 'platform' };
assert !std.objectHas(governance.tags_configuration.namespaces, 'TAGNS-LZ-COST-GOVERNANCE-KEY');
assert std.objectHas(governance.tags_configuration.namespaces, 'TAGNS-LZ-ROLE-KEY');
assert std.objectFields(governance.budgets_configuration.budgets) == ['BUDGET-LANDINGZONE-KEY'];
{ tag_selection_contracts: true }
