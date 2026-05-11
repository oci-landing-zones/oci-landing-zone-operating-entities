local extensions = import '../../../extensions.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
local platforms = import '../../../platforms.libsonnet';
local render_context = import '../../../render_context.libsonnet';
local exacs = import '../exacs.libsonnet';
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
        extension_type: 'exacs',
        extension_definition: exacs,
        publication_label: 'EXACS multi-stack',
      } + ctx.extension_routing_context()
    );
    local exacs_entries = resolved.entries;
    local extension_state = resolved.state;

    local entry_indices =
      if std.length(exacs_entries) > 0 then std.range(0, std.length(exacs_entries) - 1)
      else [];
    local networked_specs = [
      {
        entry: exacs_entries[i],
        result: extension_state.results[i],
      }
      for i in entry_indices
      if extension_state.results[i].metadata.has_network
    ];

    local multi_stack_category(spec, route_keys_to_drop=[]) =
      local scope = spec.entry.scope;
      local exacs_category =
        spec.result.contributions.network_pre.network_configuration.network_configuration_categories[
          platforms.publication_category_key(scope)
        ];
      platforms.publication_network_category(exacs_category, n, route_keys_to_drop);
    local network_categories = {
      [platforms.publication_category_key(spec.entry.scope)]: multi_stack_category(spec)
      for spec in networked_specs
    };
    local network_pre_categories = {
      [platforms.publication_category_key(spec.entry.scope)]: multi_stack_category(spec, [n.route_rule([n.region, 'drg'])])
      for spec in networked_specs
    };
    local full_network = lz(config).network;
    local full_network_categories =
      full_network.network_configuration.network_configuration_categories;
    local extension_category_keys = [
      platforms.publication_category_key(spec.entry.scope)
      for spec in networked_specs
    ];
    local hub_post = full_network {
      network_configuration+: {
        network_configuration_categories: {
          [key]: full_network_categories[key]
          for key in std.objectFields(full_network_categories)
          if !std.member(extension_category_keys, key)
        },
      },
    };

    local tag_key = 'tagns-lz-role.tag-lz-role';
    local product = products.exacs;
    local platform_db_key(scope) =
      exadb_project_db.platform_db_key(product, n, scope);
    local platform_compartments = exadb_project_db.flat_platform_compartments({
      product: product,
      naming: n,
      descriptions: descriptions,
      entries: exacs_entries,
      tag_key: tag_key,
    });
    local project_db_flat_compartments = exadb_project_db.flat_project_compartments({
      product: product,
      naming: n,
      descriptions: descriptions,
      entries: exacs_entries,
      tag_key: tag_key,
      topology: ctx.topo,
    });

    local shared_entries = [
      entry
      for entry in exacs_entries
      if entry.scope.scope_type == 'shared'
    ];
    local default_alarm_compartment =
      if std.length(shared_entries) > 0 then platform_db_key(shared_entries[0].scope)
      else platform_db_key(exacs_entries[0].scope);
    local security_compartment = n.key_global('CMP', ['SECURITY']);
    local extension_observability = extension_state.observability_cis1 {
      alarms_configuration+: {
        default_compartment_id: default_alarm_compartment,
      },
      events_configuration+: {
        default_compartment_id: security_compartment,
      },
      notifications_configuration+: {
        default_compartment_id: security_compartment,
      },
    };

    local security_compartment_for(scope) =
      if scope.scope_type == 'shared' then security_compartment
      else n.key_global('CMP', [scope.scope_name, 'SECURITY']);
    local flow_logs = std.foldl(
      function(acc, spec)
        local scope = spec.entry.scope;
        local log_group_key =
          n.key_global('LGRP', [scope.scope_name, 'PLATFORM', scope.platform_name, 'VCN', 'FLOW']);
        acc + {
          [n.key_global('LOG', [scope.scope_name, 'PLATFORM', scope.platform_name, 'SUBNET', 'FLOW'])]: {
            log_group_id: log_group_key,
            target_compartment_ids: [scope.network_compartment_key],
            target_resource_type: 'subnet',
          },
          [n.key_global('LOG', [scope.scope_name, 'PLATFORM', scope.platform_name, 'VCN', 'FLOW'])]: {
            log_group_id: log_group_key,
            target_compartment_ids: [scope.network_compartment_key],
            target_resource_type: 'vcn',
          },
        },
      networked_specs,
      {}
    );
    local log_groups = std.foldl(
      function(acc, spec)
        local scope = spec.entry.scope;
        acc + {
          [n.key_global('LGRP', [scope.scope_name, 'PLATFORM', scope.platform_name, 'VCN', 'FLOW'])]: {
            name: n.display_global('lgrp', [scope.scope_name, scope.platform_name, 'vcn', 'flow']),
            compartment_id: security_compartment_for(scope),
          },
        },
      networked_specs,
      {}
    );
    local flow_logging_overlay =
      if std.length(networked_specs) > 0 then {
        logging_configuration+: {
          default_compartment_id: security_compartment,
          flow_logs+: flow_logs,
          log_groups+: log_groups,
        },
      } else {};

    {
      network_pre: {
        network_configuration: {
          network_configuration_categories: network_pre_categories,
        },
      },
      network: {
        network_configuration: {
          network_configuration_categories: network_categories,
        },
      },
      hub_post: hub_post,
      identity: extension_state.iam {
        compartments_configuration: {
          enable_delete: 'true',
          compartments: platform_compartments + project_db_flat_compartments,
        },
        identity_domain_groups_configuration+: {
          default_identity_domain_id: 'COMMON-DOMAIN',
        },
      },
      observability_pre: extension_observability,
      observability: extension_observability + flow_logging_overlay,
    },
}
