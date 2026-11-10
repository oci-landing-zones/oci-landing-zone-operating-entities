// Native pod addresses must come from an OCI subnet rather than an overlay CIDR.
// error_contains: native OKE must omit config_params.pods_cidr
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: { platforms: { oke: {
      network: { vcn: '10.0.80.0/20' },
      extension: { type: 'oke_simple', params: {
        kubernetes_version: 'v1.35.2',
        services_cidr: '10.96.0.0/16',
        api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
        pods_cidr: '10.244.0.0/16',
      } },
    } } },
  },
}
