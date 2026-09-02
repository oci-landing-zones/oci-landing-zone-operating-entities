{
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  realm: 'oc1',
  cis_level: 2,
  hub: {
    kind: 'hub_e',
    network: {
      vcn: '10.0.192.0/21',
    },
  },
  environments: {
    prod: {
      shared_project_network: {
        network: {
          vcn: '10.0.200.0/21',
        },
      },
    },
  },
}
