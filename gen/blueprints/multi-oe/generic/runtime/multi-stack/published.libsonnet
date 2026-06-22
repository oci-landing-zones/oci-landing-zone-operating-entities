local lz = import '../../../../../landing_zone.libsonnet';
local render_context = import '../../../../../render_context.libsonnet';

{
  render(config)::
    local ctx = render_context.from_raw_config(config);
    local n = ctx.n;
    local render_hub(hub_kind) =
      lz(config + {
        hub: config.hub + { kind: hub_kind },
      });
    local rendered_by_hub = {
      hub_a: render_hub('hub_a'),
      hub_b: render_hub('hub_b'),
      hub_c: render_hub('hub_c'),
      hub_e: render_hub('hub_e'),
    };
    local rendered = rendered_by_hub[ctx.config.hub.kind];
    local oe_names = std.objectFields(ctx.config.operating_entities);
    local operation_oe_names =
      if std.objectHas(ctx.config, 'operation_oes') then ctx.config.operation_oes
      else ['oe_alpha'];
    local unknown_operation_oe_names = [
      oe_name
      for oe_name in operation_oe_names
      if !std.member(oe_names, oe_name)
    ];
    assert std.length(unknown_operation_oe_names) == 0 :
      'multi-oe operation_oes must reference defined operating_entities: %s' %
      std.join(', ', unknown_operation_oe_names);
    local oe_key_segment(oe_name) = std.strReplace(oe_name, '_', '-');
    local oe_compartment_key(oe_name) = n.key_global('CMP', [oe_key_segment(oe_name)]);
    local env_entries_for_oe(oe_name) = [
      entry
      for entry in ctx.topo.ordered_env_entries()
      if entry.oe_name == oe_name
    ];
    local object_has_key(keys, key) = std.member(keys, key);
    local all_oe_compartment_keys = [oe_compartment_key(oe_name) for oe_name in oe_names];
    local project_group_key(entry, project_name) =
      n.key_global('GRP', entry.key_segments + [project_name, 'ADMIN']);
    local project_policy_keys(entry, project_name) = [
      n.key_global('PCY', entry.key_segments + [project_name, 'ADMIN']),
      n.key_global('PCY', entry.key_segments + [project_name, 'ADMIN', 'NET']),
      n.key_global('PCY', entry.key_segments + [project_name, 'ADMIN', 'SEC']),
    ];
    local project_nsg_keys(entry, project_name) = [
      n.key('NSG', entry.key_segments + [project_name, 'WEB']),
      n.key('NSG', entry.key_segments + [project_name, 'APP']),
      n.key('NSG', entry.key_segments + [project_name, 'DB']),
    ];
    local project_group_keys = std.flattenArrays([
      [
        project_group_key(entry, project_name)
        for project_name in ctx.topo.project_names(entry)
      ]
      for entry in ctx.topo.ordered_env_entries()
    ]);
    local project_policy_keys_for_oe(oe_name) = std.flattenArrays([
      [
        key
        for project_name in ctx.topo.project_names(entry)
        for key in project_policy_keys(entry, project_name)
      ]
      for entry in env_entries_for_oe(oe_name)
    ]);
    local project_group_keys_for_oe(oe_name) = std.flattenArrays([
      [
        project_group_key(entry, project_name)
        for project_name in ctx.topo.project_names(entry)
      ]
      for entry in env_entries_for_oe(oe_name)
    ]);
    local project_nsg_keys_for_oe(oe_name) = std.flattenArrays([
      [
        key
        for project_name in ctx.topo.project_names(entry)
        for key in project_nsg_keys(entry, project_name)
      ]
      for entry in env_entries_for_oe(oe_name)
    ]);
    local all_project_group_keys = project_group_keys;
    local all_project_policy_keys = std.flattenArrays([
      [
        key
        for project_name in ctx.topo.project_names(entry)
        for key in project_policy_keys(entry, project_name)
      ]
      for entry in ctx.topo.ordered_env_entries()
    ]);
    local all_oe_drg_attachment_keys = [
      n.key('DRGATT', entry.key_segments + ['PROJ'])
      for entry in ctx.topo.ordered_spoke_env_entries()
    ];
    local all_spoke_drg_route_table_keys = [n.key('DRGRT', ['SPOKES'])];
    local all_spoke_vcn_cidrs = [
      entry.env.shared_project_network.network.vcn
      for entry in ctx.topo.ordered_spoke_env_entries()
    ];
    local non_oe_spoke_vcn_cidrs(oe_name) = [
      entry.env.shared_project_network.network.vcn
      for entry in ctx.topo.ordered_spoke_env_entries()
      if entry.oe_name != oe_name
    ];
    local spoke_category_entries =
      if std.length(ctx.spoke_envs) == 0 then []
      else [
        {
          key: '%d-%s' % [i + 1, ctx.spoke_envs[i].entry.qualified_name],
          entry: ctx.spoke_envs[i].entry,
        }
        for i in std.range(0, std.length(ctx.spoke_envs) - 1)
      ];
    local spoke_category_keys_for_oe(oe_name) = [
      item.key
      for item in spoke_category_entries
      if item.entry.oe_name == oe_name
    ];
    local all_spoke_category_keys = [item.key for item in spoke_category_entries];
    local env_event_rule_keys(entry) =
      [n.key_global('RUL', entry.key_segments + ['NOTIFY', 'SECURITY'])]
      + if std.objectHas(entry.env, 'shared_project_network') then
        [n.key_global('RUL', entry.key_segments + ['NOTIFY', 'NETWORK'])]
      else [];
    local env_flow_log_keys(entry) = [
      n.key_global('LOG', entry.key_segments + ['SUBNET', 'FLOW']),
      n.key_global('LOG', entry.key_segments + ['VCN', 'FLOW']),
    ];
    local env_log_group_keys(entry) = [
      n.key_global('LGRP', entry.key_segments + ['VCN', 'FLOW']),
    ];
    local security_recipe_key(entry) =
      n.key_global('SZ-RCP', ['03', entry.qualified_name, 'ENVIRONMENT']);
    local security_zone_key(entry) =
      n.key_global('SZ-TGT', [entry.qualified_name, 'ENVIRONMENT']);
    local all_env_event_rule_keys = std.flattenArrays([
      env_event_rule_keys(entry)
      for entry in ctx.topo.ordered_env_entries()
    ]);
    local all_env_flow_log_keys = std.flattenArrays([
      env_flow_log_keys(entry)
      for entry in ctx.topo.ordered_spoke_env_entries()
    ]);
    local all_env_log_group_keys = std.flattenArrays([
      env_log_group_keys(entry)
      for entry in ctx.topo.ordered_spoke_env_entries()
    ]);
    local all_env_security_recipe_keys = [
      security_recipe_key(entry)
      for entry in ctx.topo.security_target_env_entries()
    ];
    local all_env_security_zone_keys = [
      security_zone_key(entry)
      for entry in ctx.topo.security_target_env_entries()
    ];
    local filter_object(obj, predicate) = {
      [key]: obj[key]
      for key in std.objectFields(obj)
      if predicate(key)
    };
    local strip_keys(obj, keys) =
      filter_object(obj, function(key) !object_has_key(keys, key));
    local keep_keys(obj, keys) =
      filter_object(obj, function(key) object_has_key(keys, key));
    local hub_drg_ocid = '<HUB DRG OCID>';
    local landing_zone_parent_ocid = '<Compartment cmp-landingzone OCID>';
    local vcn_ocid_placeholder(display_name) = '<VCN %s OCID>' % display_name;
    local compartment_ocid_placeholder(display_name) = '<Compartment %s OCID>' % display_name;
    local oe_drg_attachment_vcn_ocids = {
      [n.key('DRGATT', entry.key_segments + ['PROJ'])]:
        vcn_ocid_placeholder(n.display('vcn', entry.name_segments + ['projects']))
      for entry in ctx.topo.ordered_spoke_env_entries()
    };
    local statement_references_attachment(statement, keys) =
      std.objectHas(statement, 'match_criteria') &&
      std.objectHas(statement.match_criteria, 'drg_attachment_key') &&
      object_has_key(keys, statement.match_criteria.drg_attachment_key);
    local strip_attachment_statements(statements, keys) =
      filter_object(
        statements,
        function(statement_key) !statement_references_attachment(statements[statement_key], keys)
      );
    local strip_route_distributions(distributions, keys) = {
      [distribution_key]:
        local distribution = distributions[distribution_key];
        distribution {
          [if std.objectHas(distribution, 'statements') then 'statements']:
            strip_attachment_statements(distribution.statements, keys),
        }
      for distribution_key in std.objectFields(distributions)
    };
    local externalize_oe_drg_attachments(category) =
      category {
        [if std.objectHas(category, 'non_vcn_specific_gateways') then 'non_vcn_specific_gateways']+: {
          [if std.objectHas(category.non_vcn_specific_gateways, 'dynamic_routing_gateways') then 'dynamic_routing_gateways']+: {
            [drg_key]:
              local drg = category.non_vcn_specific_gateways.dynamic_routing_gateways[drg_key];
              drg {
                [if std.objectHas(drg, 'drg_attachments') then 'drg_attachments']: {
                  [attachment_key]:
                    local attachment = drg.drg_attachments[attachment_key];
                    if std.objectHas(oe_drg_attachment_vcn_ocids, attachment_key) &&
                       std.objectHas(attachment, 'network_details') then
                      attachment {
                        network_details:
                          strip_keys(attachment.network_details, ['attached_resource_key']) + {
                            attached_resource_id: oe_drg_attachment_vcn_ocids[attachment_key],
                          },
                      }
                    else attachment
                  for attachment_key in std.objectFields(drg.drg_attachments)
                },
              }
            for drg_key in std.objectFields(category.non_vcn_specific_gateways.dynamic_routing_gateways)
          },
        },
      };
    local replace_hub_drg_route_ref(route_rule) =
      if std.objectHas(route_rule, 'network_entity_key') &&
         route_rule.network_entity_key == n.key('DRG', ['HUB']) then
        strip_keys(route_rule, ['network_entity_key']) + { network_entity_id: hub_drg_ocid }
      else route_rule;
    local replace_hub_drg_route_refs(category) =
      category {
        [if std.objectHas(category, 'vcns') then 'vcns']: {
          [vcn_key]:
            local vcn = category.vcns[vcn_key];
            vcn {
              [if std.objectHas(vcn, 'route_tables') then 'route_tables']: {
                [rt_key]:
                  local route_table = vcn.route_tables[rt_key];
                  route_table {
                    [if std.objectHas(route_table, 'route_rules') then 'route_rules']: {
                      [route_key]: replace_hub_drg_route_ref(route_table.route_rules[route_key])
                      for route_key in std.objectFields(route_table.route_rules)
                    },
                  }
                for rt_key in std.objectFields(vcn.route_tables)
              },
            }
          for vcn_key in std.objectFields(category.vcns)
        },
      };
    local strip_route_rules_to_cidrs(category, cidrs) =
      category {
        [if std.objectHas(category, 'vcns') then 'vcns']: {
          [vcn_key]:
            local vcn = category.vcns[vcn_key];
            vcn {
              [if std.objectHas(vcn, 'route_tables') then 'route_tables']: {
                [rt_key]:
                  local route_table = vcn.route_tables[rt_key];
                  route_table {
                    [if std.objectHas(route_table, 'route_rules') then 'route_rules']:
                      filter_object(
                        route_table.route_rules,
                        function(route_key)
                          !(
                            std.objectHas(route_table.route_rules[route_key], 'destination') &&
                            std.member(cidrs, route_table.route_rules[route_key].destination)
                          )
                      ),
                  }
                for rt_key in std.objectFields(vcn.route_tables)
              },
            }
          for vcn_key in std.objectFields(category.vcns)
        },
      };
    local strip_spoke_route_rules(category) =
      strip_route_rules_to_cidrs(category, all_spoke_vcn_cidrs);
    local strip_category_resources(category, keys) =
      category {
        [if std.objectHas(category, 'non_vcn_specific_gateways') then 'non_vcn_specific_gateways']+: {
          [if std.objectHas(category.non_vcn_specific_gateways, 'dynamic_routing_gateways') then 'dynamic_routing_gateways']+: {
            [drg_key]:
              local drg = category.non_vcn_specific_gateways.dynamic_routing_gateways[drg_key];
                drg {
                  [if std.objectHas(drg, 'drg_attachments') then 'drg_attachments']:
                    strip_keys(drg.drg_attachments, keys),
                  [if std.objectHas(drg, 'drg_route_distributions') then 'drg_route_distributions']:
                    strip_route_distributions(drg.drg_route_distributions, keys),
                  [if std.objectHas(drg, 'drg_route_tables') then 'drg_route_tables']: {
                    [rt_key]:
                      local rt = drg.drg_route_tables[rt_key];
                      rt {
                        [if std.objectHas(rt, 'import_drg_route_distribution') &&
                            std.objectHas(rt.import_drg_route_distribution, 'statements') then
                          'import_drg_route_distribution']+: {
                          statements: strip_attachment_statements(
                            rt.import_drg_route_distribution.statements,
                            keys
                          ),
                        },
                      }
                    for rt_key in std.objectFields(drg.drg_route_tables)
                    if !object_has_key(all_spoke_drg_route_table_keys, rt_key)
                  },
              }
            for drg_key in std.objectFields(category.non_vcn_specific_gateways.dynamic_routing_gateways)
          },
        },
      };

    local network_categories(
      network_doc,
      predicate,
      strip_drg_resources=false,
      externalize_drg_attachments=false,
      use_hub_drg_ocid=false,
      strip_spoke_routes=false,
      strip_route_cidrs=[]
    ) =
      network_doc {
        network_configuration+: {
          network_configuration_categories: {
            [key]:
              local category = network_doc.network_configuration.network_configuration_categories[key];
              local drg_stripped =
                if strip_drg_resources then strip_category_resources(category, all_oe_drg_attachment_keys)
                else category;
              local route_cidrs =
                if strip_spoke_routes then all_spoke_vcn_cidrs
                else strip_route_cidrs;
              local stripped =
                if std.length(route_cidrs) > 0 then strip_route_rules_to_cidrs(drg_stripped, route_cidrs)
                else drg_stripped;
              local externalized =
                if externalize_drg_attachments then externalize_oe_drg_attachments(stripped)
                else stripped;
              if use_hub_drg_ocid then replace_hub_drg_route_refs(externalized)
              else externalized
            for key in std.objectFields(network_doc.network_configuration.network_configuration_categories)
            if predicate(key)
          },
        },
      };

    local shared_network(hub_name, field='network', staged=false) =
      network_categories(
        rendered_by_hub[hub_name][field],
        function(key) !object_has_key(all_spoke_category_keys, key),
        staged,
        !staged,
        false,
        staged
      );

    local strip_project_nsgs_for_oe(oe_name, network_doc) =
      local keys = project_nsg_keys_for_oe(oe_name);
      network_doc {
        network_configuration+: {
          network_configuration_categories: {
            [cat_key]:
              local cat = network_doc.network_configuration.network_configuration_categories[cat_key];
              cat {
                [if std.objectHas(cat, 'vcns') then 'vcns']: {
                  [vcn_key]:
                    local vcn = cat.vcns[vcn_key];
                    vcn {
                      [if std.objectHas(vcn, 'network_security_groups') then 'network_security_groups']:
                        strip_keys(vcn.network_security_groups, keys),
                    }
                  for vcn_key in std.objectFields(cat.vcns)
                },
              }
            for cat_key in std.objectFields(network_doc.network_configuration.network_configuration_categories)
          },
        },
      };

    local oe_network(oe_name, hub_name, field='network') =
      strip_project_nsgs_for_oe(
        oe_name,
        network_categories(
          rendered_by_hub[hub_name][field],
          function(key) object_has_key(spoke_category_keys_for_oe(oe_name), key),
          true,
          false,
          true,
          false,
          non_oe_spoke_vcn_cidrs(oe_name)
        )
      );

    local strip_project_children_for_oe(oe_name, oe_tree) =
      oe_tree {
        children: {
          [ctx.topo.env_compartment_key(entry)]:
            local env_key = ctx.topo.env_compartment_key(entry);
            local projects_key = ctx.topo.env_child_compartment_key(entry, 'PROJECTS');
            local env_tree = oe_tree.children[env_key];
            env_tree {
              children+: {
                [projects_key]: env_tree.children[projects_key] { children: {} },
              },
            }
          for entry in env_entries_for_oe(oe_name)
        },
      };

    local shared_iam() =
      local iam = rendered.iam;
      local root = iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'];
      iam {
        compartments_configuration+: {
          compartments: {
            'CMP-LANDINGZONE-KEY': root {
              children: strip_keys(root.children, all_oe_compartment_keys),
            },
          },
        },
        identity_domain_groups_configuration+: {
          groups: strip_keys(iam.identity_domain_groups_configuration.groups, all_project_group_keys),
        },
        policies_configuration+: {
          supplied_policies: strip_keys(iam.policies_configuration.supplied_policies, all_project_policy_keys),
        },
      };

    local oe_iam(oe_name) =
      local iam = rendered.iam;
      local oe_key = oe_compartment_key(oe_name);
      local root = iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'];
      iam {
        compartments_configuration+: {
          default_parent_id: landing_zone_parent_ocid,
          compartments: {
            [oe_key]: strip_project_children_for_oe(oe_name, root.children[oe_key]),
          },
        },
        identity_domains_configuration: null,
        identity_domain_groups_configuration+: {
          default_identity_domain_id: 'COMMON-DOMAIN',
          ignore_external_membership_updates: true,
          groups: {},
        },
        policies_configuration+: {
          supplied_policies: {},
        },
      };

    local shared_observability(doc) =
      doc {
        events_configuration+: {
          event_rules: strip_keys(doc.events_configuration.event_rules, all_env_event_rule_keys),
        },
        [if std.objectHas(doc, 'logging_configuration') then 'logging_configuration']+: {
          [if std.objectHas(doc.logging_configuration, 'flow_logs') then 'flow_logs']:
            strip_keys(doc.logging_configuration.flow_logs, all_env_flow_log_keys),
          [if std.objectHas(doc.logging_configuration, 'log_groups') then 'log_groups']:
            strip_keys(doc.logging_configuration.log_groups, all_env_log_group_keys),
        },
      };

    local oe_observability(oe_name, doc) =
      local entries = env_entries_for_oe(oe_name);
      local networked_entries = [
        entry
        for entry in entries
        if std.objectHas(entry.env, 'shared_project_network')
      ];
      local event_rule_keys = std.flattenArrays([env_event_rule_keys(entry) for entry in entries]);
      local flow_log_keys = std.flattenArrays([env_flow_log_keys(entry) for entry in networked_entries]);
      local log_group_keys = std.flattenArrays([env_log_group_keys(entry) for entry in networked_entries]);
      doc {
        events_configuration+: {
          event_rules: keep_keys(doc.events_configuration.event_rules, event_rule_keys),
        },
        [if std.objectHas(doc, 'home_region_events_configuration') then 'home_region_events_configuration']+: {
          event_rules: {},
        },
        notifications_configuration+: {
          topics: {},
        },
        [if std.objectHas(doc, 'alarms_configuration') then 'alarms_configuration']+: {
          alarms: {},
        },
        [if std.objectHas(doc, 'service_connectors_configuration') then 'service_connectors_configuration']+: {
          [if std.objectHas(doc.service_connectors_configuration, 'buckets') then 'buckets']: {},
          [if std.objectHas(doc.service_connectors_configuration, 'service_connectors') then 'service_connectors']: {},
        },
        [if std.objectHas(doc, 'logging_configuration') then 'logging_configuration']+: {
          [if std.objectHas(doc.logging_configuration, 'flow_logs') then 'flow_logs']:
            keep_keys(doc.logging_configuration.flow_logs, flow_log_keys),
          [if std.objectHas(doc.logging_configuration, 'log_groups') then 'log_groups']:
            keep_keys(doc.logging_configuration.log_groups, log_group_keys),
        },
      };

    local shared_security(doc) =
      doc {
        security_zones_configuration+: {
          recipes: strip_keys(doc.security_zones_configuration.recipes, all_env_security_recipe_keys),
          security_zones: strip_keys(doc.security_zones_configuration.security_zones, all_env_security_zone_keys),
        },
      };

    local oe_security(oe_name, doc) =
      local entries = [
        entry
        for entry in env_entries_for_oe(oe_name)
        if object_has_key(ctx.topo.security_target_env_names(), entry.qualified_name)
      ];
      local recipe_keys = [security_recipe_key(entry) for entry in entries];
      local zone_keys = [security_zone_key(entry) for entry in entries];
      {
        security_zones_configuration: {
          reporting_region: doc.security_zones_configuration.reporting_region,
          tenancy_ocid: doc.security_zones_configuration.tenancy_ocid,
          recipes: keep_keys(doc.security_zones_configuration.recipes, recipe_keys),
          security_zones: keep_keys(doc.security_zones_configuration.security_zones, zone_keys),
        },
      };

    local project_iam(oe_name, entry, project_name) =
      local oe_compartment_key = n.key_global('CMP', [oe_key_segment(oe_name)]);
      local env_compartment_key = ctx.topo.env_compartment_key(entry);
      local projects_compartment_key = ctx.topo.env_child_compartment_key(entry, 'PROJECTS');
      local project_compartment_key = ctx.topo.env_project_compartment_key(entry, project_name);
      local group_key = project_group_key(entry, project_name);
      local policy_keys = project_policy_keys(entry, project_name);
      local oe_tree = rendered.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children[oe_compartment_key];
      local env_tree = oe_tree.children[env_compartment_key];
      local project_tree = env_tree.children[projects_compartment_key].children[project_compartment_key];
      {
        compartments_configuration: {
          default_parent_id: compartment_ocid_placeholder(
            ctx.topo.env_child_compartment_name(entry, 'projects')
          ),
          enable_delete: rendered.iam.compartments_configuration.enable_delete,
          compartments: {
            [project_compartment_key]: project_tree,
          },
        },
        identity_domains_configuration: null,
        identity_domain_groups_configuration: {
          default_identity_domain_id: 'COMMON-DOMAIN',
          ignore_external_membership_updates: true,
          groups: keep_keys(rendered.iam.identity_domain_groups_configuration.groups, [group_key]),
        },
        policies_configuration: {
          supplied_policies: keep_keys(rendered.iam.policies_configuration.supplied_policies, policy_keys),
        },
      };

    local project_network(oe_name, entry, project_name) =
      local full_network = rendered_by_hub[ctx.config.hub.kind].network;
      local vcn_key = n.key('VCN', entry.key_segments + ['PROJECTS']);
      local matching_category_keys = [
        key
        for key in std.objectFields(full_network.network_configuration.network_configuration_categories)
        if std.objectHas(full_network.network_configuration.network_configuration_categories[key], 'vcns') &&
           std.objectHas(full_network.network_configuration.network_configuration_categories[key].vcns, vcn_key)
      ];
      assert std.length(matching_category_keys) == 1 :
        'expected exactly one project VCN category for %s, found %d' % [entry.qualified_name, std.length(matching_category_keys)];
      local category_key = matching_category_keys[0];
      local category = full_network.network_configuration.network_configuration_categories[category_key];
      local vcn = category.vcns[vcn_key];
      local project_nsgs = keep_keys(vcn.network_security_groups, project_nsg_keys(entry, project_name));
      {
        network_configuration: {
          network_configuration_categories: {
            ['%s-%s' % [entry.qualified_name, project_name]]: {
              inject_into_existing_vcns: {
                [vcn_key]: {
                  vcn_id: vcn_ocid_placeholder(vcn.display_name),
                  network_security_groups: project_nsgs,
                },
              },
            },
          },
        },
      };

    local op01 = {
      governance: rendered.governance,
      iam: shared_iam(),
      network_hub_a_pre: shared_network('hub_a', 'network_pre', true),
      network_hub_a: shared_network('hub_a'),
      network_hub_b_pre: shared_network('hub_b', 'network_pre', true),
      network_hub_b: shared_network('hub_b'),
      network_hub_c_pre: shared_network('hub_c', 'network_pre', true),
      network_hub_c: shared_network('hub_c'),
      network_hub_c_backends: shared_network('hub_c', 'network_backends'),
      network_hub_e: shared_network('hub_e'),
      security_cis1_pre: shared_security(rendered.security_cis1_pre),
      security_cis1: shared_security(rendered.security_cis1),
      security_cis2_pre: shared_security(rendered.security_cis2_pre),
      security_cis2: shared_security(rendered.security_cis2),
      observability_cis1_pre: shared_observability(rendered.observability_cis1_pre),
      observability_cis1: shared_observability(rendered.observability_cis1),
      observability_cis2_pre: shared_observability(rendered.observability_cis2_pre),
      observability_cis2: shared_observability(rendered.observability_cis2),
    };

    local op02_for_oe(oe_name) = {
      iam: oe_iam(oe_name),
      network_hub_a_pre: oe_network(oe_name, 'hub_a', 'network_pre'),
      network_hub_a: oe_network(oe_name, 'hub_a'),
      network_hub_b_pre: oe_network(oe_name, 'hub_b', 'network_pre'),
      network_hub_b: oe_network(oe_name, 'hub_b'),
      network_hub_c_pre: oe_network(oe_name, 'hub_c', 'network_pre'),
      network_hub_c: oe_network(oe_name, 'hub_c'),
      network_hub_e: oe_network(oe_name, 'hub_e'),
      security_cis1_pre: oe_security(oe_name, rendered.security_cis1_pre),
      security_cis1: oe_security(oe_name, rendered.security_cis1),
      security_cis2_pre: oe_security(oe_name, rendered.security_cis2_pre),
      security_cis2: oe_security(oe_name, rendered.security_cis2),
      observability_cis1_pre: oe_observability(oe_name, rendered.observability_cis1_pre),
      observability_cis1: oe_observability(oe_name, rendered.observability_cis1),
      observability_cis2_pre: oe_observability(oe_name, rendered.observability_cis2_pre),
      observability_cis2: oe_observability(oe_name, rendered.observability_cis2),
    };

    {
      op01: op01,
      op02: { [oe_name]: op02_for_oe(oe_name) for oe_name in operation_oe_names },
      op03: {
        [oe_name]: {
          [entry.env_name]: {
            [project_name]: {
              iam: project_iam(oe_name, entry, project_name),
              network: project_network(oe_name, entry, project_name),
            }
            for project_name in ctx.topo.project_names(entry)
          }
          for entry in env_entries_for_oe(oe_name)
        }
        for oe_name in operation_oe_names
      },
    },
}
