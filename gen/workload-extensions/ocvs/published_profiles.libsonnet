local address_plan = import '../../data/network-address-plan.json';
{
  prod_hub_e: {
    config: {
      hub: { kind: 'hub_e', network: { vcn: address_plan.foundation.hub_vcn } },
      environments: {
        prod: {
          platforms: {
            ocvs: {
              network: { vcn: address_plan.platforms.ocvs.prod },
              extension: {
                type: 'ocvs',
                params: {
                  ssh_authorized_keys: 'ssh-rsa REPLACE_WITH_CUSTOMER_PUBLIC_KEY',
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
    },
  },
}
