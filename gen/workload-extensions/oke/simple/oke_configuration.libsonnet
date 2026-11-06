// One CIS OKE 0.3.0 deployment per generated cluster identity.
local public_lb = import './oke_public_load_balancer.libsonnet';

function(ctx) {
  oke_configuration+: {
    [ctx.cluster_key]: {
      cluster_configuration: {
        name: ctx.cluster_name,
        cis_level: '%d' % ctx.cis_level,
        compartment_id: ctx.cmp_key,
        cluster_type: 'enhanced',
        cni_type: ctx.cluster_cni_type,
        kubernetes_version: ctx.params.config_params.kubernetes_version,
        networking: {
          vcn_id: ctx.vcn_key,
          api_endpoint_subnet_id: ctx.sn_cp_key,
          api_endpoint_nsg_ids: [ctx.nsg_cp_key],
          service_lb_subnet_ids: [ctx.sn_lb_key],
        },
        options: {
          kubernetes_network_config: { services_cidr: ctx.services_cidr } +
            ctx.optional_cluster_kubernetes_network_config,
          service_lb_config: {
            defined_tags: { [public_lb.platform_tag]: ctx.platform_tag_value },
          },
        },
      } + (if ctx.cis_level == 2 then {
        encryption: { kube_secret_kms_key_id: ctx.kube_secret_key },
      } else {}),
      workers_configuration: {
        worker_pools: {
          [ctx.node_pool_key]: {
            name: ctx.node_pool_name,
            mode: 'node-pool',
            size: 1,
            shape: 'VM.Standard.E5.Flex',
            ocpus: 1,
            memory: 8,
            boot_volume_size: ctx.worker_boot_volume_size,
            node_cycling_enabled: false,
            freeform_tags: { cluster: ctx.cluster_name },
            node_freeform_tags: { cluster: ctx.cluster_name },
            subnet_id: ctx.sn_workers_key,
            nsg_ids: [ctx.nsg_workers_key],
            pv_transit_encryption: ctx.cis_level == 2,
          } + (if std.startsWith(ctx.worker_image, 'ocid1.image.') then {
            image_id: ctx.worker_image,
          } else {
            os: 'Oracle Linux',
            os_version: ctx.worker_image,
          }) + (if ctx.is_overlay_network then {} else {
            pod_subnet_id: ctx.sn_pods_key,
            pod_nsg_ids: [ctx.nsg_pods_key],
          }) + (if ctx.cis_level == 2 then {
            volume_kms_key_id: ctx.kube_secret_key,
            // Upstream handles filesystem growth and OKE bootstrap at both CIS levels.
            cloud_init: [{
              content_type: 'text/cloud-config',
              filename: '60-lz-fss-utils.yml',
              content: '#cloud-config\nruncmd:\n' +
                "  - /bin/sh -c '. /etc/os-release && dnf install -y --enablerepo=ol${VERSION_ID%%.*}_developer oci-fss-utils'\n",
            }],
          } else {}),
        },
      },
    },
  },
}
