// Arbitrary regex selectors cannot be used by the released OKE image selector.
// error_contains: config_params.worker_image must be an Oracle Linux 8/9 version or image OCID
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: { platforms: { oke: {
      network: { vcn: '10.0.80.0/20' },
      extension: { type: 'oke_simple', params: {
        kubernetes_version: 'v1.35.2',
        services_cidr: '10.96.0.0/16',
        api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
        worker_image: '.*',
      } },
    } } },
  },
}
