// HCX is rejected until the NAT gateway and firewalled-hub behavior is explicitly validated
// error_contains: ocvs config_params.cluster.is_hcx_enabled true is not supported until the NAT gateway pattern is validated
{
  hub: { kind: 'hub_a', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        ocvs: {
          network: { vcn: '10.0.80.0/21' },
          extension: {
            type: 'ocvs_simple',
            params: {
              ssh_authorized_keys: 'ssh-rsa AAAAocvsfixture',
              cluster: {
                service_label: 'prod-ocvs',
                sddc_display_name: 'prod-ocvs',
                vmware_software_version: '7.0 update 3',
                is_hcx_enabled: true,
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
}
