// Two environment names must not create duplicate zones over one compartment.
// error_contains: Combined Security Zones require unique target compartments
local combine = import 'gen/addons/oci-security-zones/combined.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
combine([profiles.environment_cis1, profiles.prod_preprod_cis1[1] + { target_compartment_id: 'CMP-LZ-PROD-KEY' }])
