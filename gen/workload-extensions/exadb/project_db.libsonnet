local labels = import '../../labels.libsonnet';
local collections = import '../../lib/collections.libsonnet';
local validation = import '../../lib/validation.libsonnet';

{
  component_defaults:: { infrastructure: true, database: true },

  normalize_components(product, cfg, inferred=null)::
    local has_components = std.objectHas(cfg, 'components') && cfg.components != null;
    assert !has_components :
           '%s components is not supported' % product.code;
    local base_components =
      if inferred != null then inferred
      else self.component_defaults;
    local components = base_components;
    local invalid = [
      key
      for key in std.objectFields(components)
      if std.type(components[key]) != 'boolean'
    ];
    assert std.length(invalid) == 0 :
           '%s placement.%s must be a boolean' % [product.code, invalid[0]];
    assert components.infrastructure || components.database :
           '%s placement must include infrastructure or database' % product.code;
    components,

  scope_key_segments(scope)::
    if std.objectHas(scope, 'key_segments') then scope.key_segments else [scope.scope_name],

  scope_name_segments(scope)::
    if std.objectHas(scope, 'name_segments') then scope.name_segments else [scope.scope_name],

  scope_qualified_name(scope)::
    if std.objectHas(scope, 'qualified_name') then scope.qualified_name else scope.scope_name,

  platform_db_key(product, n, scope)::
    n.key_global('CMP', $.scope_key_segments(scope) + [scope.platform_name, 'DB']),

  platform_infra_key(product, n, scope)::
    n.key_global('CMP', $.scope_key_segments(scope) + [scope.platform_name, 'INFRA']),

  platform_children(inputs)::
    local product = inputs.product;
    local n = inputs.naming;
    local descriptions = inputs.descriptions;
    local scope = inputs.scope;
    local tag_key = inputs.tag_key;
    local components =
      if std.objectHas(inputs, 'components') then inputs.components
      else self.component_defaults;
    (if components.database then {
      [self.platform_db_key(product, n, scope)]: {
        name: '%s-db' % scope.compartment_name,
        description: descriptions.platform_child_compartment(scope, 'Database'),
        defined_tags: { [tag_key]: product.tags.db },
      },
    } else {}) +
    (if components.infrastructure then {
      [self.platform_infra_key(product, n, scope)]: {
        name: '%s-infra' % scope.compartment_name,
        description: descriptions.platform_child_compartment(scope, 'Infrastructure'),
        defined_tags: { [tag_key]: product.tags.infra },
      },
    } else {}),

  project_db_key(product, n, env_name, project_name)::
    n.key_global('CMP', [env_name, project_name, std.asciiUpper(product.code), 'DB']),

  project_db_name(product, env_name, project_name)::
    'cmp-lz-%s-%s-%s-db' % [
      std.asciiLower(env_name),
      std.asciiLower(project_name),
      product.code,
    ],

  project_db_key_for_scope(product, n, scope, project_name)::
    n.key_global('CMP', $.scope_key_segments(scope) + [
      project_name,
      std.asciiUpper(product.code),
      'DB',
    ]),

  project_db_name_for_scope(product, scope, project_name)::
    'cmp-lz-%s-%s-%s-db' % [
      std.join('-', [std.asciiLower(s) for s in $.scope_name_segments(scope)]),
      std.asciiLower(project_name),
      product.code,
    ],

  platform_compartment_overlay(inputs)::
    local product = inputs.product;
    local n = inputs.naming;
    local descriptions = inputs.descriptions;
    local scope = inputs.scope;
    local tag_key = inputs.tag_key;
    local platform_key = scope.compartment_key;
    local platform_children = self.platform_children(inputs);
    if scope.scope_type == 'shared' then {
      'CMP-LANDINGZONE-KEY'+: {
        children+: {
          [n.key_global('CMP', ['PLATFORM'])]+: {
            children+: {
              [platform_key]+: {
                description: descriptions.platform_compartment(scope),
                defined_tags+: { [tag_key]: product.tags.admin },
                children+: platform_children,
              },
            },
          },
        },
      },
    } else {
      'CMP-LANDINGZONE-KEY'+: {
        children+: {
          [n.key_global('CMP', $.scope_key_segments(scope))]+: {
            children+: {
              [n.key_global('CMP', $.scope_key_segments(scope) + ['PLATFORM'])]+: {
                children+: {
                  [platform_key]+: {
                    description: descriptions.platform_compartment(scope),
                    defined_tags+: { [tag_key]: product.tags.admin },
                    children+: platform_children,
                  },
                },
              },
            },
          },
        },
      },
    },

  project_compartment_overlay(inputs)::
    local product = inputs.product;
    local n = inputs.naming;
    local descriptions = inputs.descriptions;
    local model = inputs.model;
    local tag_key = inputs.tag_key;
    local project_children(env_key) =
      local env_scope = model.environment_scope(env_key);
      local env_segments = $.scope_key_segments(env_scope);
      std.foldl(
      function(acc, project_name) acc {
        [n.key_global('CMP', env_segments + [project_name])]+: {
          children+: {
            [$.project_db_key_for_scope(product, n, env_scope, project_name)]: {
              name: $.project_db_name_for_scope(product, env_scope, project_name),
              description: descriptions.project_db_compartment(
                env_scope,
                project_name
              ),
              defined_tags: { [tag_key]: product.tags.db },
            },
          },
        },
      },
      model.by_environment[env_key],
      {}
    );
    local environment_children = std.foldl(
      function(acc, env_key)
        local env_scope = model.environment_scope(env_key);
        local env_segments = $.scope_key_segments(env_scope);
        acc {
        [n.key_global('CMP', env_segments)]+: {
          children+: {
            [n.key_global('CMP', env_segments + ['PROJECTS'])]+: {
              children+: project_children(env_key),
            },
          },
        },
      },
      std.objectFields(model.by_environment),
      {}
    );
    if std.length(model.specs) > 0 then {
      'CMP-LANDINGZONE-KEY'+: {
        children+: environment_children,
      },
    } else {},

  flat_platform_compartments(inputs)::
    local product = inputs.product;
    local descriptions = inputs.descriptions;
    local entries = inputs.entries;
    local tag_key = inputs.tag_key;
    {
      [entry.scope.compartment_key]: {
        local scope = entry.scope,
        local components = $.normalize_components(product, entry.platform_config.extension.params),
        name: scope.compartment_name,
        description: descriptions.platform_compartment(scope),
        parent_id: scope.parent_compartment_key,
        defined_tags: { [tag_key]: product.tags.admin },
        children: $.platform_children(inputs { scope: scope, components: components }),
      }
      for entry in entries
    },

  flat_project_compartments(inputs)::
    local product = inputs.product;
    local n = inputs.naming;
    local descriptions = inputs.descriptions;
    local entries = inputs.entries;
    local tag_key = inputs.tag_key;
    local topo = if std.objectHas(inputs, 'topology') then inputs.topology else null;
    local scope_config =
      if std.length(entries) > 0 && std.objectHas(entries[0], 'scope_config') then
        entries[0].scope_config
      else {};
    local environment_entries =
      if std.objectHas(scope_config, 'environment_entries') then scope_config.environment_entries
      else {};
    local environment_entries_by_env_name =
      if std.objectHas(scope_config, 'environment_entries_by_env_name') then
        scope_config.environment_entries_by_env_name
      else {};
    local env_entry_for_key(env_key) =
      if std.objectHas(environment_entries, env_key) then environment_entries[env_key]
      else if std.objectHas(environment_entries_by_env_name, env_key) then
        environment_entries_by_env_name[env_key]
      else null;
    local normalize_env_key(env_key) =
      local entry = env_entry_for_key(env_key);
      if entry == null then env_key else entry.qualified_name;
    local entry_project_db_map(entry) =
      local params = entry.platform_config.extension.params;
      if std.objectHas(params, 'project_db_compartments')
         && params.project_db_compartments != null then
        if product.code == 'exacs' && entry.scope.scope_type == 'shared' then
          {
            [normalize_env_key(env_key)]: params.project_db_compartments[env_key]
            for env_key in std.objectFields(params.project_db_compartments)
          }
        else
          { [$.scope_qualified_name(entry.scope)]: params.project_db_compartments }
      else {};
    local merged_project_db_map = std.foldl(
      function(acc, entry)
        local entry_map = entry_project_db_map(entry);
        acc + {
          [env_name]:
            (if std.objectHas(acc, env_name) then acc[env_name] else [])
            + entry_map[env_name]
          for env_name in std.objectFields(entry_map)
        },
      entries,
      {}
    );
    local project_db_compartments = {
      [env_name]: collections.unique(merged_project_db_map[env_name])
      for env_name in std.objectFields(merged_project_db_map)
    };
    local scope_for(env_key) =
      local platform_scopes = [
        entry.scope
        for entry in entries
        if entry.scope.scope_type == 'environment' && $.scope_qualified_name(entry.scope) == env_key
      ];
      local env_entry = env_entry_for_key(env_key);
      if std.length(platform_scopes) > 0 then platform_scopes[0]
      else if env_entry != null && topo != null then topo.env_platform(env_entry, product.code)
      else if topo != null then topo.env_platform(env_key, product.code)
      else error 'cannot resolve project DB environment scope %s' % env_key;
    {
      [$.project_db_key_for_scope(product, n, scope_for(env_name), project_name)]: {
        local project_scope = scope_for(env_name),
        name: $.project_db_name_for_scope(product, project_scope, project_name),
        description: descriptions.project_db_compartment(project_scope, project_name),
        parent_id: n.key_global('CMP', $.scope_key_segments(project_scope) + [project_name]),
        defined_tags: { [tag_key]: product.tags.db },
      }
      for env_name in std.objectFields(project_db_compartments)
      for project_name in project_db_compartments[env_name]
    },

  raw_project_db_map(product, scope, cfg)::
    local has_project_db =
      std.objectHas(cfg, 'project_db_compartments') && cfg.project_db_compartments != null;
    if !has_project_db then {}
    else if product.code == 'exacc' then
      assert scope.scope_type == 'environment' :
             'exacc project_db_compartments can only be set on environment platforms';
      assert std.type(cfg.project_db_compartments) == 'array' :
             'exacc project_db_compartments must be an array';
      { [$.scope_qualified_name(scope)]: cfg.project_db_compartments }
    else if product.code == 'exacs' then
      if scope.scope_type == 'shared' then
        assert std.type(cfg.project_db_compartments) == 'object' :
               'exacs project_db_compartments must be an object when set on shared platforms';
        cfg.project_db_compartments
      else
        assert std.type(cfg.project_db_compartments) == 'array' :
               'exacs project_db_compartments must be an array when set on environment platforms';
        { [$.scope_qualified_name(scope)]: cfg.project_db_compartments }
    else error 'Unsupported ExaDB product: %s' % product.code,

  validate_project_db_map(product, raw_project_db_compartments)::
    validation.string_array_map(
      raw_project_db_compartments,
      '%s project_db_compartments' % product.code
    ),

  normalize(inputs)::
    local product = inputs.product;
    local scope = inputs.scope;
    local scope_config =
      if std.objectHas(inputs, 'scope_config') then inputs.scope_config
      else {};
    local raw_project_db_compartments_unqualified = self.validate_project_db_map(
      product,
      self.raw_project_db_map(product, scope, inputs.cfg)
    );
    local environment_entries =
      if std.objectHas(scope_config, 'environment_entries') then scope_config.environment_entries
      else {};
    local environment_entries_by_env_name =
      if std.objectHas(scope_config, 'environment_entries_by_env_name') then
        scope_config.environment_entries_by_env_name
      else {};
    local env_entry_for_key(env_key) =
      if std.objectHas(environment_entries, env_key) then environment_entries[env_key]
      else if std.objectHas(environment_entries_by_env_name, env_key) then
        environment_entries_by_env_name[env_key]
      else null;
    local normalize_env_key(env_key) =
      local entry = env_entry_for_key(env_key);
      if entry == null then env_key else entry.qualified_name;
    local raw_project_db_compartments = {
      [normalize_env_key(env_name)]: raw_project_db_compartments_unqualified[env_name]
      for env_name in std.objectFields(raw_project_db_compartments_unqualified)
    };
    local components =
      if std.objectHas(inputs, 'components') then inputs.components
      else self.normalize_components(product, inputs.cfg);
    assert components.database || std.length(std.objectFields(raw_project_db_compartments)) == 0 :
           '%s project_db_compartments require database placement' % product.code;
    local extension_has_networks =
      if std.objectHas(scope_config, 'extension_has_networks') then scope_config.extension_has_networks
      else {};
    local exacs_has_platform_network =
      std.objectHas(extension_has_networks, product.code) && extension_has_networks[product.code];
    assert product.code != 'exacs' ||
           std.length(std.objectFields(raw_project_db_compartments)) == 0 ||
           exacs_has_platform_network :
           'exacs project_db_compartments require an ExaCS platform network for AVMC placement';

    local by_environment = {
      [env_name]: collections.unique(raw_project_db_compartments[env_name])
      for env_name in std.objectFields(raw_project_db_compartments)
    };
    local environment_projects =
      if std.objectHas(scope_config, 'environment_projects') then scope_config.environment_projects
      else if std.objectHas(scope_config, 'projects') && scope.scope_type == 'environment' then
        { [$.scope_qualified_name(scope)]: scope_config.projects }
      else {};
    local environment_labels =
      if std.objectHas(scope_config, 'environment_labels') then scope_config.environment_labels
      else {};
    local exacs_unknown_envs = [
      env_name
      for env_name in std.objectFields(by_environment)
      if product.code == 'exacs' && !std.objectHas(environment_projects, env_name)
    ];
    assert std.length(exacs_unknown_envs) == 0 :
           'exacs project_db_compartments must reference defined environments: %s' %
           std.join(', ', exacs_unknown_envs);

    local unknown_projects = std.flattenArrays([
      [
        project_name
        for project_name in by_environment[env_name]
        if !std.member(environment_projects[env_name], project_name)
      ]
      for env_name in std.objectFields(by_environment)
    ]);
    assert std.length(unknown_projects) == 0 :
           '%s project_db_compartments must reference projects defined in the same environment: %s' % [
      product.code,
      std.join(', ', unknown_projects),
    ];
    local environment_scope(env_name) =
      local env_entry = env_entry_for_key(env_name);
      local env_label =
        if std.objectHas(environment_labels, env_name) then environment_labels[env_name]
        else { scope_title: labels.title_case(env_name), scope_long_title: labels.title_case(env_name) };
      if scope.scope_type == 'environment' && $.scope_qualified_name(scope) == env_name then scope
      else if env_entry != null then scope {
        scope_type: 'environment',
        scope_name: env_entry.env_name,
        qualified_name: env_entry.qualified_name,
        key_segments: env_entry.key_segments,
        display_segments: env_entry.display_segments,
        name_segments: env_entry.name_segments,
        compartment_segments: env_entry.compartment_segments,
        dns_segments: env_entry.dns_segments,
        scope_title: env_label.scope_title,
        scope_long_title: env_label.scope_long_title,
      }
      else scope {
        scope_type: 'environment',
        scope_name: env_name,
        qualified_name: env_name,
        key_segments: [env_name],
        display_segments: [env_label.scope_title],
        name_segments: [env_name],
        compartment_segments: [env_name],
        scope_title: env_label.scope_title,
        scope_long_title: env_label.scope_long_title,
      };

    {
      by_environment: by_environment,
      scope_key: $.scope_qualified_name(scope),
      scope_project_names:
        if std.objectHas(by_environment, $.scope_qualified_name(scope)) then
          by_environment[$.scope_qualified_name(scope)]
        else [],

      environment_scope(env_name):: environment_scope(env_name),

      specs: std.flattenArrays([
        [
          {
            env_key: env_name,
            env_name: environment_scope(env_name).scope_name,
            qualified_name: env_name,
            project_name: project_name,
            scope: environment_scope(env_name),
          }
          for project_name in by_environment[env_name]
        ]
        for env_name in std.objectFields(by_environment)
      ]),
    },
}
