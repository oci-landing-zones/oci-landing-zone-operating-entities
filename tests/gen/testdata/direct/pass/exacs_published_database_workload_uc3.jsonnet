// Published UC3 keeps two independent environment infrastructure-to-PDB chains.
local single = import 'gen/workload-extensions/exacs/database-workload/single-stack/profiles.libsonnet';
local multi = import 'gen/workload-extensions/exacs/database-workload/multi-stack/profiles.libsonnet';
local published = import 'gen/workload-extensions/exacs/database-workload/published.libsonnet';
local s = published.single_stack(single.uc3.config).cloud_exadata_database_configuration;
local m = published.render(multi.uc3.config);
local combined = m.infrastructure.cloud_exadata_database_configuration
  + m.vmclusters.cloud_exadata_database_configuration
  + m.databases.cloud_exadata_database_configuration;
{
  same_sections: s == combined,
  sections: std.sort(std.objectFields(s)),
  infrastructure_keys: std.sort(std.objectFields(s.cloud_exadata_infrastructures_configuration.cloud_exadata_infrastructures)),
  vmcluster_keys: std.sort(std.objectFields(s.cloud_vm_clusters_configuration)),
  dbhome_keys: std.sort(std.objectFields(s.cloud_db_homes_configuration)),
  cdb_keys: std.sort(std.objectFields(s.databases_configuration)),
  pdb_keys: std.sort(std.objectFields(s.pluggable_databases_configuration)),
  no_shared_platform: !std.objectHas(single.uc3.config, 'shared_platforms'),
  regular_workload_has_no_project_db_tiers: std.all([
    !std.objectHas(single.uc3.config.environments[env].platforms.exacs.extension.params, 'project_db_compartments')
    for env in ['prod', 'preprod']
  ]),
  environment_chains: std.all([
    s.cloud_vm_clusters_configuration['vmc_' + env].exadata_infrastructure_id == 'infra_' + env
    && s.cloud_db_homes_configuration['dbhome_' + env].vm_cluster_id == 'vmc_' + env
    && s.databases_configuration['cdb_' + env].db_home_id == 'dbhome_' + env
    && s.pluggable_databases_configuration['pdb_' + env].container_database_id == 'cdb_' + env
    for env in ['prod', 'preprod']
  ]),
}
