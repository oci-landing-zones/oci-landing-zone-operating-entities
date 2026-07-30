// OKE subnet security lists stay aligned with the stateless ICMP lockdown pattern
// contains: "multi_stack_failures": []
// contains: "single_stack_failures": []
local expected_pmtu_egress = {
  description: 'Required to enable Path MTU Discovery responses to work, and non-OCI communication',
  protocol: 'ICMP',
  dst: '0.0.0.0/0',
  dst_type: 'CIDR_BLOCK',
  icmp_code: 4,
  icmp_type: 3,
  stateless: true,
};
local expected_pmtu_ingress = {
  description: 'Required to enable Path MTU Discovery to work, and non-OCI communication',
  protocol: 'ICMP',
  icmp_code: 4,
  icmp_type: 3,
  src: '0.0.0.0/0',
  src_type: 'CIDR_BLOCK',
  stateless: true,
};
local expected_fail_fast_egress(vcn_cidr) = {
  description: 'Required to allow application within VCN responses to fail fast',
  protocol: 'ICMP',
  dst: vcn_cidr,
  dst_type: 'CIDR_BLOCK',
  icmp_type: 3,
  stateless: true,
};
local expected_fail_fast_ingress(vcn_cidr) = {
  description: 'Required to allow application within VCN to fail fast',
  protocol: 'ICMP',
  icmp_type: 3,
  src: vcn_cidr,
  src_type: 'CIDR_BLOCK',
  stateless: true,
};
local list_has_rule(rules, expected) =
  std.length([rule for rule in rules if rule == expected]) == 1;
local unexpected_icmp_rules(rules, expected) = [
  rule
  for rule in rules
  if rule.protocol == 'ICMP' && !std.member(expected, rule)
];
local security_list_complies(vcn_cidr, sl) =
  local egress = sl.egress_rules;
  local ingress = sl.ingress_rules;
  list_has_rule(egress, expected_fail_fast_egress(vcn_cidr))
  && list_has_rule(ingress, expected_fail_fast_ingress(vcn_cidr))
  && list_has_rule(egress, expected_pmtu_egress)
  && list_has_rule(ingress, expected_pmtu_ingress)
  && unexpected_icmp_rules(
      egress,
      [expected_pmtu_egress, expected_fail_fast_egress(vcn_cidr)]
    ) == []
  && unexpected_icmp_rules(
      ingress,
      [expected_pmtu_ingress, expected_fail_fast_ingress(vcn_cidr)]
    ) == [];
local failures(payload) =
  local categories = payload.network_configuration.network_configuration_categories;
  [
    {
      category: category_key,
      vcn: vcn_key,
      security_list: sl_key,
    }
    for category_key in std.objectFields(categories)
    if std.length(std.findSubstr('platform-oke', category_key)) > 0
    for vcn_key in std.objectFields(categories[category_key].vcns)
    for vcn in [categories[category_key].vcns[vcn_key]]
    for sl_key in std.objectFields(vcn.security_lists)
    if vcn.default_security_list != {
         egress_rules: [],
         ingress_rules: [],
       }
       || !security_list_complies(
         vcn.cidr_blocks[0],
         vcn.security_lists[sl_key]
       )
  ];
{
  multi_stack_failures:
    failures(import 'gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet'),
  single_stack_failures:
    failures(import 'gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet'),
}
