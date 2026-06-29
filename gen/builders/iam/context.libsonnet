// gen/builders/iam/context.libsonnet
// Shared context and helpers for IAM subdomain builders.

function(config, n, realm_constants, topo)
  local labels = import '../../labels.libsonnet';
  local desc = import '../../descriptions.libsonnet';
  local config_input = config;
  local naming = n;
  local realm = realm_constants;
  local topology = topo;

  {
    config:: config_input,
    n:: naming,
    realm_constants:: realm,
    topo:: topology,
    desc:: desc,

    env_entries:: topology.ordered_env_entries(),

    // --- Display-name helpers ---
    env_desc(env_name):: topology.env_display_long(env_name),

    // Project display name for compartment/group descriptions: 'proj1' -> 'Project 1'.
    proj_display(proj_name):: labels.project_display(proj_name),

    // --- Per-environment / per-project helpers ---

    // Group name (lowercase)
    proj_grp_name(entry, proj_name)::
      'grp-lz-%s-%s-admin' % [
        std.join('-', [std.asciiLower(s) for s in entry.key_segments]),
        std.asciiLower(proj_name),
      ],

    // Key helpers: n.key_global already inserts 'LZ', so segments must NOT repeat it.
    // GRP-LZ-{ENV}-{PROJ}-ADMIN-KEY -> n.key_global('GRP', [env, proj, 'ADMIN'])
    // PCY-LZ-{ENV}-{PROJ}-ADMIN-KEY -> n.key_global('PCY', [env, proj, 'ADMIN'])

    domain_display:: 'id_lz_common',

    // --- Group name constants (kept in sync with naming module to prevent group/policy drift) ---
    grp_auditors:: naming.display_tenancy('GRP', ['AUDITORS', 'ADMIN']),
    grp_cost:: naming.display_tenancy('GRP', ['COST', 'ADMIN']),
    grp_iam:: naming.display_tenancy('GRP', ['IAM', 'ADMIN']),
    grp_network:: naming.display_global('GRP', ['NETWORK', 'ADMIN']),
    grp_security_lz:: naming.display_global('GRP', ['SECURITY', 'ADMIN']),
    grp_security_tenancy:: naming.display_tenancy('GRP', ['SECURITY', 'ADMIN']),

    cmp_lz:: 'cmp-landingzone',

    // --- Tag-Based Access Control (TBAC) constants and helpers ---
    tbac_tag:: 'tagns-lz-role.tag-lz-role',
    tag_network:: 'lz-network-admin',
    tag_security:: 'lz-security-admin',

    // Permission-deny restrictions for destructive operations (shared across policies)
    vol_deny:: ["request.permission != 'VOLUME_BACKUP_DELETE'", "request.permission != 'VOLUME_DELETE'", "request.permission != 'BOOT_VOLUME_BACKUP_DELETE'"],
    obj_deny:: ["request.permission != 'OBJECT_DELETE'", "request.permission != 'BUCKET_DELETE'"],
    fs_deny:: ["request.permission != 'FILE_SYSTEM_DELETE'", "request.permission != 'MOUNT_TARGET_DELETE'", "request.permission != 'EXPORT_SET_DELETE'", "request.permission != 'FILE_SYSTEM_DELETE_SNAPSHOT'", "request.permission != 'FILE_SYSTEM_NFSv3_UNEXPORT'"],

    // --- Policy statement builder helpers ---
    // Format a group reference: 'domain'/'group-name'
    domain_grp(grp_name):: "'%s'/'%s'" % [self.domain_display, grp_name],

    // Tenancy-level allow statement
    tenancy_allow(grp_name, verb, resource)::
      "allow group %s to %s %s in tenancy" % [self.domain_grp(grp_name), verb, resource],

    // Tenancy-level allow with custom where clause
    tenancy_allow_where(grp_name, verb, resource, where_clause)::
      "allow group %s to %s %s in tenancy %s" % [self.domain_grp(grp_name), verb, resource, where_clause],

    // TBAC-tagged allow in a compartment (with optional permission restrictions)
    tbac_allow(grp_name, verb, resource, cmp, tag_role, restrictions=[])::
      local prefix = "allow group %s to %s %s in compartment %s" % [self.domain_grp(grp_name), verb, resource, cmp];
      local tag_cond = "sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [self.tbac_tag, tag_role];
      if std.length(restrictions) == 0 then
        '%s where %s' % [prefix, tag_cond]
      else
        '%s where all{%s, %s}' % [prefix, tag_cond, std.join(', ', restrictions)],
  }
