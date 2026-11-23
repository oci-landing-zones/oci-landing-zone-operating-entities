// Environment recipe names must identify the reviewed environment scope.
// error_contains: Security Zones environment profiles require environment_name
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
render(profiles.environment_cis1 + { environment_name: '' })
