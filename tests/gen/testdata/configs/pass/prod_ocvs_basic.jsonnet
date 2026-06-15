// prod OCVS platform emits network, IAM, and direct OCVS workload configuration
// contains: ocvs.json
// contains: ocvs_configuration
// contains: VCN-FRA-LZ-PROD-PLATFORM-OCVS-KEY
// contains: RT-FRA-LZ-PROD-PLATFORM-OCVS-NSX-EDGE-UPLINK-1-KEY
// contains: NSG-FRA-LZ-PROD-PLATFORM-OCVS-NSX-EDGE-UPLINK-1-KEY
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
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
                cluster_display_name: 'prod-ocvs-cluster',
                vmware_software_version: '7.0 update 3',
                is_hcx_enabled: false,
                compute_availability_domain: '1',
                esxi_hosts_count: 3,
                vsphere_type: 'MANAGEMENT',
                initial_host_ocpu_count: 52,
                initial_host_shape_name: 'BM.DenseIO2.52',
                workload_network_cidr: '172.16.0.0/24',
              },
            },
          },
        },
      },
    },
  },
}
