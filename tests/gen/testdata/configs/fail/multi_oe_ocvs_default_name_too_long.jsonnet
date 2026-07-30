// Multi-OE OCVS fails clearly when its fully qualified default SDDC name exceeds the OCI limit.
// error_contains: Multi-OE default OCVS SDDC display name exceeds 16 characters; set config_params.cluster.sddc_display_name explicitly
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
