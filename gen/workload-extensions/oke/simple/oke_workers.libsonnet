// OKE worker node pool output builder.

function(ctx) {
  oke_workers_configuration+: {
    default_compartment_id: ctx.cmp_key,

    node_pools+: {
      [ctx.node_pool_key]: {
        name: ctx.node_pool_name,
        cluster_id: ctx.cluster_key,
        enable_cycling: false,
        size: 1,
        cloud_init: [
          {
            content: 'runcmd:\n  - sudo /usr/libexec/oci-growfs -y\n',
            content_type: 'text/cloud-config',
          },
        ],
        freeform_tags: {
          cluster: ctx.cluster_name,
        },
        networking: {
          pods_nsg_ids: [ctx.nsg_pods_key],
          pods_subnet_id: ctx.sn_pods_key,
          workers_nsg_ids: [ctx.nsg_workers_key],
          workers_subnet_id: ctx.sn_workers_key,
        },
        node_config_details: {
          image: ctx.worker_image,
          node_shape: 'VM.Standard.E5.Flex',

          flex_shape_settings: {
            memory: 8,
            ocpus: 1,
          },
        },
      },
    },
  },
}
