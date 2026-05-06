// environments without shared_project_network do not get env-network or project security-zone targets
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      projects: { proj1: {} },
    },
  },
});
local zones = outputs['security_cis1.json'].security_zones_configuration.security_zones;
{
  has_env_network_target: std.objectHas(zones, 'SZ-TGT-LZ-PROD-ENVIRONMENT-NETWORK-KEY'),
  has_project_target: std.objectHas(zones, 'SZ-TGT-LZ-PROD-PROJ1-KEY'),
  has_shared_network_target: std.objectHas(zones, 'SZ-TGT-LZ-SHARED-NETWORK-KEY'),
  zone_keys: std.sort(std.objectFields(zones)),
}
