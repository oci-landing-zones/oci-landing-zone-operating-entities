// OKE platforms must be owned by an environment.
// error_contains: oke_simple is supported only under environments.<environment>.platforms
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {},
  },
  shared_platforms: {
    oke: {
      network: { vcn: '10.0.80.0/20' },
      extension: {
        type: 'oke_simple',
        params: {
          kubernetes_version: 'v1.35.2',
          services_cidr: '10.96.0.0/16',
          api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
        },
      },
    },
  },
}
