// environments with shared_project_network still get env/project security zones and env network observability
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
});
local zones = outputs['security_cis1.json'].security_zones_configuration.security_zones;
local obs = outputs['observability_cis1.json'];
local rules = obs.events_configuration.event_rules;
local flow_logs = obs.logging_configuration.flow_logs;
local log_groups = obs.logging_configuration.log_groups;
{
  has_env_flow_log_group: std.objectHas(log_groups, 'LGRP-LZ-PROD-VCN-FLOW-KEY'),
  has_env_network_rule: std.objectHas(rules, 'RUL-LZ-PROD-NOTIFY-NETWORK-KEY'),
  has_env_network_target: std.objectHas(zones, 'SZ-TGT-LZ-PROD-ENVIRONMENT-NETWORK-KEY'),
  has_env_security_rule: std.objectHas(rules, 'RUL-LZ-PROD-NOTIFY-SECURITY-KEY'),
  has_env_subnet_flow_log: std.objectHas(flow_logs, 'LOG-LZ-PROD-SUBNET-FLOW-KEY'),
  has_env_vcn_flow_log: std.objectHas(flow_logs, 'LOG-LZ-PROD-VCN-FLOW-KEY'),
  has_project_target: std.objectHas(zones, 'SZ-TGT-LZ-PROD-PROJ1-KEY'),
}
