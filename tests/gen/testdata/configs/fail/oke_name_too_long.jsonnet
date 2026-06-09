// Long OKE scope names fail before Terraform reaches OCI name limits
// error_contains: OKE cluster name must be 32 characters or less
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prodproductionworkload: {
      shared_project_network: { network: { vcn: '10.0.72.0/21' } },
      projects: { proj1: {} },
      platforms: {
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
    },
  },
}
