// OKE cluster output builder.

function(ctx) {
  oke_clusters_configuration+: {
    default_compartment_id: ctx.cmp_key,

    clusters+: {
      [ctx.cluster_key]: {
        name: ctx.cluster_name,
        compartment_id: ctx.cmp_key,
        cni_type: ctx.cluster_cni_type,
        is_enhanced: true,
        kubernetes_version: ctx.params.config_params.kubernetes_version,
        networking: {
          api_endpoint_nsg_ids: [ctx.nsg_cp_key],
          api_endpoint_subnet_id: ctx.sn_cp_key,
          assign_public_ip_to_control_plane: false,
          is_api_endpoint_public: false,
          services_subnet_id: [ctx.sn_lb_key],
          vcn_id: ctx.vcn_key,
        },
        options: {
          add_ons: {
            dashboard_enabled: false,
            tiller_enabled: false,
          },

          kubernetes_network_config:
            {
              services_cidr: ctx.services_cidr,
            } + ctx.optional_cluster_kubernetes_network_config,
        },
      },
    },
  },
}
