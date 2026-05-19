local subnet_utils = import 'lib/subnets.libsonnet';
local validation = import 'lib/validation.libsonnet';
local platforms = import 'platforms.libsonnet';
local collections = import 'lib/collections.libsonnet';

{
  local standard_contribution_keys = [
    'network_pre',
    'iam',
    'security_cis1',
    'security_cis2',
    'observability_cis1',
    'observability_cis2',
  ],

  local merge_contribution(results, key) =
    std.foldl(
      function(acc, ext)
        if std.objectHas(ext.contributions, key) then acc + ext.contributions[key]
        else acc,
      results,
      {}
    ),

  local merge_extra_contributions(results) =
    std.foldl(
      function(acc, ext)
        std.foldl(
          function(next, key)
            if std.objectHas(next, key) then next { [key]+: ext.contributions[key] }
            else next { [key]: ext.contributions[key] },
          [
            key
            for key in std.objectFields(ext.contributions)
            if !std.member(standard_contribution_keys, key)
          ],
          acc
        ),
      results,
      {}
    ),

  select_entries_by_type(extension_entries, extension_type)::
    [
      entry
      for entry in extension_entries
      if entry.platform_config.extension.type == extension_type
    ],

  entries_by_type(extension_entries, extension_type, publication_label)::
    local entries = self.select_entries_by_type(extension_entries, extension_type);
    assert std.length(entries) > 0 :
           '%s publication requires at least one %s platform' % [publication_label, extension_type];
    entries,

  resolve_by_type(inputs)::
    local extension_type = inputs.extension_type;
    local extension_definition =
      if std.objectHas(inputs, 'extension_definition') then inputs.extension_definition
      else inputs.extension_def;
    local entries = self.entries_by_type(
      inputs.extension_entries,
      extension_type,
      inputs.publication_label
    );
    local state = self.resolve(inputs {
      extension_registry: { [extension_type]: extension_definition },
      extension_entries: entries,
    });
    {
      entries: entries,
      state: state,
    },

  resolve_entry(inputs)::
    local pe = inputs.platform_entry;
    local n = inputs.naming;
    local ext_type = pe.platform_config.extension.type;
    local ext_def = self._validate_definition(
      ext_type,
      self._lookup_definition(inputs.extension_registry, pe)
    );
    local raw_ext_meta = self._raw_metadata(ext_type, ext_def, pe, n);
    local ext_meta = self._normalize_metadata(ext_type, raw_ext_meta, pe);
    local resolved_subnets = self._resolve_subnets(ext_type, pe, ext_meta);
    local routing = self._resolve_routing(inputs, pe, ext_meta);
    local render_params =
      self._render_params(inputs, pe, resolved_subnets, routing, ext_meta);
    {
      type: ext_type,
      definition: ext_def,
      metadata: ext_meta { resolved_subnets: resolved_subnets },
      resolved_subnets: resolved_subnets,
      routing: routing,
      render_params: render_params,
    },

  _lookup_definition(extension_registry, pe)::
    local ext_type = pe.platform_config.extension.type;
    assert std.objectHas(extension_registry, ext_type) :
           'Unknown extension type "%s" for platform %s/%s. Available: %s' % [
      ext_type,
      pe.scope.scope_name,
      pe.scope.platform_name,
      std.join(', ', std.objectFields(extension_registry)),
    ];
    extension_registry[ext_type],

  _validate_definition(ext_type, ext_def)::
    assert std.objectHasAll(ext_def, 'metadata') :
           'Extension "%s" must define metadata(params)' % ext_type;
    assert std.objectHasAll(ext_def, 'render') :
           'Extension "%s" must define render(params)' % ext_type;
    ext_def,

  _raw_metadata(ext_type, ext_def, pe, n)::
    local meta = ext_def.metadata({
      config_params: pe.platform_config.extension.params,
      naming: n,
      topology: pe.scope,
      scope_config:
        if std.objectHas(pe, 'scope_config') then pe.scope_config
        else {},
      platform_config: pe.platform_config,
    });
    validation.returned_object(
      meta,
      'Extension "%s" metadata(params)' % ext_type
    ),

  _normalize_metadata(ext_type, raw_ext_meta, pe)::
    local has_legacy_requires_network = std.objectHas(raw_ext_meta, 'requires_network');
    assert !has_legacy_requires_network || std.type(raw_ext_meta.requires_network) == 'boolean' :
           'Extension "%s" metadata.requires_network must be a boolean' % ext_type;
    local has_platform_network =
      std.objectHas(pe.platform_config, 'network') && pe.platform_config.network != null;
    local declared_network_mode =
      if std.objectHas(raw_ext_meta, 'network_mode') then raw_ext_meta.network_mode
      else if has_legacy_requires_network then
        if raw_ext_meta.requires_network then 'required' else 'forbidden'
      else 'required';
    assert std.member(['required', 'forbidden', 'optional'], declared_network_mode) :
           'Extension "%s" metadata.network_mode must be one of: required, forbidden, optional; got %s' % [
      ext_type,
      std.manifestJson(declared_network_mode),
    ];
    assert declared_network_mode != 'required' || has_platform_network :
           'Extension "%s" for platform %s/%s requires network.vcn' % [
      ext_type,
      pe.scope.scope_name,
      pe.scope.platform_name,
    ];
    assert declared_network_mode != 'forbidden' || !has_platform_network :
           if has_legacy_requires_network && !raw_ext_meta.requires_network &&
              !std.objectHas(raw_ext_meta, 'network_mode') then
      'Extension "%s" for platform %s/%s does not accept platform.network because metadata.requires_network is false' % [
        ext_type,
        pe.scope.scope_name,
        pe.scope.platform_name,
      ]
    else
      'Extension "%s" for platform %s/%s does not accept platform.network because metadata.network_mode is forbidden' % [
        ext_type,
        pe.scope.scope_name,
        pe.scope.platform_name,
      ];
    local resolves_network = has_platform_network;
    assert !resolves_network || std.objectHas(raw_ext_meta, 'default_subnets') :
           'Extension "%s" must define metadata.default_subnets when network is used' % ext_type;
    raw_ext_meta {
      network_mode: declared_network_mode,
      requires_network: declared_network_mode == 'required',
      has_network: resolves_network,
    },

  _subnet_names(ext_meta)::
    if ext_meta.has_network then
      if std.objectHas(ext_meta, 'subnet_order') then ext_meta.subnet_order
      else std.objectFields(ext_meta.default_subnets)
    else [],

  _resolve_subnets(ext_type, pe, ext_meta)::
    local subnet_names =
      self._subnet_names(ext_meta);
    assert !ext_meta.has_network || collections.all([
      std.objectHas(ext_meta.default_subnets, sn)
      for sn in subnet_names
    ]) : 'Extension "%s" subnet_order contains names not in default_subnets: %s' % [
      ext_type,
      std.join(', ', [sn for sn in subnet_names if !std.objectHas(ext_meta.default_subnets, sn)]),
    ];
    local subnet_label =
      'Platform %s.network.subnets for extension %s' % [pe.scope.platform_name, ext_type];
    local resolved_subnets =
      if ext_meta.has_network then
        if pe.platform_config.network.subnets != null then
          subnet_utils.validate_subnet_map(
            pe.platform_config.network.subnets,
            subnet_names,
            subnet_label,
            pe.platform_config.network.vcn
          )
        else subnet_utils.auto_subnets(
          pe.platform_config.network.vcn,
          [
            { name: sn_name, size: ext_meta.default_subnets[sn_name] }
            for sn_name in subnet_names
          ]
        )
      else null;
    resolved_subnets,

  _resolve_routing(inputs, pe, ext_meta)::
    local hub_has_spoke_natgw =
      if std.objectHas(inputs, 'hub_has_spoke_natgw') then inputs.hub_has_spoke_natgw
      else true;
    if ext_meta.has_network then
      platforms.build_extension_route_targets({
        platform_entry: pe,
        routed_vcn_entries: inputs.routed_vcn_entries,
        naming: inputs.naming,
        hub_vcn_cidr: inputs.hub_vcn_cidr,
        hub_has_spoke_natgw: hub_has_spoke_natgw,
      })
    else null,

  _render_params(inputs, pe, resolved_subnets, routing, ext_meta)::
    {
      config_params: pe.platform_config.extension.params,
      network:
        if ext_meta.has_network then
          { vcn: pe.platform_config.network.vcn, subnets: resolved_subnets }
        else null,
      naming: inputs.naming,
      topology: pe.scope,
      scope_config:
        if std.objectHas(pe, 'scope_config') then pe.scope_config
        else {},
      routing: routing,
    },

  resolve(inputs)::
    local extension_registry = inputs.extension_registry;
    local extension_entries = inputs.extension_entries;
    local component_defaults = { infrastructure: true, database: true };
    local has_network(entry) =
      std.objectHas(entry.platform_config, 'network') && entry.platform_config.network != null;
    local has_project_db(entry) =
      local cfg = entry.platform_config.extension.params;
      std.objectHas(cfg, 'project_db_compartments') && cfg.project_db_compartments != null;
    local has_shared_extension_type(ext_type) =
      std.length([
        entry
        for entry in extension_entries
        if entry.platform_config.extension.type == ext_type && entry.scope.scope_type == 'shared'
      ]) > 0;
    local entry_components(entry) =
      local ext_type = entry.platform_config.extension.type;
      local project_db_only =
        ext_type == 'exacs' && has_project_db(entry) && !has_network(entry);
      local inferred =
        if ext_type != 'exacs' then component_defaults
        else {
          infrastructure:
            entry.scope.scope_type == 'shared' ||
            !has_shared_extension_type(ext_type) ||
            project_db_only,
          database: has_network(entry) || project_db_only,
        };
      inferred;
    local extension_types = collections.unique([
      entry.platform_config.extension.type
      for entry in extension_entries
    ]);
    local extension_has_networks = {
      [ext_type]: std.length([
        entry
        for entry in extension_entries
        if entry.platform_config.extension.type == ext_type && has_network(entry)
      ]) > 0
      for ext_type in extension_types
    };
    local extension_components = {
      [ext_type]: {
        infrastructure: std.length([
          entry
          for entry in extension_entries
          if entry.platform_config.extension.type == ext_type && entry_components(entry).infrastructure
        ]) > 0,
        database: std.length([
          entry
          for entry in extension_entries
          if entry.platform_config.extension.type == ext_type && entry_components(entry).database
        ]) > 0,
      }
      for ext_type in extension_types
    };
    local results = std.map(
      function(entry)
        local entry_with_summary = entry {
          scope_config+: {
            extension_components: extension_components,
            extension_entry_components: entry_components(entry),
            extension_has_networks: extension_has_networks,
          },
        };
        local resolved = self.resolve_entry(inputs { platform_entry: entry_with_summary });
        local ext_contributions = validation.returned_object(
          resolved.definition.render(resolved.render_params),
          'Extension "%s" render(params)' % resolved.type
        );
        assert !resolved.metadata.has_network || std.objectHas(ext_contributions, 'network_pre') :
               'Extension "%s" is missing required contribution "network_pre"' % resolved.type;
        {
          type: resolved.type,
          metadata: resolved.metadata,
          contributions: ext_contributions,
        },
      extension_entries
    );
    {
      results: results,
    }
    + {
      [key]: merge_contribution(results, key)
      for key in standard_contribution_keys
    }
    + {
      extra: merge_extra_contributions(results),
    },
}
