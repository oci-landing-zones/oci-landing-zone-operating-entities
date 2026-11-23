// Standalone Security Zones require an explicit supported CIS level.
// error_contains: Security Zones profile.cis_level must be 1 or 2
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
render(profiles.environment_cis1 + { cis_level: 3 })
