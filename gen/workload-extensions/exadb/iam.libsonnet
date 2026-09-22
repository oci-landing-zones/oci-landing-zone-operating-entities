{
  render(inputs)::
    local product = inputs.product;
    local n = inputs.naming;
    local descriptions = inputs.descriptions;
    local model = inputs.model;
    local scope = inputs.scope;
    local tag_key = inputs.tag_key;
    local components =
      if std.objectHas(inputs, 'components') then inputs.components
      else { infrastructure: true, database: true };
    local aggregate_components =
      if std.objectHas(inputs, 'aggregate_components') then inputs.aggregate_components
      else components;
    local shared_components =
      if std.objectHas(inputs, 'shared_components') then inputs.shared_components
      else { infrastructure: false, database: false };
    local is_shared_scope = scope.scope_type == 'shared';
    local has_global_infra_group =
      is_shared_scope && (components.infrastructure || components.database);
    local has_global_db_group = is_shared_scope && components.database;
    local has_environment_infra_group =
      !is_shared_scope && (components.infrastructure || components.database);
    local has_environment_db_group = !is_shared_scope && components.database;
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
    local exclusions(attribute, values) = std.join(', ', [
      "%s !='%s'" % [attribute, value]
      for value in values
    ]);
    local tag_allow_excluding(grp_name, verb, resource, tag_value, attribute, values) =
      "allow group %s to %s %s in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), %s}" % [
        domain_grp(grp_name),
        verb,
        resource,
        tag_key,
        tag_value,
        exclusions(attribute, values),
      ];
    local compartment_allow(grp_name, verb, resource, compartment_path) =
      'allow group %s to %s %s in compartment %s' % [
        domain_grp(grp_name),
        verb,
        resource,
        compartment_path,
      ];
    local compartment_allow_excluding(grp_name, verb, resource, compartment_path, attribute, values) =
      'allow group %s to %s %s in compartment %s where all{%s}' % [
        domain_grp(grp_name),
        verb,
        resource,
        compartment_path,
        exclusions(attribute, values),
      ];
    local global_group_key_segments(role) =
      if product.code == 'exacc' then ['GLOBAL', role, 'ADMIN']
      else ['GLOBAL', product_upper, role, 'ADMIN'];
    local group_name(role) =
      'grp-lz-global-%s-%s-admin' % [product.code, std.asciiLower(role)];
    local environment_group_name(role) =
      'grp-lz-%s-%s-%s-admin' % [
        std.asciiLower(scope.scope_name),
        product.code,
        std.asciiLower(role),
      ];
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
    local autonomous_vmcluster_resource = product.resources.autonomous_vmclusters;
    local environment_name = std.asciiLower(scope.scope_name);
    local environment_platform_path =
      'cmp-lz-%s-platform:%s' % [environment_name, scope.compartment_name];
    local environment_infra_path =
      '%s:%s-infra' % [environment_platform_path, scope.compartment_name];
    local environment_db_path =
      '%s:%s-db' % [environment_platform_path, scope.compartment_name];
    local environment_network_path = 'cmp-lz-%s-network' % environment_name;
    local environment_security_path = 'cmp-lz-%s-security' % environment_name;

    local global_groups =
    (if has_global_db_group then {
      [n.key_global('GRP', global_group_key_segments('DB'))]: {
        name: group_name('DB'),
        description: descriptions.global_db_group,
      },
    } else {}) +
    (if has_global_infra_group then {
      [n.key_global('GRP', global_group_key_segments('INFRA'))]: {
        name: group_name('INFRA'),
        description: descriptions.global_infra_group,
      },
    } else {});
    local environment_groups =
    (if has_environment_db_group then {
      [n.key_global('GRP', [scope.scope_name, product_upper, 'DB', 'ADMIN'])]: {
        name: environment_group_name('DB'),
        description: descriptions.environment_db_group(scope),
      },
    } else {}) +
    (if has_environment_infra_group then {
      [n.key_global('GRP', [scope.scope_name, product_upper, 'INFRA', 'ADMIN'])]: {
        name: environment_group_name('INFRA'),
        description: descriptions.environment_infra_group(scope),
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
      tag_allow_excluding(
        grp,
        'manage',
        vmcluster_resource,
        product.tags.db,
        'request.permission',
        product.iam.infra_vmcluster_excluded_permissions
      ),
      tag_allow(grp, 'use', 'dbservers', product.tags.infra),
      tag_allow(grp, 'manage', 'dbnode-console-connection', product.tags.db),
      tag_allow(grp, 'manage', 'dbnode-console-history', product.tags.db),
      tag_allow(grp, 'manage', autonomous_vmcluster_resource, product.tags.db),
      tag_allow(grp, 'use', 'subnets', 'lz-network-admin'),
      tag_allow(grp, 'use', 'vnics', 'lz-network-admin'),
      tag_allow(grp, 'use', 'dns', 'lz-network-admin'),
      tag_allow(grp, 'manage', 'db-nodes', product.tags.db),
    ];
    local global_infra_policy = if has_global_infra_group then {
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

    local global_db_policy = if has_global_db_group then {
      [n.key_global('PCY', ['GLOBAL', product_upper, 'DB', 'ADMIN'])]: {
        name: 'pcy-lz-global-%s-db-admin' % product.code,
        description: descriptions.global_db_policy,
        compartment_id: 'CMP-LANDINGZONE-KEY',
        local grp = group_name('DB'),
        statements: [
          tag_allow(grp, 'manage', 'orm-stacks', product.tags.db),
          tag_allow(grp, 'manage', 'orm-jobs', product.tags.db),
          tag_allow(grp, 'manage', 'data-safe-family', product.tags.db),
          tag_allow_excluding(
            grp,
            'use',
            infra_resource,
            product.tags.infra,
            'request.operation',
            product.iam.db_infrastructure_excluded_operations
          ),
          tag_allow_excluding(
            grp,
            'use',
            vmcluster_resource,
            product.tags.db,
            'request.permission',
            product.iam.db_vmcluster_excluded_permissions
          ),
          tag_allow(grp, 'manage', 'backups', product.tags.db),
          tag_allow(grp, 'manage', 'database-software-image', product.tags.db),
          tag_allow(grp, 'manage', 'db-homes', product.tags.db),
          tag_allow(grp, 'manage', 'databases', product.tags.db),
          tag_allow(grp, 'manage', 'pluggable-databases', product.tags.db),
          tag_allow(grp, 'manage', 'autonomous-databases', product.tags.db),
          tag_allow(grp, 'manage', 'autonomous-backups', product.tags.db),
          tag_allow(grp, 'manage', 'autonomous-container-databases', product.tags.db),
          tag_allow(grp, 'use', autonomous_vmcluster_resource, product.tags.db),
          tag_allow(grp, 'read', 'virtual-network-family', 'lz-network-admin'),
        ],
      },
    } else {};

    local global_generic_policy = if has_global_infra_group || has_global_db_group then {
      [n.key_global('PCY', ['GLOBAL', product_upper, 'GENERIC', 'ADMIN'])]: {
        name: 'pcy-lz-global-%s-generic' % product.code,
        description: descriptions.global_generic_policy,
        compartment_id: 'TENANCY-ROOT',
        local groups = std.join(',', (
          if has_global_infra_group then [domain_grp(group_name('INFRA'))] else []
        ) + (
          if has_global_db_group then [domain_grp(group_name('DB'))] else []
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

    local environment_infra_policy = if has_environment_infra_group then {
      [n.key_global('PCY', [scope.scope_name, product_upper, 'INFRA', 'ADMIN'])]: {
        name: 'pcy-lz-%s-%s-infra-admin' % [environment_name, product.code],
        description: descriptions.environment_infra_policy(scope),
        compartment_id: n.key_global('CMP', [scope.scope_name]),
        local grp = environment_group_name('INFRA'),
        statements:
          (if components.infrastructure then [
            compartment_allow(grp, 'manage', infra_resource, environment_infra_path),
            compartment_allow(grp, 'manage', 'scheduling-policies', environment_infra_path),
            compartment_allow(grp, 'manage', 'scheduling-windows', environment_infra_path),
            compartment_allow(grp, 'manage', 'execution-windows', environment_infra_path),
            compartment_allow(grp, 'manage', 'orm-stacks', environment_infra_path),
            compartment_allow(grp, 'manage', 'orm-jobs', environment_infra_path),
            compartment_allow(grp, 'manage', 'orm-config-source-providers', environment_infra_path),
            compartment_allow(grp, 'use', 'dbservers', environment_infra_path),
          ] else [])
          + (if components.database then [
            compartment_allow_excluding(
              grp,
              'manage',
              vmcluster_resource,
              environment_db_path,
              'request.permission',
              product.iam.infra_vmcluster_excluded_permissions
            ),
            compartment_allow(grp, 'manage', 'dbnode-console-connection', environment_db_path),
            compartment_allow(grp, 'manage', 'dbnode-console-history', environment_db_path),
            compartment_allow(grp, 'manage', autonomous_vmcluster_resource, environment_db_path),
            compartment_allow(grp, 'use', 'subnets', environment_network_path),
            compartment_allow(grp, 'use', 'vnics', environment_network_path),
            compartment_allow(grp, 'use', 'dns', environment_network_path),
            compartment_allow(grp, 'manage', 'db-nodes', environment_db_path),
          ] else []),
      },
    } else {};

    local environment_db_policy = if has_environment_db_group then {
      [n.key_global('PCY', [scope.scope_name, product_upper, 'DB', 'ADMIN'])]: {
        name: 'pcy-lz-%s-%s-db-admin' % [environment_name, product.code],
        description: descriptions.environment_db_policy(scope),
        compartment_id: n.key_global('CMP', [scope.scope_name]),
        local grp = environment_group_name('DB'),
        statements:
          (if components.infrastructure then [
            compartment_allow_excluding(
              grp,
              'use',
              infra_resource,
              environment_infra_path,
              'request.operation',
              product.iam.db_infrastructure_excluded_operations
            ),
          ] else [])
          + [
            compartment_allow(grp, 'manage', 'orm-stacks', environment_db_path),
            compartment_allow(grp, 'manage', 'orm-jobs', environment_db_path),
            compartment_allow(grp, 'manage', 'data-safe-family', environment_db_path),
            compartment_allow_excluding(
              grp,
              'use',
              vmcluster_resource,
              environment_db_path,
              'request.permission',
              product.iam.db_vmcluster_excluded_permissions
            ),
            compartment_allow(grp, 'manage', 'backups', environment_db_path),
            compartment_allow(grp, 'manage', 'database-software-image', environment_db_path),
            compartment_allow(grp, 'manage', 'db-homes', environment_db_path),
            compartment_allow(grp, 'manage', 'databases', environment_db_path),
            compartment_allow(grp, 'manage', 'pluggable-databases', environment_db_path),
            compartment_allow(grp, 'manage', 'autonomous-databases', environment_db_path),
            compartment_allow(grp, 'manage', 'autonomous-backups', environment_db_path),
            compartment_allow(grp, 'manage', 'autonomous-container-databases', environment_db_path),
            compartment_allow(grp, 'use', autonomous_vmcluster_resource, environment_db_path),
            compartment_allow(grp, 'read', 'virtual-network-family', environment_network_path),
          ],
      },
    } else {};

    local environment_generic_policy =
      if has_environment_infra_group || has_environment_db_group then {
        [n.key_global('PCY', [scope.scope_name, product_upper, 'GENERIC', 'ADMIN'])]: {
          name: 'pcy-lz-%s-%s-generic' % [environment_name, product.code],
          description: descriptions.environment_generic_policy(scope),
          compartment_id: n.key_global('CMP', [scope.scope_name]),
          local groups = std.join(',', (
            if has_environment_infra_group then
              [domain_grp(environment_group_name('INFRA'))]
            else []
          ) + (
            if has_environment_db_group then
              [domain_grp(environment_group_name('DB'))]
            else []
          )),
          statements: [
            'allow group %s to read all-resources in compartment %s' % [groups, environment_platform_path],
            'allow group %s to manage alarms in compartment %s' % [groups, environment_platform_path],
            'allow group %s to manage metrics in compartment %s' % [groups, environment_platform_path],
            'allow group %s to read audit-events in compartment %s' % [groups, environment_platform_path],
            'allow group %s to read work-requests in compartment %s' % [groups, environment_platform_path],
            'allow group %s to manage cloudevents-rules in compartment %s' % [groups, environment_platform_path],
            'allow group %s to manage ons-family in compartment %s' % [groups, environment_security_path],
          ],
        },
      } else {};

    local shared_infrastructure_use_policy =
      if has_environment_infra_group && components.database && shared_components.infrastructure then {
        [n.key_global('PCY', [scope.scope_name, product_upper, 'SHARED', 'INFRA', 'USE'])]: {
          name: 'pcy-lz-%s-%s-shared-infra-use' % [environment_name, product.code],
          description:
            'Grants the %s environment %s infrastructure and database administration groups the shared infrastructure dependency permissions required by VMC, AVMC, and ACD operations.' % [
              scope.scope_long_title,
              product.display,
            ],
          compartment_id: n.key_global('CMP', ['SHARED', scope.platform_name]),
          local groups = std.join(',', [
            domain_grp(environment_group_name('INFRA')),
            domain_grp(environment_group_name('DB')),
          ]),
          local shared_infra_name = 'cmp-lz-shared-%s-infra' % product.code,
          statements: [
            'allow group %s to use %s in compartment %s where all{%s}' % [
              groups,
              infra_resource,
              shared_infra_name,
              exclusions('request.operation', product.iam.db_infrastructure_excluded_operations),
            ],
            'allow group %s to use dbservers in compartment %s' % [groups, shared_infra_name],
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
        ],
      }
      for spec in model.specs
    };

    local platform_acd_read_policy = if std.length(model.specs) > 0 then {
      [n.key_global('PCY', [scope.scope_name, product_upper, 'PROJECT', 'ACD', 'READ'])]: {
        name: 'pcy-lz-%s-%s-project-acd-read' % [std.asciiLower(scope.scope_name), product.code],
        description: 'Grants %s Project DBA groups read access to the hosting Autonomous Container Databases.' % product.display,
        compartment_id: inputs.platform_db_key,
        statements: [
          'allow group %s to read autonomous-container-databases in compartment %s' % [
            domain_grp(project_group_name(spec)),
            inputs.platform_db_name,
          ]
          for spec in model.specs
        ],
      },
    } else {};

    {
      groups: global_groups + environment_groups + project_groups,
      policies:
        global_infra_policy
        + global_db_policy
        + global_generic_policy
        + environment_infra_policy
        + environment_db_policy
        + environment_generic_policy
        + shared_infrastructure_use_policy
        + project_policies
        + platform_acd_read_policy,
    },
}
