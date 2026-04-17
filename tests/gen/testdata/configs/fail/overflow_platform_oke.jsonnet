// too-small OKE platform vcn is rejected when generated subnets overflow available space
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/24' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.31.1',
              services_cidr: '10.96.0.0/16',
            },
          },
        },
      },
    },
  },
}
