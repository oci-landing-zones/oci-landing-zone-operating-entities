// function(profile) -> published One-OE security with the landing-zone baseline only.
function(profile)
  local result = (import '../../../../landing_zone.libsonnet')(profile.config);
  local recipe1_only(security) =
    local zones = security.security_zones_configuration;
    local targets = {
      [key]: zones.security_zones[key]
      for key in std.objectFields(zones.security_zones)
      if zones.security_zones[key].compartment_id == 'CMP-LANDINGZONE-KEY'
    };
    local recipe_keys = [target.recipe_key for target in std.objectValues(targets)];
    security + {
      security_zones_configuration: zones + {
        recipes: { [key]: zones.recipes[key] for key in recipe_keys },
        security_zones: targets,
      },
    };
  {
    security_cis1: recipe1_only(result.security_cis1_pre),
    security_cis2: recipe1_only(result.security_cis2_pre),
  }
