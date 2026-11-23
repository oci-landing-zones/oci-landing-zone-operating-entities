// function(profile) -> one Recipe 02 and zone for an existing environment compartment.
function(profile)
  local constants = import '../../constants.libsonnet';
  local non_empty(value) = std.type(value) == 'string' && std.length(std.stripChars(value, ' \t\r\n')) > 0;
  local compartment(value) = non_empty(value) && value != 'TENANCY-ROOT' && !std.startsWith(value, 'ocid1.tenancy.');
  assert std.type(profile) == 'object' : 'Security Zones profile must be an object';
  assert std.objectHas(profile, 'cis_level') && std.member([1, 2], profile.cis_level) :
         'Security Zones profile.cis_level must be 1 or 2';
  assert std.objectHas(profile, 'reporting_region') && non_empty(profile.reporting_region) :
         'Security Zones profile.reporting_region must be a non-empty string';
  assert std.objectHas(profile, 'recipe_compartment_id') && compartment(profile.recipe_compartment_id) :
         'Security Zones profile.recipe_compartment_id must identify an existing non-root compartment';
  assert std.objectHas(profile, 'target_compartment_id') && compartment(profile.target_compartment_id) :
         'Security Zones profile.target_compartment_id must identify an existing non-root compartment';
  local realm = if std.objectHas(profile, 'realm') then profile.realm else 'oc1';
  assert !std.objectHas(profile, 'recipe_scope') :
         'Security Zones environment profiles do not accept recipe_scope';
  assert std.type(realm) == 'string' && std.objectHas(constants, realm) :
         'Security Zones profile.realm must be supported by gen/constants.libsonnet';
  assert std.objectHas(profile, 'environment_name') && non_empty(profile.environment_name) :
         'Security Zones environment profiles require environment_name';
  // Only global naming helpers are used; no deployment region is inferred from a name.
  local n = (import '../../naming.libsonnet')('');
  local recipe_segments = ['02', profile.environment_name, 'ENVIRONMENT'];
  local target_segments = [profile.environment_name, 'ENVIRONMENT'];
  local recipe_key = n.key_global('SZ-RCP', recipe_segments);
  local target_key = n.key_global('SZ-TGT', target_segments);
  {
    security_zones_configuration: {
      reporting_region: profile.reporting_region,
      recipes: {
        [recipe_key]: {
          name: n.display_global('sz-rcp', recipe_segments),
          description: 'Recipe %s CIS Level %s' % [recipe_segments[0], profile.cis_level],
          compartment_id: profile.recipe_compartment_id,
          cis_level: std.toString(profile.cis_level),
          security_policies_ocids: constants[realm].security_zone_policy_ocids.environment,
        },
      },
      security_zones: {
        [target_key]: {
          name: n.display_global('sz-tgt', target_segments),
          compartment_id: profile.target_compartment_id,
          recipe_key: recipe_key,
        },
      },
    },
  }
