// One combined preset must consistently enforce the selected CIS baseline.
// error_contains: Combined Security Zones require the same CIS level for every environment
local combine = import 'gen/addons/oci-security-zones/combined.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
combine([profiles.environment_cis1, (profiles.environment_cis2 + { environment_name: 'preprod', target_compartment_id: 'CMP-LZ-PREPROD-KEY' })])
