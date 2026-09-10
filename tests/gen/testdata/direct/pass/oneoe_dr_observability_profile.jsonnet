// Amsterdam DR observability creates a replication destination bucket and no Service Connector.
// contains: "bucket_name": "bkt-ams-lz-service-connector"
// contains: "service_connector_count": 0
// contains: "cis2_uses_kms": true
// contains: "final_has_flow_logs": true
// contains: "alarm_count": 42
// contains: "regional_lb_name": "al-ams-lz-network-lb-unhealthy-backend"
// contains: "regional_lb_topic_is_correct": true
// contains: "regional_lb_query_is_correct": true
local summarize(observability) =
  local alarms = observability.alarms_configuration.alarms;
  local lb_key = 'AL-AMS-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY';
  {
    bucket_name: observability.service_connectors_configuration.buckets['BKT-AMS-LZ-SERVICE-CONNECTOR-KEY'].name,
    service_connector_count: std.length(std.objectFields(observability.service_connectors_configuration.service_connectors)),
    cis2_uses_kms: std.objectHas(
      observability.service_connectors_configuration.buckets['BKT-AMS-LZ-SERVICE-CONNECTOR-KEY'],
      'kms_key_id'
    ),
    final_has_flow_logs: std.objectHas(observability, 'logging_configuration'),
    alarm_count: std.length(std.objectFields(alarms)),
    regional_lb_name: alarms[lb_key].display_name,
    regional_lb_topic_is_correct: alarms[lb_key].destination_topic_ids == ['NOTT-AMS-LZ-NETWORK-KEY'],
    regional_lb_query_is_correct:
      alarms[lb_key].supplied_alarm.query == 'unhealthyBackendServers[1m]{lbComponent = "backendSet"}.max() > 0',
  };
{
  cis1_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis1_pre.jsonnet'),
  cis1: summarize(import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis1.jsonnet'),
  cis2_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis2_pre.jsonnet'),
  cis2: summarize(import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis2.jsonnet'),
}
