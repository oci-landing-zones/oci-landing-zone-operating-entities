// xrpc validates peer_tenancy_ocid shape when cross-tenancy IAM is requested
// error_contains: peer_tenancy_ocid must start with ocid1.tenancy
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
      peer_tenancy_ocid: 'not-a-tenancy',
      requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
