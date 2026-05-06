// ExaCC notification email config requires default fallback recipients
// error_contains: exacc notification_emails.default is required
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            db_workloads: ['exacc-db@example.com'],
          },
        },
      },
    },
  },
}
