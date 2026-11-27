// function(profiles) -> one Orchestrator configuration containing the selected environment zones.
function(profiles)
  assert std.type(profiles) == 'array' && std.length(profiles) > 0 :
         'Combined Security Zones require a non-empty array of environment profiles';
  local render = import './published.libsonnet';
  local configs = [render(profile).security_zones_configuration for profile in profiles];
  local zone_keys = [std.objectFields(config.security_zones)[0] for config in configs];
  local targets = [std.objectValues(config.security_zones)[0].compartment_id for config in configs];
  assert std.length(std.set(zone_keys)) == std.length(zone_keys) :
         'Combined Security Zones require unique environment names';
  assert std.length(std.set(targets)) == std.length(targets) :
         'Combined Security Zones require unique target compartments';
  assert std.foldl(function(ok, profile) ok && profile.cis_level == profiles[0].cis_level, profiles, true) :
         'Combined Security Zones require the same CIS level for every environment';
  local realm(profile) = if std.objectHas(profile, 'realm') then profile.realm else 'oc1';
  assert std.foldl(function(ok, profile) ok && realm(profile) == realm(profiles[0]), profiles, true) :
         'Combined Security Zones require the same realm for every environment';
  assert std.foldl(function(ok, config) ok && config.reporting_region == configs[0].reporting_region, configs, true) :
         'Combined Security Zones require the same reporting region for every environment';
  {
    security_zones_configuration: configs[0] + {
      recipes: std.foldl(function(acc, config) acc + config.recipes, configs, {}),
      security_zones: std.foldl(function(acc, config) acc + config.security_zones, configs, {}),
    },
  }
