local base = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['alpha-prod', 'beta-prod'],
  hub: {
    network: { vcn: '10.0.0.0/21' },
  },
  operating_entities: {
    alpha: {
      display_name: 'Alpha',
      dns: 'al',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
          projects: { proj1: {} },
        },
        preprod: {
          shared_project_network: { network: { vcn: '10.0.128.0/21' } },
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
        preprod: {
          shared_project_network: { network: { vcn: '10.1.128.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
  },
};

local profile(hub_kind) = {
  config: base + {
    hub: base.hub + { kind: hub_kind },
  },
};

{
  hub_a: profile('hub_a'),
  hub_b: profile('hub_b'),
  hub_c: profile('hub_c'),
  hub_e: profile('hub_e'),
}
