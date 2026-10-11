// gen/landing_zone_multi.jsonnet
// Usage: jsonnet --multi output/ --tla-code-file config=my_config.libsonnet gen/landing_zone_multi.jsonnet
function(config)
  local lz = import 'landing_zone.libsonnet';
  local render_context = import 'render_context.libsonnet';
  local result = lz(config);
  local ctx = render_context.from_raw_config(config);
  local complete_cis_outputs =
    if result.cis_level == 1 then {
      'security_cis1_pre.json': result.security_cis1_pre,
      'security_cis1.json': result.security_cis1,
      'observability_cis1_pre.json': result.observability_cis1_pre,
      'observability_cis1.json': result.observability_cis1,
    } else {
      'security_cis2_pre.json': result.security_cis2_pre,
      'security_cis2.json': result.security_cis2,
      'observability_cis2_pre.json': result.observability_cis2_pre,
      'observability_cis2.json': result.observability_cis2,
    };
  local without_home_region_events(observability) = {
    [key]: observability[key]
    for key in std.objectFields(observability)
    if key != 'home_region_events_configuration'
  };
  local regional_observability(observability) =
    local cis_level = std.toString(result.cis_level);
    local bucket_key = ctx.n.key('BKT', ['SERVICE-CONNECTOR']);
    local bucket_name = ctx.n.display('bkt', ['service-connector']);
    local regional = without_home_region_events(observability);
    local unused_topic_keys = [
      ctx.n.key_global('NOTT', ['CLOUDGUARD']),
      ctx.n.key_global('NOTT', ['IAM']),
    ];
    regional {
      alarms_configuration+: {
        alarms: {
          [key]: regional.alarms_configuration.alarms[key]
          for key in std.objectFields(regional.alarms_configuration.alarms)
          if regional.alarms_configuration.alarms[key].supplied_alarm.namespace !=
             'oci_service_connector_hub'
        },
      },
      notifications_configuration+: {
        topics: {
          [key]: regional.notifications_configuration.topics[key]
          for key in std.objectFields(regional.notifications_configuration.topics)
          if !std.member(unused_topic_keys, key)
        },
      },
      service_connectors_configuration+: {
        buckets: {
          [bucket_key]: {
            name: bucket_name,
            compartment_id: 'CMP-LZ-SECURITY-KEY',
            cis_level: cis_level,
          } + if result.cis_level == 2 then {
            kms_key_id: 'KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY',
          } else {},
        },
        service_connectors: {},
      },
    };
  local regional_security = {
    scanning_configuration: result.security_cis1.scanning_configuration,
  };
  local regional_cis_outputs =
    if result.cis_level == 1 then {
      'security_cis1.json': regional_security,
      'observability_cis1_pre.json': regional_observability(result.observability_cis1_pre),
      'observability_cis1.json': regional_observability(result.observability_cis1),
    } else {
      'security_cis2.json': regional_security,
      'observability_cis2_pre.json': regional_observability(result.observability_cis2_pre),
      'observability_cis2.json': regional_observability(result.observability_cis2),
    };
  local network_outputs = {
    'network.json': result.network,
  }
  + (if result.network_pre != null then { 'network_pre.json': result.network_pre } else {})
  + (if std.objectHas(result, 'network_backends') && result.network_backends != null then { 'network_backends.json': result.network_backends } else {});
  local complete_outputs = {
    'iam.json': result.iam,
    'governance.json': result.governance,
  }
  + complete_cis_outputs
  + (if std.objectHas(result, 'extra') then { [key + '.json']: result.extra[key] for key in std.objectFields(result.extra) } else {});

  network_outputs +
  if result.stack_scope == 'complete' then complete_outputs
  else regional_cis_outputs
