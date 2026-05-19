// Shared project subnets must fit inside shared project VCN
// error_contains: Environment prod.shared_project_network.network.subnets must be contained by 10.0.64.0/21
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: {
        network: {
          vcn: '10.0.64.0/21',
          subnets: {
            web: '10.0.64.0/24',
            app: '10.0.65.0/24',
            db: '10.0.66.0/24',
            infra: '10.0.72.0/24',
          },
        },
      },
    },
  },
}
