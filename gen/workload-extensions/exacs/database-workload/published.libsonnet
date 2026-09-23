local multi = import '../../../landing_zone_multi.jsonnet';

{
  render(config)::
    local outputs = multi(config);
    {
      infrastructure: outputs['exacs_cloud_exadata_infrastructure.json'],
      vmclusters: outputs['exacs_cloud_exadata_vmclusters.json'],
      databases: outputs['exacs_cloud_exadata_databases.json'],
    },

  single_stack(config)::
    local outputs = self.render(config);
    local documents = [
      outputs.infrastructure.cloud_exadata_database_configuration,
      outputs.vmclusters.cloud_exadata_database_configuration,
      outputs.databases.cloud_exadata_database_configuration,
    ];
    local section_names = std.flattenArrays([
      std.objectFields(document)
      for document in documents
    ]);
    assert std.length(section_names) == std.length(std.uniq(section_names)) :
      'published ExaDB-D single-stack workload contains duplicate Cloud Exadata sections';
    {
      cloud_exadata_database_configuration:
        std.foldl(function(acc, document) acc + document, documents, {}),
    },
}
