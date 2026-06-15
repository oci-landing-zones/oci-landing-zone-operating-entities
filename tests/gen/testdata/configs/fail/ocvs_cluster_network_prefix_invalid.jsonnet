// OCVS platform VCN must match OCI OCVS supported cluster network CIDR sizes
// error_contains: ocvs platform network.vcn prefix must be one of /21, /22, /23, /24
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        ocvs: {
          network: { vcn: '10.0.80.0/20' },
          extension: {
            type: 'ocvs_simple',
            params: {
              ssh_authorized_keys: 'ssh-rsa AAAAocvsfixture',
              cluster: {
                service_label: 'prod-ocvs',
                sddc_display_name: 'prod-ocvs',
                vmware_software_version: '7.0 update 3',
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
