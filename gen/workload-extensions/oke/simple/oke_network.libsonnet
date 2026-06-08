// OKE network output builder.

function(ctx, overlay_output=false) {
  local n = ctx.n,
  local root = self,
  local osn_service_cidr = 'all-%s-services-in-oracle-services-network' % n.region,
  local icmp_security_list_egress_rules = root._icmp_security_list_egress_rules(ctx),
  local icmp_security_list_ingress_rules = root._icmp_security_list_ingress_rules(ctx),

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
            default_security_list: {
              egress_rules: [],
              ingress_rules: [],
            },
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,

            subnets: ({
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
            } + (if ctx.is_overlay_network then {} else {
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
            })),

            route_tables: {
              [desc.key]: {
                display_name: n.display('rt', ctx.display_segments + [desc.suffix]),
                route_rules: root._route_rules(ctx),
              }
              for desc in [
                { key: ctx.rt_cp_key, suffix: 'cp' },
                { key: ctx.rt_lb_key, suffix: 'int-lb' },
                { key: ctx.rt_workers_key, suffix: 'workers' },
              ] + (if ctx.is_overlay_network then [] else [
                { key: ctx.rt_pods_key, suffix: 'pods' },
              ])
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
                  egress: icmp_security_list_egress_rules,
                  ingress: icmp_security_list_ingress_rules,
                },
                {
                  key: ctx.sl_cp_key,
                  suffix: 'cp',
                  egress: icmp_security_list_egress_rules,
                  ingress: icmp_security_list_ingress_rules,
                  extras: { defined_tags: null, freeform_tags: null },
                },
                {
                  key: ctx.sl_workers_key,
                  suffix: 'workers',
                  egress: icmp_security_list_egress_rules,
                  ingress: icmp_security_list_ingress_rules,
                },
              ] + (if ctx.is_overlay_network then [] else [
                {
                  key: ctx.sl_pods_key,
                  suffix: 'pods',
                  egress: icmp_security_list_egress_rules,
                  ingress: icmp_security_list_ingress_rules,
                },
              ])
            },

            network_security_groups: ({
              [ctx.nsg_cp_key]: {
                display_name: n.display('nsg', ctx.display_segments + ['cp']),

                egress_rules: {
                  nsg_cp_6443: root._nsg_tcp_egress('Allow TCP egress for Kubernetes control plane inter-communication', ctx.nsg_cp_key, '6443'),
                  nsg_service: root._nsg_service_egress('Allow TCP egress from OKE control plane to OCI services'),
                  nsg_workers_10250: root._nsg_tcp_egress('Allow TCP egress for path discovery to worker nodes', ctx.nsg_workers_key, '10250'),
                  nsg_workers_12250: root._nsg_tcp_egress_src('Allow TCP egress from control plane to worker nodes with source port 12250', ctx.nsg_workers_key, '12250'),
                  nsg_workers_6443: root._nsg_tcp_egress_src('Allow TCP egress from control plane to worker nodes with source port 6443', ctx.nsg_workers_key, '6443'),
                } + (if ctx.is_overlay_network then {} else {
                  nsg_pods: root._nsg_tcp_egress_any('Broad webhook rule: allow TCP egress from OKE control plane to pods on any port for API server callbacks. If removed, keep explicit 12250 and 6443 rules.', ctx.nsg_pods_key),
                  nsg_pods_12250: root._nsg_tcp_egress_src('Allow TCP egress from OKE control plane to pods with source port 12250', ctx.nsg_pods_key, '12250'),
                  nsg_pods_6443: root._nsg_tcp_egress_src('Allow TCP egress from OKE control plane to pods with source port 6443', ctx.nsg_pods_key, '6443'),
                }) + ctx.api_endpoint_egress_rules,

                ingress_rules: {
                  nsg_cp_6443: root._nsg_tcp_ingress_src('Allow TCP ingress for Kubernetes control plane inter-communication on source port 6443', ctx.nsg_cp_key, '6443'),
                } + ctx.api_endpoint_ingress_rules + {
                  nsg_service: root._nsg_service_ingress('Allow TCP ingress from OCI services to control plane for responses'),
                  nsg_workers_10250: root._nsg_tcp_ingress_src('Allow TCP ingress to control plane from worker nodes for Kubelet responses on source port 10250', ctx.nsg_workers_key, '10250'),
                  nsg_workers_12250: root._nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from workers on port 12250', ctx.nsg_workers_key, '12250'),
                  nsg_workers_6443: root._nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from workers on port 6443', ctx.nsg_workers_key, '6443'),
                } + (if ctx.is_overlay_network then {} else {
                  nsg_pods: root._nsg_tcp_ingress_any('Return pair for broad pod webhook rule: allow TCP ingress from pods to OKE control plane. If broad rule is removed, keep 12250 and 6443 rules.', ctx.nsg_pods_key),
                  nsg_pods_12250: root._nsg_tcp_ingress('Allow TCP ingress from pods to kube-apiserver on port 12250', ctx.nsg_pods_key, '12250'),
                  nsg_pods_6443: root._nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from pods on port 6443', ctx.nsg_pods_key, '6443'),
                }),
              },

              [ctx.nsg_lb_key]: {
                display_name: n.display('nsg', ctx.display_segments + ['int-lb', 'default-backend']),
                ingress_rules: {
                  nsg_workers_10256: root._nsg_tcp_ingress_src('Allow TCP ingress from worker nodes to load balancers for health check responses on source port 10256', ctx.nsg_workers_key, '10256'),
                  nsg_workers_tcp: root._nsg_tcp_ingress_src_range('Allow TCP ingress from worker nodes to load balancers for service responses on source ports 30000-32767', ctx.nsg_workers_key, '30000', '32767'),
                  nsg_workers_udp: root._nsg_udp_ingress_src_range('Allow UDP ingress from worker nodes to load balancers for service responses on source ports 30000-32767', ctx.nsg_workers_key, '30000', '32767'),
                } + (if ctx.is_overlay_network then {} else {
                  nsg_pods_tcp: root._nsg_tcp_ingress_any('Allow TCP ingress from pods to load balancers for responses', ctx.nsg_pods_key),
                  nsg_pods_udp: root._nsg_udp_ingress_any('Allow UDP ingress from pods to load balancers for responses', ctx.nsg_pods_key),
                }),

                egress_rules: {
                  nsg_workers_tcp: root._nsg_tcp_egress_range('Allow TCP egress from load balancers to worker nodes for NodePort traffic', ctx.nsg_workers_key, '30000', '32767'),
                  nsg_workers_udp: root._nsg_udp_egress_range('Allow UDP egress from load balancers to worker nodes for NodePort traffic', ctx.nsg_workers_key, '30000', '32767'),
                  nsg_workers_10256: root._nsg_tcp_egress('Allow TCP egress from load balancers to worker nodes for health checks', ctx.nsg_workers_key, '10256'),
                } + (if ctx.is_overlay_network then {} else {
                  nsg_pods_tcp: root._nsg_tcp_egress_any('Allow TCP egress from load balancers to pods for OCI Native Ingress and Pods as Backends', ctx.nsg_pods_key),
                  nsg_pods_udp: root._nsg_udp_egress_any('Allow UDP egress from load balancers to pods for OCI Native Ingress and Pods as Backends', ctx.nsg_pods_key),
                }),
              },
            } + (if ctx.is_overlay_network then {} else {
              [ctx.nsg_pods_key]: {
                display_name: n.display('nsg', ctx.display_segments + ['pods']),

                egress_rules: {
                  anywhere: {
                    description: 'Allow ALL egress from pods to internet',
                    protocol: 'ALL',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  nsg_cp: root._nsg_all_egress('Return pair for broad pod webhook rule: allow all egress from pods to Kubernetes control plane. Remove with matching broad ingress rule.', ctx.nsg_cp_key),
                  nsg_cp_6443: root._nsg_tcp_egress('Allow TCP egress from pods to Kubernetes API server', ctx.nsg_cp_key, '6443'),
                  nsg_lb_tcp: root._nsg_tcp_egress_any('Allow TCP egress from pods to load balancers', ctx.nsg_lb_key),
                  nsg_lb_udp: root._nsg_udp_egress_any('Allow UDP egress from pods to load balancers', ctx.nsg_lb_key),
                  nsg_pods: root._nsg_all_egress('Allow ALL egress from pods to other pods', ctx.nsg_pods_key),
                  nsg_service: root._nsg_service_egress('Allow TCP egress from pods to OCI Services'),
                  nsg_workers: root._nsg_all_egress('Allow ALL egress from pods to workers', ctx.nsg_workers_key),
                } + root._hub_public_lb_pod_egress_rules(ctx),

                ingress_rules: {
                  nsg_cp: root._nsg_all_ingress('Broad webhook rule: allow all ingress to pods from Kubernetes control plane. Needed for pod-hosted webhooks on arbitrary target ports.', ctx.nsg_cp_key),
                  nsg_cp_6443: root._nsg_tcp_ingress_src('Allow TCP ingress from control plane to pods on source port 6443', ctx.nsg_cp_key, '6443'),
                  nsg_lb_tcp: root._nsg_tcp_ingress_any('Allow TCP ingress to pods from load balancers', ctx.nsg_lb_key),
                  nsg_lb_udp: root._nsg_udp_ingress_any('Allow UDP ingress to pods from load balancers', ctx.nsg_lb_key),
                  nsg_pods: root._nsg_all_ingress('Allow ALL ingress to pods from other pods', ctx.nsg_pods_key),
                  nsg_service: root._nsg_service_ingress('Allow TCP ingress from OCI services to pods'),
                  nsg_workers: root._nsg_all_ingress('Allow ALL ingress to pods from workers', ctx.nsg_workers_key),
                } + root._hub_public_lb_pod_ingress_rules(ctx),
              },
            }) + {
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
                  nsg_cp: root._nsg_tcp_egress_any('Return pair for hostNetwork webhook rule: allow TCP egress from workers to Kubernetes control plane on any port.', ctx.nsg_cp_key),
                  nsg_cp_10250: root._nsg_tcp_egress('Allow TCP egress from workers to OKE control plane', ctx.nsg_cp_key, '10250'),
                  nsg_cp_12250: root._nsg_tcp_egress('Allow TCP egress from workers to OKE control plane on port 12250', ctx.nsg_cp_key, '12250'),
                  nsg_cp_6443: root._nsg_tcp_egress('Allow TCP egress from workers to Kubernetes API server', ctx.nsg_cp_key, '6443'),
                  nsg_lb_10256: root._nsg_tcp_egress_src('Allow TCP egress to load balancers from workers with source port 10256', ctx.nsg_lb_key, '10256'),
                  nsg_lb_tcp: root._nsg_tcp_egress_src_range('Allow TCP egress to load balancers from workers with source ports 30000-32767', ctx.nsg_lb_key, '30000', '32767'),
                  nsg_lb_udp: root._nsg_udp_egress_src_range('Allow UDP egress to load balancers from workers with source ports 30000-32767', ctx.nsg_lb_key, '30000', '32767'),
                  nsg_service: root._nsg_service_egress('Allow TCP egress from workers to OCI Services'),
                  nsg_workers: root._nsg_all_egress('Allow ALL egress from workers to other workers', ctx.nsg_workers_key),
                } + (if ctx.is_overlay_network then {} else {
                  nsg_pods: root._nsg_all_egress('Allow ALL egress from workers to pods', ctx.nsg_pods_key),
                }) + root._hub_public_lb_worker_egress_rules(ctx),

                ingress_rules: {
                  nsg_cp: root._nsg_tcp_ingress_any('Broad hostNetwork webhook rule: allow TCP ingress to workers from Kubernetes control plane on any port.', ctx.nsg_cp_key),
                  nsg_cp_10250: root._nsg_tcp_ingress_src('Allow TCP ingress from control plane to workers on source port 10250', ctx.nsg_cp_key, '10250'),
                  nsg_cp_12250: root._nsg_tcp_ingress_src('Allow TCP ingress from control plane to workers on source port 12250', ctx.nsg_cp_key, '12250'),
                  nsg_cp_6443: root._nsg_tcp_ingress_src('Allow TCP ingress from control plane to workers on source port 6443', ctx.nsg_cp_key, '6443'),
                  nsg_lb_10256: root._nsg_tcp_ingress('Allow TCP ingress to workers for health check from load balancer on port 10256', ctx.nsg_lb_key, '10256'),
                  nsg_lb_tcp: root._nsg_tcp_ingress_range('Allow TCP ingress to workers from load balancers on service ports 30000-32767', ctx.nsg_lb_key, '30000', '32767'),
                  nsg_lb_udp: root._nsg_udp_ingress_range('Allow UDP ingress to workers from load balancers on service ports 30000-32767', ctx.nsg_lb_key, '30000', '32767'),
                  nsg_service: root._nsg_service_ingress('Allow TCP ingress from OCI services to workers'),
                  nsg_workers: root._nsg_all_ingress('Allow ALL ingress to workers from other workers', ctx.nsg_workers_key),
                } + (if ctx.is_overlay_network then {} else {
                  nsg_pods: root._nsg_all_ingress('Allow ALL ingress to workers from pods', ctx.nsg_pods_key),
                }) + root._hub_public_lb_worker_ingress_rules(ctx),
              },
            }),

            vcn_specific_gateways:
              {
                service_gateways: {
                  [ctx.sgw_key]: {
                    display_name: n.display('sgw', ctx.display_segments),
                    services: 'all-services',
                  },
                },
              } + (if ctx.has_hub && !overlay_output && ctx.use_local_natgw then {
                nat_gateways: {
                  [ctx.ngw_key]: {
                    display_name: n.display('ngw', ctx.display_segments),
                    block_traffic: false,
                  },
                },
              } else {}),
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
    stateless: true,
  },

  _nsg_tcp_ingress(description, src_nsg_key, port):: {
    description: description,
    protocol: 'TCP',
    dst_port_max: port,
    dst_port_min: port,
    src: src_nsg_key,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_tcp_egress_src(description, dst_nsg_key, port):: {
    description: description,
    protocol: 'TCP',
    dst: dst_nsg_key,
    dst_type: 'NETWORK_SECURITY_GROUP',
    src_port_max: port,
    src_port_min: port,
    stateless: true,
  },

  _nsg_tcp_ingress_src(description, src_nsg_key, port):: {
    description: description,
    protocol: 'TCP',
    src: src_nsg_key,
    src_port_max: port,
    src_port_min: port,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_tcp_egress_any(description, dst_nsg_key):: {
    description: description,
    protocol: 'TCP',
    dst: dst_nsg_key,
    dst_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_tcp_ingress_any(description, src_nsg_key):: {
    description: description,
    protocol: 'TCP',
    src: src_nsg_key,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_tcp_egress_range(description, dst_nsg_key, port_min, port_max):: {
    description: description,
    protocol: 'TCP',
    dst: dst_nsg_key,
    dst_port_max: port_max,
    dst_port_min: port_min,
    dst_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_tcp_ingress_range(description, src_nsg_key, port_min, port_max):: {
    description: description,
    protocol: 'TCP',
    dst_port_max: port_max,
    dst_port_min: port_min,
    src: src_nsg_key,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_tcp_egress_src_range(description, dst_nsg_key, port_min, port_max):: {
    description: description,
    protocol: 'TCP',
    dst: dst_nsg_key,
    dst_type: 'NETWORK_SECURITY_GROUP',
    src_port_max: port_max,
    src_port_min: port_min,
    stateless: true,
  },

  _nsg_tcp_ingress_src_range(description, src_nsg_key, port_min, port_max):: {
    description: description,
    protocol: 'TCP',
    src: src_nsg_key,
    src_port_max: port_max,
    src_port_min: port_min,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_udp_egress_any(description, dst_nsg_key):: {
    description: description,
    protocol: 'UDP',
    dst: dst_nsg_key,
    dst_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_udp_ingress_any(description, src_nsg_key):: {
    description: description,
    protocol: 'UDP',
    src: src_nsg_key,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_tcp_egress_cidr(description, dst_cidr):: {
    description: description,
    protocol: 'TCP',
    dst: dst_cidr,
    dst_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _nsg_tcp_ingress_cidr(description, src_cidr):: {
    description: description,
    protocol: 'TCP',
    src: src_cidr,
    src_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _nsg_tcp_egress_cidr_src(description, dst_cidr, port):: {
    description: description,
    protocol: 'TCP',
    dst: dst_cidr,
    dst_type: 'CIDR_BLOCK',
    src_port_max: port,
    src_port_min: port,
    stateless: true,
  },

  _nsg_tcp_ingress_cidr_dst(description, src_cidr, port):: {
    description: description,
    protocol: 'TCP',
    dst_port_max: port,
    dst_port_min: port,
    src: src_cidr,
    src_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _nsg_tcp_egress_cidr_src_range(description, dst_cidr, port_min, port_max):: {
    description: description,
    protocol: 'TCP',
    dst: dst_cidr,
    dst_type: 'CIDR_BLOCK',
    src_port_max: port_max,
    src_port_min: port_min,
    stateless: true,
  },

  _nsg_tcp_ingress_cidr_dst_range(description, src_cidr, port_min, port_max):: {
    description: description,
    protocol: 'TCP',
    dst_port_max: port_max,
    dst_port_min: port_min,
    src: src_cidr,
    src_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _nsg_udp_egress_cidr(description, dst_cidr):: {
    description: description,
    protocol: 'UDP',
    dst: dst_cidr,
    dst_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _nsg_udp_ingress_cidr(description, src_cidr):: {
    description: description,
    protocol: 'UDP',
    src: src_cidr,
    src_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _nsg_udp_egress_cidr_src_range(description, dst_cidr, port_min, port_max):: {
    description: description,
    protocol: 'UDP',
    dst: dst_cidr,
    dst_type: 'CIDR_BLOCK',
    src_port_max: port_max,
    src_port_min: port_min,
    stateless: true,
  },

  _nsg_udp_ingress_cidr_dst_range(description, src_cidr, port_min, port_max):: {
    description: description,
    protocol: 'UDP',
    dst_port_max: port_max,
    dst_port_min: port_min,
    src: src_cidr,
    src_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _nsg_udp_egress_range(description, dst_nsg_key, port_min, port_max):: {
    description: description,
    protocol: 'UDP',
    dst: dst_nsg_key,
    dst_port_max: port_max,
    dst_port_min: port_min,
    dst_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_udp_ingress_range(description, src_nsg_key, port_min, port_max):: {
    description: description,
    protocol: 'UDP',
    dst_port_max: port_max,
    dst_port_min: port_min,
    src: src_nsg_key,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_udp_egress_src_range(description, dst_nsg_key, port_min, port_max):: {
    description: description,
    protocol: 'UDP',
    dst: dst_nsg_key,
    dst_type: 'NETWORK_SECURITY_GROUP',
    src_port_max: port_max,
    src_port_min: port_min,
    stateless: true,
  },

  _nsg_udp_ingress_src_range(description, src_nsg_key, port_min, port_max):: {
    description: description,
    protocol: 'UDP',
    src: src_nsg_key,
    src_port_max: port_max,
    src_port_min: port_min,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_all_egress(description, dst_nsg_key):: {
    description: description,
    protocol: 'ALL',
    dst: dst_nsg_key,
    dst_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_all_ingress(description, src_nsg_key):: {
    description: description,
    protocol: 'ALL',
    src: src_nsg_key,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: true,
  },

  _nsg_service_egress(description):: {
    description: description,
    protocol: 'TCP',
    dst: 'all-services',
    dst_type: 'SERVICE_CIDR_BLOCK',
    stateless: true,
  },

  _nsg_service_ingress(description):: {
    description: description,
    protocol: 'TCP',
    src: osn_service_cidr,
    src_type: 'SERVICE_CIDR_BLOCK',
    stateless: true,
  },

  _hub_public_lb_pod_ingress_rules(ctx):: if ctx.hub_lb_cidr == null then {} else {
    hub_public_lb_tcp: $._nsg_tcp_ingress_cidr(
      'Allow TCP ingress to pods from Hub public LB subnet %s. OKE can create public LBs there; cross-VCN rule uses CIDR instead of NSG.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr
    ),
    hub_public_lb_udp: $._nsg_udp_ingress_cidr(
      'Allow UDP ingress to pods from Hub public LB subnet %s. OKE can create public LBs there; cross-VCN rule uses CIDR instead of NSG.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr
    ),
  },

  _hub_public_lb_pod_egress_rules(ctx):: if ctx.hub_lb_cidr == null then {} else {
    hub_public_lb_tcp: $._nsg_tcp_egress_cidr(
      'Return pair: allow TCP egress from pods to Hub public LB subnet %s for public LB traffic responses.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr
    ),
    hub_public_lb_udp: $._nsg_udp_egress_cidr(
      'Return pair: allow UDP egress from pods to Hub public LB subnet %s for public LB traffic responses.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr
    ),
  },

  _hub_public_lb_worker_ingress_rules(ctx):: if ctx.hub_lb_cidr == null then {} else {
    hub_public_lb_10256: $._nsg_tcp_ingress_cidr_dst(
      'Allow TCP ingress to workers from Hub public LB subnet %s for health checks on port 10256. Cross-VCN rule uses CIDR instead of NSG.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '10256'
    ),
    hub_public_lb_tcp: $._nsg_tcp_ingress_cidr_dst_range(
      'Allow TCP ingress to workers from Hub public LB subnet %s on NodePort ports 30000-32767. Mirrors internal LB rule using CIDR.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '30000',
      '32767'
    ),
    hub_public_lb_udp: $._nsg_udp_ingress_cidr_dst_range(
      'Allow UDP ingress to workers from Hub public LB subnet %s on NodePort ports 30000-32767. Mirrors internal LB rule using CIDR.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '30000',
      '32767'
    ),
  },

  _hub_public_lb_worker_egress_rules(ctx):: if ctx.hub_lb_cidr == null then {} else {
    hub_public_lb_10256: $._nsg_tcp_egress_cidr_src(
      'Return pair: allow TCP egress from workers to Hub public LB subnet %s with source port 10256 for health checks.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '10256'
    ),
    hub_public_lb_tcp: $._nsg_tcp_egress_cidr_src_range(
      'Return pair: allow TCP egress from workers to Hub public LB subnet %s with source ports 30000-32767 for NodePort responses.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '30000',
      '32767'
    ),
    hub_public_lb_udp: $._nsg_udp_egress_cidr_src_range(
      'Return pair: allow UDP egress from workers to Hub public LB subnet %s with source ports 30000-32767 for NodePort responses.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '30000',
      '32767'
    ),
  },

  _icmp_security_list_egress_rules(ctx):: [
    self._icmp_pmtu_egress_rule,
    self._icmp_vcn_fail_fast_egress_rule(ctx),
  ],

  _icmp_security_list_ingress_rules(ctx):: [
    self._icmp_pmtu_ingress_rule,
    self._icmp_vcn_fail_fast_ingress_rule(ctx),
  ],

  _icmp_pmtu_egress_rule:: {
    description: 'Required to enable Path MTU Discovery responses to work, and non-OCI communication',
    protocol: 'ICMP',
    dst: '0.0.0.0/0',
    dst_type: 'CIDR_BLOCK',
    icmp_code: 4,
    icmp_type: 3,
    stateless: true,
  },

  _icmp_pmtu_ingress_rule:: {
    description: 'Required to enable Path MTU Discovery to work, and non-OCI communication',
    protocol: 'ICMP',
    icmp_code: 4,
    icmp_type: 3,
    src: '0.0.0.0/0',
    src_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _icmp_vcn_fail_fast_egress_rule(ctx):: {
    description: 'Required to allow application within VCN responses to fail fast',
    protocol: 'ICMP',
    dst: ctx.params.network.vcn,
    dst_type: 'CIDR_BLOCK',
    icmp_type: 3,
    stateless: true,
  },

  _icmp_vcn_fail_fast_ingress_rule(ctx):: {
    description: 'Required to allow application within VCN to fail fast',
    protocol: 'ICMP',
    icmp_type: 3,
    src: ctx.params.network.vcn,
    src_type: 'CIDR_BLOCK',
    stateless: true,
  },

  _route_rules(ctx)::
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
