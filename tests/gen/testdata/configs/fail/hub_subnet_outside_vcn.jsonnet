// Hub subnets must fit inside hub VCN
// error_contains: config.hub.network.subnets for hub_e must be contained by 10.0.0.0/21
{
  hub: {
    kind: 'hub_e',
    network: {
      vcn: '10.0.0.0/21',
      subnets: {
        lb: '10.0.0.0/24',
        mgmt: '10.0.1.0/24',
        mon: '10.0.2.0/24',
        dns: '10.0.8.0/24',
      },
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
