// Environment recipe numbers must be a supported integer, not an arbitrary resource-key version.
// error_contains: config.security_zone_environment_recipe_number must be 2 or 3
(import 'gen/landing_zone_multi.jsonnet')({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  security_zone_environment_recipe_number: 4,
})
