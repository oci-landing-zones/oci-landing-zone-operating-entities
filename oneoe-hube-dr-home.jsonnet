{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  cis_level: 2,
  hub: {
    kind: 'hub_e',
    network: {
      vcn: '10.0.0.0/21',
    },
  },
  environments: {
    prod: {
      shared_project_network: {
        network: {
          vcn: '10.0.64.0/21',
        },
      },
    },
    preprod: {
      shared_project_network: {
        network: {
          vcn: '10.0.128.0/21',
        },
      },
    },
  },
}
