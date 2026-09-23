// UC1, UC2, and UC3 ExaCS database-workload operations resolve compartment and subnet keys from their placement scope.
local multi = import 'gen/landing_zone_multi.jsonnet';

local emails = {
  default: ['exacs-platform@example.com'],
  db_workloads: ['exacs-db@example.com'],
  infra_workloads: ['exacs-infra@example.com'],
  projects: ['exacs-projects@example.com'],
};

local infrastructure(key) = {
  infrastructure: {
    cloud_exadata_infrastructures: {
      [key]: { display_name: key, shape: 'Exadata.X11M' },
    },
  },
};

local database(key, infrastructure_key) = {
  vmclusters: {
    cloud_vm_clusters: {
      [key]: { exadata_infrastructure_id: infrastructure_key },
    },
  },
  databases: {
    cloud_db_homes: {
      [key + '_home']: { vm_cluster_id: key },
    },
    databases: {
      [key + '_cdb']: { db_home_id: key + '_home' },
    },
    pluggable_databases: {
      [key + '_pdb']: { container_database_id: key + '_cdb', pdb_name: 'PDB' },
    },
  },
};

local extension(database_workload) = {
  extension: {
    type: 'exacs',
    params: { notification_emails: emails, exacs_database_workload: database_workload },
  },
};

local base = {
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {},
    preprod: {},
  },
};

local uc1 = multi(base {
  shared_platforms: {
    exacs: extension(infrastructure('shared_infra') + database('shared_vmc', 'shared_infra')) + {
      network: { vcn: '10.0.24.0/21' },
    },
  },
});

local uc2 = multi(base {
  shared_platforms: {
    exacs: extension(infrastructure('shared_infra')),
  },
  environments+: {
    prod+: {
      platforms: {
        exacs: extension(database('prod_vmc', 'shared_infra')) + {
          network: { vcn: '10.0.24.0/21' },
        },
      },
    },
  },
});

local uc3 = multi(base {
  environments+: {
    prod+: {
      platforms: {
        exacs: extension(infrastructure('prod_infra') + database('prod_vmc', 'prod_infra')) + {
          network: { vcn: '10.0.24.0/21' },
        },
      },
    },
    preprod+: {
      platforms: {
        exacs: extension(infrastructure('preprod_infra') + database('preprod_vmc', 'preprod_infra')) + {
          network: { vcn: '10.0.32.0/21' },
        },
      },
    },
  },
});

local root(output, name) =
  output[name].cloud_exadata_database_configuration;

local summarize(output, infrastructure_key, vmcluster_key) = {
  database_sections: std.sort(std.objectFields(root(output, 'exacs_cloud_exadata_databases.json'))),
  infrastructure_compartment:
    root(output, 'exacs_cloud_exadata_infrastructure.json')
      .cloud_exadata_infrastructures_configuration.cloud_exadata_infrastructures[infrastructure_key]
      .compartment_id,
  vmcluster_backup_subnet:
    root(output, 'exacs_cloud_exadata_vmclusters.json')
      .cloud_vm_clusters_configuration[vmcluster_key].backup_subnet_id,
  vmcluster_compartment:
    root(output, 'exacs_cloud_exadata_vmclusters.json')
      .cloud_vm_clusters_configuration[vmcluster_key].compartment_id,
  vmcluster_subnet:
    root(output, 'exacs_cloud_exadata_vmclusters.json')
      .cloud_vm_clusters_configuration[vmcluster_key].subnet_id,
};

{
  uc1: summarize(uc1, 'shared_infra', 'shared_vmc'),
  uc2: summarize(uc2, 'shared_infra', 'prod_vmc'),
  uc3: {
    preprod: summarize(uc3, 'preprod_infra', 'preprod_vmc'),
    prod: summarize(uc3, 'prod_infra', 'prod_vmc'),
  },
}
