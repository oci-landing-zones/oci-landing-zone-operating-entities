// Identity domain names reject characters that cannot be used in generated IAM references.
// error_contains: config.identity_domain_name may contain only
local config = import 'gen/config.libsonnet';
config.normalize({ identity_domain_name: "invalid'name", hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } } })
