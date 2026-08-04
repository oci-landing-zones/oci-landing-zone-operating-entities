// gen/builders/iam/project_policies.libsonnet
// Per-environment and per-project IAM policy construction.

function(ctx)
  local n = ctx.n;
  local topo = ctx.topo;
  local desc = ctx.desc;
  local env_entries = ctx.env_entries;
  local domain_grp = ctx.domain_grp;
  local vol_deny = ctx.vol_deny;
  local obj_deny = ctx.obj_deny;
  local fs_deny = ctx.fs_deny;

  // Per-project policies: 3 policies per project (admin, net, sec)
  local proj_policies(entry, proj_name) =
    local env_name = entry.env_name;
    local proj_key = n.key_global('PCY', entry.key_segments + [proj_name, 'ADMIN']);
    local proj_net_key = n.key_global('PCY', entry.key_segments + [proj_name, 'ADMIN', 'NET']);
    local proj_sec_key = n.key_global('PCY', entry.key_segments + [proj_name, 'ADMIN', 'SEC']);

    local grp = 'allow group %s' % domain_grp(ctx.proj_grp_name(entry, proj_name));
    local policy_compartment_name_or_path(entry, name, path) =
      if entry.mode == 'one_oe' then name else path;
    local proj_cmp = policy_compartment_name_or_path(
      entry,
      topo.env_project_compartment_name(entry, proj_name),
      topo.env_project_compartment_path(entry, proj_name)
    );
    local net_cmp = policy_compartment_name_or_path(
      entry,
      topo.env_child_compartment_name(entry, 'network'),
      topo.env_child_compartment_path(entry, 'network')
    );
    local sec_cmp = policy_compartment_name_or_path(
      entry,
      topo.env_child_compartment_name(entry, 'security'),
      topo.env_child_compartment_path(entry, 'security')
    );
    local proj_cmp_key = topo.env_project_compartment_key(entry, proj_name);
    local net_cmp_key = topo.env_child_compartment_key(entry, 'NETWORK');
    local sec_cmp_key = topo.env_child_compartment_key(entry, 'SECURITY');
    local grp_name = ctx.proj_grp_name(entry, proj_name);
    local name_segments = [std.asciiLower(s) for s in entry.key_segments] + [std.asciiLower(proj_name)];
    {
      [proj_key]: {
        name: 'pcy-lz-%s-admin' % std.join('-', name_segments),
        description: desc.policy.grants(
          grp_name,
          'administration access',
          desc.scope.project_compartment(ctx.env_desc(env_name), proj_name)
        ),
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
        name: 'pcy-lz-%s-admin-net' % std.join('-', name_segments),
        description: desc.policy.grants(
          grp_name,
          'shared network resource usage',
          desc.scope.environment_compartment(ctx.env_desc(env_name), 'network')
        ),
        compartment_id: net_cmp_key,
        statements: [
          '%s to use virtual-network-family in compartment %s' % [grp, net_cmp],
          '%s to use subnets in compartment %s' % [grp, net_cmp],
          '%s to use vnics in compartment %s' % [grp, net_cmp],
          '%s to manage private-ips in compartment %s' % [grp, net_cmp],
        ],
      },

      [proj_sec_key]: {
        name: 'pcy-lz-%s-admin-sec' % std.join('-', name_segments),
        description: desc.policy.grants(
          grp_name,
          'shared security resource usage',
          desc.scope.environment_compartment(ctx.env_desc(env_name), 'security')
        ),
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
  std.foldl(
    function(acc, entry)
      local project_names = topo.project_names(entry);
      acc + std.foldl(
        function(pacc, proj_name) pacc + proj_policies(entry, proj_name),
        project_names,
        {}
      ),
    env_entries,
    {}
  )
