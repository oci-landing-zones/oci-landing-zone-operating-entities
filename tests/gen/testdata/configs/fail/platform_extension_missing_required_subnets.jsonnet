// OKE extension rejects subnet overrides that omit required subnet keys
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.72.0/21' } },
      platforms: {
        oke: {
          network: {
            vcn: '10.0.80.0/21',
            subnets: {
              'int-lb': '10.0.80.0/25',
              workers: '10.0.81.0/23',
              pods: '10.0.83.0/23',
            },
          },
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
