// Autonomous lifecycle sections are outside the regular ExaCS database-workload contract.
// error_contains: exacs_database_workload contains unsupported keys: autonomous_vmclusters
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        exacs: {
          network: { vcn: '10.0.24.0/21' },
          extension: {
            type: 'exacs',
            params: {
              notification_emails: {
                default: ['exacs-platform@example.com'],
                db_workloads: ['exacs-db@example.com'],
                infra_workloads: ['exacs-infra@example.com'],
                projects: ['exacs-projects@example.com'],
              },
              exacs_database_workload: {
                autonomous_vmclusters: {},
              },
            },
          },
        },
      },
    },
  },
}
