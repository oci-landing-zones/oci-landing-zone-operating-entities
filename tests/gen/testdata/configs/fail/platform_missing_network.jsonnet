// platform config requires network block before extension expansion
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        data: {
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
