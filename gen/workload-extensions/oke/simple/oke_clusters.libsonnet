// OKE cluster output builder.

local public_lb = import './oke_public_load_balancer.libsonnet';

function(ctx) {
  oke_clusters_configuration+: {
    clusters+: {
      [ctx.cluster_key]: {
        name: ctx.cluster_name,
        cis_level: '%d' % ctx.cis_level,
        compartment_id: ctx.cmp_key,
        cni_type: ctx.cluster_cni_type,
      } + (if ctx.cis_level == 2 then {
        encryption: {
          kube_secret_kms_key_id: ctx.kube_secret_key,
        },
      } else {}) + {
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

          // These are initial tags for LBs and NLBs created later by Kubernetes
          // Services of type LoadBalancer. Existing-resource IAM compares this
          // value with the requesting cluster's platform tag. Tag-override
          // annotations must not replace it.
          service_lb_config: {
            defined_tags: {
              [public_lb.platform_tag]: ctx.platform_tag_value,
            },
          },
        },
      },
    },
  },
}
