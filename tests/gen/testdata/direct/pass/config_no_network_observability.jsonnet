// environments without project_network keep security rules but skip env network observability
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  cis_level: 1,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {},
  },
});
local obs = outputs['observability_cis1.json'];
local rules = obs.events_configuration.event_rules;
local flow_logs = obs.logging_configuration.service_logs;
local has_flow(prefix) = std.length([key for key in std.objectFields(flow_logs) if std.startsWith(key, prefix + '-')]) > 0;
local log_groups = obs.logging_configuration.log_groups;
{
  has_env_flow_log_group: std.objectHas(log_groups, 'LGRP-LZ-PROD-VCN-FLOW-KEY'),
  has_env_network_rule: std.objectHas(rules, 'RUL-LZ-PROD-NOTIFY-NETWORK-KEY'),
  has_env_security_rule: std.objectHas(rules, 'RUL-LZ-PROD-NOTIFY-SECURITY-KEY'),
  has_env_subnet_flow_log: has_flow('LOG-LZ-PROD-SUBNET-FLOW-KEY'),
  has_env_vcn_flow_log: has_flow('LOG-LZ-PROD-VCN-FLOW-KEY'),
  has_shared_flow_log_group: std.objectHas(log_groups, 'LGRP-LZ-VCN-FLOW-KEY'),
  has_shared_network_rule: std.objectHas(rules, 'RUL-LZ-NOTIFY-NETWORK-KEY'),
  has_shared_subnet_flow_log: has_flow('LOG-LZ-SUBNET-FLOW-KEY'),
  has_shared_vcn_flow_log: has_flow('LOG-LZ-VCN-FLOW-KEY'),
}
