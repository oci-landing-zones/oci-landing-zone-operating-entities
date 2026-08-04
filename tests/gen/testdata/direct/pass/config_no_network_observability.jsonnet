// environments without shared_project_network keep security rules but skip env network observability
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
local flow_logs = obs.logging_configuration.flow_logs;
local log_groups = obs.logging_configuration.log_groups;
{
  has_env_flow_log_group: std.objectHas(log_groups, 'LGRP-LZ-PROD-VCN-FLOW-KEY'),
  has_env_network_rule: std.objectHas(rules, 'RUL-LZ-PROD-NOTIFY-NETWORK-KEY'),
  has_env_security_rule: std.objectHas(rules, 'RUL-LZ-PROD-NOTIFY-SECURITY-KEY'),
  has_env_subnet_flow_log: std.objectHas(flow_logs, 'LOG-LZ-PROD-SUBNET-FLOW-KEY'),
  has_env_vcn_flow_log: std.objectHas(flow_logs, 'LOG-LZ-PROD-VCN-FLOW-KEY'),
  has_shared_flow_log_group: std.objectHas(log_groups, 'LGRP-LZ-VCN-FLOW-KEY'),
  has_shared_network_rule: std.objectHas(rules, 'RUL-LZ-NOTIFY-NETWORK-KEY'),
  has_shared_subnet_flow_log: std.objectHas(flow_logs, 'LOG-LZ-SUBNET-FLOW-KEY'),
  has_shared_vcn_flow_log: std.objectHas(flow_logs, 'LOG-LZ-VCN-FLOW-KEY'),
}
