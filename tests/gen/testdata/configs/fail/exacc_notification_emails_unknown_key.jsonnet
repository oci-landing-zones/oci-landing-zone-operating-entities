// ExaCC notification email config rejects unsupported topic keys to catch typos
// error_contains: exacc notification_emails contains unsupported keys: operators
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: ['exacc-platform@example.com'],
            operators: ['operators@example.com'],
          },
        },
      },
    },
  },
}
