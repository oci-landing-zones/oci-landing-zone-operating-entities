local collections = import 'collections.libsonnet';

// Summarizes cross-entry component state passed to extension renderers.
//
// This is intentionally separate from extension contract resolution: the
// resolver validates metadata and render outputs, while this helper derives the
// component matrix needed by extensions such as ExaCS.
{
  summarize(extension_entries):: {
    local component_defaults = { infrastructure: true, database: true },
    local has_network(entry) =
      std.objectHas(entry.platform_config, 'network') && entry.platform_config.network != null,
    local has_project_db(entry) =
      local cfg = entry.platform_config.extension.params;
      std.objectHas(cfg, 'project_db_compartments') && cfg.project_db_compartments != null,
    local has_shared_extension_type(ext_type) =
      std.length([
        entry
        for entry in extension_entries
        if entry.platform_config.extension.type == ext_type && entry.scope.scope_type == 'shared'
      ]) > 0,
    local publication_components(entry) =
      if std.objectHas(entry.platform_config, 'publication_components') then
        local components = entry.platform_config.publication_components;
        assert std.type(components) == 'object' :
               'Platform %s/%s publication_components must be an object' % [
                 entry.scope.scope_name,
                 entry.scope.platform_name,
               ];
        assert std.objectHas(components, 'infrastructure') && std.objectHas(components, 'database') :
               'Platform %s/%s publication_components must define infrastructure and database' % [
                 entry.scope.scope_name,
                 entry.scope.platform_name,
               ];
        assert std.type(components.infrastructure) == 'boolean' &&
               std.type(components.database) == 'boolean' :
               'Platform %s/%s publication_components values must be boolean' % [
                 entry.scope.scope_name,
                 entry.scope.platform_name,
               ];
        components
      else null,
    local entry_components(entry) =
      local ext_type = entry.platform_config.extension.type;
      local project_db_only =
        ext_type == 'exacs' && has_project_db(entry) && !has_network(entry);
      local explicit_components = publication_components(entry);
      if explicit_components != null then explicit_components
      else if ext_type != 'exacs' then component_defaults
      else {
        infrastructure:
          entry.scope.scope_type == 'shared' ||
          !has_shared_extension_type(ext_type) ||
          project_db_only,
        database: has_network(entry) || project_db_only,
      },
    local extension_types = collections.unique([
      entry.platform_config.extension.type
      for entry in extension_entries
    ]),

    extension_has_networks: {
      [ext_type]: std.length([
        entry
        for entry in extension_entries
        if entry.platform_config.extension.type == ext_type && has_network(entry)
      ]) > 0
      for ext_type in extension_types
    },

    extension_components: {
      [ext_type]: {
        infrastructure: std.length([
          entry
          for entry in extension_entries
          if entry.platform_config.extension.type == ext_type && entry_components(entry).infrastructure
        ]) > 0,
        database: std.length([
          entry
          for entry in extension_entries
          if entry.platform_config.extension.type == ext_type && entry_components(entry).database
        ]) > 0,
      }
      for ext_type in extension_types
    },

    extension_shared_components: {
      [ext_type]: {
        infrastructure: std.length([
          entry
          for entry in extension_entries
          if entry.platform_config.extension.type == ext_type &&
             entry.scope.scope_type == 'shared' &&
             entry_components(entry).infrastructure
        ]) > 0,
        database: std.length([
          entry
          for entry in extension_entries
          if entry.platform_config.extension.type == ext_type &&
             entry.scope.scope_type == 'shared' &&
             entry_components(entry).database
        ]) > 0,
      }
      for ext_type in extension_types
    },

    entry_components(entry):: entry_components(entry),
    entry_uses_publication_components(entry):: publication_components(entry) != null,
  },
}
