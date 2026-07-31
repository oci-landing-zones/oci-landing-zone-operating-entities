local environment(vcn) = {
  shared_project_network: {
    network: {
      vcn: vcn,
    },
  },
};

{
  manual_iam_options: {
    connectivity_hub: {
      enable_delete: 'true',
      enable_cis_benchmark_checks: 'false',
      root_description: 'Enclosing Production Landing Zone Compartment',
    },
    oe1: {
      enable_delete: true,
      enable_cis_benchmark_checks: false,
      root_description: 'Enclosing oe1 Production Landing Zone Compartment',
    },
  },

  // Role-oriented sources for customers adapting an existing One-OE deployment
  // without Blueprint Factory. Publication keeps the historical curated IAM
  // boundary while emitting the network and governance references.
  connectivity_hub_reference: {
    region: 'eu-frankfurt-1',
    region_short_name: 'fra',
    hub: {
      kind: 'hub_a',
      network: {
        vcn: '10.0.0.0/21',
      },
    },
    remote_peering_connections: {
      oe1: {
        remote_cidrs: ['10.1.0.0/16'],
        peer_region_name: 'eu-amsterdam-1',
        peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
        requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
      },
    },
    environments: {
      prod: environment('10.0.64.0/21'),
      preprod: environment('10.0.128.0/21'),
    },
  },

  oe1_reference: {
    region: 'eu-amsterdam-1',
    region_short_name: 'ams',
    hub: {
      kind: 'hub_e',
      network: {
        vcn: '10.1.0.0/21',
      },
    },
    remote_peering_connections: {
      connectivity_hub: {
        remote_cidrs: ['10.0.0.0/16'],
        peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.replace-me',
        peer_region_name: 'eu-frankfurt-1',
        peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor',
      },
    },
    environments: {
      prod: environment('10.1.64.0/21'),
      preprod: environment('10.1.128.0/21'),
    },
  },

  // Focused RPC-only reference profiles.
  same_tenancy_acceptor: {
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
        peer_region_name: 'eu-amsterdam-1',
      },
    },
    environments: {
      prod: environment('10.0.64.0/21'),
    },
  },

  same_tenancy_requestor: {
    region: 'eu-amsterdam-1',
    region_short_name: 'ams',
    hub: {
      kind: 'hub_e',
      network: {
        vcn: '10.1.0.0/21',
      },
    },
    remote_peering_connections: {
      region_a: {
        remote_cidrs: ['10.0.0.0/16'],
        peer_id: 'RPC-FRA-LZ-HUB-REGION-B-KEY',
        peer_region_name: 'eu-frankfurt-1',
      },
    },
    environments: {
      prod: environment('10.1.64.0/21'),
    },
  },

  cross_tenancy_acceptor: {
    region: 'eu-frankfurt-1',
    region_short_name: 'fra',
    hub: {
      kind: 'hub_a',
      network: {
        vcn: '10.0.0.0/21',
      },
    },
    remote_peering_connections: {
      requestor: {
        remote_cidrs: ['10.1.0.0/16'],
        peer_region_name: 'eu-amsterdam-1',
        peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
        requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
      },
    },
    environments: {
      prod: environment('10.0.64.0/21'),
    },
  },

  cross_tenancy_requestor: {
    region: 'eu-amsterdam-1',
    region_short_name: 'ams',
    hub: {
      kind: 'hub_e',
      network: {
        vcn: '10.1.0.0/21',
      },
    },
    remote_peering_connections: {
      acceptor: {
        remote_cidrs: ['10.0.0.0/16'],
        peer_id: 'RPC-FRA-LZ-HUB-REQUESTOR-KEY',
        peer_region_name: 'eu-frankfurt-1',
        peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor',
      },
    },
    environments: {
      prod: environment('10.1.64.0/21'),
    },
  },
}
