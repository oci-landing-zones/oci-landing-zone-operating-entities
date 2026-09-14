// One-OE observability expands the operational alarm catalog by topology and derives regional identifiers from config.
local lz = import 'gen/landing_zone.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local alarm_config = lz(defaults.hub_a).observability_cis1.alarms_configuration;
local alarms = alarm_config.alarms;
local sandbox_alarms = lz(defaults.hub_e + {
  security_targets: ['sandbox'],
  environments: { sandbox: {} },
}).observability_cis1.alarms_configuration.alarms;
local phoenix_alarms = lz(defaults.hub_e + {
  region: 'us-phoenix-1',
  region_short_name: 'phx',
}).observability_cis1.alarms_configuration.alarms;
{
  alarm_count: std.length(std.objectFields(alarms)),
  enabled_count: std.length([alarm for alarm in std.objectValues(alarms) if alarm.is_enabled]),
  all_stored_in_security: std.foldl(
    function(all_security, alarm) all_security && alarm.compartment_id == 'CMP-LZ-SECURITY-KEY',
    std.objectValues(alarms),
    true
  ),
  default_alarm_compartment: alarm_config.default_compartment_id,
  all_warning_alarms_disabled: std.foldl(
    function(all_disabled, alarm)
      all_disabled && (alarm.supplied_alarm.severity != 'WARNING' || !alarm.is_enabled),
    std.objectValues(alarms),
    true
  ),
  cpu_and_memory_critical_enabled:
    alarms['AL-FRA-LZ-COMPUTE-CPU-CRITICAL-KEY'].is_enabled &&
    alarms['AL-FRA-LZ-COMPUTE-MEMORY-CRITICAL-KEY'].is_enabled,
  cpu_and_memory_warning_enabled:
    alarms['AL-FRA-LZ-COMPUTE-CPU-WARNING-KEY'].is_enabled ||
    alarms['AL-FRA-LZ-COMPUTE-MEMORY-WARNING-KEY'].is_enabled,
  nlb_backend_enabled: alarms['AL-FRA-LZ-NETWORK-NLB-UNHEALTHY-BACKEND-KEY'].is_enabled,
  shared_lb_enabled: alarms['AL-FRA-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].is_enabled,
  shared_lb_metric_compartment: alarms['AL-FRA-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].supplied_alarm.metric_compartment_id,
  shared_lb_notifies_network_team: alarms['AL-FRA-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].destination_topic_ids == ['NOTT-FRA-LZ-NETWORK-KEY'],
  event_delivery: alarms['AL-FRA-LZ-EVENT-DELIVERY-FAILED-KEY'].supplied_alarm,
  notification_delivery: alarms['AL-FRA-LZ-NOTIFICATION-DELIVERY-FAILED-KEY'].supplied_alarm,
  shared_vnic_conntrack_critical: alarms['AL-FRA-LZ-VNIC-CONNTRACK-CRITICAL-KEY'].supplied_alarm,
  prod_vnic_conntrack_warning: alarms['AL-FRA-LZ-PROD-VNIC-CONNTRACK-WARNING-KEY'].supplied_alarm,
  preprod_vnic_conntrack_critical: alarms['AL-FRA-LZ-PREPROD-VNIC-CONNTRACK-CRITICAL-KEY'].supplied_alarm,
  networkless_environment_precreated:
    std.objectHas(sandbox_alarms, 'AL-FRA-LZ-SANDBOX-VNIC-CONNTRACK-WARNING-KEY') &&
    !sandbox_alarms['AL-FRA-LZ-SANDBOX-VNIC-CONNTRACK-WARNING-KEY'].is_enabled &&
    sandbox_alarms['AL-FRA-LZ-SANDBOX-VNIC-CONNTRACK-WARNING-KEY'].supplied_alarm.metric_compartment_id == 'CMP-LZ-SANDBOX-NETWORK-KEY',
  shared_lb_query: alarms['AL-FRA-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].supplied_alarm.query,
  shared_lb_topic: alarms['AL-FRA-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].destination_topic_ids,
  prod_scope: alarms['AL-FRA-LZ-PROD-VNIC-CONNTRACK-WARNING-KEY'].supplied_alarm.metric_compartment_id,
  preprod_scope: alarms['AL-FRA-LZ-PREPROD-VNIC-CONNTRACK-CRITICAL-KEY'].supplied_alarm.metric_compartment_id,
  phoenix_key: std.objectHas(phoenix_alarms, 'AL-PHX-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'),
  phoenix_name: phoenix_alarms['AL-PHX-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].display_name,
  phoenix_topic: phoenix_alarms['AL-PHX-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY'].destination_topic_ids,
}
