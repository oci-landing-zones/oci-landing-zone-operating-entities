// Standalone recipes must be placed in an existing non-root compartment.
// error_contains: Security Zones profile.recipe_compartment_id must identify an existing non-root compartment
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
render(profiles.environment_cis1 + { recipe_compartment_id: null })
