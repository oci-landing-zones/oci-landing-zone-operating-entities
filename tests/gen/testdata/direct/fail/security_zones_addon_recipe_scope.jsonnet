// The environment-only add-on rejects obsolete scope selection.
// error_contains: Security Zones environment profiles do not accept recipe_scope
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
render(profiles.environment_cis1 + { recipe_scope: 'shared_network' })
