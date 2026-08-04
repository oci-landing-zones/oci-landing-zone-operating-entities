// Config-mode OKE public LB and NLB access is explicitly enabled for one platform.
// contains: "tagns-lz-oke.platform": "prod-oke"
// contains: manage public-ips
// contains: LOAD_BALANCER_CREATE
// contains: NETWORK_LOAD_BALANCER_CREATE
// contains: "PCY-LZ-OKE-SERVICE-PUBLIC-LB-HUB-KEY"
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              public_load_balancer: true,
            },
          },
        },
      },
    },
  },
}
