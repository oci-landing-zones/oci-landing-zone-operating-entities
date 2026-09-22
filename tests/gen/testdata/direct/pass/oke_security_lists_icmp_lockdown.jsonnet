// OKE subnet security lists stay aligned with the stateless ICMP lockdown pattern
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
local icmp_rule_count(rules) =
  std.length([rule for rule in rules if rule.protocol == 'ICMP']);
local list_has_rule(rules, expected) =
  std.length([rule for rule in rules if rule == expected]) == 1;
local summarize_security_list(vcn_cidr, sl) =
  local egress = sl.egress_rules;
  local ingress = sl.ingress_rules;
  {
    egress_icmp_rule_count: icmp_rule_count(egress),
    ingress_icmp_rule_count: icmp_rule_count(ingress),
    has_fail_fast_egress: list_has_rule(egress, expected_fail_fast_egress(vcn_cidr)),
    has_fail_fast_ingress: list_has_rule(ingress, expected_fail_fast_ingress(vcn_cidr)),
    has_pmtu_egress: list_has_rule(egress, expected_pmtu_egress),
    has_pmtu_ingress: list_has_rule(ingress, expected_pmtu_ingress),
  };
local summarize(payload) =
  local categories = payload.network_configuration.network_configuration_categories;
  {
    [category_key]: {
      [vcn_key]:
        local vcn = categories[category_key].vcns[vcn_key];
        local vcn_cidr = vcn.cidr_blocks[0];
        {
          default_security_list: vcn.default_security_list,
          security_lists: {
            [sl_key]: summarize_security_list(vcn_cidr, vcn.security_lists[sl_key])
            for sl_key in std.objectFields(vcn.security_lists)
          },
        }
      for vcn_key in std.objectFields(categories[category_key].vcns)
    }
    for category_key in std.objectFields(categories)
    if std.length(std.findSubstr('platform-oke', category_key)) > 0
  };
{
  multi_stack:
    summarize(import 'gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet'),
  single_stack:
    summarize(import 'gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet'),
}
