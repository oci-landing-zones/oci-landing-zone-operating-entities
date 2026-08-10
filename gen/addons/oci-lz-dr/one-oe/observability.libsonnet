local lz = import '../../../landing_zone.libsonnet';

local bucket_key = 'BKT-AMS-LZ-SERVICE-CONNECTOR-KEY';
local bucket_name = 'bkt-ams-lz-service-connector';
local kms_key = 'KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY';

local replication_bucket(cis_level) = {
  name: bucket_name,
  compartment_id: 'CMP-LZ-SECURITY-KEY',
  cis_level: cis_level,
} + (if cis_level == '2' then { kms_key_id: kms_key } else {});

local without_home_region_events(observability) = {
  [key]: observability[key]
  for key in std.objectFields(observability)
  if key != 'home_region_events_configuration'
};

local with_replication_bucket(observability, cis_level) =
  observability {
    service_connectors_configuration+: {
      buckets: {
        [bucket_key]: replication_bucket(cis_level),
      },
      service_connectors: {},
    },
  };

function(profile)
  local generated = lz(profile);
  {
    cis1_pre: with_replication_bucket(without_home_region_events(generated.observability_cis1_pre), '1'),
    cis1: with_replication_bucket(without_home_region_events(generated.observability_cis1), '1'),
    cis2_pre: with_replication_bucket(without_home_region_events(generated.observability_cis2_pre), '2'),
    cis2: with_replication_bucket(without_home_region_events(generated.observability_cis2), '2'),
  }
