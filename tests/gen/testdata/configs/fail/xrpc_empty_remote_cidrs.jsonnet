// xrpc requires at least one remote CIDR for every peer
// error_contains: remote_cidrs must contain at least one value
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_e',
    network: {
      vcn: '10.0.0.0/21',
    },
  },
  remote_peering_connections: {
    region_b: { remote_cidrs: [] },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
