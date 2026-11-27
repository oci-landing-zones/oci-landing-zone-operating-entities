// A combined configuration has exactly one Cloud Guard reporting-region setting.
// error_contains: Combined Security Zones require the same reporting region for every environment
local combine = import 'gen/addons/oci-security-zones/combined.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
combine([profiles.environment_cis1, (profiles.environment_cis1 + { environment_name: 'preprod', target_compartment_id: 'CMP-LZ-PREPROD-KEY' }) + { reporting_region: 'eu-amsterdam-1' }])
