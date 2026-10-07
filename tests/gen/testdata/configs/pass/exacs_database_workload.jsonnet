// A networked ExaCS scope emits the three Cloud Exadata Database workload operation files.
// contains: exacs_cloud_exadata_infrastructure.json
// contains: exacs_cloud_exadata_vmclusters.json
// contains: exacs_cloud_exadata_databases.json
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
                infrastructure: {
                  cloud_exadata_infrastructures: {
                    infra_primary: {
                      display_name: 'exacs-infra-primary',
                      shape: 'Exadata.X11M',
                    },
                  },
                },
                vmclusters: {
                  cloud_vm_clusters: {
                    vmc_primary: {
                      display_name: 'exacs-vmc-primary',
                      cpu_core_count: 2,
                      exadata_infrastructure_id: 'infra_primary',
                      gi_version: '19.0.0.0',
                      hostname: 'exacsvmc',
                      ssh_public_keys: ['ssh-rsa fixture'],
                    },
                  },
                },
                databases: {
                  cloud_db_homes: {
                    dbhome_primary: {
                      db_version: '19.0.0.0',
                      display_name: 'exacs-dbhome-primary',
                      source: 'VM_CLUSTER_NEW',
                      vm_cluster_id: 'vmc_primary',
                    },
                  },
                  databases: {
                    cdb_primary: {
                      database: {
                        admin_password_secret_id: 'ocid1.vaultsecret.oc1..fixture',
                        db_name: 'CDBPRIM',
                      },
                      db_home_id: 'dbhome_primary',
                      source: 'NONE',
                    },
                  },
                  pluggable_databases: {
                    pdb_primary: {
                      container_database_id: 'cdb_primary',
                      pdb_name: 'PDBPRIMARY',
                    },
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
