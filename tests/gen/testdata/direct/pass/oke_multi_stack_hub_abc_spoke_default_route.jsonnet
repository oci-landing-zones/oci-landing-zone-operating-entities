// OKE multi-stack publications for firewall hubs keep the spoke default route through DRG
local defaults = import 'gen/defaults.libsonnet';
local output_builder = import 'gen/workload-extensions/oke/simple/multi-stack/output_builder.libsonnet';
local profiles = import 'gen/workload-extensions/oke/simple/published_profiles.libsonnet';

local config(hub_kind) =
  local base = defaults[hub_kind] {
    environments+: {
      prod+: {
        platforms+: {
          oke: profiles.oke_platform,
        },
      },
    },
  };
  {
    cis1_config: base + { cis_level: 1 },
    iam_cis2_config: base + { cis_level: 2 },
  };

local category(doc) =
  doc.network_configuration.network_configuration_categories['prod-platform-oke'];

local route_tables(doc) =
  category(doc).vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'].route_tables;

local route_table_keys = [
  'RT-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
  'RT-FRA-LZ-PROD-PLATFORM-OKE-INT-LB-KEY',
  'RT-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY',
  'RT-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
];

local summarize(hub_kind) =
  local doc = output_builder(config(hub_kind)).oke_network;
  {
    [rt_key]: route_tables(doc)[rt_key].route_rules['rr-fra-drg']
    for rt_key in route_table_keys
  };

{
  hub_a: summarize('hub_a'),
  hub_b: summarize('hub_b'),
  hub_c: summarize('hub_c'),
}
