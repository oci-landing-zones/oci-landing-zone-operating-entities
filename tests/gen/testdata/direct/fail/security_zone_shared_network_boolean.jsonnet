// error_contains: config.enable_shared_network_security_zone must be a boolean
local config = import 'gen/config.libsonnet';
config.normalize({ hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } }, enable_shared_network_security_zone: 'false' })
