// xrpc rejects peer_key as a public config field
// error_contains: contains unsupported keys: peer_key
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
    region_b: {
      remote_cidrs: ['10.1.0.0/16'],
      peer_key: 'RPC-FRA-LZ-HUB-REGION-B-KEY',
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
