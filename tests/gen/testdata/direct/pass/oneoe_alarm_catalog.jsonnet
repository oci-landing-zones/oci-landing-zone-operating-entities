// One-OE observability publishes the concrete operational alarm catalog with deployable MQL only.
local lz = import 'gen/landing_zone.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local alarms = lz(defaults.hub_a).observability_cis1.alarms_configuration.alarms;
{
  alarm_count: std.length(std.objectFields(alarms)),
  all_disabled: std.foldl(function(all_disabled, alarm) all_disabled && !alarm.is_enabled, std.objectValues(alarms), true),
  cpu_warning: alarms['AL-LZ-COMPUTE-CPU-WARNING-KEY'].supplied_alarm,
  event_delivery: alarms['AL-LZ-EVENT-DELIVERY-FAILED-KEY'].supplied_alarm,
  notification_delivery: alarms['AL-LZ-NOTIFICATION-DELIVERY-FAILED-KEY'].supplied_alarm,
  vnic_conntrack_critical: alarms['AL-LZ-VNIC-CONNTRACK-CRITICAL-KEY'].supplied_alarm,
}
