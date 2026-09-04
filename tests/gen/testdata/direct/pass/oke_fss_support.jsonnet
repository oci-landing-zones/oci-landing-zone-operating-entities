// OKE FSS support is opt-in and emits only the CSI network and IAM prerequisites.
// contains: "default_fss_resources": false
// contains: "default_file_family_permission": false
// contains: "native_fss_resources": true
// contains: "overlay_fss_resources": true
// contains: "native_pods_preserved": true
// contains: "overlay_pods_omitted": true
// contains: "fss_route_rule_count": 1
// contains: "fss_routes_only_to_services": true
// contains: "fss_worker_ingress_rule_count": 5
// contains: "fss_worker_egress_rule_count": 5
// contains: "fss_pod_ingress_rule_count": 5
// contains: "fss_pod_egress_rule_count": 5
// contains: "worker_fss_ingress_rule_count": 5
// contains: "worker_fss_egress_rule_count": 5
// contains: "pod_fss_ingress_rule_count": 5
// contains: "pod_fss_egress_rule_count": 5
// contains: "pod_fss_rules_are_stateless": true
// contains: "overlay_fss_ingress_rule_count": 5
// contains: "overlay_fss_egress_rule_count": 5
// contains: "enabled_file_family_permission": true
local multi = import 'gen/landing_zone_multi.jsonnet';

local render(create_fss=false, cni_type='native') =
  local outputs = multi({
    hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
    environments: {
      prod: {
        platforms: {
          oke: {
            network: { vcn: '10.0.80.0/20' },
            extension: {
              type: 'oke_simple',
              params: {
                kubernetes_version: 'v1.35.2',
                services_cidr: '10.96.0.0/16',
                api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
                cni_type: cni_type,
                create_fss: create_fss,
              },
            },
          },
        },
      },
    },
  });
  {
    vcn: outputs['network.json'].network_configuration
      .network_configuration_categories['prod-platform-oke']
      .vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'],
    storage_policy: outputs['iam.json'].policies_configuration
      .supplied_policies['PCY-LZ-PROD-PLATFORM-OKE-SERVICE-STORAGE-KEY'],
  };

local default = render();
local native = render(true);
local overlay = render(true, 'overlay');
local fss_subnet_key = 'SN-FRA-LZ-PROD-PLATFORM-OKE-FSS-KEY';
local fss_route_table_key = 'RT-FRA-LZ-PROD-PLATFORM-OKE-FSS-KEY';
local fss_security_list_key = 'SL-FRA-LZ-PROD-PLATFORM-OKE-FSS-KEY';
local fss_nsg_key = 'NSG-FRA-LZ-PROD-PLATFORM-OKE-FSS-KEY';
local workers_nsg_key = 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY';
local pods_subnet_key = 'SN-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY';
local has_fss_resources(rendered) =
  std.objectHas(rendered.vcn.subnets, fss_subnet_key) &&
  std.objectHas(rendered.vcn.route_tables, fss_route_table_key) &&
  std.objectHas(rendered.vcn.security_lists, fss_security_list_key) &&
  std.objectHas(rendered.vcn.network_security_groups, fss_nsg_key);
local has_file_family_permission(rendered) =
  std.length([
    statement
    for statement in rendered.storage_policy.statements
    if std.length(std.findSubstr('manage file-family', statement)) > 0
  ]) == 1;
local rules_with_prefix_are_stateless(rules, prefix) =
  local matching_rules = [
    rules[key]
    for key in std.objectFields(rules)
    if std.startsWith(key, prefix)
  ];
  std.length(matching_rules) > 0 &&
  std.length([rule for rule in matching_rules if rule.stateless]) == std.length(matching_rules);
local fss_routes = native.vcn.route_tables[fss_route_table_key].route_rules;
local fss_nsg = native.vcn.network_security_groups[fss_nsg_key];
local workers_nsg = native.vcn.network_security_groups[workers_nsg_key];
local pods_nsg_key = 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY';
local pods_nsg = native.vcn.network_security_groups[pods_nsg_key];
local overlay_fss_nsg = overlay.vcn.network_security_groups[fss_nsg_key];

{
  default_fss_resources: has_fss_resources(default),
  default_file_family_permission: has_file_family_permission(default),
  native_fss_resources: has_fss_resources(native),
  overlay_fss_resources: has_fss_resources(overlay),
  native_pods_preserved: std.objectHas(native.vcn.subnets, pods_subnet_key),
  overlay_pods_omitted: !std.objectHas(overlay.vcn.subnets, pods_subnet_key),
  fss_route_rule_count: std.length(std.objectFields(fss_routes)),
  fss_routes_only_to_services:
    std.length([
      key
      for key in std.objectFields(fss_routes)
      if fss_routes[key].destination_type == 'SERVICE_CIDR_BLOCK'
    ]) == std.length(std.objectFields(fss_routes)),
  fss_worker_ingress_rule_count: std.length([
    key for key in std.objectFields(fss_nsg.ingress_rules)
    if std.startsWith(key, 'nsg_workers_')
  ]),
  fss_worker_egress_rule_count: std.length([
    key for key in std.objectFields(fss_nsg.egress_rules)
    if std.startsWith(key, 'nsg_workers_')
  ]),
  fss_pod_ingress_rule_count: std.length([
    key for key in std.objectFields(fss_nsg.ingress_rules)
    if std.startsWith(key, 'nsg_pods_')
  ]),
  fss_pod_egress_rule_count: std.length([
    key for key in std.objectFields(fss_nsg.egress_rules)
    if std.startsWith(key, 'nsg_pods_')
  ]),
  worker_fss_ingress_rule_count: std.length([
    key for key in std.objectFields(workers_nsg.ingress_rules)
    if std.startsWith(key, 'nsg_fss_')
  ]),
  worker_fss_egress_rule_count: std.length([
    key for key in std.objectFields(workers_nsg.egress_rules)
    if std.startsWith(key, 'nsg_fss_')
  ]),
  pod_fss_ingress_rule_count: std.length([
    key for key in std.objectFields(pods_nsg.ingress_rules)
    if std.startsWith(key, 'nsg_fss_')
  ]),
  pod_fss_egress_rule_count: std.length([
    key for key in std.objectFields(pods_nsg.egress_rules)
    if std.startsWith(key, 'nsg_fss_')
  ]),
  pod_fss_rules_are_stateless:
    rules_with_prefix_are_stateless(fss_nsg.ingress_rules, 'nsg_pods_') &&
    rules_with_prefix_are_stateless(fss_nsg.egress_rules, 'nsg_pods_') &&
    rules_with_prefix_are_stateless(pods_nsg.ingress_rules, 'nsg_fss_') &&
    rules_with_prefix_are_stateless(pods_nsg.egress_rules, 'nsg_fss_'),
  overlay_fss_ingress_rule_count: std.length(std.objectFields(overlay_fss_nsg.ingress_rules)),
  overlay_fss_egress_rule_count: std.length(std.objectFields(overlay_fss_nsg.egress_rules)),
  enabled_file_family_permission: has_file_family_permission(native),
}
