local extensions = import '../../../extensions.libsonnet';
local render_context = import '../../../render_context.libsonnet';
local exacc = import '../exacc.libsonnet';
local descriptions = import '../descriptions.libsonnet';

{
  render(config)::
    local ctx = render_context.from_raw_config(config);
    local n = ctx.n;
    local exacc_entries = [
      entry
      for entry in ctx.extension_entries
      if entry.platform_config.extension.type == 'exacc'
    ];
    assert std.length(exacc_entries) > 0 :
      'ExaCC multi-stack publication requires at least one exacc platform';
    local extension_state = extensions.resolve({
      extension_registry: { exacc: exacc },
      extension_entries: exacc_entries,
      naming: n,
      hub_vcn_cidr: ctx.config.hub.network.vcn,
      routed_vcn_entries: ctx.all_vcn_entries,
      hub_has_spoke_natgw: true,
    });

    local tag_key = 'tagns-lz-role.tag-lz-role';
    local tag_exacc = 'lz-exacc-admin';
    local tag_exacc_db = 'lz-exacc-db-admin';
    local tag_exacc_infra = 'lz-exacc-infra-admin';

    local platform_db_key(scope) =
      n.key_global('CMP', [scope.scope_name, scope.platform_name, 'DB']);
    local platform_infra_key(scope) =
      n.key_global('CMP', [scope.scope_name, scope.platform_name, 'INFRA']);
    local platform_compartments = std.foldl(
      function(acc, entry)
        local scope = entry.scope;
        acc + {
          [scope.compartment_key]: {
            name: scope.compartment_name,
            description: descriptions.platform_compartment(scope),
            parent_id: scope.parent_compartment_key,
            defined_tags: { [tag_key]: tag_exacc },
            children: {
              [platform_db_key(scope)]: {
                name: '%s-db' % scope.compartment_name,
                description: descriptions.platform_child_compartment(scope, 'Database'),
                defined_tags: { [tag_key]: tag_exacc_db },
              },
              [platform_infra_key(scope)]: {
                name: '%s-infra' % scope.compartment_name,
                description: descriptions.platform_child_compartment(scope, 'Infrastructure'),
                defined_tags: { [tag_key]: tag_exacc_infra },
              },
            },
          },
        },
      exacc_entries,
      {}
    );

    local env_project_names(entry) =
      if std.objectHas(entry.platform_config.extension.params, 'project_db_compartments')
         && entry.platform_config.extension.params.project_db_compartments != null then
        entry.platform_config.extension.params.project_db_compartments
      else [];
    local project_db_compartments = std.foldl(
      function(acc, entry)
        local scope = entry.scope;
        if scope.scope_type != 'environment' then acc
        else acc + {
          [n.key_global('CMP', [scope.scope_name, project_name, 'DB'])]: {
            name: 'cmp-lz-%s-%s-db' % [
              std.asciiLower(scope.scope_name),
              std.asciiLower(project_name),
            ],
            description: descriptions.project_db_compartment(scope, project_name),
            parent_id: n.key_global('CMP', [scope.scope_name, project_name]),
            defined_tags: { [tag_key]: tag_exacc_db },
          }
          for project_name in env_project_names(entry)
        },
      exacc_entries,
      {}
    );

    local shared_entries = [entry for entry in exacc_entries if entry.scope.scope_type == 'shared'];
    local default_alarm_compartment =
      if std.length(shared_entries) > 0 then platform_db_key(shared_entries[0].scope)
      else platform_db_key(exacc_entries[0].scope);
    local security_compartment = n.key_global('CMP', ['SECURITY']);

    {
      identity: extension_state.iam {
        compartments_configuration: {
          enable_delete: 'true',
          compartments: platform_compartments + project_db_compartments,
        },
        identity_domain_groups_configuration+: {
          default_identity_domain_id: 'COMMON-DOMAIN',
        },
      },

      observability: extension_state.observability_cis1 {
        alarms_configuration+: {
          default_compartment_id: default_alarm_compartment,
        },
        events_configuration+: {
          default_compartment_id: security_compartment,
        },
        notifications_configuration+: {
          default_compartment_id: security_compartment,
        },
      },
    }
}
