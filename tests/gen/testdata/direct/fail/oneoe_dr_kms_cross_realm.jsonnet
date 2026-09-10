// KMS replicas cannot use a DR profile from a different OCI realm.
// error_contains: KMS DR profile pair must use the same OCI realm
local defaults = import 'gen/defaults.libsonnet';
local profiles = import 'gen/addons/oci-lz-dr/one-oe/profiles.libsonnet';
local home_security = import 'gen/addons/oci-lz-dr/one-oe/home_security.libsonnet';

home_security({
  home: defaults.hub_a,
  dr: profiles.hub_a + { realm: 'oc19' },
}).cis2
