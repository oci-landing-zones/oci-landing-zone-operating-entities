// environments with project_network get environment security zones and env network observability
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  cis_level: 1,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
});
local zones = outputs['security_cis1.json'].security_zones_configuration.security_zones;
local obs = outputs['observability_cis1.json'];
local rules = obs.events_configuration.event_rules;
local flow_logs = obs.logging_configuration.service_logs;
local has_flow(prefix) = std.length([key for key in std.objectFields(flow_logs) if std.startsWith(key, prefix + '-')]) > 0;
local log_groups = obs.logging_configuration.log_groups;
{
  has_env_flow_log_group: std.objectHas(log_groups, 'LGRP-LZ-PROD-VCN-FLOW-KEY'),
  has_env_network_rule: std.objectHas(rules, 'RUL-LZ-PROD-NOTIFY-NETWORK-KEY'),
  has_env_network_target: std.objectHas(zones, 'SZ-TGT-LZ-PROD-ENVIRONMENT-NETWORK-KEY'),
  has_env_security_rule: std.objectHas(rules, 'RUL-LZ-PROD-NOTIFY-SECURITY-KEY'),
  has_env_target: std.objectHas(zones, 'SZ-TGT-LZ-PROD-ENVIRONMENT-KEY'),
  has_env_subnet_flow_log: has_flow('LOG-LZ-PROD-SUBNET-FLOW-KEY'),
  has_env_vcn_flow_log: has_flow('LOG-LZ-PROD-VCN-FLOW-KEY'),
  has_project_target: std.objectHas(zones, 'SZ-TGT-LZ-PROD-PROJ1-KEY'),
}
