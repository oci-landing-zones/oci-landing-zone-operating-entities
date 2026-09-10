// One-OE observability expands the operational alarm catalog by topology and derives regional identifiers from config.
local lz = import 'gen/landing_zone.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local alarm_config = lz(defaults.hub_a).observability_cis1.alarms_configuration;
local alarms = alarm_config.alarms;
local phoenix_alarms = lz(defaults.hub_e + {
  region: 'us-phoenix-1',
  region_short_name: 'phx',
}).observability_cis1.alarms_configuration.alarms;
{
  alarm_count: std.length(std.objectFields(alarms)),
  enabled_count: std.length([alarm for alarm in std.objectValues(alarms) if alarm.is_enabled]),
  default_alarm_compartment: alarm_config.default_compartment_id,
  shared_lb_query: alarms['AL-FRA-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].supplied_alarm.query,
  shared_lb_topic: alarms['AL-FRA-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].destination_topic_ids,
  prod_scope: alarms['AL-FRA-LZ-PROD-VNIC-CONNTRACK-WARNING-KEY'].supplied_alarm.metric_compartment_id,
  preprod_scope: alarms['AL-FRA-LZ-PREPROD-VNIC-CONNTRACK-CRITICAL-KEY'].supplied_alarm.metric_compartment_id,
  phoenix_key: std.objectHas(phoenix_alarms, 'AL-PHX-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'),
  phoenix_name: phoenix_alarms['AL-PHX-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].display_name,
  phoenix_topic: phoenix_alarms['AL-PHX-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].destination_topic_ids,
}
