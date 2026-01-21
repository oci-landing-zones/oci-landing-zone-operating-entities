{
  network_configuration+: {

    network_configuration_categories+: {
      oke: {
        category_compartment_id: 'CMP-LZ-PROD-NETWORK-KEY',

        vcns: {
          'VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY': {
            display_name: 'vcn-fra-lz-prod-platform-oke',
            cidr_blocks: ['10.0.80.0/21'],
            dns_label: 'vcnfralzppoke',
            block_nat_traffic: false,
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,

            subnets: {
              'SN-FRA-LZ-PROD-OKE-CP-KEY': {
                display_name: 'sn-fra-lz-prod-platform-oke-cp',
                dns_label: 'snpplatokecp',
                cidr_block: '10.0.80.128/25',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-PROD-OKE-CP-KEY',
                security_list_keys: ['SL-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY'],
              },

              'SN-FRA-LZ-PROD-OKE-INT-LB-KEY': {
                display_name: 'sn-fra-lz-prod-platform-oke-lb',
                dns_label: 'snpplatmokelb',
                cidr_block: '10.0.80.0/25',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-PROD-OKE-INT-LB-KEY',
                security_list_keys: ['SL-FRA-LZ-PROD-PLATFORM-OKE-INT-LB-KEY'],
              },

              'SN-FRA-LZ-PROD-OKE-PODS-KEY': {
                display_name: 'sn-fra-lz-prod-platform-oke-pods',
                dns_label: 'snpplatokepods',
                cidr_block: '10.0.84.0/23',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-PROD-OKE-PODS-KEY',
                security_list_keys: ['SL-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY'],
              },

              'SN-FRA-LZ-PROD-OKE-WORKERS-KEY': {
                display_name: 'sn-fra-lz-prod-platform-oke-workers',
                dns_label: 'snpplatokework',
                cidr_block: '10.0.82.0/23',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-PROD-OKE-WORKERS-KEY',
                security_list_keys: ['SL-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY'],
              },
            },

            route_tables: {
              'RT-FRA-LZ-PROD-OKE-CP-KEY': {
                display_name: 'rt-fra-lz-prod-oke-cp',

                route_rules: {
                  sgw_route: {
                    description: 'Route for OCI services',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                },
              },

              'RT-FRA-LZ-PROD-OKE-INT-LB-KEY': {
                display_name: 'rt-fra-lz-prod-oke-int-lb',

                route_rules: {
                  sgw_route: {
                    description: 'Route for OCI services',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                },
              },

              'RT-FRA-LZ-PROD-OKE-PODS-KEY': {
                display_name: 'rt-fra-lz-prod-oke-pods',

                route_rules: {
                  sgw_route: {
                    description: 'Route for OCI services',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                },
              },

              'RT-FRA-LZ-PROD-OKE-WORKERS-KEY': {
                display_name: 'rt-fra-lz-prod-oke-workers',

                route_rules: {
                  sgw_route: {
                    description: 'Route for OCI services',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                },
              },
            },

            security_lists: {
              'SL-FRA-LZ-PROD-PLATFORM-OKE-INT-LB-KEY': {
                display_name: 'sl-fra-lz-prod-platform-oke-int-lb',
                egress_rules: [],
                ingress_rules: [],
              },

              'SL-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY': {
                display_name: 'sl-fra-lz-prod-platform-oke-cp',
                defined_tags: null,
                freeform_tags: null,

                egress_rules: [
                  {
                    description: 'ICMP type 3 code 4 for: All',
                    protocol: 'ICMP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                ],

                ingress_rules: [
                  {
                    description: 'ICMP type 3 code 4 for: All',
                    protocol: 'ICMP',
                    icmp_code: 4,
                    icmp_type: 3,
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                ],
              },

              'SL-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY': {
                display_name: 'sl-fra-lz-prod-platform-oke-pods',

                egress_rules: [
                  {
                    description: 'ICMP type 3 code 4 for: All',
                    protocol: 'ICMP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                ],

                ingress_rules: [
                  {
                    description: 'ICMP type 3 code 4 for: All',
                    protocol: 'ICMP',
                    icmp_code: 4,
                    icmp_type: 3,
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                ],
              },

              'SL-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY': {
                display_name: 'sl-fra-lz-prod-platform-oke-workers',

                egress_rules: [
                  {
                    description: 'ICMP type 3 code 4 for: All',
                    protocol: 'ICMP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                ],

                ingress_rules: [
                  {
                    description: 'ICMP type 3 code 4 for: All',
                    protocol: 'ICMP',
                    icmp_code: 4,
                    icmp_type: 3,
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                ],
              },
            },

            network_security_groups: {
              'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY': {
                display_name: 'nsg-fra-lz-prod-platform-oke-cp',

                egress_rules: {
                  nsg_cp_6443: {
                    description: 'Allow TCP egress for Kubernetes control plane inter-communication',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
                    dst_port_max: '6443',
                    dst_port_min: '6443',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_pods: {
                    description: 'Allow TCP egress from OKE control plane to pods',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_service: {
                    description: 'Allow TCP egress from OKE control plane to OCI services',
                    protocol: 'TCP',
                    dst: 'all-services',
                    dst_type: 'SERVICE_CIDR_BLOCK',
                    stateless: false,
                  },

                  nsg_workers_10250: {
                    description: 'Allow TCP egress for path discovery to worker nodes',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    dst_port_max: '10250',
                    dst_port_min: '10250',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers_12250: {
                    description: 'Allow TCP egress for path discovery to worker nodes',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    dst_port_max: '12250',
                    dst_port_min: '12250',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers_icmp: {
                    description: 'Allow ICMP egress from OKE control plane to worker nodes',
                    protocol: 'ICMP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    icmp_code: '4',
                    icmp_type: '3',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp_6443: {
                    description: 'Allow ALL ingress to workers from other workers',
                    protocol: 'TCP',
                    dst_port_max: '6443',
                    dst_port_min: '6443',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_icmp: {
                    description: 'Allow TCP ingress to kube-apiserver from 0.0.0.0/0',
                    protocol: 'TCP',
                    dst_port_max: '6443',
                    dst_port_min: '6443',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },

                  nsg_pods_12250: {
                    description: 'Allow TCP ingress from pods to kube-apiserver',
                    protocol: 'TCP',
                    dst_port_max: '12250',
                    dst_port_min: '12250',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_pods_6443: {
                    description: 'Allow ALL ingress to workers from other workers',
                    protocol: 'TCP',
                    dst_port_max: '6443',
                    dst_port_min: '6443',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers_12250: {
                    description: 'Allow ALL ingress to workers from other workers',
                    protocol: 'TCP',
                    dst_port_max: '12250',
                    dst_port_min: '12250',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers_6443: {
                    description: 'Allow ALL ingress to workers from other workers',
                    protocol: 'TCP',
                    dst_port_max: '6443',
                    dst_port_min: '6443',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers_icmp: {
                    description: 'Allow ICMP ingress for path discovery from worker nodes',
                    protocol: 'ICMP',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    icmp_code: '4',
                    icmp_type: '3',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },

              'NSG-FRA-LZ-PROD-PLATFORM-OKE-LB-KEY': {
                display_name: 'nsg-fra-lz-prod-platform-oke-lb',
                ingress_rules: {},

                egress_rules: {
                  nsg_workers: {
                    description: 'Allow TCP egress from public load balancers to workers nodes for NodePort traffic',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    dst_port_max: '32767',
                    dst_port_min: '30000',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers_30000_32767: {
                    description: 'Allow TCP egress from public load balancers to worker nodes for health checks',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    dst_port_max: '10256',
                    dst_port_min: '10256',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers_ICMP: {
                    description: 'Allow ICMP egress from public load balancers to worker nodes for path discovery',
                    protocol: 'ICMP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    icmp_code: '4',
                    icmp_type: '3',
                    stateless: false,
                  },
                },
              },

              'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY': {
                display_name: 'nsg-fra-lz-prod-platform-oke-pods',

                egress_rules: {
                  anywhere: {
                    description: 'Allow ALL egress from pods to internet',
                    protocol: 'TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    stateless: false,
                  },

                  nsg_cp_6443: {
                    description: 'Allow TCP egress from pods to Kubernetes API server',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
                    dst_port_max: '6443',
                    dst_port_min: '6443',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_icmp: {
                    description: 'Allow ICMP egress from pods for path discovery',
                    protocol: 'ICMP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    icmp_code: '4',
                    icmp_type: '3',
                    stateless: false,
                  },

                  nsg_pods: {
                    description: 'Allow ALL egress from pods to other pods',
                    protocol: 'ALL',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_service: {
                    description: 'Allow TCP egress from pods to OCI Services',
                    protocol: 'TCP',
                    dst: 'all-services',
                    dst_type: 'SERVICE_CIDR_BLOCK',
                    stateless: false,
                  },

                  nsg_workers: {
                    description: 'Allow ALL egress from pods for cross-node pod communication when using NodePorts or hostNetwork: true',
                    protocol: 'ALL',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp: {
                    description: 'Allow ALL ingress to pods from Kubernetes control plane for webhooks served by pods',
                    protocol: 'ALL',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_icmp: {
                    description: 'Allow ICMP ingress to pods for path discovery',
                    protocol: 'ICMP',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    icmp_code: '4',
                    icmp_type: '3',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },

                  nsg_pods: {
                    description: 'Allow ALL ingress to pods from other pods',
                    protocol: 'ALL',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers: {
                    description: 'Allow ALL ingress to pods for cross-node pod communication when using NodePorts or hostNetwork: true',
                    protocol: 'ALL',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },

              'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY': {
                display_name: 'nsg-fra-lz-prod-platform-oke-workers',

                egress_rules: {
                  anywhere: {
                    description: 'Allow ALL egress from workers to internet',
                    protocol: 'ALL',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    stateless: false,
                  },

                  nsg_cp_10250: {
                    description: 'Allow TCP egress from workers to OKE control plane',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
                    dst_port_max: '10250',
                    dst_port_min: '10250',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_cp_12250: {
                    description: 'Allow TCP ingress to workers for health check from OKE control plane',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
                    dst_port_max: '12250',
                    dst_port_min: '12250',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_cp_6443: {
                    description: 'Allow TCP egress from workers to Kubernetes API server',
                    protocol: 'TCP',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
                    dst_port_max: '6443',
                    dst_port_min: '6443',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_icmp: {
                    description: 'Allow ICMP egress from workers for path discovery',
                    protocol: 'ICMP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    icmp_code: '4',
                    icmp_type: '3',
                    stateless: false,
                  },

                  nsg_pods: {
                    description: 'Allow ALL egress from workers to other pods',
                    protocol: 'ALL',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_service: {
                    description: 'Allow TCP egress from workers to OCI Services',
                    protocol: 'TCP',
                    dst: 'all-services',
                    dst_type: 'SERVICE_CIDR_BLOCK',
                    stateless: false,
                  },

                  nsg_workers: {
                    description: 'Allow ALL egress from workers for cross-node pod communication when using NodePorts or hostNetwork: true',
                    protocol: 'ALL',
                    dst: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp: {
                    description: 'Allow ALL ingress to workers from Kubernetes control plane for webhooks served by workers',
                    protocol: 'ALL',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_cp_10256: {
                    description: 'Allow TCP ingress to workers for a health check from OKE control plane',
                    protocol: 'TCP',
                    dst_port_max: '10256',
                    dst_port_min: '10256',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-LB-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_icmp: {
                    description: 'Allow ICMP ingress to pods for path discovery',
                    protocol: 'ICMP',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    icmp_code: '4',
                    icmp_type: '3',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },

                  nsg_pods: {
                    description: 'Allow ALL ingress to workers from other pods',
                    protocol: 'ALL',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_pub_lb_30000_30000: {
                    description: 'Allow TCP ingress to workers from public load balancers',
                    protocol: 'TCP',
                    dst_port_max: '32767',
                    dst_port_min: '30000',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-LB-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },

                  nsg_workers: {
                    description: 'Allow ALL ingress to workers from other workers',
                    protocol: 'ALL',
                    dst_port_max: '80',
                    dst_port_min: '80',
                    src: 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },
            },

            vcn_specific_gateways: {
              service_gateways: {
                'SGW-FRA-LZ-PROD-PLATFORM-OKE-KEY': {
                  display_name: 'sgw-fra-lz-prod-platform-oke',
                  services: 'all-services',
                },
              },
            },
          },
        },

    
      },
    },
  },
}
