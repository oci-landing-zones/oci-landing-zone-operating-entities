// Helpers for publication-only network projections.
//
// These helpers reshape generic platform VCN categories for committed
// multi-stack publication artifacts. They are not part of the generic platform
// rendering contract.
{
  category_key(scope):: '%s-platform-%s' % [
    std.asciiLower(scope.qualified_name),
    std.asciiLower(scope.platform_name),
  ],

  strip_local_routes(vcn, n, route_keys_to_drop=[], strip_nat_gateways=true)::
    local route_drop_keys = [n.route_rule([n.region, 'default'])] + route_keys_to_drop;
    vcn {
      route_tables: {
        [rt_key]: vcn.route_tables[rt_key] {
          route_rules: {
            [route_key]: vcn.route_tables[rt_key].route_rules[route_key]
            for route_key in std.objectFields(vcn.route_tables[rt_key].route_rules)
            if !std.member(route_drop_keys, route_key)
          },
        }
        for rt_key in std.objectFields(vcn.route_tables)
      },
      vcn_specific_gateways:
        if strip_nat_gateways && std.objectHas(vcn.vcn_specific_gateways, 'nat_gateways') then
          {
            [gateway_type]: vcn.vcn_specific_gateways[gateway_type]
            for gateway_type in std.objectFields(vcn.vcn_specific_gateways)
            if gateway_type != 'nat_gateways'
          }
        else vcn.vcn_specific_gateways,
    },

  network_category(category, n, route_keys_to_drop=[], strip_nat_gateways=true)::
    category {
      vcns: {
        [key]: $.strip_local_routes(
          category.vcns[key],
          n,
          route_keys_to_drop,
          strip_nat_gateways
        )
        for key in std.objectFields(category.vcns)
      },
    },
}
