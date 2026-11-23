// The standalone add-on must not accidentally protect the tenancy root.
// error_contains: Security Zones profile.target_compartment_id must identify an existing non-root compartment
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
render(profiles.environment_cis1 + { target_compartment_id: 'TENANCY-ROOT' })
