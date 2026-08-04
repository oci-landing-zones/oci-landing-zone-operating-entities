local extensions = import '../../../extensions.libsonnet';
local render_context = import '../../../render_context.libsonnet';
local exacc = import '../exacc.libsonnet';
local descriptions = import '../descriptions.libsonnet';
local exadb_project_db = import '../../exadb/project_db.libsonnet';
local products = import '../../exadb/products.libsonnet';

{
  render(config)::
    local ctx = render_context.from_raw_config(config);
    local n = ctx.n;
    local resolved = extensions.resolve_by_type(
      {
        extension_entries: ctx.extension_entries,
        extension_type: 'exacc',
        extension_definition: exacc,
        publication_label: 'ExaCC multi-stack',
      } + ctx.extension_routing_context()
    );
    local exacc_entries = resolved.entries;
    local extension_state = resolved.state;

    local tag_key = 'tagns-lz-role.tag-lz-role';
    local product = products.exacc;
    local platform_db_key(scope) =
      exadb_project_db.platform_db_key(product, n, scope);
    local platform_compartments = exadb_project_db.flat_platform_compartments({
      product: product,
      naming: n,
      descriptions: descriptions,
      entries: exacc_entries,
      tag_key: tag_key,
    });
    local project_db_compartments = exadb_project_db.flat_project_compartments({
      product: product,
      naming: n,
      descriptions: descriptions,
      entries: exacc_entries,
      tag_key: tag_key,
      topology: ctx.topo,
    });

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
