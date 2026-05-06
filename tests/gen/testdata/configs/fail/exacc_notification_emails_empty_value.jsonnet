// ExaCC notification email lists reject empty string recipients
// error_contains: exacc notification_emails.default values must be non-empty strings
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: [''],
          },
        },
      },
    },
  },
}
