// xrpc requires cross-tenancy IAM OCIDs to be provided as a pair
// error_contains: requestor_group_ocid is required when peer_tenancy_ocid is provided
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_e',
    network: {
      vcn: '10.0.0.0/21',
      remote_peering_connections: {
        region_b: {
          remote_cidrs: ['10.1.0.0/16'],
          peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
        },
      },
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
