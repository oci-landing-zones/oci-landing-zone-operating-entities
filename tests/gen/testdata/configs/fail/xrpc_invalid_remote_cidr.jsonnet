// xrpc validates each remote CIDR with the normal CIDR validator
// error_contains: remote_cidrs[0] must be a canonical IPv4 CIDR
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
    region_b: { remote_cidrs: ['10.1.0.1/16'] },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
