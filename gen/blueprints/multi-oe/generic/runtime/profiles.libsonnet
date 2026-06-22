local base = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  operating_entities: {
    oe_alpha: {
      display_name: 'OE Alpha',
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
    oe_beta: {
      display_name: 'OE Beta',
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

{
  hub_a: { config: base { hub: { kind: 'hub_a', network: { vcn: '10.0.0.0/21' } } } },
  hub_b: { config: base { hub: { kind: 'hub_b', network: { vcn: '10.0.0.0/21' } } } },
  hub_c: { config: base { hub: { kind: 'hub_c', network: { vcn: '10.0.0.0/21' } } } },
  hub_e: { config: base { hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } } } },
}
