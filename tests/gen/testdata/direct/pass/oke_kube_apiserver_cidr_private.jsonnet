// kube-apiserver cidr ingress stays private and never opens to broad public ranges
local collect_rules(payload) = [
  {
    src: value.src,
    description: value.description,
  }
  for value in std.flattenArrays([
    local nsgs =
      payload.network_configuration.network_configuration_categories[category_key]
        .vcns[vcn_key].network_security_groups;
    [
      nsgs[nsg_key].ingress_rules[rule_key]
      for nsg_key in std.objectFields(nsgs)
      for rule_key in std.objectFields(nsgs[nsg_key].ingress_rules)
      if nsgs[nsg_key].ingress_rules[rule_key].src_type == 'CIDR_BLOCK' &&
         nsgs[nsg_key].ingress_rules[rule_key].protocol == 'TCP' &&
         std.objectHas(nsgs[nsg_key].ingress_rules[rule_key], 'dst_port_min') &&
         std.objectHas(nsgs[nsg_key].ingress_rules[rule_key], 'dst_port_max') &&
         nsgs[nsg_key].ingress_rules[rule_key].dst_port_min == '6443' &&
         nsgs[nsg_key].ingress_rules[rule_key].dst_port_max == '6443' &&
         std.length(std.findSubstr(
           'kube-apiserver',
           nsgs[nsg_key].ingress_rules[rule_key].description
         )) > 0
    ]
    for category_key in std.objectFields(payload.network_configuration.network_configuration_categories)
    for vcn_key in std.objectFields(
      payload.network_configuration.network_configuration_categories[category_key].vcns
    )
  ])
];
local summarize(payload) =
  local rules = collect_rules(payload);
  {
    rule_count: std.length(rules),
    sources: [rule.src for rule in rules],
    descriptions_with_public_cidr: [
      rule.description
      for rule in rules
      if std.length(std.findSubstr('0.0.0.0/0', rule.description)) > 0
    ],
  };
{
  single_stack:
    summarize(import 'gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet'),
  multi_stack:
    summarize(import 'gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet'),
}
