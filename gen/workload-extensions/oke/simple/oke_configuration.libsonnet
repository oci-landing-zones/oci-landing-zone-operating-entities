local peering = import './oke_peering.libsonnet';
// Native CIS OKE 0.3.0 contract: one cluster and optional pools per deployment.
local public_lb = import './oke_public_load_balancer.libsonnet';
function(ctx) {
  oke_configuration+: {
    [ctx.cluster_key]: {
      cluster_configuration: {
        name: ctx.cluster_name,
        cis_level: '%d' % ctx.cis_level,
        compartment_id: ctx.cmp_key,
        cluster_type: 'enhanced',
        cni_type: if ctx.is_overlay_network then 'flannel' else 'native',
        kubernetes_version: ctx.params.config_params.kubernetes_version,
        networking: {
          vcn_id: ctx.vcn_key,
          api_endpoint_subnet_id: ctx.sn_cp_key,
          api_endpoint_nsg_ids: [ctx.nsg_cp_key],
          service_lb_subnet_ids: [ctx.sn_lb_key],
        },
        options: {
          kubernetes_network_config: { services_cidr: ctx.services_cidr } +
            (if ctx.is_overlay_network then ctx.optional_cluster_kubernetes_network_config else {}),
          service_lb_config: { defined_tags: { [public_lb.platform_tag]: ctx.platform_tag_value } },
        },
      } + (if ctx.cis_level == 2 then { encryption: { kube_secret_kms_key_id: ctx.kube_secret_key } } else {}),
    } + (if ctx.create_node_pools then {
      workers_configuration:
        assert std.member(['8\\.[0-9]+', '9\\.[0-9]+'], ctx.worker_image) :
          'OKE 0.3.0 worker_image must select Oracle Linux 8 or 9';
        {
          default_shape: 'VM.Standard.E5.Flex',
          default_size: 1,
          default_ocpus: 1,
          default_memory: 8,
          default_os: 'Oracle Linux',
          default_os_version: if ctx.worker_image == '8\\.[0-9]+' then '8' else '9',
          default_boot_volume_size: ctx.worker_boot_volume_size,
          default_subnet_id: ctx.sn_workers_key,
          default_nsg_ids: [ctx.nsg_workers_key] + peering.worker_ids(ctx),
          // Retain upstream bootstrap and IMDSv2 enforcement. Add only LZ setup.
          default_cloud_init: [{
            content_type: 'text/cloud-config',
            filename: '60-lz-worker-config.yml',
            content: '#cloud-config\nruncmd:\n  - /usr/libexec/oci-growfs -y\n' +
              (if ctx.cis_level == 2 then
                "  - /bin/sh -c '. /etc/os-release && dnf install -y --enablerepo=ol${VERSION_ID%%.*}_developer oci-fss-utils'\n"
              else ''),
          }],
          worker_pools: {
            [ctx.node_pool_key]: {
              name: ctx.node_pool_name,
              node_cycling_enabled: false,
              freeform_tags: { cluster: ctx.cluster_name },
              node_freeform_tags: { cluster: ctx.cluster_name },
            },
          },
        } + (if ctx.is_overlay_network then {} else {
          default_pod_subnet_id: ctx.sn_pods_key,
          default_pod_nsg_ids: [ctx.nsg_pods_key] + peering.pod_ids(ctx),
        }) + (if ctx.cis_level == 2 then {
          default_pv_transit_encryption: true,
          default_volume_kms_key_id: ctx.kube_secret_key,
        } else {}),
    } else {}),
  },
}
