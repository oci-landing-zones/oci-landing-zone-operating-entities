// Additional recipe policy OCIDs must come from a supported realm.
// error_contains: Security Zones profile.realm must be supported by gen/constants.libsonnet
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
render(profiles.environment_cis1 + { realm: 'unknown' })
