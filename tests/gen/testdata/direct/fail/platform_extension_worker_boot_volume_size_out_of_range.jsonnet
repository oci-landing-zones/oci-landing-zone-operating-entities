// Worker boot-volume size must stay inside the downstream OCI-supported range.
// error_contains: config_params.worker_boot_volume_size must be between 50 and 32768 GB
local multi = import 'gen/landing_zone_multi.jsonnet';

multi({
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
              worker_boot_volume_size: 49,
            },
          },
        },
      },
    },
  },
})
