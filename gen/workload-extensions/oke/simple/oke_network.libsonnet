// OKE network output builder.

function(ctx, overlay_output=false) {
  local n = ctx.n,
  local resources = import './oke_network_resources.libsonnet',

  network_configuration+: {
    network_configuration_categories+: {
      [ctx.category_key]: {
        category_compartment_id: ctx.scope.network_compartment_key,

        vcns: {
          [ctx.vcn_key]: {
            display_name: n.display('vcn', ctx.display_segments),
            cidr_blocks: [ctx.params.network.vcn],
            dns_label: n.dns_label(['vcn', n.region, 'lz', ctx.dns, ctx.dns + ctx.plat]),
            block_nat_traffic: false,
            default_security_list: {
              egress_rules: [],
              ingress_rules: [],
            },
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,

            subnets: resources.subnets(ctx),
            route_tables: resources.route_tables(ctx, overlay_output),
            security_lists: resources.security_lists(ctx),
            network_security_groups: resources.network_security_groups(ctx),
            vcn_specific_gateways: resources.vcn_specific_gateways(ctx, overlay_output),
          },
        },
      },
    },
  },
}
