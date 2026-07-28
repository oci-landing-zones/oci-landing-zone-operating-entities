// Multi-OE OCVS also explains how to override an overlong fully qualified default cluster name.
// error_contains: Multi-OE default OCVS cluster display name exceeds 22 characters; set config_params.cluster.cluster_display_name explicitly
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      dns: 'al',
      environments: {
        prod: {
          platforms: {
            ocvs: {
              network: { vcn: '10.2.24.0/21' },
              extension: {
                type: 'ocvs',
                params: {
                  ssh_authorized_keys: 'ssh-rsa AAAAmultioeocvs',
                  cluster: {
                    service_label: 'alpha-ocvs',
                    sddc_display_name: 'sddc-al-p',
                    vmware_software_version: '7.0 update 3',
                    is_hcx_enabled: false,
                    compute_availability_domain: '1',
                    esxi_hosts_count: 3,
                    vsphere_type: 'MANAGEMENT',
                    initial_host_ocpu_count: 52,
                    initial_host_shape_name: 'BM.DenseIO2.52',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
