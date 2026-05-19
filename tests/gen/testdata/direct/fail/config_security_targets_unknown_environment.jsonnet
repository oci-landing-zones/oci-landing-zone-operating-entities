// config normalization rejects security targets that reference unknown environments
// error_contains: config.security_targets must only reference defined environments: missing
local cfg = import '../../../../../gen/config.libsonnet';

cfg.normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  security_targets: ['missing'],
})
