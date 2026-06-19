// xrpc validates requestor_group_ocid shape when cross-tenancy IAM is requested
// error_contains: requestor_group_ocid must start with ocid1.group
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
          requestor_group_ocid: 'not-a-group',
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
