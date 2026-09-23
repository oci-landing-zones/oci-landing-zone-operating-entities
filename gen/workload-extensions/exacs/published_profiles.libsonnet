local notification_emails = {
  default: ['exacs-platform-team@example.com'],
  db_workloads: ['exacs-db-team@example.com'],
  infra_workloads: ['exacs-infra-team@example.com'],
  projects: ['exacs-project-team@example.com'],
};

local exacs_params(projects=null) = {
  [if projects != null then 'project_db_compartments']: projects,
  notification_emails: notification_emails,
};

local infra_only = { infrastructure: true, database: false };
local db_only = { infrastructure: false, database: true };
local infra_and_db = { infrastructure: true, database: true };

local exacs_extension(projects=null, components=null) = {
  [if components != null then 'publication_components']: components,
  extension: {
    type: 'exacs',
    params: exacs_params(projects),
  },
};

local env_exacs_platform(projects, vcn, components=null) = exacs_extension(projects, components) + {
  network: { vcn: vcn },
};

local shared_exacs_platform(projects=null) = exacs_extension(projects, infra_and_db) + {
  network: { vcn: '10.0.24.0/21' },
};

local prod_exacs_vcn = '10.0.104.0/21';
local preprod_exacs_vcn = '10.0.168.0/21';

local base_prod_preprod_config(hub_kind) = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  hub: {
    kind: hub_kind,
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
    preprod: {
      project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
    },
  },
};

local prod_preprod_exacs_uc1_config(hub_kind) = base_prod_preprod_config(hub_kind) {
  shared_platforms: {
    exacs: shared_exacs_platform({
      prod: ['proj1'],
      preprod: ['proj1'],
    }),
  },
};

local prod_preprod_exacs_database_workload_uc1_config =
  prod_preprod_exacs_uc1_config('hub_e') {
    shared_platforms+: {
      exacs+: {
        extension+: {
          params+: {
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
                    ssh_public_keys: ['ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY'],
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
                      admin_password_secret_id: 'ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID',
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
  };

local prod_preprod_exacs_uc2_config(hub_kind) = base_prod_preprod_config(hub_kind) {
  shared_platforms: {
    exacs: exacs_extension(null, infra_only),
  },
  environments+: {
    prod+: {
      platforms: {
        exacs: env_exacs_platform(['proj1'], prod_exacs_vcn, db_only),
      },
    },
    preprod+: {
      platforms: {
        exacs: env_exacs_platform(['proj1'], preprod_exacs_vcn, db_only),
      },
    },
  },
};

local prod_preprod_exacs_uc3_config(hub_kind) = base_prod_preprod_config(hub_kind) {
  environments+: {
    prod+: {
      platforms: {
        exacs: env_exacs_platform(['proj1'], prod_exacs_vcn, infra_and_db),
      },
    },
    preprod+: {
      platforms: {
        exacs: env_exacs_platform(['proj1'], preprod_exacs_vcn, infra_and_db),
      },
    },
  },
};

{
  notification_emails: notification_emails,

  hub_a_prod_preprod_exacs_uc1_config: prod_preprod_exacs_uc1_config('hub_a'),
  hub_e_prod_preprod_exacs_uc1_config: prod_preprod_exacs_uc1_config('hub_e'),
  hub_e_prod_preprod_exacs_database_workload_uc1_config:
    prod_preprod_exacs_database_workload_uc1_config,
  hub_a_prod_preprod_exacs_uc2_config: prod_preprod_exacs_uc2_config('hub_a'),
  hub_e_prod_preprod_exacs_uc2_config: prod_preprod_exacs_uc2_config('hub_e'),
  hub_a_prod_preprod_exacs_uc3_config: prod_preprod_exacs_uc3_config('hub_a'),
  hub_e_prod_preprod_exacs_uc3_config: prod_preprod_exacs_uc3_config('hub_e'),
}
