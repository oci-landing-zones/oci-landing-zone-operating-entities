// Reject a custom environment/platform identifier that cannot fit the OCI NFW limit.
// error_contains: OCI Network Firewall address-list name exceeds the 28-character limit
local lz = import 'gen/landing_zone.libsonnet';
local result = lz({
  hub: { kind: 'hub_b', network: { vcn: '10.100.0.0/20' } },
  environments: {
    customerdevelopment: {
      platforms: {
        oke: {
          network: { vcn: '10.100.16.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '172.20.0.0/20',
              api_endpoint_allowed_cidrs: ['10.100.2.0/24'],
            },
          },
        },
      },
    },
  },
});

// Force Network Firewall address-list evaluation.
result.network_pre
