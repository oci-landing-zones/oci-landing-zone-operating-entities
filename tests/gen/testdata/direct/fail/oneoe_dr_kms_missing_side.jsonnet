// A KMS DR profile pair must provide both regional configurations.
// error_contains: KMS DR profile pair must contain home and dr configurations
local defaults = import 'gen/defaults.libsonnet';
local home_security = import 'gen/addons/oci-lz-dr/one-oe/home_security.libsonnet';

home_security({ home: defaults.hub_a }).cis2
