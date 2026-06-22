// gen/topology.libsonnet
// Shared semantic helpers for environment labels, platform placement, and security targeting.
//
// function(config, n) -> topology helper object

function(config, n)
  local labels = import './labels.libsonnet';
  local is_multi_oe = std.objectHas(config, 'operating_entities');
  local oe_names =
    if is_multi_oe then std.objectFields(config.operating_entities) else [];
  local raw_env_names =
    if is_multi_oe then
      std.foldl(
        function(acc, oe_name)
          acc + [
            env_name
            for env_name in std.objectFields(config.operating_entities[oe_name].environments)
            if !std.member(acc, env_name)
          ],
        oe_names,
        []
      )
    else std.objectFields(config.environments);
  local preferred_env_names = ['prod', 'preprod', 'staging', 'uat', 'dev', 'test'];
  local ordered_env_names =
    [name for preferred_name in preferred_env_names for name in raw_env_names if name == preferred_name]
    + [name for name in raw_env_names if !std.member(preferred_env_names, name)];

  local env_labels = {
    prod: { short: 'Prod', long: 'Production', network: 'Prod', dns: 'p' },
    preprod: { short: 'PreProd', long: 'Pre-Production', network: 'Pre-Production', dns: 'pp' },
    dev: { short: 'Dev', long: 'Dev', network: 'Dev', dns: 'd' },
    staging: { short: 'Staging', long: 'Staging', network: 'Staging', dns: 'st' },
    uat: { short: 'UAT', long: 'UAT', network: 'UAT', dns: 'ua' },
    test: { short: 'Test', long: 'Test', network: 'Test', dns: 't' },
  };

  local title_case(name) = labels.title_case(name);
  local key_segment(name) = std.strReplace(name, '_', '-');
  local env_label(env_name) =
    if std.objectHas(env_labels, env_name) then env_labels[env_name]
    else {
      short: title_case(env_name),
      long: title_case(env_name),
      network: title_case(env_name),
      dns: env_name[0:2],
    };

  local one_oe_env_entries = [
    {
      mode: 'one_oe',
      oe_name: null,
      oe_display_name: null,
      oe_dns: null,
      env_name: name,
      qualified_name: name,
      key_segments: [name],
      display_segments: [env_label(name).short],
      name_segments: [name],
      compartment_segments: [name],
      dns_segments: [env_label(name).dns],
      env: config.environments[name],
    }
    for name in ordered_env_names
  ];

  local multi_oe_env_entries = std.flattenArrays([
    [
      local oe_segment = key_segment(oe_name);
      {
        mode: 'multi_oe',
        oe_name: oe_name,
        oe_display_name: config.operating_entities[oe_name].display_name,
        oe_dns: config.operating_entities[oe_name].dns,
        env_name: env_name,
        qualified_name: '%s-%s' % [oe_segment, env_name],
        key_segments: [oe_segment, env_name],
        display_segments: [config.operating_entities[oe_name].display_name, env_label(env_name).short],
        name_segments: [oe_segment, env_name],
        compartment_segments: [oe_segment, env_name],
        dns_segments: [config.operating_entities[oe_name].dns, env_label(env_name).dns],
        env: config.operating_entities[oe_name].environments[env_name],
      }
      for env_name in ordered_env_names
      if std.objectHas(config.operating_entities[oe_name].environments, env_name)
    ]
    for oe_name in oe_names
  ]);

  local env_entries = if is_multi_oe then multi_oe_env_entries else one_oe_env_entries;
  local ordered_spoke_env_entries = [
    entry
    for entry in env_entries
    if std.objectHas(entry.env, 'shared_project_network')
  ];
  local ordered_spoke_env_names = [entry.qualified_name for entry in ordered_spoke_env_entries];
  local security_target_env_entries =
    if std.objectHas(config, 'security_targets') && config.security_targets != null then
      [
        entry
        for entry in env_entries
        if std.member(config.security_targets, entry.env_name)
      ]
    else env_entries;
  local security_target_env_names = [entry.qualified_name for entry in security_target_env_entries];
  local security_target_networked_env_names = [
    entry.qualified_name
    for entry in ordered_spoke_env_entries
    if std.member(security_target_env_names, entry.qualified_name)
  ];

  local env_compartment_key(entry) = n.key_global('CMP', entry.key_segments);
  local env_child_compartment_key(entry, child) = n.key_global('CMP', entry.key_segments + [child]);
  local env_project_compartment_key(entry, project) = n.key_global('CMP', entry.key_segments + [project]);
  local env_compartment_name(entry) = 'cmp-lz-%s' % std.join('-', [std.asciiLower(s) for s in entry.compartment_segments]);
  local env_child_compartment_name(entry, child) = 'cmp-lz-%s-%s' % [
    std.join('-', [std.asciiLower(s) for s in entry.compartment_segments]),
    std.asciiLower(child),
  ];
  local env_project_compartment_name(entry, project) = 'cmp-lz-%s-%s' % [
    std.join('-', [std.asciiLower(s) for s in entry.compartment_segments]),
    std.asciiLower(project),
  ];
  local env_compartment_path(entry) =
    n.compartment_path(entry.compartment_segments);
  local env_child_compartment_path(entry, child) = '%s:%s' % [
    env_compartment_path(entry),
    env_child_compartment_name(entry, child),
  ];
  local env_project_compartment_path(entry, project) = '%s:%s' % [
    env_child_compartment_path(entry, 'projects'),
    env_project_compartment_name(entry, project),
  ];

  local platform_scope_for_entry(entry, platform_name) =
    local platform_title = title_case(platform_name);
    local scope_title = std.join(' ', entry.display_segments);
    local scope_compartment_prefix = std.join('-', [
      std.asciiLower(s)
      for s in entry.compartment_segments
    ]);
    local platform_compartment_name = 'cmp-lz-%s-%s' % [
      scope_compartment_prefix,
      std.asciiLower(platform_name),
    ];
    {
      scope_type: 'environment',
      scope_name: entry.env_name,
      qualified_name: entry.qualified_name,
      key_segments: entry.key_segments,
      display_segments: entry.display_segments,
      name_segments: entry.name_segments,
      compartment_segments: entry.compartment_segments,
      dns_segments: entry.dns_segments,
      scope_title: scope_title,
      scope_long_title: scope_title,
      dns: std.join('', entry.dns_segments),
      platform_name: platform_name,

      compartment_key: n.key_global('CMP', entry.key_segments + [platform_name]),
      parent_compartment_key: n.key_global('CMP', entry.key_segments + ['PLATFORM']),
      compartment_name: platform_compartment_name,
      compartment_description: '%s Platform %s Compartment' % [scope_title, platform_title],
      compartment_path: '%s:%s' % [
        env_child_compartment_path(entry, 'platform'),
        platform_compartment_name,
      ],

      network_compartment_key: env_child_compartment_key(entry, 'NETWORK'),
      network_compartment_path: env_child_compartment_path(entry, 'network'),

      allow_security_target:
        if std.objectHas(config, 'security_targets') && config.security_targets != null then
          std.member(config.security_targets, entry.env_name)
        else true,
    };

  local shared_platform_scope(platform_name) =
    local platform_title = title_case(platform_name);
    {
      scope_type: 'shared',
      scope_name: 'shared',
      qualified_name: 'shared',
      key_segments: ['shared'],
      display_segments: ['Shared'],
      name_segments: ['shared'],
      compartment_segments: ['shared'],
      dns_segments: ['sh'],
      scope_title: 'Shared',
      scope_long_title: 'Shared',
      dns: 'sh',
      platform_name: platform_name,
      compartment_key: n.key_global('CMP', ['SHARED', platform_name]),
      parent_compartment_key: n.key_global('CMP', ['PLATFORM']),
      compartment_name: 'cmp-lz-shared-%s' % std.asciiLower(platform_name),
      compartment_description: 'Shared Platform %s Compartment' % platform_title,
      compartment_path: '%s:%s' % [
        n.compartment_path(['platform']),
        'cmp-lz-shared-%s' % std.asciiLower(platform_name),
      ],
      network_compartment_key: n.key_global('CMP', ['NETWORK']),
      network_compartment_path: n.compartment_path(['network']),
      allow_security_target: true,
    };

  {
    ordered_env_names():: ordered_env_names,
    ordered_env_entries():: env_entries,
    ordered_spoke_env_names():: ordered_spoke_env_names,
    ordered_spoke_env_entries():: ordered_spoke_env_entries,
    networked_env_names():: ordered_spoke_env_names,
    networked_env_entries():: self.ordered_spoke_env_entries(),
    security_target_networked_env_names():: security_target_networked_env_names,

    env_entry_by_qualified_name(qualified_name)::
      local matches = [
        entry
        for entry in env_entries
        if entry.qualified_name == qualified_name
      ];
      assert std.length(matches) == 1 : 'unknown topology environment entry %s' % qualified_name;
      matches[0],

    project_names(scope)::
      local entry =
        if std.type(scope) == 'string' then
          assert !is_multi_oe :
            'project_names with an environment name is only valid in One-OE mode; pass a topology entry in Multi-OE mode';
          self.env_entry_by_qualified_name(scope)
        else scope;
      if std.objectHas(entry.env, 'projects') then
        std.objectFields(entry.env.projects)
      else [],

    project_names_by_env_name(env_name)::
      assert !is_multi_oe :
        'project_names_by_env_name is only valid in One-OE mode; pass a topology entry in Multi-OE mode';
      self.project_names(self.env_entry_by_qualified_name(env_name)),

    env_label(env_name):: env_label(env_name),
    env_display(env_name):: self.env_label(env_name).short,
    env_display_long(env_name):: self.env_label(env_name).long,
    env_display_network(env_name):: self.env_label(env_name).network,
    env_dns(env_name):: self.env_label(env_name).dns,

    env_compartment_key(entry):: env_compartment_key(entry),
    env_child_compartment_key(entry, child):: env_child_compartment_key(entry, child),
    env_project_compartment_key(entry, project):: env_project_compartment_key(entry, project),
    env_compartment_name(entry):: env_compartment_name(entry),
    env_child_compartment_name(entry, child):: env_child_compartment_name(entry, child),
    env_project_compartment_name(entry, project):: env_project_compartment_name(entry, project),
    env_compartment_path(entry):: env_compartment_path(entry),
    env_child_compartment_path(entry, child):: env_child_compartment_path(entry, child),
    env_project_compartment_path(entry, project):: env_project_compartment_path(entry, project),

    env_platform(scope, platform_name)::
      local entry =
        if std.type(scope) == 'string' then
          assert !is_multi_oe :
            'env_platform with an environment name is only valid in One-OE mode; pass a topology entry in Multi-OE mode';
          self.env_entry_by_qualified_name(scope)
        else scope;
      platform_scope_for_entry(entry, platform_name),
    shared_platform(platform_name):: shared_platform_scope(platform_name),

    security_target_env_entries():: security_target_env_entries,
    security_target_env_names():: security_target_env_names,
  }
