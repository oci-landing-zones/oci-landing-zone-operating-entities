// Networkless EXACC publication retains workload/service alarms with resolvable destinations for every UC and CIS level.
// contains: "alarm_dependencies_valid": true
local published = import 'gen/workload-extensions/exacc/single-stack/published.libsonnet';
local profiles = import 'gen/workload-extensions/exacc/single-stack/profiles.libsonnet';

local check(doc, workload_alarm) =
  local alarms = doc.alarms_configuration.alarms;
  local topics = doc.notifications_configuration.topics;
  assert !std.objectHas(topics, 'NOTT-LZ-NETWORK-KEY');
  assert std.objectHas(alarms, workload_alarm) : 'EXACC workload alarm must be preserved';
  assert std.objectHas(alarms, 'AL-LZ-NOTIFICATION-DELIVERY-FAILED-KEY') : 'Service alarms must be preserved';
  assert std.all([
    std.all([std.objectHas(topics, topic) for topic in alarm.destination_topic_ids])
    for alarm in std.objectValues(alarms)
  ]) : 'Alarm destination topic is missing';
  assert std.all([
    std.length(std.findSubstr('-NETWORK-KEY', alarm.supplied_alarm.metric_compartment_id)) == 0
    for alarm in std.objectValues(alarms)
    if std.objectHas(alarm, 'supplied_alarm') && std.objectHas(alarm.supplied_alarm, 'metric_compartment_id')
  ]) : 'Networkless publication must exclude network metric alarms';
  true;

{
  alarm_dependencies_valid: std.all([
    local result = published.render(profiles.single_stack['uc' + uc + '_config']);
    check(result['observability_cis' + cis],
          if uc == '1' then 'AL-LZ-CPUUTIL-KEY' else 'AL-LZ-PROD-CPUUTIL-KEY')
    for uc in ['1', '2', '3']
    for cis in ['1', '2']
  ]),
}
