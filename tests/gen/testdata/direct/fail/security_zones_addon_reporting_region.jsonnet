// Standalone Security Zones cannot silently select a Cloud Guard reporting region.
// error_contains: Security Zones profile.reporting_region must be a non-empty string
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
render(profiles.environment_cis1 + { reporting_region: ' ' })
