// hub subnet override must include every required hub_b subnet key
{
  hub: {
    kind: 'hub_b',
    network: {
      vcn: '10.0.0.0/21',
      subnets: {
        lb: '10.0.0.0/24',
        mgmt: '10.0.2.0/24',
        mon: '10.0.3.0/24',
        dns: '10.0.4.0/24',
      },
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
}
