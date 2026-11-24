// One combined preset must consistently enforce the selected CIS baseline.
// error_contains: Combined Security Zones require the same CIS level for every environment
local combine = import 'gen/addons/oci-security-zones/combined.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
combine([profiles.environment_cis1, profiles.prod_preprod_cis2[1]])
