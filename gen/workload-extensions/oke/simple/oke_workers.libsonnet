// OKE worker node pool output builder.

function(ctx)
  local fss_utils_install =
    if ctx.cis_level == 2 then
      "/bin/sh -c '. /etc/os-release && sudo dnf install -y --enablerepo=ol${VERSION_ID%%.*}_developer oci-fss-utils'\n\n"
    else '';
  local cloud_init =
    '#!/bin/bash\n\n' +
    'sudo /usr/libexec/oci-growfs -y\n\n' +
    fss_utils_install +
    'curl --fail -H "Authorization: Bearer Oracle" -L0 ' +
    'http://169.254.169.254/opc/v2/instance/metadata/oke_init_script ' +
    '| base64 --decode >/var/run/oke-init.sh\n' +
    'bash /var/run/oke-init.sh\n';
{
  oke_workers_configuration+: {
    node_pools+: {
      [ctx.node_pool_key]: {
        name: ctx.node_pool_name,
        cis_level: '%d' % ctx.cis_level,
        compartment_id: ctx.cmp_key,
        cluster_id: ctx.cluster_key,
        enable_cycling: false,
        size: 1,
        freeform_tags: {
          cluster: ctx.cluster_name,
        },
        networking: (if ctx.is_overlay_network then {} else {
          pods_nsg_ids: [ctx.nsg_pods_key],
          pods_subnet_id: ctx.sn_pods_key,
        }) + {
          workers_nsg_ids: [ctx.nsg_workers_key],
          workers_subnet_id: ctx.sn_workers_key,
        },
        node_config_details: {
          image: ctx.worker_image,
          boot_volume_size: ctx.worker_boot_volume_size,
          cloud_init: {
            heredoc_script: cloud_init,
          },
          node_shape: 'VM.Standard.E5.Flex',
          flex_shape_settings: {
            memory: 8,
            ocpus: 1,
          },
        } + (if ctx.cis_level == 2 then {
          encryption: {
            enable_encrypt_in_transit: true,
            kms_key_id: ctx.kube_secret_key,
          },
        } else {}),
      },
    },
  },
}
