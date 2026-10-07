// Published ExaDB-D UC1 workload renders three isolated operation documents for both stack paths.
local single = import 'gen/workload-extensions/exacs/database-workload/single-stack/profiles.libsonnet';
local multi = import 'gen/workload-extensions/exacs/database-workload/multi-stack/profiles.libsonnet';
local published = import 'gen/workload-extensions/exacs/database-workload/published.libsonnet';
local single_output = published.single_stack(single.uc1.config);
local multi_outputs = published.render(multi.uc1.config);
{
  single_root_keys: std.objectFields(single_output),
  single_sections: std.sort(std.objectFields(single_output.cloud_exadata_database_configuration)),
  multi_output_names: std.sort(std.objectFields(multi_outputs)),
  multi_sections: {
    [name]: std.sort(std.objectFields(multi_outputs[name].cloud_exadata_database_configuration))
    for name in std.objectFields(multi_outputs)
  },
}
