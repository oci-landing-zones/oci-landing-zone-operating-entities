// gen/workload-extensions/oke/simple/oke_builder.libsonnet
// Internal OKE builder used by the generic extension wrapper and published adapters.
//
// Contract:
//   {
//     metadata(params):: { default_subnets, subnet_order },
//     render(params, published_view=null):: { metadata, contributions, published },
//   }
//   params.config_params — {kubernetes_version, services_cidr, pods_cidr?}
//   params.network       — {vcn: 'cidr', subnets: {name: cidr}}
//   params.naming        — naming object
//   params.topology      — platform scope semantics from topology.libsonnet
//   params.routing       — explicit DRG route targets (null when not hub-backed)

{
  metadata(params):: {
    default_subnets: {
      'control-plane': '/25',
      'int-lb': '/25',
      pods: '/23',
      workers: '/23',
    },
    // Order for auto-subnet allocation (determines CIDR assignment order)
    subnet_order: ['int-lb', 'control-plane', 'workers', 'pods'],
  },

  render(params, published_view=null)::
  assert std.objectHas(params.config_params, 'kubernetes_version') : 'oke_simple requires config_params.kubernetes_version';
  assert std.objectHas(params.config_params, 'services_cidr') : 'oke_simple requires config_params.services_cidr';
  assert std.objectHas(params, 'topology') : 'oke_simple requires topology scope semantics';

  local metadata = self.metadata(params);
  local n = params.naming;
  local scope = params.topology;
  local env = scope.scope_name;
  local env_title = scope.scope_title;
  local plat = scope.platform_name;
  local cmp_key = scope.compartment_key;
  local routing = if std.objectHas(params, 'routing') then params.routing else null;
  local has_hub = routing != null && routing.hub != null;
  local internet_default_target =
    if routing != null && std.objectHas(routing, 'internet_default_target')
    then routing.internet_default_target
    else 'local_natgw';
  local use_local_natgw = internet_default_target == 'local_natgw';
  local emit_multi_stack_outputs = published_view == 'multi_stack';
  local category_key = '%s-platform-%s' % [std.asciiLower(env), std.asciiLower(plat)];
  local optional_cluster_kubernetes_network_config =
    if std.objectHas(params.config_params, 'pods_cidr') && params.config_params.pods_cidr != null then
      { pods_cidr: params.config_params.pods_cidr }
    else
      {};
  local sn_key(suffix) =
    n.key('SN', [env, 'PLATFORM', plat, suffix]);
  local rt_key(suffix) =
    n.key('RT', [env, 'PLATFORM', plat, suffix]);
  local cluster_key =
    n.key('OKE-CLUSTER', [env, 'PLATFORM', plat]);
  local cluster_name =
    n.display('oke-cluster', [env, 'platform', plat]);
  local node_pool_key =
    n.key('NODEPOOL', [env, 'PLATFORM', plat, '1']);
  local node_pool_name =
    n.display('nodepool', [env, 'platform', plat, '1']);

  // Subnet CIDRs from params
  local subnets = params.network.subnets;

  // --- Naming keys ---
  local vcn_key = n.key('VCN', [env, 'PLATFORM', plat]);
  local sgw_key = n.key('SGW', [env, 'PLATFORM', plat]);
  local ngw_key = n.key('NGW', [env, 'PLATFORM', plat]);
  local drg_key = n.key('DRG', ['HUB']);

  // Subnet keys
  local sn_cp_key = sn_key('CP');
  local sn_lb_key = sn_key('INT-LB');
  local sn_pods_key = sn_key('PODS');
  local sn_workers_key = sn_key('WORKERS');

  // Route table keys
  local rt_cp_key = rt_key('CP');
  local rt_lb_key = rt_key('INT-LB');
  local rt_pods_key = rt_key('PODS');
  local rt_workers_key = rt_key('WORKERS');

  // Security list keys
  local sl_cp_key = n.key('SL', [env, 'PLATFORM', plat, 'CP']);
  local sl_lb_key = n.key('SL', [env, 'PLATFORM', plat, 'INT-LB']);
  local sl_pods_key = n.key('SL', [env, 'PLATFORM', plat, 'PODS']);
  local sl_workers_key = n.key('SL', [env, 'PLATFORM', plat, 'WORKERS']);

  // NSG keys
  local nsg_cp_key = n.key('NSG', [env, 'PLATFORM', plat, 'CP']);
  local nsg_lb_key = n.key('NSG', [env, 'PLATFORM', plat, 'INT-LB']);
  local nsg_pods_key = n.key('NSG', [env, 'PLATFORM', plat, 'PODS']);
  local nsg_workers_key = n.key('NSG', [env, 'PLATFORM', plat, 'WORKERS']);

  // DNS labels
  local dns = scope.dns;

  // TCP NSG↔NSG single-port rule templates (mirrors network_spokes.libsonnet).
  local nsg_tcp_egress(description, dst_nsg_key, port) = {
    description: description,
    protocol: 'TCP',
    dst: dst_nsg_key,
    dst_port_max: port,
    dst_port_min: port,
    dst_type: 'NETWORK_SECURITY_GROUP',
    stateless: false,
  };
  local nsg_tcp_ingress(description, src_nsg_key, port) = {
    description: description,
    protocol: 'TCP',
    dst_port_max: port,
    dst_port_min: port,
    src: src_nsg_key,
    src_type: 'NETWORK_SECURITY_GROUP',
    stateless: false,
  };

  // ICMP security list rule template (used in CP, pods, workers SLs)
  local icmp_egress_rule = {
    description: 'ICMP type 3 code 4 for: All',
    protocol: 'ICMP',
    dst: '0.0.0.0/0',
    dst_type: 'CIDR_BLOCK',
    icmp_code: 4,
    icmp_type: 3,
    stateless: false,
  };
  local icmp_ingress_rule = {
    description: 'ICMP type 3 code 4 for: All',
    protocol: 'ICMP',
    icmp_code: 4,
    icmp_type: 3,
    src: '0.0.0.0/0',
    src_type: 'CIDR_BLOCK',
    stateless: false,
  };

  local security_list_descriptors = [
    {
      key: sl_lb_key,
      suffix: 'int-lb',
      egress: [],
      ingress: [],
    },
    {
      key: sl_cp_key,
      suffix: 'cp',
      egress: [icmp_egress_rule],
      ingress: [icmp_ingress_rule],
      extras: { defined_tags: null, freeform_tags: null },
    },
    {
      key: sl_pods_key,
      suffix: 'pods',
      egress: [icmp_egress_rule],
      ingress: [icmp_ingress_rule],
    },
    {
      key: sl_workers_key,
      suffix: 'workers',
      egress: [icmp_egress_rule],
      ingress: [icmp_ingress_rule],
    },
  ];
  local build_security_lists() =
    {
      [desc.key]:
        (
          {
            display_name: n.display('sl', [env, 'platform', plat, desc.suffix]),
            egress_rules: desc.egress,
            ingress_rules: desc.ingress,
          }
          + (if std.objectHas(desc, 'extras') then desc.extras else {})
        )
      for desc in security_list_descriptors
    };

  local peer_routes = if routing != null && std.objectHas(routing, 'peers') then routing.peers else {};
  local drg_route_rules =
    (if has_hub then {
       [routing.hub.route_key]: {
         description: routing.hub.description,
         destination: routing.hub.destination,
         destination_type: 'CIDR_BLOCK',
         network_entity_key: drg_key,
       },
     } else {})
    + {
      [route_key]: {
        description: peer_routes[route_key].description,
        destination: peer_routes[route_key].destination,
        destination_type: 'CIDR_BLOCK',
        network_entity_key: drg_key,
      }
      for route_key in std.objectFields(peer_routes)
    };

  local build_rt_rules(overlay_output=false) =
    (if has_hub && !overlay_output && use_local_natgw then {
       [n.route_rule([n.region, 'default'])]: {
         description: 'Default route to internet through NAT Gateway',
         destination: '0.0.0.0/0',
         destination_type: 'CIDR_BLOCK',
         network_entity_key: ngw_key,
       },
     } else if has_hub && !overlay_output then {
       [n.route_rule([n.region, 'default'])]: {
         description: 'Default route to internet through DRG',
         destination: '0.0.0.0/0',
         destination_type: 'CIDR_BLOCK',
         network_entity_key: drg_key,
       },
     } else {})
    + drg_route_rules
    + {
      [n.route_rule([n.region, 'sgw'])]: {
        description: 'Route for OCI services',
        destination: 'all-services',
        destination_type: 'SERVICE_CIDR_BLOCK',
        network_entity_key: sgw_key,
      },
    };

  local route_table_descriptors = [
    { key: rt_cp_key, suffix: 'cp' },
    { key: rt_lb_key, suffix: 'int-lb' },
    { key: rt_pods_key, suffix: 'pods' },
    { key: rt_workers_key, suffix: 'workers' },
  ];
  local build_route_tables(route_rules) =
    {
      [desc.key]: {
        display_name: n.display('rt', [env, 'platform', plat, desc.suffix]),
        route_rules: route_rules,
      }
      for desc in route_table_descriptors
    };

  {
    metadata: metadata,

    // Shared security zone target (identical for CIS1 and CIS2)
    local security_zone_contribution =
      if scope.allow_security_target then {
        security_zones_configuration+: {
          security_zones+: {
            [n.key_global('SZ-TGT', [env, 'PLATFORM', plat])]: {
              name: n.display_global('sz-tgt', [env, 'platform', plat]),
              compartment_id: cmp_key,
              recipe_key: 'SZ-RCP-LZ-05-WORKLOAD-KEY',
            },
          },
        },
      } else {},

    local build_oke_category(overlay_output=false) =
      local route_rules = build_rt_rules(overlay_output);
      {
        category_compartment_id: scope.network_compartment_key,

        vcns: {
          [vcn_key]: {
            display_name: n.display('vcn', [env, 'platform', plat]),
            cidr_blocks: [params.network.vcn],
            dns_label: n.dns_label(['vcn', n.region, 'lz', dns, dns + plat]),
            block_nat_traffic: false,
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,

            subnets: {
              [sn_cp_key]: {
                display_name: n.display('sn', [env, 'platform', plat, 'cp']),
                dns_label: n.dns_label(['sn', dns, 'plat', plat, 'cp']),
                cidr_block: subnets['control-plane'],
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: rt_cp_key,
                security_list_keys: [sl_cp_key],
              },

              [sn_lb_key]: {
                display_name: n.display('sn', [env, 'platform', plat, 'lb']),
                dns_label: n.dns_label(['sn', dns, 'plat', plat, 'lb']),
                cidr_block: subnets['int-lb'],
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: rt_lb_key,
                security_list_keys: [sl_lb_key],
              },

              [sn_pods_key]: {
                display_name: n.display('sn', [env, 'platform', plat, 'pods']),
                dns_label: n.dns_label(['sn', dns, 'plat', plat, 'pods']),
                cidr_block: subnets.pods,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: rt_pods_key,
                security_list_keys: [sl_pods_key],
              },

              [sn_workers_key]: {
                display_name: n.display('sn', [env, 'platform', plat, 'workers']),
                dns_label: n.dns_label(['sn', dns, 'plat', plat, 'work']),
                cidr_block: subnets.workers,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: rt_workers_key,
                security_list_keys: [sl_workers_key],
              },
            },

            route_tables: build_route_tables(route_rules),

            security_lists: build_security_lists(),

            network_security_groups: {
              // --- Control Plane NSG ---
              [nsg_cp_key]: {
                display_name: n.display('nsg', [env, 'platform', plat, 'cp']),

                egress_rules: {
                  nsg_cp_6443: nsg_tcp_egress('Allow TCP egress for Kubernetes control plane inter-communication', nsg_cp_key, '6443'),
                  nsg_pods: {
                    description: 'Allow TCP egress from OKE control plane to pods',
                    protocol: 'TCP',
                    dst: nsg_pods_key,
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
                  nsg_workers_10250: nsg_tcp_egress('Allow TCP egress for path discovery to worker nodes', nsg_workers_key, '10250'),
                  nsg_workers_12250: nsg_tcp_egress('Allow TCP egress for path discovery to worker nodes', nsg_workers_key, '12250'),
                  nsg_workers_icmp: {
                    description: 'Allow ICMP egress from OKE control plane to worker nodes',
                    protocol: 'ICMP',
                    dst: nsg_workers_key,
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp_6443: nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from control plane on port 6443', nsg_cp_key, '6443'),
                  nsg_public_6443: {
                    description: 'Allow TCP ingress to kube-apiserver from 10.0.0.0/8 on port 6443',
                    protocol: 'TCP',
                    dst_port_max: '6443',
                    dst_port_min: '6443',
                    src: '10.0.0.0/8',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  nsg_pods_12250: nsg_tcp_ingress('Allow TCP ingress from pods to kube-apiserver on port 12250', nsg_pods_key, '12250'),
                  nsg_pods_6443: nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from pods on port 6443', nsg_pods_key, '6443'),
                  nsg_workers_12250: nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from workers on port 12250', nsg_workers_key, '12250'),
                  nsg_workers_6443: nsg_tcp_ingress('Allow TCP ingress to kube-apiserver from workers on port 6443', nsg_workers_key, '6443'),
                  nsg_workers_icmp: {
                    description: 'Allow ICMP ingress for path discovery from worker nodes',
                    protocol: 'ICMP',
                    icmp_code: 4,
                    icmp_type: 3,
                    src: nsg_workers_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },

              // --- LB NSG ---
              [nsg_lb_key]: {
                display_name: n.display('nsg', [env, 'platform', plat, 'int-lb']),
                ingress_rules: {},

                egress_rules: {
                  nsg_workers: {
                    description: 'Allow TCP egress from public load balancers to workers nodes for NodePort traffic',
                    protocol: 'TCP',
                    dst: nsg_workers_key,
                    dst_port_max: '32767',
                    dst_port_min: '30000',
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_workers_10256: nsg_tcp_egress('Allow TCP egress from public load balancers to worker nodes for health checks', nsg_workers_key, '10256'),
                  nsg_workers_icmp: {
                    description: 'Allow ICMP egress from public load balancers to worker nodes for path discovery',
                    protocol: 'ICMP',
                    dst: nsg_workers_key,
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    icmp_code: 4,
                    icmp_type: 3,
                    stateless: false,
                  },
                },
              },

              // --- Pods NSG ---
              [nsg_pods_key]: {
                display_name: n.display('nsg', [env, 'platform', plat, 'pods']),

                egress_rules: {
                  anywhere: {
                    description: 'Allow ALL egress from pods to internet',
                    protocol: 'TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  nsg_cp_6443: nsg_tcp_egress('Allow TCP egress from pods to Kubernetes API server', nsg_cp_key, '6443'),
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
                    dst: nsg_pods_key,
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
                    dst: nsg_workers_key,
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp: {
                    description: 'Allow ALL ingress to pods from Kubernetes control plane for webhooks served by pods',
                    protocol: 'ALL',
                    src: nsg_cp_key,
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
                    src: nsg_pods_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_workers: {
                    description: 'Allow ALL ingress to pods for cross-node pod communication when using NodePorts or hostNetwork: true',
                    protocol: 'ALL',
                    src: nsg_workers_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },

              // --- Workers NSG ---
              [nsg_workers_key]: {
                display_name: n.display('nsg', [env, 'platform', plat, 'workers']),

                egress_rules: {
                  anywhere: {
                    description: 'Allow ALL egress from workers to internet',
                    protocol: 'ALL',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  nsg_cp_10250: nsg_tcp_egress('Allow TCP egress from workers to OKE control plane', nsg_cp_key, '10250'),
                  nsg_cp_12250: nsg_tcp_egress('Allow TCP egress from workers to OKE control plane on port 12250', nsg_cp_key, '12250'),
                  nsg_cp_6443: nsg_tcp_egress('Allow TCP egress from workers to Kubernetes API server', nsg_cp_key, '6443'),
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
                    dst: nsg_pods_key,
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
                    dst: nsg_workers_key,
                    dst_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  nsg_cp: {
                    description: 'Allow ALL ingress to workers from Kubernetes control plane for webhooks served by workers',
                    protocol: 'ALL',
                    src: nsg_cp_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_lb_10256: nsg_tcp_ingress('Allow TCP ingress to workers for health check from load balancer on port 10256', nsg_lb_key, '10256'),
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
                    src: nsg_pods_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_pub_lb_30000_30000: {
                    description: 'Allow TCP ingress to workers from public load balancers',
                    protocol: 'TCP',
                    dst_port_max: '32767',
                    dst_port_min: '30000',
                    src: nsg_lb_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_workers: {
                    description: 'Allow ALL ingress to workers from other workers',
                    protocol: 'ALL',
                    src: nsg_workers_key,
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },
            },

            vcn_specific_gateways:
              {
                service_gateways: {
                  [sgw_key]: {
                    display_name: n.display('sgw', [env, 'platform', plat]),
                    services: 'all-services',
                  },
                },
              } + if has_hub && !overlay_output && use_local_natgw then {
                nat_gateways: {
                  [ngw_key]: {
                    display_name: n.display('ngw', [env, 'platform', plat]),
                    block_traffic: false,
                  },
                },
              } else {},
          },
        },
      },

    local multi_stack_oke_network =
      if emit_multi_stack_outputs then {
        network_configuration: {
          network_configuration_categories: {
            [category_key]: build_oke_category(true) {
              category_compartment_id: scope.network_compartment_key,
              non_vcn_specific_gateways+: {
                inject_into_existing_drgs+: {
                  [drg_key]+: {
                    drg_id: drg_key,

                    drg_attachments+: {
                      [n.key('DRGATT', [env, 'PLATFORM', plat])]: {
                        display_name: n.display('drgatt', [env, 'platform', plat]),
                        drg_route_table_key: n.key('DRGRT', ['SPOKES']),

                        network_details: {
                          type: 'VCN',
                          attached_resource_key: vcn_key,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      } else null,

    local build_oke_identity() =
      {
        groups_configuration+: {
          groups+: {
            [n.key_global('GRP', [env, 'PLATFORM', plat, 'ADMINS'])]: {
              name: n.display_global('grp', [env, 'platform', plat, 'admins']),
              description: '%s OKE Cluster Management Admin' % env_title,
            },
            [n.key_global('GRP', [env, 'PLATFORM', plat, 'RBAC-ADMIN'])]: {
              name: n.display_global('grp', [env, 'platform', plat, 'rbac-admin']),
              description: '%s OKE RBAC Admin' % env_title,
            },
            [n.key_global('GRP', [env, 'PLATFORM', plat, 'RBAC-VIEWER'])]: {
              name: n.display_global('grp', [env, 'platform', plat, 'rbac-viewer']),
              description: '%s OKE RBAC Viewer' % env_title,
            },
          },
        },

        policies_configuration+: {
          supplied_policies+: {
            [n.key_global('PCY', [env, 'PLATFORM', plat, 'ADMINS'])]: {
              name: n.display_global('pcy', [env, 'platform', plat, 'admins']),
              description: 'allow %s to manage OKE resources' % n.display_global('grp', [env, 'platform', plat, 'admins']),
              compartment_id: 'TENANCY-ROOT',

              local cmp_path = scope.compartment_path,
              local net_path = scope.network_compartment_path,
              local grp_name = n.display_global('grp', [env, 'platform', plat, 'admins']),

              statements: [
                "allow group 'id_lz_common'/'%s' to read all-resources in compartment %s" % [grp_name, cmp_path],
                "allow group 'id_lz_common'/'%s' to manage cluster-family in compartment %s" % [grp_name, cmp_path],
                "allow group 'id_lz_common'/'%s' to manage instance-family in compartment %s" % [grp_name, cmp_path],
                "allow group 'id_lz_common'/'%s' to use vnics in compartment %s" % [grp_name, cmp_path],
                "allow group 'id_lz_common'/'%s' to inspect compartments in compartment %s" % [grp_name, cmp_path],
                "allow group 'id_lz_common'/'%s' to read virtual-network-family in compartment %s" % [grp_name, net_path],
                "allow group 'id_lz_common'/'%s' to use subnets in compartment %s" % [grp_name, net_path],
                "allow group 'id_lz_common'/'%s' to use network-security-groups in compartment %s" % [grp_name, net_path],
                "allow group 'id_lz_common'/'%s' to use vnics in compartment %s" % [grp_name, net_path],
                "allow group 'id_lz_common'/'%s' to manage private-ips in compartment %s" % [grp_name, net_path],
              ],
            },

            [n.key_global('PCY', [env, 'PLATFORM', plat, 'RBAC-ROLE'])]: {
              name: n.display_global('pcy', [env, 'platform', plat, 'rbac-roles']),
              description: 'allow rbac roles to access OKE %s Cluster' % env_title,
              compartment_id: 'TENANCY-ROOT',

              local cmp_path = scope.compartment_path,
              local rbac_admin = n.display_global('grp', [env, 'platform', plat, 'rbac-admin']),
              local rbac_viewer = n.display_global('grp', [env, 'platform', plat, 'rbac-viewer']),

              statements: [
                "allow group 'id_lz_common'/'%s' to use cluster in compartment %s" % [rbac_admin, cmp_path],
                "allow group 'id_lz_common'/'%s' to use cluster in compartment %s" % [rbac_viewer, cmp_path],
              ],
            },

            [n.key_global('PCY', [env, 'PLATFORM', plat, 'VCN-CNI'])]: {
              name: n.display_global('pcy', [env, 'platform', plat, 'vcn-cni']),
              description: '(unsafe) Grant OKE clusters tenancy wide permissions to use resource',
              compartment_id: 'TENANCY-ROOT',
              '//': 'This is potentially unsafe as it can be used for privilege escalation across environments. See https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengpodnetworking_topic-OCI_CNI_plugin.htm for restricting permissions.',

              statements: [
                "allow any-user to manage instances in tenancy where all { request.principal.type = 'cluster'}",
                "allow any-user to use private-ips in tenancy where all { request.principal.type = 'cluster'}",
                "allow any-user to use network-security-groups in tenancy where all { request.principal.type = 'cluster'}",
              ],
            },
          },
        },
      },

    local multi_stack_oke_identity =
      if emit_multi_stack_outputs then
        {
          compartments_configuration: {
            enable_delete: 'true',
            compartments: {
              [cmp_key]: {
                name: scope.compartment_name,
                description: scope.compartment_description,
                parent_id: scope.parent_compartment_key,
              },
            },
          },
        } + build_oke_identity()
      else null,

    contributions: {
      network_pre: {
        network_configuration+: {
          network_configuration_categories+: {
            [category_key]: build_oke_category(),
          },
        },
      },

      iam: build_oke_identity(),

      // --- security_cis1 / security_cis2: Security zone target (same recipe for both CIS levels) ---
      security_cis1: security_zone_contribution,
      security_cis2: security_zone_contribution,

      // --- oke_clusters: Cluster configuration ---
      oke_clusters: {
        oke_clusters_configuration+: {
          default_compartment_id: cmp_key,

          clusters+: {
            [cluster_key]:
              {
                name: cluster_name,
                cni_type: 'native',
                is_enhanced: true,
                kubernetes_version: params.config_params.kubernetes_version,
              } + {
                networking: {
                  api_endpoint_nsg_ids: [nsg_cp_key],
                  api_endpoint_subnet_id: sn_cp_key,
                  assign_public_ip_to_control_plane: false,
                  is_api_endpoint_public: false,
                  services_subnet_id: [sn_lb_key],
                  vcn_id: vcn_key,
                },

                options: {
                  add_ons: {
                    dashboard_enabled: false,
                    tiller_enabled: false,
                  },
                } + {
                  kubernetes_network_config:
                    {
                      services_cidr: params.config_params.services_cidr,
                    } + optional_cluster_kubernetes_network_config,
                },
              },
          },
        },
      },

      // --- oke_workers: Worker node pool configuration ---
      oke_workers: {
        oke_workers_configuration+: {
          default_compartment_id: cmp_key,

          node_pools+: {
            [node_pool_key]: {
              name: node_pool_name,
              cluster_id: cluster_key,
              enable_cycling: false,
              size: 1,

              cloud_init: [
                {
                  content: 'runcmd:\n  - sudo /usr/libexec/oci-growfs -y\n',
                  content_type: 'text/cloud-config',
                },
              ],

              freeform_tags: {
                cluster: cluster_name,
              },

              networking: {
                pods_nsg_ids: [nsg_pods_key],
                pods_subnet_id: sn_pods_key,
                workers_nsg_ids: [nsg_workers_key],
                workers_subnet_id: sn_workers_key,
              },

              node_config_details: {
                node_shape: 'VM.Standard.E5.Flex',

                flex_shape_settings: {
                  memory: 8,
                  ocpus: 1,
                },
              },
            },
          },
        },
      },
    },
    published:
      if emit_multi_stack_outputs then {
        oke_network: multi_stack_oke_network,
        oke_identity: multi_stack_oke_identity,
      } else {},
  },
}
