{
  render(inputs)::
    local product = inputs.product;
    local n = inputs.naming;
    local descriptions = inputs.descriptions;
    local model = inputs.model;
    local tag_key = inputs.tag_key;
    local components =
      if std.objectHas(inputs, 'components') then inputs.components
      else { infrastructure: true, database: true };
    local aggregate_components =
      if std.objectHas(inputs, 'aggregate_components') then inputs.aggregate_components
      else components;
    local has_infra_group = aggregate_components.infrastructure || aggregate_components.database;
    local has_db_group = aggregate_components.database;
    local product_upper = std.asciiUpper(product.code);
    local domain_display = 'id_lz_common';
    local domain_grp(grp_name) = "'%s'/'%s'" % [domain_display, grp_name];
    local tag_allow(grp_name, verb, resource, tag_value) =
      "allow group %s to %s %s in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [
        domain_grp(grp_name),
        verb,
        resource,
        tag_key,
        tag_value,
      ];
    local global_group_key_segments(role) =
      if product.code == 'exacc' then ['GLOBAL', role, 'ADMIN']
      else ['GLOBAL', product_upper, role, 'ADMIN'];
    local group_name(role) =
      'grp-lz-global-%s-%s-admin' % [product.code, std.asciiLower(role)];
    local project_group_name(spec) =
      'grp-lz-%s-%s-%s-admin' % [
        std.asciiLower(spec.env_name),
        std.asciiLower(spec.project_name),
        product.code,
      ];
    local project_policy_name(spec) =
      'pcy-lz-%s-%s-%s-admin' % [
        std.asciiLower(spec.env_name),
        product.code,
        std.asciiLower(spec.project_name),
      ];
    local infra_resource = product.resources.infrastructure;
    local vmcluster_resource = product.resources.vmclusters;

    local global_groups =
    (if has_db_group then {
      [n.key_global('GRP', global_group_key_segments('DB'))]: {
        name: group_name('DB'),
        description: descriptions.global_db_group,
      },
    } else {}) +
    (if has_infra_group then {
      [n.key_global('GRP', global_group_key_segments('INFRA'))]: {
        name: group_name('INFRA'),
        description: descriptions.global_infra_group,
      },
    } else {});
    local project_groups = {
      [n.key_global('GRP', [spec.env_name, product_upper, spec.project_name, 'ADMIN'])]: {
        name: project_group_name(spec),
        description: descriptions.project_group(spec.scope, spec.project_name),
      }
      for spec in model.specs
    };

    local infra_base_statements(grp) = [
      tag_allow(grp, 'manage', infra_resource, product.tags.infra),
      tag_allow(grp, 'manage', 'scheduling-policies', product.tags.infra),
      tag_allow(grp, 'manage', 'scheduling-windows', product.tags.infra),
      tag_allow(grp, 'manage', 'execution-windows', product.tags.infra),
      tag_allow(grp, 'manage', 'orm-stacks', product.tags.infra),
      tag_allow(grp, 'manage', 'orm-jobs', product.tags.infra),
      tag_allow(grp, 'manage', 'orm-config-source-providers', product.tags.infra),
    ];
    local infra_database_statements(grp) = [
      "allow group %s to manage %s in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.permission !='VM_CLUSTER_UPDATE_GI_SOFTWARE', request.permission !='VM_CLUSTER_UPDATE_EXADATA_STORAGE'}" % [domain_grp(grp), vmcluster_resource, tag_key, product.tags.db],
      tag_allow(grp, 'use', 'dbServers', product.tags.db),
      tag_allow(grp, 'manage', 'dbnode-console-connection', product.tags.db),
      tag_allow(grp, 'manage', 'dbnode-console-history', product.tags.db),
      tag_allow(grp, 'manage', 'autonomous-vmclusters', product.tags.db),
      tag_allow(grp, 'use', 'subnets', 'lz-network-admin'),
      tag_allow(grp, 'use', 'vnics', 'lz-network-admin'),
      tag_allow(grp, 'use', 'dns', 'lz-network-admin'),
      tag_allow(grp, 'manage', 'db-nodes', product.tags.db),
    ];
    local global_infra_policy = if has_infra_group then {
      [n.key_global('PCY', ['GLOBAL', product_upper, 'INFRA', 'ADMIN'])]: {
        name: 'pcy-lz-global-%s-infra-admin' % product.code,
        description: descriptions.global_infra_policy,
        compartment_id: 'CMP-LANDINGZONE-KEY',
        local grp = group_name('INFRA'),
        statements:
          (if aggregate_components.infrastructure then infra_base_statements(grp) else [])
          + (if aggregate_components.database then infra_database_statements(grp) else []),
      },
    } else {};

    local global_db_policy = if has_db_group then {
      [n.key_global('PCY', ['GLOBAL', product_upper, 'DB', 'ADMIN'])]: {
        name: 'pcy-lz-global-%s-db-admin' % product.code,
        description: descriptions.global_db_policy,
        compartment_id: 'CMP-LANDINGZONE-KEY',
        local grp = group_name('DB'),
        statements: [
          tag_allow(grp, 'manage', 'orm-stacks', product.tags.db),
          tag_allow(grp, 'manage', 'orm-jobs', product.tags.db),
          tag_allow(grp, 'manage', 'data-safe-family', product.tags.db),
          "allow group %s to use %s in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.operation !='ValidateVmClusterNetwork', request.operation !='ActivateExadataInfrastructure', request.operation !='ChangeExadataInfrastructureCompartment', request.operation !='AddStorageCapacityExadataInfrastructure', request.operation !='CreateVmClusterNetwork', request.operation !='UpdateVmClusterNetwork', request.operation !='DeleteVmClusterNetwork'}" % [domain_grp(grp), infra_resource, tag_key, product.tags.db],
          "allow group %s to use %s in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.permission !='VM_CLUSTER_UPDATE_SSH_KEY', request.permission !='VM_CLUSTER_UPDATE_CPU', request.permission !='VM_CLUSTER_UPDATE_MEMORY', request.permission !='VM_CLUSTER_UPDATE_LOCAL_STORAGE', request.permission !='VM_CLUSTER_UPDATE_FILE_SYSTEM'}" % [domain_grp(grp), vmcluster_resource, tag_key, product.tags.db],
          tag_allow(grp, 'manage', 'backups', product.tags.db),
          tag_allow(grp, 'manage', 'database-software-image', product.tags.db),
          tag_allow(grp, 'manage', 'db-homes', product.tags.db),
          tag_allow(grp, 'manage', 'databases', product.tags.db),
          tag_allow(grp, 'manage', 'pluggable-databases', product.tags.db),
          tag_allow(grp, 'manage', 'autonomous-databases', product.tags.db),
          tag_allow(grp, 'manage', 'autonomous-backups', product.tags.db),
          tag_allow(grp, 'manage', 'autonomous-container-databases', product.tags.db),
          tag_allow(grp, 'read', 'virtual-network-family', 'lz-network-admin'),
        ],
      },
    } else {};

    local global_generic_policy = if has_infra_group || has_db_group then {
      [n.key_global('PCY', ['GLOBAL', product_upper, 'GENERIC', 'ADMIN'])]: {
        name: 'pcy-lz-global-%s-generic' % product.code,
        description: descriptions.global_generic_policy,
        compartment_id: 'TENANCY-ROOT',
        local groups = std.join(',', (
          if has_infra_group then [domain_grp(group_name('INFRA'))] else []
        ) + (
          if has_db_group then [domain_grp(group_name('DB'))] else []
        )),
        statements: [
          'allow group %s to use cloud-shell in tenancy' % groups,
          'allow group %s to read compartments in tenancy' % groups,
          "allow group %s to read all-resources in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, product.tags.admin],
          "allow group %s to manage alarms in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, product.tags.admin],
          "allow group %s to manage metrics in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, product.tags.admin],
          "allow group %s to read audit-events in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, product.tags.admin],
          "allow group %s to read work-requests in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, product.tags.admin],
          "allow group %s to manage cloudevents-rules in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, product.tags.admin],
          "allow group %s to manage ons-family in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, product.tags.admin],
        ],
      },
    } else {};

    local project_policies = {
      [n.key_global('PCY', [spec.env_name, product_upper, spec.project_name, 'ADMIN'])]: {
        name: project_policy_name(spec),
        description: descriptions.project_policy(spec.scope, spec.project_name),
        compartment_id: inputs.project_db_key(spec.env_name, spec.project_name),
        local grp_name = project_group_name(spec),
        local cmp_name = inputs.project_db_name(spec.env_name, spec.project_name),
        statements: [
          'allow group %s to read all-resources in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage alarms in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage metrics in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to read audit-events in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to read work-requests in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage cloudevents-rules in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage ons-family in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage autonomous-databases in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage autonomous-backups in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage autonomous-container-databases in compartment %s' % [domain_grp(grp_name), cmp_name],
        ],
      }
      for spec in model.specs
    };

    {
      groups: global_groups + project_groups,
      policies: global_infra_policy + global_db_policy + global_generic_policy + project_policies,
    },
}
