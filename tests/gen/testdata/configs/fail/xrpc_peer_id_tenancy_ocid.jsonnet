// xrpc keeps peer_id separate from tenancy OCID input
// error_contains: peer_id must reference a remote peering connection OCID or dependency key
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
      peer_id: 'ocid1.tenancy.oc1..wrong',
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
