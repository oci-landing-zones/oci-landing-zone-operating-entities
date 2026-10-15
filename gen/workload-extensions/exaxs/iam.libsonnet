// ExaDB-XS policies are scoped to the compartments emitted for each placement.
// Cluster lifecycle needs database, vault, and network permissions in addition
// to manage exadb-vm-clusters; see the ExaDB-XS IAM policy details.
{
  render(inputs)::
    local n = inputs.naming;
    local scope = inputs.scope;
    local components = inputs.components;
    local scope_config = inputs.scope_config;
    local shared = scope.scope_type == 'shared';
    local env = std.join('-', [std.asciiLower(s) for s in scope.name_segments]);
    local env_key = scope.key_segments;
    local shared_components =
      if std.objectHas(scope_config, 'extension_shared_components') &&
         std.objectHas(scope_config.extension_shared_components, 'exaxs') then
        scope_config.extension_shared_components.exaxs
      else { infrastructure: false, database: false };
    local has_infra = components.infrastructure || components.database;
    local has_db = components.database;
    local infra_group = if shared then 'grp-lz-global-exaxs-infra-admin' else 'grp-lz-%s-exaxs-infra-admin' % env;
    local db_group = if shared then 'grp-lz-global-exaxs-db-admin' else 'grp-lz-%s-exaxs-db-admin' % env;
    local principal(group) = "'id_lz_common'/'%s'" % group;
    local policy(group, verb, resource, path) =
      'allow group %s to %s %s in compartment %s' % [principal(group), verb, resource, path];
    // XS exposes one cluster-update permission rather than ExaCS's per-attribute permissions.
    local db_vmcluster_excluded_permissions = ['EXADB_VM_CLUSTER_UPDATE'];
    local policy_excluding_permissions(group, verb, resource, path, permissions) =
      policy(group, verb, resource, path) + ' where all{%s}' % std.join(', ', [
        "request.permission !='%s'" % permission
        for permission in permissions
      ]);
    // These policies are attached to cmp-landingzone, so paths start at its children.
    local relative_path(path) = std.join(':', std.split(path, ':')[1:]);
    local shared_scopes =
      if std.objectHas(scope_config, 'extension_shared_scopes') &&
         std.objectHas(scope_config.extension_shared_scopes, 'exaxs') then
        scope_config.extension_shared_scopes.exaxs
      else [];
    local shared_infrastructure_scope =
      assert std.length(shared_scopes) == 1 :
             'exaxs requires exactly one shared infrastructure scope for environment VM Clusters';
      shared_scopes[0];
    local platform_root = relative_path(scope.compartment_path);
    local vault_path =
      if shared || !shared_components.infrastructure then '%s:%s-infra' % [platform_root, scope.compartment_name]
      else '%s:%s-infra' % [
        relative_path(shared_infrastructure_scope.compartment_path),
        shared_infrastructure_scope.compartment_name,
      ];
    local db_path = '%s:%s-db' % [platform_root, scope.compartment_name];
    local network_path = relative_path(scope.network_compartment_path);
    local network_dependencies(group) = [
      policy(group, 'use', 'vnics', network_path),
      policy(group, 'use', 'subnets', network_path),
      policy(group, 'use', 'private-ips', network_path),
    ];
    local infra_statements =
      (if components.infrastructure then [
        policy(infra_group, 'manage', 'exascale-db-storage-vaults', vault_path),
      ] else []) +
      (if components.database then [
        policy(infra_group, 'manage', 'exadb-vm-clusters', db_path),
        policy(infra_group, 'manage', 'db-homes', db_path),
        policy(infra_group, 'manage', 'databases', db_path),
      ] + (if components.infrastructure then [] else [
        policy(infra_group, 'use', 'exascale-db-storage-vaults', vault_path),
      ]) + network_dependencies(infra_group) else []);
    local db_statements = if components.database then [
      policy_excluding_permissions(
        db_group, 'use', 'exadb-vm-clusters', db_path,
        db_vmcluster_excluded_permissions
      ),
      policy(db_group, 'manage', 'db-homes', db_path),
      policy(db_group, 'manage', 'databases', db_path),
      policy(db_group, 'manage', 'pluggable-databases', db_path),
      policy(db_group, 'manage', 'db-backups', db_path),
      policy(db_group, 'manage', 'database-software-image', db_path),
      policy(db_group, 'read', 'virtual-network-family', network_path),
    ] else [];
    {
      groups:
        (if has_infra then {
          [n.key_global('GRP', (if shared then ['GLOBAL'] else env_key) + ['EXAXS', 'INFRA', 'ADMIN'])]: {
            name: infra_group,
            description: 'ExaDB-XS Storage Vault and VM Cluster administration.',
          },
        } else {}) +
        (if has_db then {
          [n.key_global('GRP', (if shared then ['GLOBAL'] else env_key) + ['EXAXS', 'DB', 'ADMIN'])]: {
            name: db_group,
            description: 'ExaDB-XS Database Home, database, PDB, and backup administration.',
          },
        } else {}),
      policies:
        (if has_infra then {
          [n.key_global('PCY', (if shared then ['GLOBAL'] else env_key) + ['EXAXS', 'INFRA', 'ADMIN'])]: {
            name: if shared then 'pcy-lz-global-exaxs-infra-admin' else 'pcy-lz-%s-exaxs-infra-admin' % env,
            description: 'ExaDB-XS vault and cluster administration and required dependent permissions.',
            compartment_id: 'CMP-LANDINGZONE-KEY',
            statements: infra_statements,
          },
        } else {}) +
        (if has_db then {
          [n.key_global('PCY', (if shared then ['GLOBAL'] else env_key) + ['EXAXS', 'DB', 'ADMIN'])]: {
            name: if shared then 'pcy-lz-global-exaxs-db-admin' else 'pcy-lz-%s-exaxs-db-admin' % env,
            description: 'ExaDB-XS database administration in the platform database compartment.',
            compartment_id: 'CMP-LANDINGZONE-KEY',
            statements: db_statements,
          },
        } else {}),
    },
}
