// The environment add-on must not create a second zone on the landing-zone compartment.
// error_contains: Security Zones profile.target_compartment_id must not reference the landing-zone or shared compartments
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
render(profiles.environment_cis1 + { target_compartment_id: 'CMP-LANDINGZONE-KEY' })
