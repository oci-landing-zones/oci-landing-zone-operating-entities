// OKE network output builder.

function(ctx, overlay_output=false) {
  local n = ctx.n,
  local root = self,

  network_configuration+: {
    network_configuration_categories+: {
      [ctx.category_key]: {
        category_compartment_id: ctx.scope.network_compartment_key,

        vcns: {
          [ctx.vcn_key]: {
            display_name: n.display('vcn', ctx.display_segments),
            cidr_blocks: [ctx.params.network.vcn],
            dns_label: n.dns_label(['vcn', n.region, 'lz', ctx.dns, ctx.dns + ctx.plat]),
            block_nat_traffic: false,
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,

            subnets: {
              [ctx.sn_cp_key]: {
                display_name: n.display('sn', ctx.display_segments + ['cp']),
                dns_label: n.dns_label(['sn', ctx.dns, 'plat', ctx.plat, 'cp']),
                cidr_block: ctx.subnets['control-plane'],
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: ctx.rt_cp_key,
                security_list_keys: [ctx.sl_cp_key],
              },

              [ctx.sn_lb_key]: {
                display_name: n.display('sn', ctx.display_segments + ['lb']),
                dns_label: n.dns_label(['sn', ctx.dns, 'plat', ctx.plat, 'lb']),
                cidr_block: ctx.subnets['int-lb'],
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: ctx.rt_lb_key,
                security_list_keys: [ctx.sl_lb_key],
              },

              [ctx.sn_pods_key]: {
                display_name: n.display('sn', ctx.display_segments + ['pods']),
                dns_label: n.dns_label(['sn', ctx.dns, 'plat', ctx.plat, 'pods']),
                cidr_block: ctx.subnets.pods,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: ctx.rt_pods_key,
                security_list_keys: [ctx.sl_pods_key],
              },

              [ctx.sn_workers_key]: {
                display_name: n.display('sn', ctx.display_segments + ['workers']),
                dns_label: n.dns_label(['sn', ctx.dns, 'plat', ctx.plat, 'work']),
                cidr_block: ctx.subnets.workers,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: ctx.rt_workers_key,
                security_list_keys: [ctx.sl_workers_key],
              },
            },

            route_tables: {
              [desc.key]: {
                display_name: n.display('rt', ctx.display_segments + [desc.suffix]),
                route_rules: root._route_rules,
              }
              for desc in [
                { key: ctx.rt_cp_key, suffix: 'cp' },
                { key: ctx.rt_lb_key, suffix: 'int-lb' },
                { key: ctx.rt_pods_key, suffix: 'pods' },
                { key: ctx.rt_workers_key, suffix: 'workers' },
              ]
            },

            security_lists: {
              [desc.key]:
                (
                  {
                    display_name: n.display('sl', ctx.display_segments + [desc.suffix]),
                    egress_rules: desc.egress,
                    ingress_rules: desc.ingress,
                  }
                  + (if std.objectHas(desc, 'extras') then desc.extras else {})
                )
              for desc in [
                {
                  key: ctx.sl_lb_key,
                  suffix: 'int-lb',
                  egress: [],
                  ingress: [],
                },
                {
                  key: ctx.sl_cp_key,
                  suffix: 'cp',
                  egress: [root._icmp_egress_rule],
                  ingress: [root._icmp_ingress_rule],
                  extras: { defined_tags: null, freeform_tags: null },
                },
                {
                  key: ctx.sl_pods_key,
                  suffix: 'pods',
                  egress: [root._icmp_egress_rule],
                  ingress: [root._icmp_ingress_rule],
                },
                {
                  key: ctx.sl_workers_key,
                  suffix: 'workers',
                  egress: [root._icmp_egress_rule],
                  ingress: [root._icmp_ingress_rule],
                },
              ]
            },

            network_security_groups: {
              [ctx.nsg_cp_key]: {
                display_name: n.display('nsg', ctx.display_segments + ['cp']),

                egress_rules: {
                  nsg_cp_6443: root._nsg_tcp_egress('Allow TCP egress for Kubernetes control plane inter-communication', ctx.nsg_cp_key, '6443'),
                  nsg_pods: {
                    description: 'Allow TCP egress from OKE control plane to pods',
                    protocol: 'TCP',
                    dst: ctx.nsg_pods_key,
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
                  nsg_workers_10250: root._nsg_tcp_egress('Allow TCP egress for path discovery to worker nodes', ctx.nsg_workers_key, '10250'),
                  nsg_workers_12250: root._nsg_tcp_egress('Allow TCP egress for path discovery to worker nodes', ctx.nsg_workers_key, '12250'),
                  nsg_workers_icmp: {
                    description: 'Allow ICMP egress from OKE control plane to worker nodes',
                    protocol: 'ICMP',
                    dst: ctx.nsg_workers_key,
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp_6443: root._nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from control plane on port 6443', ctx.nsg_cp_key, '6443'),
                } + ctx.api_endpoint_ingress_rules + {
                  nsg_pods_12250: root._nsg_tcp_ingress('Allow TCP ingress from pods to kube-apiserver on port 12250', ctx.nsg_pods_key, '12250'),
                  nsg_pods_6443: root._nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from pods on port 6443', ctx.nsg_pods_key, '6443'),
                  nsg_workers_12250: root._nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from workers on port 12250', ctx.nsg_workers_key, '12250'),
                  nsg_workers_6443: root._nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from workers on port 6443', ctx.nsg_workers_key, '6443'),
                  nsg_workers_icmp: {
                    description: 'Allow ICMP ingress for path discovery from worker nodes',
                    protocol: 'ICMP',
                    icmp_code: 4,
                    icmp_type: 3,
                    src: ctx.nsg_workers_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },

              [ctx.nsg_lb_key]: {
                display_name: n.display('nsg', ctx.display_segments + ['int-lb']),
                ingress_rules: {},

                egress_rules: {
                  nsg_workers: {
                    description: 'Allow TCP egress from load balancers to worker nodes for NodePort traffic',
                    protocol: 'TCP',
                    dst: ctx.nsg_workers_key,
                    dst_port_max: '32767',
                    dst_port_min: '30000',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_workers_10256: root._nsg_tcp_egress('Allow TCP egress from load balancers to worker nodes for health checks', ctx.nsg_workers_key, '10256'),
                  nsg_workers_icmp: {
                    description: 'Allow ICMP egress from load balancers to worker nodes for path discovery',
                    protocol: 'ICMP',
                    dst: ctx.nsg_workers_key,
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                },
              },

              [ctx.nsg_pods_key]: {
                display_name: n.display('nsg', ctx.display_segments + ['pods']),

                egress_rules: {
                  anywhere: {
                    description: 'Allow ALL egress from pods to internet',
                    protocol: 'TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  nsg_cp_6443: root._nsg_tcp_egress('Allow TCP egress from pods to Kubernetes API server', ctx.nsg_cp_key, '6443'),
                  nsg_icmp: {
                    description: 'Allow ICMP egress from pods for path discovery',
                    protocol: 'ICMP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                  nsg_pods: {
                    description: 'Allow ALL egress from pods to other pods',
                    protocol: 'ALL',
                    dst: ctx.nsg_pods_key,
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
                    dst: ctx.nsg_workers_key,
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp: {
                    description: 'Allow ALL ingress to pods from Kubernetes control plane for webhooks served by pods',
                    protocol: 'ALL',
                    src: ctx.nsg_cp_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_icmp: {
                    description: 'Allow ICMP ingress to pods for path discovery',
                    protocol: 'ICMP',
                    icmp_code: 4,
                    icmp_type: 3,
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  nsg_pods: {
                    description: 'Allow ALL ingress to pods from other pods',
                    protocol: 'ALL',
                    src: ctx.nsg_pods_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_workers: {
                    description: 'Allow ALL ingress to pods for cross-node pod communication when using NodePorts or hostNetwork: true',
                    protocol: 'ALL',
                    src: ctx.nsg_workers_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },

              [ctx.nsg_workers_key]: {
                display_name: n.display('nsg', ctx.display_segments + ['workers']),

                egress_rules: {
                  anywhere: {
                    description: 'Allow ALL egress from workers to internet',
                    protocol: 'ALL',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  nsg_cp_10250: root._nsg_tcp_egress('Allow TCP egress from workers to OKE control plane', ctx.nsg_cp_key, '10250'),
                  nsg_cp_12250: root._nsg_tcp_egress('Allow TCP egress from workers to OKE control plane on port 12250', ctx.nsg_cp_key, '12250'),
                  nsg_cp_6443: root._nsg_tcp_egress('Allow TCP egress from workers to Kubernetes API server', ctx.nsg_cp_key, '6443'),
                  nsg_icmp: {
                    description: 'Allow ICMP egress from workers for path discovery',
                    protocol: 'ICMP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                  nsg_pods: {
                    description: 'Allow ALL egress from workers to other pods',
                    protocol: 'ALL',
                    dst: ctx.nsg_pods_key,
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
                    dst: ctx.nsg_workers_key,
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp: {
                    description: 'Allow ALL ingress to workers from Kubernetes control plane for webhooks served by workers',
                    protocol: 'ALL',
                    src: ctx.nsg_cp_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_lb_10256: root._nsg_tcp_ingress('Allow TCP ingress to workers for health check from load balancer on port 10256', ctx.nsg_lb_key, '10256'),
                  nsg_icmp: {
                    description: 'Allow ICMP ingress to pods for path discovery',
                    protocol: 'ICMP',
                    icmp_code: 4,
                    icmp_type: 3,
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  nsg_pods: {
                    description: 'Allow ALL ingress to workers from other pods',
                    protocol: 'ALL',
                    src: ctx.nsg_pods_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_pub_lb_30000_30000: {
                    description: 'Allow TCP ingress to workers from load balancers',
                    protocol: 'TCP',
                    dst_port_max: '32767',
                    dst_port_min: '30000',
                    src: ctx.nsg_lb_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_workers: {
                    description: 'Allow ALL ingress to workers from other workers',
                    protocol: 'ALL',
                    src: ctx.nsg_workers_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },
            },

            vcn_specific_gateways:
              {
                service_gateways: {
                  [ctx.sgw_key]: {
                    display_name: n.display('sgw', ctx.display_segments),
                    services: 'all-services',
                  },
                },
              } + if ctx.has_hub && !overlay_output && ctx.use_local_natgw then {
                nat_gateways: {
                  [ctx.ngw_key]: {
                    display_name: n.display('ngw', ctx.display_segments),
                    block_traffic: false,
                  },
                },
              } else {},
          },
        },
      },
    },
  },

  _nsg_tcp_egress(description, dst_nsg_key, port):: {
    description: description,
    protocol: 'TCP',
    dst: dst_nsg_key,
    dst_port_max: port,
    dst_port_min: port,
    dst_type: 'NETWORK_SECURITY_GROUP',
    stateless: false,
  },

  _nsg_tcp_ingress(description, src_nsg_key, port):: {
    description: description,
    protocol: 'TCP',
    dst_port_max: port,
    dst_port_min: port,
    src: src_nsg_key,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: false,
  },

  _icmp_egress_rule:: {
    description: 'ICMP type 3 code 4 for: All',
    protocol: 'ICMP',
    dst: '0.0.0.0/0',
    dst_type: 'CIDR_BLOCK',
    icmp_code: 4,
    icmp_type: 3,
    stateless: false,
  },

  _icmp_ingress_rule:: {
    description: 'ICMP type 3 code 4 for: All',
    protocol: 'ICMP',
    icmp_code: 4,
    icmp_type: 3,
    src: '0.0.0.0/0',
    src_type: 'CIDR_BLOCK',
    stateless: false,
  },

  _route_rules::
    local peer_routes = if ctx.routing != null && std.objectHas(ctx.routing, 'peers') then ctx.routing.peers else {};
    local drg_route_rules =
      (if ctx.has_hub then {
         [ctx.routing.hub.route_key]: {
           description: ctx.routing.hub.description,
           destination: ctx.routing.hub.destination,
           destination_type: 'CIDR_BLOCK',
           network_entity_key: ctx.drg_key,
         },
       } else {})
      + {
        [route_key]: {
          description: peer_routes[route_key].description,
          destination: peer_routes[route_key].destination,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: ctx.drg_key,
        }
        for route_key in std.objectFields(peer_routes)
      };
    (if ctx.has_hub && !overlay_output && ctx.use_local_natgw then {
       [n.route_rule([n.region, 'default'])]: {
         description: 'Default route to internet through NAT Gateway',
         destination: '0.0.0.0/0',
         destination_type: 'CIDR_BLOCK',
         network_entity_key: ctx.ngw_key,
       },
     } else if ctx.has_hub && !overlay_output then {
       [n.route_rule([n.region, 'default'])]: {
         description: 'Default route to internet through DRG',
         destination: '0.0.0.0/0',
         destination_type: 'CIDR_BLOCK',
         network_entity_key: ctx.drg_key,
       },
     } else {})
    + drg_route_rules
    + {
      [n.route_rule([n.region, 'sgw'])]: {
        description: 'Route for OCI services',
        destination: 'all-services',
        destination_type: 'SERVICE_CIDR_BLOCK',
        network_entity_key: ctx.sgw_key,
      },
    },
}
