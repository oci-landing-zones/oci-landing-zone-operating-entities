// An infrastructure-only ExaCS scope cannot emit Cloud VM Cluster input.
// error_contains: exacs_database_workload.vmclusters requires database placement with platform.network
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {},
  },
  shared_platforms: {
    exacs: {
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
                vmc_primary: {
                  exadata_infrastructure_id: 'infra_primary',
                },
              },
            },
          },
        },
      },
    },
  },
}
