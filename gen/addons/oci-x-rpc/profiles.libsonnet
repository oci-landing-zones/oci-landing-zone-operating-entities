{
  same_tenancy_acceptor: {
    region: 'eu-frankfurt-1',
    region_short_name: 'fra',
    hub: {
      kind: 'hub_e',
      network: {
        vcn: '10.0.0.0/21',
        remote_peering_connections: {
          region_b: {
            remote_cidrs: ['10.1.0.0/16'],
            peer_region_name: 'eu-amsterdam-1',
          },
        },
      },
    },
    environments: {
      prod: {
        shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      },
    },
  },

  same_tenancy_requester: {
    region: 'eu-amsterdam-1',
    region_short_name: 'ams',
    hub: {
      kind: 'hub_e',
      network: {
        vcn: '10.1.0.0/21',
        remote_peering_connections: {
          region_a: {
            remote_cidrs: ['10.0.0.0/16'],
            peer_id: 'RPC-FRA-LZ-HUB-REGION-B-KEY',
            peer_region_name: 'eu-frankfurt-1',
          },
        },
      },
    },
    environments: {
      prod: {
        shared_project_network: { network: { vcn: '10.1.64.0/21' } },
      },
    },
  },

  cross_tenancy_acceptor: {
    region: 'eu-frankfurt-1',
    region_short_name: 'fra',
    hub: {
      kind: 'hub_a',
      network: {
        vcn: '10.0.0.0/21',
        remote_peering_connections: {
          tenancy2: {
            remote_cidrs: ['10.1.0.0/16'],
            peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
            requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
          },
        },
      },
    },
    environments: {
      prod: {
        shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      },
    },
  },

  cross_tenancy_requester: {
    region: 'eu-amsterdam-1',
    region_short_name: 'ams',
    hub: {
      kind: 'hub_e',
      network: {
        vcn: '10.1.0.0/21',
        remote_peering_connections: {
          tenancy1: {
            remote_cidrs: ['10.0.0.0/16'],
            peer_id: 'RPC-FRA-LZ-HUB-TENANCY2-KEY',
            peer_region_name: 'eu-frankfurt-1',
            peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor',
            requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
          },
        },
      },
    },
    environments: {
      prod: {
        shared_project_network: { network: { vcn: '10.1.64.0/21' } },
      },
    },
  },
}
