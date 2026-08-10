// Amsterdam DR observability creates a replication destination bucket and no Service Connector.
// contains: "bucket_name": "bkt-ams-lz-service-connector"
// contains: "service_connector_count": 0
// contains: "cis2_uses_kms": true
// contains: "final_has_flow_logs": true
local summarize(observability) = {
  bucket_name: observability.service_connectors_configuration.buckets['BKT-AMS-LZ-SERVICE-CONNECTOR-KEY'].name,
  service_connector_count: std.length(std.objectFields(observability.service_connectors_configuration.service_connectors)),
  cis2_uses_kms: std.objectHas(
    observability.service_connectors_configuration.buckets['BKT-AMS-LZ-SERVICE-CONNECTOR-KEY'],
    'kms_key_id'
  ),
  final_has_flow_logs: std.objectHas(observability, 'logging_configuration'),
};
{
  cis1_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.jsonnet'),
  cis1: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1.jsonnet'),
  cis2_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.jsonnet'),
  cis2: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.jsonnet'),
}
