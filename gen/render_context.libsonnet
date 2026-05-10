// gen/render_context.libsonnet — Shared normalized render-time context helper.
//
// Purpose:
//   Centralize the one-time normalization and derived helper state needed by
//   render-time consumers. This keeps the main landing-zone orchestrator and
//   published add-on adapters from reimplementing config normalization,
//   topology ordering, platform collection, routed VCN derivation, and example
//   load-balancer backend calculation.
//
// Public contract:
//   from_raw_config(raw_config) -> {
//     config,
//     n,
//     topo,
//     realm_constants,
//     spoke_envs,
//     all_platform_entries,
//     extension_entries,
//     network_only_platforms,
//     all_vcn_entries,
//     lb_backends,
//     lb_env_name,
//     shared_only_config,
//     extension_entries_by_type(type),
//     require_extension_entries(type, label),
//     env_platform_entry(env_name, platform_name),
//     extension_routing_context(hub_has_spoke_natgw=true),
//     extension_resolve_inputs(registry, entries, hub_has_spoke_natgw=true),
//     extension_resolve_entry_inputs(registry, entry, hub_has_spoke_natgw=true),
//   }
//
// Key semantics:
//   - `config` is always normalized via `config.libsonnet`.
//   - `spoke_envs` follows topology ordering, not raw object-field order.
//   - `all_vcn_entries` carries the canonical routed VCN metadata used by
//     render-time consumers.
//   - `lb_backends` derives stable example backend IPs from the first spoke's
//     web subnet when available; otherwise it falls back to `0.0.0.0`
//     placeholders so hub-only publications can still render.
//   - `lb_env_name` follows that same first ordered workload spoke so example
//     hub LB names track the backend source.
//   - `shared_only_config` keeps the normalized shared services/root state but
//     removes environments for consumers that intentionally publish only
//     shared-only IAM/governance views.
//
// Scope guardrail:
//   This helper should expose reusable inputs. It should not assemble final
//   output documents or own profile-specific publication logic.
local cfg_lib = import 'config.libsonnet';
local constants = import 'constants.libsonnet';
local naming = import 'naming.libsonnet';
local platforms = import 'platforms.libsonnet';
local topology = import 'topology.libsonnet';
local common = import 'hub/hub_common.libsonnet';

{
  from_raw_config(raw_config)::
    local config = cfg_lib.normalize(raw_config);
    local n = naming(config.region_short_name);
    local topo = topology(config, n);
    local spoke_env_names = topo.ordered_spoke_env_names();
    local spoke_envs = [
      { name: name, env: config.environments[name] }
      for name in spoke_env_names
    ];
    local platform_state = platforms.collect_entries(config, topo);
    local all_platform_entries = platform_state.all_platform_entries;
    local routed_vcn_state =
      platforms.build_routed_vcn_entries(config, all_platform_entries, topo, n);
    local all_vcn_entries = routed_vcn_state.all_vcn_entries;
    {
      config: config,
      n: n,
      topo: topo,
      realm_constants: constants[config.realm],
      spoke_envs: spoke_envs,
      all_platform_entries: all_platform_entries,
      extension_entries: platform_state.extension_entries,
      network_only_platforms: platform_state.network_only_platforms,
      all_vcn_entries: all_vcn_entries,
      lb_env_name:
        if std.length(spoke_envs) > 0 then spoke_envs[0].name
        else 'prod',
      lb_backends:
        if std.length(spoke_envs) > 0 then
          local web_subnet = spoke_envs[0].env.shared_project_network.network.subnets.web;
          {
            backend1_ip: common.host_ip_from_subnet(web_subnet, 10),
            backend2_ip: common.host_ip_from_subnet(web_subnet, 20),
          }
        else {
          backend1_ip: '0.0.0.0',
          backend2_ip: '0.0.0.0',
        },
      shared_only_config: config { environments: {} },

      extension_entries_by_type(ext_type)::
        [
          entry
          for entry in self.extension_entries
          if entry.platform_config.extension.type == ext_type
        ],

      require_extension_entries(ext_type, label)::
        local entries = self.extension_entries_by_type(ext_type);
        assert std.length(entries) > 0 :
          '%s publication requires at least one %s platform' % [label, ext_type];
        entries,

      env_platform_entry(env_name, platform_name)::
        local matches = [
          entry
          for entry in self.all_platform_entries
          if entry.scope.scope_type == 'environment' &&
             entry.scope.scope_name == env_name &&
             entry.scope.platform_name == platform_name
        ];
        assert std.length(matches) == 1 :
          'Expected exactly one platform %s/%s, found %d' % [
            env_name,
            platform_name,
            std.length(matches),
          ];
        matches[0],

      extension_routing_context(hub_has_spoke_natgw=true):: {
        naming: n,
        hub_vcn_cidr: config.hub.network.vcn,
        routed_vcn_entries: all_vcn_entries,
        hub_has_spoke_natgw: hub_has_spoke_natgw,
      },

      extension_resolve_inputs(extension_registry, extension_entries, hub_has_spoke_natgw=true)::
        {
          extension_registry: extension_registry,
          extension_entries: extension_entries,
        } + self.extension_routing_context(hub_has_spoke_natgw),

      extension_resolve_entry_inputs(extension_registry, platform_entry, hub_has_spoke_natgw=true)::
        {
          extension_registry: extension_registry,
          platform_entry: platform_entry,
        } + self.extension_routing_context(hub_has_spoke_natgw),
    },
}
