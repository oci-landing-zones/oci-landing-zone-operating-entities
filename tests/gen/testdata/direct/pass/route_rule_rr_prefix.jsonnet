// generated route-rule keys avoid rt-prefixed names and document deliberate non-rr exceptions
local unique(values) = std.objectFields({ [value]: true for value in values });
local route_rule_keys(node) =
  if std.type(node) == 'object' then
    (if std.objectHas(node, 'route_rules') && std.type(node.route_rules) == 'object'
     then std.objectFields(node.route_rules)
     else [])
    + std.flattenArrays([route_rule_keys(node[key]) for key in std.objectFields(node)])
  else if std.type(node) == 'array' then
    std.flattenArrays([route_rule_keys(value) for value in node])
  else [];
local summarize(payload) =
  local keys = route_rule_keys(payload);
  {
    has_route_rules: std.length(keys) > 0,
    has_rr_prefixed_keys: std.length([key for key in keys if std.substr(key, 0, 3) == 'rr-']) > 0,
    non_rr_keys: unique([key for key in keys if std.substr(key, 0, 3) != 'rr-']),
    rt_prefixed_keys: [key for key in keys if std.substr(key, 0, 3) == 'rt-'],
  };
{
  hub_a:
    summarize(import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.jsonnet'),
  hub_e:
    summarize(import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.jsonnet'),
  oke_single_stack:
    summarize(import 'gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet'),
  oke_multi_stack:
    summarize(import 'gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet'),
}
