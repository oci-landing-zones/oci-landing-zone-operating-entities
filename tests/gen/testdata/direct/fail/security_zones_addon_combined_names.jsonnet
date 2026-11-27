// Case variants must not overwrite the same environment's zone and recipe keys.
// error_contains: Combined Security Zones require unique environment names
local combine = import 'gen/addons/oci-security-zones/combined.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
combine([profiles.environment_cis1, (profiles.environment_cis1 + { environment_name: 'preprod', target_compartment_id: 'CMP-LZ-PREPROD-KEY' }) + { environment_name: 'PROD' }])
