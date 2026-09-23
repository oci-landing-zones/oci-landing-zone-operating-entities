// A Cloud VM Cluster requires an explicit upstream infrastructure reference.
// error_contains: exacs_database_workload.vmclusters.vmc_primary.exadata_infrastructure_id must be a non-empty string
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
                vmclusters: {
                  cloud_vm_clusters: {
                    vmc_primary: {},
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
