// A combined stack must select at least one environment.
// error_contains: Combined Security Zones require a non-empty array of environment profiles
local combine = import 'gen/addons/oci-security-zones/combined.libsonnet';
combine([])
