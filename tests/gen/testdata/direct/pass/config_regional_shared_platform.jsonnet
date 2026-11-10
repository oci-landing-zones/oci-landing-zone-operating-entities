// regional stacks normalize shared network platforms
// contains: "stack_scope": "regional"
// contains: "shared_platforms": {
local config = import 'gen/config.libsonnet';

config.normalize({
  stack_scope: 'regional',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {},
  shared_platforms: {
    database: {
      network: {
        vcn: '10.0.64.0/21',
        subnets: { db: '10.0.64.0/24' },
      },
    },
  },
})
