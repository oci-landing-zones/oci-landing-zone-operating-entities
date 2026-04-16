local platforms = import 'platforms.libsonnet';

{
  resolve(cfg_lib, extension_registry, extension_entries, n, hub_vcn_cidr, routed_vcn_entries)::
    local results =
      if std.length(extension_entries) > 0 then
        [
          local pe = extension_entries[i];
          local ext_type = pe.platform_config.extension.type;
          assert std.objectHas(extension_registry, ext_type) :
                 'Unknown extension type "%s" for platform %s/%s. Available: %s' % [
            ext_type,
            pe.scope.scope_name,
            pe.scope.platform_name,
            std.join(', ', std.objectFields(extension_registry)),
          ];
          local ext_def = extension_registry[ext_type];
          assert std.objectHasAll(ext_def, 'metadata') :
                 'Extension "%s" must define metadata(params)' % ext_type;
          assert std.objectHasAll(ext_def, 'render') :
                 'Extension "%s" must define render(params)' % ext_type;
          local ext_meta = ext_def.metadata({
            config_params: pe.platform_config.extension.params,
            naming: n,
            topology: pe.scope,
          });
          local subnet_names =
            if std.objectHas(ext_meta, 'subnet_order') then ext_meta.subnet_order
            else std.objectFields(ext_meta.default_subnets);
          assert std.all([
            std.objectHas(ext_meta.default_subnets, sn)
            for sn in subnet_names
          ]) : 'Extension "%s" subnet_order contains names not in default_subnets: %s' % [
            ext_type,
            std.join(', ', [sn for sn in subnet_names if !std.objectHas(ext_meta.default_subnets, sn)]),
          ];
          local resolved_subnets =
            if pe.platform_config.network.subnets != null then pe.platform_config.network.subnets
            else cfg_lib.auto_subnets(
              pe.platform_config.network.vcn,
              [
                { name: sn_name, size: ext_meta.default_subnets[sn_name] }
                for sn_name in subnet_names
              ]
            );
          local routing = platforms.build_extension_route_targets(pe, routed_vcn_entries, n, hub_vcn_cidr);
          local ext_contributions = ext_def.render({
            config_params: pe.platform_config.extension.params,
            network: { vcn: pe.platform_config.network.vcn, subnets: resolved_subnets },
            naming: n,
            topology: pe.scope,
            routing: routing,
          });
          {
            type: ext_type,
            metadata: ext_meta,
            contributions: ext_contributions,
          }
          for i in std.range(0, std.length(extension_entries) - 1)
        ]
      else [];
    local standard_key_specs = [
      { key: 'network_pre', required: true },
      { key: 'iam', required: false },
      { key: 'security_cis1', required: false },
      { key: 'security_cis2', required: false },
    ];
    local standard_keys = [spec.key for spec in standard_key_specs];
    local merge_standard_contribution(spec) =
      std.foldl(
        function(acc, ext)
          if std.objectHas(ext.contributions, spec.key) then
            acc + ext.contributions[spec.key]
          else
            assert !spec.required :
                   'Extension "%s" is missing required contribution "%s"' % [ext.type, spec.key];
            acc,
        results,
        {}
      );
    local standard_contributions =
      {
        [spec.key]: merge_standard_contribution(spec)
        for spec in standard_key_specs
      };
    {
      results: results,
    }
    + standard_contributions
    + {
      extra: std.foldl(
        function(acc, ext)
          local extra_keys = [
            k
            for k in std.objectFields(ext.contributions)
            if !std.member(standard_keys, k)
          ];
          std.foldl(
            function(a, k)
              if std.objectHas(a, k) then a { [k]+: ext.contributions[k] }
              else a { [k]: ext.contributions[k] },
            extra_keys,
            acc
          ),
        results,
        {}
      ),
    },
}
