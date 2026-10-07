local validation = import '../../lib/validation.libsonnet';
local exadb_project_db = import '../exadb/project_db.libsonnet';
local products = import '../exadb/products.libsonnet';

{
  local object_map(value, label) =
    local checked = validation.object(value, label);
    local keys = std.objectFields(checked);
    local invalid_keys = [key for key in keys if std.type(checked[key]) != 'object'];
    assert std.length(keys) > 0 : '%s must contain at least one entry' % label;
    assert std.length(invalid_keys) == 0 :
           '%s.%s must be an object' % [label, invalid_keys[0]];
    checked,

  local duplicate_keys(keys) = [
    key
    for key in std.uniq(keys)
    if std.length([candidate for candidate in keys if candidate == key]) > 1
  ],

  local assert_unique_keys(keys, label) =
    local duplicates = duplicate_keys(keys);
    assert std.length(duplicates) == 0 :
           '%s contains duplicate logical key: %s' % [label, duplicates[0]];
    true,

  contributions(params)::
    local cfg = params.config_params;
    local has_workload =
      std.objectHas(cfg, 'exacs_database_workload') && cfg.exacs_database_workload != null;
    if !has_workload then {}
    else
      local workload = validation.allowed_keys(
        validation.object(cfg.exacs_database_workload, 'exacs_database_workload'),
        'exacs_database_workload',
        ['infrastructure', 'vmclusters', 'databases']
      );
      local scope_config = if std.objectHas(params, 'scope_config') then params.scope_config else {};
      local inferred_components =
        if std.objectHas(scope_config, 'extension_entry_components') then
          scope_config.extension_entry_components
        else null;
      local components = exadb_project_db.normalize_components(
        products.exacs,
        cfg,
        inferred_components
      );
      local n = params.naming;
      local scope = params.topology;
      local infrastructure_compartment = exadb_project_db.platform_infra_key(
        products.exacs,
        n,
        scope
      );
      local database_compartment = exadb_project_db.platform_db_key(
        products.exacs,
        n,
        scope
      );
      local subnet_key(kind) = n.key(
        'SN',
        [scope.scope_name, 'PLATFORM', scope.platform_name, kind]
      );
      local operation(name) =
        validation.object(workload[name], 'exacs_database_workload.%s' % name);
      local infrastructure =
        if std.objectHas(workload, 'infrastructure') then
          local input = validation.allowed_keys(
            operation('infrastructure'),
            'exacs_database_workload.infrastructure',
            ['cloud_exadata_infrastructures']
          );
          local records = object_map(
            validation.required(
              input,
              'cloud_exadata_infrastructures',
              'exacs_database_workload.infrastructure.cloud_exadata_infrastructures'
            ),
            'exacs_database_workload.infrastructure.cloud_exadata_infrastructures'
          );
          assert components.infrastructure :
                 'exacs_database_workload.infrastructure requires infrastructure placement';
          {
            exacs_cloud_exadata_infrastructure: {
              assert assert_unique_keys(
                self._database_workload_infrastructure_keys,
                'exacs_database_workload.infrastructure'
              ) : null,
              _database_workload_infrastructure_keys+:: std.objectFields(records),
              cloud_exadata_database_configuration+: {
                cloud_exadata_infrastructures_configuration+: {
                  cloud_exadata_infrastructures+: {
                    [key]: records[key] + { compartment_id: infrastructure_compartment }
                    for key in std.objectFields(records)
                  },
                },
              },
            },
          }
        else {};
      local vmclusters =
        if std.objectHas(workload, 'vmclusters') then
          local input = validation.allowed_keys(
            operation('vmclusters'),
            'exacs_database_workload.vmclusters',
            ['cloud_vm_clusters']
          );
          local records = object_map(
            validation.required(
              input,
              'cloud_vm_clusters',
              'exacs_database_workload.vmclusters.cloud_vm_clusters'
            ),
            'exacs_database_workload.vmclusters.cloud_vm_clusters'
          );
          local invalid_references = [
            key
            for key in std.objectFields(records)
            if !std.objectHas(records[key], 'exadata_infrastructure_id') ||
               std.type(records[key].exadata_infrastructure_id) != 'string' ||
               records[key].exadata_infrastructure_id == ''
          ];
          assert components.database && params.network != null :
                 'exacs_database_workload.vmclusters requires database placement with platform.network';
          assert std.length(invalid_references) == 0 :
                 'exacs_database_workload.vmclusters.%s.exadata_infrastructure_id must be a non-empty string' %
                 invalid_references[0];
          {
            exacs_cloud_exadata_vmclusters: {
              assert assert_unique_keys(
                self._database_workload_vmcluster_keys,
                'exacs_database_workload.vmclusters'
              ) : null,
              _database_workload_vmcluster_keys+:: std.objectFields(records),
              cloud_exadata_database_configuration+: {
                cloud_vm_clusters_configuration+: {
                  [key]: records[key] + {
                    compartment_id: database_compartment,
                    subnet_id: subnet_key('DB'),
                    backup_subnet_id: subnet_key('BACKUP'),
                  }
                  for key in std.objectFields(records)
                },
              },
            },
          }
        else {};
      local databases =
        if std.objectHas(workload, 'databases') then
          local input = validation.allowed_keys(
            operation('databases'),
            'exacs_database_workload.databases',
            ['cloud_db_homes', 'databases', 'pluggable_databases']
          );
          local sections = [
            key
            for key in ['cloud_db_homes', 'databases', 'pluggable_databases']
            if std.objectHas(input, key)
          ];
          local db_homes =
            if std.objectHas(input, 'cloud_db_homes') then
              object_map(
                input.cloud_db_homes,
                'exacs_database_workload.databases.cloud_db_homes'
              )
            else {};
          local database_records =
            if std.objectHas(input, 'databases') then
              object_map(
                input.databases,
                'exacs_database_workload.databases.databases'
              )
            else {};
          local pluggable_database_records =
            if std.objectHas(input, 'pluggable_databases') then
              object_map(
                input.pluggable_databases,
                'exacs_database_workload.databases.pluggable_databases'
              )
            else {};
          assert components.database && params.network != null :
                 'exacs_database_workload.databases requires database placement with platform.network';
          assert std.length(sections) > 0 :
                 'exacs_database_workload.databases must contain at least one section';
          {
            exacs_cloud_exadata_databases: {
              assert assert_unique_keys(
                self._database_workload_db_home_keys,
                'exacs_database_workload.databases.cloud_db_homes'
              ) && assert_unique_keys(
                self._database_workload_database_keys,
                'exacs_database_workload.databases.databases'
              ) && assert_unique_keys(
                self._database_workload_pluggable_database_keys,
                'exacs_database_workload.databases.pluggable_databases'
              ) : null,
              _database_workload_db_home_keys+:: std.objectFields(db_homes),
              _database_workload_database_keys+:: std.objectFields(database_records),
              _database_workload_pluggable_database_keys+:: std.objectFields(pluggable_database_records),
              cloud_exadata_database_configuration+:
                (if std.objectHas(input, 'cloud_db_homes') then {
                  cloud_db_homes_configuration+: db_homes,
                } else {})
                + (if std.objectHas(input, 'databases') then {
                  databases_configuration+: database_records,
                } else {})
                + (if std.objectHas(input, 'pluggable_databases') then {
                  pluggable_databases_configuration+: pluggable_database_records,
                } else {}),
            },
          }
        else {};
      infrastructure + vmclusters + databases,
}
