function(hub_kind) {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  cis_level: 2,
  hub: {
    kind: hub_kind,
    network: { vcn: '10.0.0.0/21' },
  },
  security_targets: ['alpha-prod', 'beta-prod'],
  operating_entities: {
    alpha: {
      display_name: 'Alpha',
      dns: 'al',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
    beta: {
      display_name: 'Beta',
      dns: 'be',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.1.64.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
  },
}
