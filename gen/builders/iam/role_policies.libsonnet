// Shared and per-operating-entity network/security role policies.
// Statement factories keep least-privilege verbs consistent without multiplying
// policies for every environment, project, or platform.

function(ctx)
  local n = ctx.n;
  local topo = ctx.topo;
  local desc = ctx.desc;
  local tbac_allow = ctx.tbac_allow;

  local network_statements(grp_name, cmp, network_tag, security_tag) = [
    // Own compartment access: network-tagged compartments
    tbac_allow(grp_name, 'read', 'all-resources', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'virtual-network-family', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'dns', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'load-balancers', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'alarms', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'metrics', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'orm-stacks', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'orm-jobs', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'orm-config-source-providers', cmp, network_tag),
    tbac_allow(grp_name, 'read', 'audit-events', cmp, network_tag),
    tbac_allow(grp_name, 'read', 'work-requests', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'instance-family', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'volume-family', cmp, network_tag, ctx.vol_deny),
    tbac_allow(grp_name, 'manage', 'object-family', cmp, network_tag, ctx.obj_deny),
    tbac_allow(grp_name, 'manage', 'file-family', cmp, network_tag, ctx.fs_deny),
    tbac_allow(grp_name, 'manage', 'bastion-session', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'cloudevents-rules', cmp, network_tag),
    tbac_allow(grp_name, 'read', 'instance-agent-plugins', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'keys', cmp, network_tag),
    tbac_allow(grp_name, 'use', 'key-delegate', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'secret-family', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'repos', cmp, network_tag),
    tbac_allow(grp_name, 'read', 'vss-family', cmp, network_tag),
    // Cross-compartment access: security-tagged compartments
    tbac_allow(grp_name, 'read', 'ons-topics', cmp, security_tag),
    tbac_allow(grp_name, 'use', 'bastion', cmp, security_tag),
    tbac_allow(grp_name, 'use', 'bastion-session', cmp, security_tag),
    tbac_allow(grp_name, 'use', 'vaults', cmp, security_tag),
    tbac_allow(grp_name, 'read', 'logging-family', cmp, security_tag),
  ];

  local security_statements(grp_name, cmp, network_tag, security_tag) = [
    // Own compartment access: security-tagged compartments
    tbac_allow(grp_name, 'manage', 'tag-namespaces', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'tag-defaults', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'repos', cmp, security_tag),
    tbac_allow(grp_name, 'read', 'audit-events', cmp, security_tag),
    tbac_allow(grp_name, 'read', 'app-catalog-listing', cmp, security_tag),
    tbac_allow(grp_name, 'read', 'instance-images', cmp, security_tag),
    tbac_allow(grp_name, 'inspect', 'buckets', cmp, security_tag),
    tbac_allow(grp_name, 'read', 'all-resources', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'instance-family', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'volume-family', cmp, security_tag, ctx.vol_deny),
    tbac_allow(grp_name, 'manage', 'object-family', cmp, security_tag, ctx.obj_deny),
    tbac_allow(grp_name, 'manage', 'file-family', cmp, security_tag, ctx.fs_deny),
    tbac_allow(grp_name, 'manage', 'vaults', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'keys', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'secret-family', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'logging-family', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'serviceconnectors', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'streams', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'ons-family', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'functions-family', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'waas-family', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'security-zone', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'orm-stacks', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'orm-jobs', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'orm-config-source-providers', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'vss-family', cmp, security_tag),
    tbac_allow(grp_name, 'read', 'work-requests', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'bastion-family', cmp, security_tag),
    tbac_allow(grp_name, 'read', 'instance-agent-plugins', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'cloudevents-rules', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'alarms', cmp, security_tag),
    tbac_allow(grp_name, 'manage', 'metrics', cmp, security_tag),
    tbac_allow(grp_name, 'use', 'key-delegate', cmp, security_tag),
    // Cross-compartment access: network-tagged compartments
    tbac_allow(grp_name, 'read', 'virtual-network-family', cmp, network_tag),
    tbac_allow(grp_name, 'use', 'subnets', cmp, network_tag),
    tbac_allow(grp_name, 'use', 'network-security-groups', cmp, network_tag),
    tbac_allow(grp_name, 'use', 'vnics', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'private-ips', cmp, network_tag),
    tbac_allow(grp_name, 'read', 'keys', cmp, network_tag),
    tbac_allow(grp_name, 'manage', 'operator-control-family', cmp, security_tag),
  ];

  local network_policy(key_segments, grp_name, compartment_id, cmp, network_tag, security_tag, scope) = {
    [n.key_global('PCY', key_segments + ['NETWORK', 'ADMIN'])]: {
      name: n.display_global('PCY', key_segments + ['NETWORK', 'ADMIN']),
      description: desc.policy.grants(grp_name, 'network administration access', scope),
      compartment_id: compartment_id,
      statements: network_statements(grp_name, cmp, network_tag, security_tag),
    },
  };

  local security_policy(key_segments, grp_name, compartment_id, cmp, network_tag, security_tag, scope) = {
    [n.key_global('PCY', key_segments + ['SECURITY', 'ADMIN'])]: {
      name: n.display_global('PCY', key_segments + ['SECURITY', 'ADMIN']),
      description: desc.policy.grants(grp_name, 'security administration access', scope),
      compartment_id: compartment_id,
      statements: security_statements(grp_name, cmp, network_tag, security_tag),
    },
  };

  local shared_scope = 'Landing Zone child compartments tagged for %s administration';
  local shared_policies =
    network_policy(
      [],
      ctx.grp_network,
      'CMP-LANDINGZONE-KEY',
      ctx.cmp_lz,
      ctx.tag_shared_network,
      ctx.tag_shared_security,
      shared_scope % 'network'
    )
    + security_policy(
      [],
      ctx.grp_security_lz,
      'CMP-LANDINGZONE-KEY',
      ctx.cmp_lz,
      ctx.tag_shared_network,
      ctx.tag_shared_security,
      shared_scope % 'security'
    );

  local oe_policies =
    if topo.mode != 'multi_oe' then {}
    else std.foldl(
      function(acc, oe)
        local cmp = topo.oe_compartment_name(oe);
        local scope(role) = '%s Operating Entity child compartments tagged for %s administration' % [oe.display_name, role];
        acc
        + network_policy(
          oe.key_segments,
          ctx.oe_grp_name(oe, 'network'),
          topo.oe_compartment_key(oe),
          cmp,
          ctx.tag_network,
          ctx.tag_security,
          scope('network')
        )
        + security_policy(
          oe.key_segments,
          ctx.oe_grp_name(oe, 'security'),
          topo.oe_compartment_key(oe),
          cmp,
          ctx.tag_network,
          ctx.tag_security,
          scope('security')
        ),
      topo.ordered_oe_entries(),
      {}
    );

  shared_policies + oe_policies
