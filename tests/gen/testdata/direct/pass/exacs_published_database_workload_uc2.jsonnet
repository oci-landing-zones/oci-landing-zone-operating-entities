// Published UC2 preserves one shared infrastructure and two complete environment database chains.
local single = import 'gen/workload-extensions/exacs/database-workload/single-stack/profiles.libsonnet';
local multi = import 'gen/workload-extensions/exacs/database-workload/multi-stack/profiles.libsonnet';
local published = import 'gen/workload-extensions/exacs/database-workload/published.libsonnet';
local s = published.single_stack(single.uc2.config).cloud_exadata_database_configuration;
local m = published.render(multi.uc2.config);
local combined = m.infrastructure.cloud_exadata_database_configuration
  + m.vmclusters.cloud_exadata_database_configuration
  + m.databases.cloud_exadata_database_configuration;
{
  same_sections: s == combined,
  sections: std.sort(std.objectFields(s)),
  infrastructure_keys: std.objectFields(s.cloud_exadata_infrastructures_configuration.cloud_exadata_infrastructures),
  vmcluster_keys: std.sort(std.objectFields(s.cloud_vm_clusters_configuration)),
  dbhome_keys: std.sort(std.objectFields(s.cloud_db_homes_configuration)),
  cdb_keys: std.sort(std.objectFields(s.databases_configuration)),
  pdb_keys: std.sort(std.objectFields(s.pluggable_databases_configuration)),
  shared_reference: std.all([
    vmc.exadata_infrastructure_id == 'infra_shared'
    for vmc in std.objectValues(s.cloud_vm_clusters_configuration)
  ]),
  infrastructure_has_no_network: !std.objectHas(single.uc2.config.shared_platforms.exacs, 'network'),
  regular_workload_has_no_project_db_tiers: std.all([
    !std.objectHas(single.uc2.config.environments[env].platforms.exacs.extension.params, 'project_db_compartments')
    for env in ['prod', 'preprod']
  ]),
  environment_chains: std.all([
    s.cloud_db_homes_configuration['dbhome_' + env].vm_cluster_id == 'vmc_' + env
    && s.databases_configuration['cdb_' + env].db_home_id == 'dbhome_' + env
    && s.pluggable_databases_configuration['pdb_' + env].container_database_id == 'cdb_' + env
    for env in ['prod', 'preprod']
  ]),
}
