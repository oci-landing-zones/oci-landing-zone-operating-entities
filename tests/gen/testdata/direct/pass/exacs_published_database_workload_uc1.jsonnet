// Published ExaDB-D UC1 workload renders three isolated operation documents for both stack paths.
local single = import 'gen/workload-extensions/exacs/database-workload/single-stack/profiles.libsonnet';
local multi = import 'gen/workload-extensions/exacs/database-workload/multi-stack/profiles.libsonnet';
local published = import 'gen/workload-extensions/exacs/database-workload/published.libsonnet';
local single_outputs = published.render(single.uc1.config);
local multi_outputs = published.render(multi.uc1.config);
{
  output_names: std.sort(std.objectFields(single_outputs)),
  roots: {
    [name]: std.objectFields(single_outputs[name])
    for name in std.objectFields(single_outputs)
  },
  sections: {
    [name]: std.sort(std.objectFields(single_outputs[name].cloud_exadata_database_configuration))
    for name in std.objectFields(single_outputs)
  },
  stack_profiles_match: single_outputs == multi_outputs,
}
