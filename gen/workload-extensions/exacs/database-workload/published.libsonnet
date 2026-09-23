local multi = import '../../../landing_zone_multi.jsonnet';

{
  render(config)::
    local outputs = multi(config);
    {
      infrastructure: outputs['exacs_cloud_exadata_infrastructure.json'],
      vmclusters: outputs['exacs_cloud_exadata_vmclusters.json'],
      databases: outputs['exacs_cloud_exadata_databases.json'],
    },
}
