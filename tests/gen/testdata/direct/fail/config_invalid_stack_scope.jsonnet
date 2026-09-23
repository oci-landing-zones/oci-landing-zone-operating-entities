// stack_scope rejects unknown ownership modes
// error_contains: config.stack_scope must be one of: complete, regional
local config = import 'gen/config.libsonnet';

config.normalize({
  stack_scope: 'foundation',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {},
})
