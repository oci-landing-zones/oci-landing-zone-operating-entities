local environment(vcn) = {
  shared_project_network: {
    network: {
      vcn: vcn,
    },
  },
};

local tenancy1_acceptor = {
  realm: 'oc1',
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_a',
    network: {
      vcn: '10.0.0.0/21',
    },
  },
  remote_peering_connections: {
    tenancy2: {
      remote_cidrs: [
        '10.1.0.0/21',
        '10.1.64.0/21',
        '10.1.128.0/21',
      ],
      peer_region_name: 'eu-amsterdam-1',
    },
  },
  environments: {
    prod: environment('10.0.64.0/21'),
    preprod: environment('10.0.128.0/21'),
  },
};

local tenancy2_requestor = {
  realm: 'oc1',
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  hub: {
    kind: 'hub_b',
    network: {
      vcn: '10.1.0.0/21',
    },
  },
  remote_peering_connections: {
    tenancy1: {
      remote_cidrs: [
        '10.0.0.0/21',
        '10.0.64.0/21',
        '10.0.128.0/21',
      ],
      peer_id: 'RPC-FRA-LZ-HUB-TENANCY2-KEY',
      peer_region_name: 'eu-frankfurt-1',
    },
  },
  environments: {
    prod: environment('10.1.64.0/21'),
    preprod: environment('10.1.128.0/21'),
  },
};

{
  same_tenancy_acceptor: tenancy1_acceptor,

  same_tenancy_requestor: tenancy2_requestor,

  cross_tenancy_acceptor: tenancy1_acceptor {
    remote_peering_connections+: {
      tenancy2+: {
        peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
        requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
      },
    },
  },

  cross_tenancy_requestor: tenancy2_requestor {
    remote_peering_connections+: {
      tenancy1+: {
        peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor',
      },
    },
  },
}
