// Config mode emits one isolated Cloud Exadata root document for each ExaCS database-workload operation.
local multi = import 'gen/landing_zone_multi.jsonnet';
local config = import 'tests/gen/testdata/configs/pass/exacs_database_workload.jsonnet';
local outputs = multi(config);
local root(name) = outputs[name].cloud_exadata_database_configuration;
{
  database_input:
    root('exacs_cloud_exadata_databases.json')
      .databases_configuration.cdb_primary.database,
  database_sections: std.sort(std.objectFields(root('exacs_cloud_exadata_databases.json'))),
  infrastructure_root_keys: std.objectFields(outputs['exacs_cloud_exadata_infrastructure.json']),
  infrastructure_sections: std.objectFields(root('exacs_cloud_exadata_infrastructure.json')),
  database_workload_output_files: std.sort([
    name
    for name in std.objectFields(outputs)
    if std.startsWith(name, 'exacs_cloud_exadata_')
  ]),
  vmclusters_root_keys: std.objectFields(outputs['exacs_cloud_exadata_vmclusters.json']),
  vmclusters_sections: std.objectFields(root('exacs_cloud_exadata_vmclusters.json')),
}
