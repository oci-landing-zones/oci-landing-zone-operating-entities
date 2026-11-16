// OKE extension-only rendering must derive spoke NAT creation from the selected hub.
// contains: "failures": []
local context = import 'gen/render_context.libsonnet';
local extensions = import 'gen/extensions.libsonnet';
local builder = import 'gen/workload-extensions/oke/simple/oke_builder.libsonnet';
local profiles = import 'gen/workload-extensions/oke/simple/published_profiles.libsonnet';
local check(kind) =
  local ctx = context.from_raw_config(profiles.cis1_config + {
    hub: { kind: kind, network: { vcn: '10.0.0.0/21' } },
  });
  local entry = ctx.env_platform_entry('prod', 'oke');
  local resolved = extensions.resolve_entry(ctx.extension_resolve_entry_inputs({ oke_simple: builder }, entry));
  local rendered = builder.render(resolved.render_params);
  local categories = rendered.contributions.network.network_configuration.network_configuration_categories;
  local vcns = categories['prod-platform-oke'].vcns;
  local vcn = vcns[std.objectFields(vcns)[0]];
  local nat = std.objectHas(vcn.vcn_specific_gateways, 'nat_gateways');
  local default_targets = [
    rule.network_entity_key
    for table in std.objectValues(vcn.route_tables)
    for rule in std.objectValues(table.route_rules)
    if rule.destination == '0.0.0.0/0'
  ];
  local expected_target = if kind == 'hub_e' then 'NGW-FRA-LZ-PROD-PLATFORM-OKE-KEY' else 'DRG-FRA-LZ-HUB-KEY';
  {
    kind: kind,
    correct: nat == (kind == 'hub_e') &&
      std.length(default_targets) > 0 &&
      std.length([target for target in default_targets if target != expected_target]) == 0 &&
      ctx.extension_routing_context().hub_has_spoke_natgw == (kind == 'hub_e') &&
      ctx.extension_resolve_inputs({ oke_simple: builder }, [entry]).hub_has_spoke_natgw == (kind == 'hub_e'),
  };
{
  failures: [result.kind for result in [check(kind) for kind in ['hub_a', 'hub_b', 'hub_c', 'hub_e']] if !result.correct],
}
