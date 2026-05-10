// EXACS requires notification_emails config
// error_contains: exacs notification_emails is required
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacs: {
      extension: {
        type: 'exacs',
        params: {},
      },
    },
  },
}
