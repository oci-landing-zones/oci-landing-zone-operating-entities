// ExaCC is a networkless extension and must not accept a phantom platform VCN
// error_contains: Extension "exacc" for platform shared/exacc does not accept platform.network because metadata.requires_network is false
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacc: {
      network: { vcn: '10.0.80.0/21' },
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: ['exacc-platform@example.com'],
          },
        },
      },
    },
  },
}
