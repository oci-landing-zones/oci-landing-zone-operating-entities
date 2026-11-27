// One deployment cannot mix policy identifiers from different OCI realms.
// error_contains: Combined Security Zones require the same realm for every environment
local combine = import 'gen/addons/oci-security-zones/combined.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
combine([profiles.environment_cis1, (profiles.environment_cis1 + { environment_name: 'preprod', target_compartment_id: 'CMP-LZ-PREPROD-KEY' }) + { realm: 'oc19' }])
