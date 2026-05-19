// ExaCC notification default email list must not be empty
// error_contains: exacc notification_emails.default must contain at least one value
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: [],
          },
        },
      },
    },
  },
}
