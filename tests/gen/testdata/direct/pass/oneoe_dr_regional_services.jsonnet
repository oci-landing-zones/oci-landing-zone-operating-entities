// DR-only regional services retain their operational and security behavior.
// contains: "vulnerability_scanning_is_strict_and_linked": true
// contains: "observability_is_regional_and_encrypted": true
local observability =
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis2.jsonnet';
local observability_pre =
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis2_pre.jsonnet';
local security = import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_security.jsonnet';

local scanning = security.scanning_configuration;
local recipes = std.objectFields(scanning.host_recipes);
local targets = std.objectValues(scanning.host_targets);
local buckets = std.objectValues(
  observability.service_connectors_configuration.buckets
);
local alarms = std.objectValues(observability.alarms_configuration.alarms);
local topic_keys = std.objectFields(observability.notifications_configuration.topics);

{
  vulnerability_scanning_is_strict_and_linked:
    std.length(recipes) == 1 &&
    std.length(targets) == 1 &&
    targets[0].host_recipe_id == recipes[0] &&
    scanning.host_recipes[recipes[0]].agent_settings.cis_benchmark_scan_level ==
    'STRICT' &&
    scanning.host_recipes[recipes[0]].file_scan_settings.enable,
  observability_is_regional_and_encrypted:
    std.length(buckets) == 1 &&
    std.objectHas(buckets[0], 'kms_key_id') &&
    std.length(std.objectFields(
      observability.service_connectors_configuration.service_connectors
    )) == 0 &&
    std.length([
      alarm
      for alarm in alarms
      if alarm.supplied_alarm.namespace == 'oci_service_connector_hub'
    ]) == 0 &&
    !std.member(topic_keys, 'NOTT-LZ-CLOUDGUARD-KEY') &&
    !std.member(topic_keys, 'NOTT-LZ-IAM-KEY') &&
    !std.objectHas(observability_pre, 'logging_configuration') &&
    std.objectHas(observability, 'logging_configuration') &&
    std.length(std.objectFields(observability.alarms_configuration.alarms)) > 0,
}
