// regional stacks cannot emit cross-tenancy RPC without complete-stack IAM ownership
// error_contains: config.stack_scope regional does not support cross-tenancy remote peering
local config = import 'gen/config.libsonnet';

config.normalize({
  region: 'uk-london-1',
  region_short_name: 'lhr',
  stack_scope: 'regional',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {},
  remote_peering_connections: {
    external: {
      remote_cidrs: ['10.1.0.0/21'],
      peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.example',
      peer_region_name: 'eu-frankfurt-1',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..example',
    },
  },
})
