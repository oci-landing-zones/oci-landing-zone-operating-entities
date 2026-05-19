// hub subnet override rejects unknown hub_b subnet names
{
  hub: {
    kind: 'hub_b',
    network: {
      vcn: '10.0.0.0/21',
      subnets: {
        lb: '10.0.0.0/24',
        fw: '10.0.1.0/24',
        mgmt: '10.0.2.0/24',
        mon: '10.0.3.0/24',
        dns: '10.0.4.0/24',
        firewall: '10.0.5.0/24',
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
