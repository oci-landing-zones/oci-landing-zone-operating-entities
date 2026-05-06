// gen/builders/iam.libsonnet
// IAM builder: compartments, groups, identity domains, and policies.
//
// Generates the same structure as blueprints/one-oe/runtime/one-stack/oneoe_iam.json
// dynamically from config.environments (and their projects).
//
// function(config, n, realm_constants, topo) → IAM output object

function(config, n, realm_constants, topo)
  local labels = import '../labels.libsonnet';

  // --- Display-name helpers ---
  local env_desc(env_name) = topo.env_display_long(env_name);

  // Project display name for compartment/group descriptions: 'proj1' → 'Project 1'.
  local proj_display(proj_name) = labels.project_display(proj_name);

  // Lowercase project display for policy description sentences.
  local proj_desc_lower(proj_name) = labels.project_desc_lower(proj_name);

  local env_names = topo.ordered_env_names();

  // --- Per-environment / per-project helpers ---

  // Group name (lowercase)
  local proj_grp_name(env_name, proj_name) =
    'grp-lz-%s-%s-admin' % [std.asciiLower(env_name), std.asciiLower(proj_name)];

  // Key helpers: n.key_global already inserts 'LZ', so segments must NOT repeat it.
  // GRP-LZ-{ENV}-{PROJ}-ADMIN-KEY → n.key_global('GRP', [env, proj, 'ADMIN'])
  // PCY-LZ-{ENV}-{PROJ}-ADMIN-KEY → n.key_global('PCY', [env, proj, 'ADMIN'])

  local domain_display = 'id_lz_common';

  // --- Group name constants (kept in sync with naming module to prevent group/policy drift) ---
  local grp_auditors = n.display_tenancy('GRP', ['AUDITORS', 'ADMIN']);
  local grp_cost = n.display_tenancy('GRP', ['COST', 'ADMIN']);
  local grp_iam = n.display_tenancy('GRP', ['IAM', 'ADMIN']);
  local grp_network = n.display_global('GRP', ['NETWORK', 'ADMIN']);
  local grp_security_lz = n.display_global('GRP', ['SECURITY', 'ADMIN']);
  local grp_security_tenancy = n.display_tenancy('GRP', ['SECURITY', 'ADMIN']);

  local cmp_lz = 'cmp-landingzone';

  // --- Tag-Based Access Control (TBAC) constants and helpers ---
  local tbac_tag = 'tagns-lz-role.tag-lz-role';
  local tag_network = 'lz-network-admin';
  local tag_security = 'lz-security-admin';

  // Permission-deny restrictions for destructive operations (shared across policies)
  local vol_deny = ["request.permission != 'VOLUME_BACKUP_DELETE'", "request.permission != 'VOLUME_DELETE'", "request.permission != 'BOOT_VOLUME_BACKUP_DELETE'"];
  local obj_deny = ["request.permission != 'OBJECT_DELETE'", "request.permission != 'BUCKET_DELETE'"];
  local fs_deny = ["request.permission != 'FILE_SYSTEM_DELETE'", "request.permission != 'MOUNT_TARGET_DELETE'", "request.permission != 'EXPORT_SET_DELETE'", "request.permission != 'FILE_SYSTEM_DELETE_SNAPSHOT'", "request.permission != 'FILE_SYSTEM_NFSv3_UNEXPORT'"];

  // --- Policy statement builder helpers ---
  // Format a group reference: 'domain'/'group-name'
  local domain_grp(grp_name) = "'%s'/'%s'" % [domain_display, grp_name];

  // Tenancy-level allow statement
  local tenancy_allow(grp_name, verb, resource) =
    "allow group %s to %s %s in tenancy" % [domain_grp(grp_name), verb, resource];

  // Tenancy-level allow with custom where clause
  local tenancy_allow_where(grp_name, verb, resource, where_clause) =
    "allow group %s to %s %s in tenancy %s" % [domain_grp(grp_name), verb, resource, where_clause];

  // TBAC-tagged allow in a compartment (with optional permission restrictions)
  local tbac_allow(grp_name, verb, resource, cmp, tag_role, restrictions=[]) =
    local prefix = "allow group %s to %s %s in compartment %s" % [domain_grp(grp_name), verb, resource, cmp];
    local tag_cond = "sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [tbac_tag, tag_role];
    if std.length(restrictions) == 0 then
      '%s where %s' % [prefix, tag_cond]
    else
      '%s where all{%s, %s}' % [prefix, tag_cond, std.join(', ', restrictions)];

  // --- Compartments ---

  local platform_children(env_name) =
    local env = config.environments[env_name];
    if std.objectHas(env, 'platforms') then {
      [topo.env_platform(env_name, p_name).compartment_key]: {
        name: topo.env_platform(env_name, p_name).compartment_name,
        description: topo.env_platform(env_name, p_name).compartment_description,
      }
      for p_name in std.objectFields(env.platforms)
    } else {};

  local shared_platform_children =
    if std.objectHas(config, 'shared_platforms') then {
      [topo.shared_platform(p_name).compartment_key]: {
        name: topo.shared_platform(p_name).compartment_name,
        description: topo.shared_platform(p_name).compartment_description,
      }
      for p_name in std.objectFields(config.shared_platforms)
    } else {};

  // Per-environment children compartments
  local env_compartment_children(env_name) =
    local env = config.environments[env_name];
    local elo = std.asciiLower(env_name);

    // Per-project compartments inside PROJECTS
    local project_names = if std.objectHas(env, 'projects')
      then std.objectFields(env.projects)
      else [];

    local proj_children = {
      [n.key_global('CMP', [env_name, proj_name])]: {
        name: 'cmp-lz-%s-%s' % [elo, std.asciiLower(proj_name)],
        description: '%s environment, %s compartment' % [env_desc(env_name), proj_display(proj_name)],
      }
      for proj_name in project_names
    };

    {
      [n.key_global('CMP', [env_name, 'NETWORK'])]: {
        name: 'cmp-lz-%s-network' % elo,
        // 'prod' is abbreviated to "Prod" for the NETWORK compartment (matches hand-written JSON).
        description: '%s Workload Environment, Common Network Compartment' % topo.env_display_network(env_name),
        defined_tags: {
          [tbac_tag]: tag_network,
        },
      },

      [n.key_global('CMP', [env_name, 'PLATFORM'])]: {
        name: 'cmp-lz-%s-platform' % elo,
        description: '%s Workload Environment, Common Platform Compartment' % env_desc(env_name),
      } + (
        if std.length(std.objectFields(platform_children(env_name))) > 0 then {
          children: platform_children(env_name),
        } else {}
      ),

      [n.key_global('CMP', [env_name, 'PROJECTS'])]: {
        name: 'cmp-lz-%s-projects' % elo,
        description: '%s Workload Environment, Common Projects Compartment' % env_desc(env_name),
        children: proj_children,
      },

      [n.key_global('CMP', [env_name, 'SECURITY'])]: {
        name: 'cmp-lz-%s-security' % elo,
        description: '%s Workload Environment, Common Security Compartment' % env_desc(env_name),
        defined_tags: {
          [tbac_tag]: tag_security,
        },
      },
    };

  // All env children (merged into LANDINGZONE children)
  local env_compartments = std.foldl(
    function(acc, env_name)
      acc + {
        [n.key_global('CMP', [env_name])]: {
          name: 'cmp-lz-%s' % std.asciiLower(env_name),
          description: '%s Environment Compartment' % env_desc(env_name),
          children: env_compartment_children(env_name),
        },
      },
    env_names,
    {}
  );

  local compartments_configuration = {
    enable_delete: 'true',
    compartments: {
      'CMP-LANDINGZONE-KEY': {
        name: 'cmp-landingzone',
        description: 'Enclosing Landing Zone Compartment',
        children: {
          [n.key_global('CMP', ['NETWORK'])]: {
            name: 'cmp-lz-network',
            description: 'Shared Network Compartment',
            defined_tags: {
              [tbac_tag]: tag_network,
            },
          },
          [n.key_global('CMP', ['PLATFORM'])]: {
            name: 'cmp-lz-platform',
            description: 'Shared Platform Compartment',
          } + (
            if std.length(std.objectFields(shared_platform_children)) > 0 then {
              children: shared_platform_children,
            } else {}
          ),
        } + env_compartments + {
          [n.key_global('CMP', ['SECURITY'])]: {
            name: 'cmp-lz-security',
            description: 'Shared Security Compartment',
            defined_tags: {
              [tbac_tag]: tag_security,
            },
          },
        },
      },
    },
  };

  // --- Identity domain groups ---

  // Per-environment per-project admin groups
  local env_project_groups = std.foldl(
    function(acc, env_name)
      local env = config.environments[env_name];
      local project_names = if std.objectHas(env, 'projects')
        then std.objectFields(env.projects)
        else [];
      acc + std.foldl(
        function(gacc, proj_name)
          gacc + {
            [n.key_global('GRP', [env_name, proj_name, 'ADMIN'])]: {
              name: proj_grp_name(env_name, proj_name),
              description: 'One-OE Landing Zone, %s environment, %s, Administrators.' % [env_desc(env_name), proj_display(proj_name)],
            },
          },
        project_names,
        {}
      ),
    env_names,
    {}
  );

  local identity_domain_groups_configuration = {
    default_identity_domain_id: 'COMMON-DOMAIN',
    groups: {
      [n.key_tenancy('GRP', ['AUDITORS', 'ADMIN'])]: {
        name: n.display_tenancy('GRP', ['AUDITORS', 'ADMIN']),
        description: 'Tenancy global read access group(for security auditing or health checks).',
      },
      [n.key_tenancy('GRP', ['COST', 'ADMIN'])]: {
        name: n.display_tenancy('GRP', ['COST', 'ADMIN']),
        description: 'Tenancy global cost control group.',
      },
      [n.key_tenancy('GRP', ['IAM', 'ADMIN'])]: {
        name: n.display_tenancy('GRP', ['IAM', 'ADMIN']),
        description: 'Tenancy global Identity and access management administrator group.',
      },
      [n.key_global('GRP', ['NETWORK', 'ADMIN'])]: {
        name: n.display_global('GRP', ['NETWORK', 'ADMIN']),
        description: 'One-OE Landing Zone, Shared network administration group, including common OE network elements.',
      },
    } + env_project_groups + {
      [n.key_global('GRP', ['SECURITY', 'ADMIN'])]: {
        name: n.display_global('GRP', ['SECURITY', 'ADMIN']),
        description: 'One-OE Landing Zone, Shared security administration group, including common OE network elements.',
      },
      [n.key_tenancy('GRP', ['SECURITY', 'ADMIN'])]: {
        name: n.display_tenancy('GRP', ['SECURITY', 'ADMIN']),
        description: 'Tenancy Security Administrators for global resources as Cloud Guard.',
      },
    },
  };

  // --- Identity domains ---

  local identity_domains_configuration = {
    default_compartment_id: null,
    default_defined_tags: null,
    default_freeform_tags: null,
    identity_domains: {
      'COMMON-DOMAIN': {
        display_name: 'id_lz_common',
        description: 'One-OE LZ common Identity Domain',
        compartment_id: null,
        admin_email: null,
        admin_first_name: null,
        admin_last_name: null,
        admin_user_name: null,
        allow_signing_cert_public_access: false,
        home_region: null,
        is_hidden_on_login: false,
        is_notification_bypassed: false,
        is_primary_email_required: false,
        license_type: 'free',
        replica_region: null,
      },
    },
  };

  // --- Policies ---

  // Per-project policies: 3 policies per project (admin, net, sec)
  local proj_policies(env_name, proj_name) =
    local proj_key = n.key_global('PCY', [env_name, proj_name, 'ADMIN']);
    local proj_net_key = n.key_global('PCY', [env_name, proj_name, 'ADMIN', 'NET']);
    local proj_sec_key = n.key_global('PCY', [env_name, proj_name, 'ADMIN', 'SEC']);

    local grp = 'allow group %s' % domain_grp(proj_grp_name(env_name, proj_name));
    local proj_cmp = 'cmp-lz-%s-%s' % [std.asciiLower(env_name), std.asciiLower(proj_name)];
    local net_cmp = 'cmp-lz-%s-network' % std.asciiLower(env_name);
    local sec_cmp = 'cmp-lz-%s-security' % std.asciiLower(env_name);
    local proj_cmp_key = n.key_global('CMP', [env_name, proj_name]);
    local net_cmp_key = n.key_global('CMP', [env_name, 'NETWORK']);
    local sec_cmp_key = n.key_global('CMP', [env_name, 'SECURITY']);
    local grp_name = proj_grp_name(env_name, proj_name);
    local proj_desc_l = proj_desc_lower(proj_name);

    {
      [proj_key]: {
        name: 'pcy-lz-%s-%s-admin' % [std.asciiLower(env_name), std.asciiLower(proj_name)],
        description: 'Allow %s group to manage their dedicated %s compartment' % [grp_name, proj_desc_l],
        compartment_id: proj_cmp_key,
        statements: [
          '%s to read all-resources in compartment %s' % [grp, proj_cmp],
          '%s to read bucket in compartment %s' % [grp, proj_cmp],
          '%s to inspect object in compartment %s' % [grp, proj_cmp],
          '%s to read audit-events in compartment %s' % [grp, proj_cmp],
          '%s to read work-requests in compartment %s' % [grp, proj_cmp],
          '%s to read instance-agent-plugins in compartment %s' % [grp, proj_cmp],
          '%s to use network-security-groups in compartment %s' % [grp, proj_cmp],
          '%s to use load-balancers in compartment %s' % [grp, proj_cmp],
          '%s to use vnics in compartment %s' % [grp, proj_cmp],
          '%s to use key-delegate in compartment %s' % [grp, proj_cmp],
          '%s to manage api-gateway-family in compartment %s' % [grp, proj_cmp],
          '%s to manage streams in compartment %s' % [grp, proj_cmp],
          '%s to manage cluster-family in compartment %s' % [grp, proj_cmp],
          '%s to manage alarms in compartment %s' % [grp, proj_cmp],
          '%s to manage metrics in compartment %s' % [grp, proj_cmp],
          '%s to manage logging-family in compartment %s' % [grp, proj_cmp],
          '%s to manage instance-family in compartment %s' % [grp, proj_cmp],
          "%s to manage volume-family in compartment %s where all{%s}" % [grp, proj_cmp, std.join(', ', vol_deny)],
          "%s to manage object-family in compartment %s where all{%s}" % [grp, proj_cmp, std.join(', ', obj_deny)],
          "%s to manage file-family in compartment %s where all{%s}" % [grp, proj_cmp, std.join(', ', fs_deny)],
          '%s to manage repos in compartment %s' % [grp, proj_cmp],
          '%s to manage orm-stacks in compartment %s' % [grp, proj_cmp],
          '%s to manage orm-jobs in compartment %s' % [grp, proj_cmp],
          '%s to manage orm-config-source-providers in compartment %s' % [grp, proj_cmp],
          '%s to manage bastion-session in compartment %s' % [grp, proj_cmp],
          '%s to manage cloudevents-rules in compartment %s' % [grp, proj_cmp],
          '%s to manage keys in compartment %s' % [grp, proj_cmp],
          '%s to manage secret-family in compartment %s' % [grp, proj_cmp],
          '%s to manage database-family in compartment %s' % [grp, proj_cmp],
          '%s to manage autonomous-database-family in compartment %s' % [grp, proj_cmp],
          '%s to manage data-safe-family in compartment %s' % [grp, proj_cmp],
        ],
      },

      [proj_net_key]: {
        name: 'pcy-lz-%s-%s-admin-net' % [std.asciiLower(env_name), std.asciiLower(proj_name)],
        description: 'Allow %s group to use shared network resources' % grp_name,
        compartment_id: net_cmp_key,
        statements: [
          '%s to use virtual-network-family in compartment %s' % [grp, net_cmp],
          '%s to use subnets in compartment %s' % [grp, net_cmp],
          '%s to use vnics in compartment %s' % [grp, net_cmp],
          '%s to manage private-ips in compartment %s' % [grp, net_cmp],
        ],
      },

      [proj_sec_key]: {
        name: 'pcy-lz-%s-%s-admin-sec' % [std.asciiLower(env_name), std.asciiLower(proj_name)],
        description: 'Allow %s group to use shared security resources' % grp_name,
        compartment_id: sec_cmp_key,
        statements: [
          '%s to read ons-topics in compartment %s' % [grp, sec_cmp],
          '%s to use vaults in compartment %s' % [grp, sec_cmp],
          '%s to manage instance-images in compartment %s' % [grp, sec_cmp],
          '%s to use vss-family in compartment %s' % [grp, sec_cmp],
          '%s to use bastion in compartment %s' % [grp, sec_cmp],
          '%s to read logging-family in compartment %s' % [grp, sec_cmp],
        ],
      },
    };

  // Collect all per-env per-project policies
  local env_project_policies = std.foldl(
    function(acc, env_name)
      local env = config.environments[env_name];
      local project_names = if std.objectHas(env, 'projects')
        then std.objectFields(env.projects)
        else [];
      acc + std.foldl(
        function(pacc, proj_name) pacc + proj_policies(env_name, proj_name),
        project_names,
        {}
      ),
    env_names,
    {}
  );

  // Combined group list for generic admin policy statement
  local generic_admin_groups = [
    domain_grp(grp_iam),
    domain_grp(grp_auditors),
    domain_grp(grp_security_tenancy),
    domain_grp(grp_network),
  ];
  local generic_admin_stmt = 'allow group %s' % std.join(', ', generic_admin_groups);

  // Service policy: FSS service identifier + objectstorage region-specific
  local fss_service = realm_constants.service_identifiers.fss;
  local obj_service = 'objectstorage-%s' % config.region;

  local policies_configuration = {
    enable_cis_benchmark_checks: 'false',
    supplied_policies: {
      [n.key_tenancy('PCY', ['AUDITING', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['AUDITING', 'ADMIN']),
        description: 'Allow %s group users to read all the resources in the tenancy.' % grp_auditors,
        compartment_id: 'TENANCY-ROOT',
        statements: [
          tenancy_allow(grp_auditors, 'inspect', 'all-resources'),
          tenancy_allow(grp_auditors, 'read', 'instances'),
          tenancy_allow(grp_auditors, 'read', 'load-balancers'),
          tenancy_allow(grp_auditors, 'read', 'buckets'),
          tenancy_allow(grp_auditors, 'read', 'nat-gateways'),
          tenancy_allow(grp_auditors, 'read', 'public-ips'),
          tenancy_allow(grp_auditors, 'read', 'file-family'),
          tenancy_allow(grp_auditors, 'read', 'instance-configurations'),
          tenancy_allow(grp_auditors, 'read', 'network-security-groups'),
          tenancy_allow(grp_auditors, 'read', 'resource-availability'),
          tenancy_allow(grp_auditors, 'read', 'audit-events'),
          tenancy_allow(grp_auditors, 'read', 'users'),
          tenancy_allow(grp_auditors, 'use', 'cloud-shell'),
          tenancy_allow(grp_auditors, 'read', 'vss-family'),
          tenancy_allow(grp_auditors, 'read', 'usage-budgets'),
          tenancy_allow(grp_auditors, 'read', 'usage-reports'),
          tenancy_allow(grp_auditors, 'read', 'data-safe-family'),
          tenancy_allow(grp_auditors, 'read', 'vaults'),
          tenancy_allow(grp_auditors, 'read', 'keys'),
          tenancy_allow(grp_auditors, 'read', 'tag-namespaces'),
          tenancy_allow(grp_auditors, 'read', 'serviceconnectors'),
          tenancy_allow_where(grp_auditors, 'use', 'ons-family', "where any {request.operation!=/Create*/, request.operation!=/Update*/, request.operation!=/Delete*/, request.operation!=/Change*/}"),
        ],
      },

      [n.key_tenancy('PCY', ['COST', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['COST', 'ADMIN']),
        description: 'Allow %s group users to manage all budget resources in the tenancy.' % grp_cost,
        compartment_id: 'TENANCY-ROOT',
        statements: [
          'define tenancy usage-report as %s' % realm_constants.usage_report_tenancy_ocid,
          "endorse group %s to read objects in tenancy usage-report" % domain_grp(grp_cost),
          tenancy_allow(grp_cost, 'manage', 'usage-report'),
          tenancy_allow(grp_cost, 'manage', 'usage-budgets'),
        ],
      },

      [n.key_tenancy('PCY', ['GENERIC', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['GENERIC', 'ADMIN']),
        description: 'Allow defined groups to use generic services.',
        compartment_id: 'TENANCY-ROOT',
        statements: [
          '%s to use cloud-shell in tenancy' % generic_admin_stmt,
          '%s to use cloud-shell-public-network in tenancy' % generic_admin_stmt,
          '%s to read usage-budgets in tenancy' % generic_admin_stmt,
          '%s to read usage-reports in tenancy' % generic_admin_stmt,
          '%s to read objectstorage-namespaces in tenancy' % generic_admin_stmt,
          "allow any-user to inspect tag-namespaces in tenancy where target.tag-namespace.name='tagns-lz-role'",
        ],
      },

      [n.key_tenancy('PCY', ['IAM', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['IAM', 'ADMIN']),
        description: 'Allow %s group users to manage IAM resources in the tenancy.' % grp_iam,
        compartment_id: 'TENANCY-ROOT',
        statements: [
          tenancy_allow(grp_iam, 'manage', 'policies'),
          tenancy_allow(grp_iam, 'manage', 'users'),
          tenancy_allow(grp_iam, 'inspect', 'groups'),
          tenancy_allow_where(grp_iam, 'manage', 'groups', "where all {target.group.name != 'Administrators'}"),
          tenancy_allow(grp_iam, 'manage', 'identity-providers'),
          tenancy_allow(grp_iam, 'manage', 'dynamic-groups'),
          tenancy_allow(grp_iam, 'manage', 'authentication-policies'),
          tenancy_allow(grp_iam, 'manage', 'network-sources'),
          tenancy_allow(grp_iam, 'manage', 'quota'),
          tenancy_allow(grp_iam, 'manage', 'tag-defaults'),
          tenancy_allow(grp_iam, 'manage', 'tag-namespaces'),
          tenancy_allow(grp_iam, 'manage', 'orm-jobs'),
          tenancy_allow(grp_iam, 'manage', 'orm-config-source-providers'),
        ],
      },

      [n.key_global('PCY', ['NETWORK', 'ADMIN'])]: {
        name: n.display_global('PCY', ['NETWORK', 'ADMIN']),
        description: 'Allow %s group users to manage all network resources in the child compartments of %s with the matching tags.' % [grp_network, cmp_lz],
        compartment_id: 'CMP-LANDINGZONE-KEY',
        statements: [
          // Own compartment access: network-tagged compartments
          tbac_allow(grp_network, 'read', 'all-resources', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'virtual-network-family', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'dns', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'load-balancers', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'alarms', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'metrics', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'orm-stacks', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'orm-jobs', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'orm-config-source-providers', cmp_lz, tag_network),
          tbac_allow(grp_network, 'read', 'audit-events', cmp_lz, tag_network),
          tbac_allow(grp_network, 'read', 'work-requests', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'instance-family', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'volume-family', cmp_lz, tag_network, vol_deny),
          tbac_allow(grp_network, 'manage', 'object-family', cmp_lz, tag_network, obj_deny),
          tbac_allow(grp_network, 'manage', 'file-family', cmp_lz, tag_network, fs_deny),
          tbac_allow(grp_network, 'manage', 'bastion-session', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'cloudevents-rules', cmp_lz, tag_network),
          tbac_allow(grp_network, 'read', 'instance-agent-plugins', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'keys', cmp_lz, tag_network),
          tbac_allow(grp_network, 'use', 'key-delegate', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'secret-family', cmp_lz, tag_network),
          tbac_allow(grp_network, 'manage', 'repos', cmp_lz, tag_network),
          tbac_allow(grp_network, 'read', 'vss-family', cmp_lz, tag_network),
          // Cross-compartment access: security-tagged compartments
          tbac_allow(grp_network, 'read', 'ons-topics', cmp_lz, tag_security),
          tbac_allow(grp_network, 'use', 'bastion', cmp_lz, tag_security),
          tbac_allow(grp_network, 'use', 'bastion-session', cmp_lz, tag_security),
          tbac_allow(grp_network, 'use', 'vaults', cmp_lz, tag_security),
          tbac_allow(grp_network, 'read', 'logging-family', cmp_lz, tag_security),
        ],
      },
    } + env_project_policies + {
      [n.key_global('PCY', ['SECURITY', 'ADMIN'])]: {
        name: n.display_global('PCY', ['SECURITY', 'ADMIN']),
        description: 'Allow %s group users to manage all security resources in the child compartments of %s with the matching tags.' % [grp_security_lz, cmp_lz],
        compartment_id: 'CMP-LANDINGZONE-KEY',
        statements: [
          // Own compartment access: security-tagged compartments
          tbac_allow(grp_security_lz, 'manage', 'tag-namespaces', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'tag-defaults', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'repos', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'read', 'audit-events', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'read', 'app-catalog-listing', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'read', 'instance-images', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'inspect', 'buckets', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'read', 'all-resources', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'instance-family', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'volume-family', cmp_lz, tag_security, vol_deny),
          tbac_allow(grp_security_lz, 'manage', 'object-family', cmp_lz, tag_security, obj_deny),
          tbac_allow(grp_security_lz, 'manage', 'file-family', cmp_lz, tag_security, fs_deny),
          tbac_allow(grp_security_lz, 'manage', 'vaults', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'keys', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'secret-family', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'logging-family', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'serviceconnectors', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'streams', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'ons-family', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'functions-family', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'waas-family', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'security-zone', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'orm-stacks', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'orm-jobs', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'orm-config-source-providers', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'vss-family', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'read', 'work-requests', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'bastion-family', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'read', 'instance-agent-plugins', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'cloudevents-rules', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'alarms', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'manage', 'metrics', cmp_lz, tag_security),
          tbac_allow(grp_security_lz, 'use', 'key-delegate', cmp_lz, tag_security),
          // Cross-compartment access: network-tagged compartments
          tbac_allow(grp_security_lz, 'read', 'virtual-network-family', cmp_lz, tag_network),
          tbac_allow(grp_security_lz, 'use', 'subnets', cmp_lz, tag_network),
          tbac_allow(grp_security_lz, 'use', 'network-security-groups', cmp_lz, tag_network),
          tbac_allow(grp_security_lz, 'use', 'vnics', cmp_lz, tag_network),
          tbac_allow(grp_security_lz, 'manage', 'private-ips', cmp_lz, tag_network),
          tbac_allow(grp_security_lz, 'read', 'keys', cmp_lz, tag_network),
          tbac_allow(grp_security_lz, 'manage', 'operator-control-family', cmp_lz, tag_security),
        ],
      },

      [n.key_tenancy('PCY', ['SECURITY', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['SECURITY', 'ADMIN']),
        description: 'Allow %s group users to manage all security resources in the security compartment.' % grp_security_tenancy,
        compartment_id: 'TENANCY-ROOT',
        statements: [
          tenancy_allow(grp_security_tenancy, 'manage', 'cloudevents-rules'),
          tenancy_allow(grp_security_tenancy, 'manage', 'cloud-guard-family'),
          tenancy_allow(grp_security_tenancy, 'read', 'tenancies'),
        ],
      },

      [n.key_tenancy('PCY', ['SERVICES', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['SERVICES', 'ADMIN']),
        description: 'Policy for all supported services in the tenancy.',
        compartment_id: 'TENANCY-ROOT',
        statements: [
          "allow service cloudguard to manage cloudevents-rules in tenancy where target.rule.type='managed'",
          'allow service cloudguard to read tenancies in tenancy',
          'allow service cloudguard to read all-resources in tenancy',
          'allow service cloudguard to use network-security-groups in tenancy',
          "allow any-user to { WLP_BOM_READ, WLP_CONFIG_READ } in tenancy where all { request.principal.id = target.agent.id, request.principal.type = 'workloadprotectionagent'}",
          "endorse any-user to { WLP_LOG_CREATE, WLP_METRICS_CREATE, WLP_ADHOC_QUERY_READ, WLP_ADHOC_RESULTS_CREATE } in any-tenancy where all { request.principal.id = target.agent.id, request.principal.type = 'workloadprotectionagent' }",
          'allow service vulnerability-scanning-service to manage instances in tenancy',
          'allow service vulnerability-scanning-service to read compartments in tenancy',
          'allow service vulnerability-scanning-service to read repos in tenancy',
          'allow service vulnerability-scanning-service to read vnics in tenancy',
          'allow service vulnerability-scanning-service to read vnic-attachments in tenancy',
          'allow service osms to read instances in tenancy',
          'allow service blockstorage, oke, streaming, %s, %s to use keys in tenancy' % [fss_service, obj_service],
        ],
      },
    },
  };

  // --- Final output ---
  {
    compartments_configuration: compartments_configuration,
    identity_domain_groups_configuration: identity_domain_groups_configuration,
    identity_domains_configuration: identity_domains_configuration,
    policies_configuration: policies_configuration,
  }
