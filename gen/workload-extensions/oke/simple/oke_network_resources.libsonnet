// OKE network resource assembly helpers.

local rules = import './oke_network_rule_factories.libsonnet';
local nsg = rules.nsg;
local service = rules.service;
local hub_public_lb = import './oke_network_hub_public_lb_rules.libsonnet';

{
  subnets(ctx)::
    local n = ctx.n;
    ({
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

  route_tables(ctx, overlay_output=false)::
    local n = ctx.n;
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
    local route_rules =
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
      };
    {
      [desc.key]: {
        display_name: n.display('rt', ctx.display_segments + [desc.suffix]),
        route_rules: route_rules,
      }
      for desc in [
        { key: ctx.rt_cp_key, suffix: 'cp' },
        { key: ctx.rt_lb_key, suffix: 'int-lb' },
        { key: ctx.rt_workers_key, suffix: 'workers' },
      ] + (if ctx.is_overlay_network then [] else [
        { key: ctx.rt_pods_key, suffix: 'pods' },
      ])
    },

  security_lists(ctx)::
    local n = ctx.n;
    local icmp_egress_rules = [
      {
        description: 'Required to enable Path MTU Discovery responses to work, and non-OCI communication',
        protocol: 'ICMP',
        dst: '0.0.0.0/0',
        dst_type: 'CIDR_BLOCK',
        icmp_code: 4,
        icmp_type: 3,
        stateless: true,
      },
      {
        description: 'Required to allow application within VCN responses to fail fast',
        protocol: 'ICMP',
        dst: ctx.params.network.vcn,
        dst_type: 'CIDR_BLOCK',
        icmp_type: 3,
        stateless: true,
      },
    ];
    local icmp_ingress_rules = [
      {
        description: 'Required to enable Path MTU Discovery to work, and non-OCI communication',
        protocol: 'ICMP',
        icmp_code: 4,
        icmp_type: 3,
        src: '0.0.0.0/0',
        src_type: 'CIDR_BLOCK',
        stateless: true,
      },
      {
        description: 'Required to allow application within VCN to fail fast',
        protocol: 'ICMP',
        icmp_type: 3,
        src: ctx.params.network.vcn,
        src_type: 'CIDR_BLOCK',
        stateless: true,
      },
    ];
    {
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
          egress: icmp_egress_rules,
          ingress: icmp_ingress_rules,
        },
        {
          key: ctx.sl_cp_key,
          suffix: 'cp',
          egress: icmp_egress_rules,
          ingress: icmp_ingress_rules,
          extras: { defined_tags: null, freeform_tags: null },
        },
        {
          key: ctx.sl_workers_key,
          suffix: 'workers',
          egress: icmp_egress_rules,
          ingress: icmp_ingress_rules,
        },
      ] + (if ctx.is_overlay_network then [] else [
        {
          key: ctx.sl_pods_key,
          suffix: 'pods',
          egress: icmp_egress_rules,
          ingress: icmp_ingress_rules,
        },
      ])
    },

  network_security_groups(ctx)::
    local n = ctx.n;
    ({
      [ctx.nsg_cp_key]: {
        display_name: n.display('nsg', ctx.display_segments + ['cp']),

        egress_rules: {
          nsg_cp_6443: nsg.tcp_egress('Allow TCP egress for Kubernetes control plane inter-communication', ctx.nsg_cp_key, '6443'),
          nsg_service: service.tcp_egress('Allow TCP egress from OKE control plane to OCI services'),
          nsg_workers_10250: nsg.tcp_egress('Allow TCP egress for path discovery to worker nodes', ctx.nsg_workers_key, '10250'),
          nsg_workers_12250: nsg.tcp_egress_src('Allow TCP egress from control plane to worker nodes with source port 12250', ctx.nsg_workers_key, '12250'),
          nsg_workers_6443: nsg.tcp_egress_src('Allow TCP egress from control plane to worker nodes with source port 6443', ctx.nsg_workers_key, '6443'),
        } + (if ctx.is_overlay_network then {} else {
          nsg_pods: nsg.tcp_egress_any('Broad webhook rule: allow TCP egress from OKE control plane to pods on any port for API server callbacks. If removed, keep explicit 12250 and 6443 rules.', ctx.nsg_pods_key),
          nsg_pods_12250: nsg.tcp_egress_src('Allow TCP egress from OKE control plane to pods with source port 12250', ctx.nsg_pods_key, '12250'),
          nsg_pods_6443: nsg.tcp_egress_src('Allow TCP egress from OKE control plane to pods with source port 6443', ctx.nsg_pods_key, '6443'),
        }) + ctx.api_endpoint_egress_rules,

        ingress_rules: {
          nsg_cp_6443: nsg.tcp_ingress_src('Allow TCP ingress for Kubernetes control plane inter-communication on source port 6443', ctx.nsg_cp_key, '6443'),
        } + ctx.api_endpoint_ingress_rules + {
          nsg_service: service.tcp_ingress(ctx, 'Allow TCP ingress from OCI services to control plane for responses'),
          nsg_workers_10250: nsg.tcp_ingress_src('Allow TCP ingress to control plane from worker nodes for Kubelet responses on source port 10250', ctx.nsg_workers_key, '10250'),
          nsg_workers_12250: nsg.tcp_ingress('Allow TCP ingress to kube-apiserver from workers on port 12250', ctx.nsg_workers_key, '12250'),
          nsg_workers_6443: nsg.tcp_ingress('Allow TCP ingress to kube-apiserver from workers on port 6443', ctx.nsg_workers_key, '6443'),
        } + (if ctx.is_overlay_network then {} else {
          nsg_pods: nsg.tcp_ingress_any('Return pair for broad pod webhook rule: allow TCP ingress from pods to OKE control plane. If broad rule is removed, keep 12250 and 6443 rules.', ctx.nsg_pods_key),
          nsg_pods_12250: nsg.tcp_ingress('Allow TCP ingress from pods to kube-apiserver on port 12250', ctx.nsg_pods_key, '12250'),
          nsg_pods_6443: nsg.tcp_ingress('Allow TCP ingress to kube-apiserver from pods on port 6443', ctx.nsg_pods_key, '6443'),
        }),
      },

      [ctx.nsg_lb_key]: {
        display_name: n.display('nsg', ctx.display_segments + ['int-lb', 'default-backend']),
        ingress_rules: {
          nsg_workers_10256: nsg.tcp_ingress_src('Allow TCP ingress from worker nodes to load balancers for health check responses on source port 10256', ctx.nsg_workers_key, '10256'),
          nsg_workers_tcp: nsg.tcp_ingress_src_range('Allow TCP ingress from worker nodes to load balancers for service responses on source ports 30000-32767', ctx.nsg_workers_key, '30000', '32767'),
          nsg_workers_udp: nsg.udp_ingress_src_range('Allow UDP ingress from worker nodes to load balancers for service responses on source ports 30000-32767', ctx.nsg_workers_key, '30000', '32767'),
        } + (if ctx.is_overlay_network then {} else {
          nsg_pods_tcp: nsg.tcp_ingress_any('Allow TCP ingress from pods to load balancers for responses', ctx.nsg_pods_key),
          nsg_pods_udp: nsg.udp_ingress_any('Allow UDP ingress from pods to load balancers for responses', ctx.nsg_pods_key),
        }),

        egress_rules: {
          nsg_workers_tcp: nsg.tcp_egress_range('Allow TCP egress from load balancers to worker nodes for NodePort traffic', ctx.nsg_workers_key, '30000', '32767'),
          nsg_workers_udp: nsg.udp_egress_range('Allow UDP egress from load balancers to worker nodes for NodePort traffic', ctx.nsg_workers_key, '30000', '32767'),
          nsg_workers_10256: nsg.tcp_egress('Allow TCP egress from load balancers to worker nodes for health checks', ctx.nsg_workers_key, '10256'),
        } + (if ctx.is_overlay_network then {} else {
          nsg_pods_tcp: nsg.tcp_egress_any('Allow TCP egress from load balancers to pods for OCI Native Ingress and Pods as Backends', ctx.nsg_pods_key),
          nsg_pods_udp: nsg.udp_egress_any('Allow UDP egress from load balancers to pods for OCI Native Ingress and Pods as Backends', ctx.nsg_pods_key),
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
          nsg_cp: nsg.all_egress('Return pair for broad pod webhook rule: allow all egress from pods to Kubernetes control plane. Remove with matching broad ingress rule.', ctx.nsg_cp_key),
          nsg_cp_6443: nsg.tcp_egress('Allow TCP egress from pods to Kubernetes API server', ctx.nsg_cp_key, '6443'),
          nsg_lb_tcp: nsg.tcp_egress_any('Allow TCP egress from pods to load balancers', ctx.nsg_lb_key),
          nsg_lb_udp: nsg.udp_egress_any('Allow UDP egress from pods to load balancers', ctx.nsg_lb_key),
          nsg_pods: nsg.all_egress('Allow ALL egress from pods to other pods', ctx.nsg_pods_key),
          nsg_service: service.tcp_egress('Allow TCP egress from pods to OCI Services'),
          nsg_workers: nsg.all_egress('Allow ALL egress from pods to workers', ctx.nsg_workers_key),
        } + hub_public_lb.pod_egress(ctx),

        ingress_rules: {
          nsg_cp: nsg.all_ingress('Broad webhook rule: allow all ingress to pods from Kubernetes control plane. Needed for pod-hosted webhooks on arbitrary target ports.', ctx.nsg_cp_key),
          nsg_cp_6443: nsg.tcp_ingress_src('Allow TCP ingress from control plane to pods on source port 6443', ctx.nsg_cp_key, '6443'),
          nsg_lb_tcp: nsg.tcp_ingress_any('Allow TCP ingress to pods from load balancers', ctx.nsg_lb_key),
          nsg_lb_udp: nsg.udp_ingress_any('Allow UDP ingress to pods from load balancers', ctx.nsg_lb_key),
          nsg_pods: nsg.all_ingress('Allow ALL ingress to pods from other pods', ctx.nsg_pods_key),
          nsg_service: service.tcp_ingress(ctx, 'Allow TCP ingress from OCI services to pods'),
          nsg_workers: nsg.all_ingress('Allow ALL ingress to pods from workers', ctx.nsg_workers_key),
        } + hub_public_lb.pod_ingress(ctx),
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
          nsg_cp: nsg.tcp_egress_any('Return pair for hostNetwork webhook rule: allow TCP egress from workers to Kubernetes control plane on any port.', ctx.nsg_cp_key),
          nsg_cp_10250: nsg.tcp_egress('Allow TCP egress from workers to OKE control plane', ctx.nsg_cp_key, '10250'),
          nsg_cp_12250: nsg.tcp_egress('Allow TCP egress from workers to OKE control plane on port 12250', ctx.nsg_cp_key, '12250'),
          nsg_cp_6443: nsg.tcp_egress('Allow TCP egress from workers to Kubernetes API server', ctx.nsg_cp_key, '6443'),
          nsg_lb_10256: nsg.tcp_egress_src('Allow TCP egress to load balancers from workers with source port 10256', ctx.nsg_lb_key, '10256'),
          nsg_lb_tcp: nsg.tcp_egress_src_range('Allow TCP egress to load balancers from workers with source ports 30000-32767', ctx.nsg_lb_key, '30000', '32767'),
          nsg_lb_udp: nsg.udp_egress_src_range('Allow UDP egress to load balancers from workers with source ports 30000-32767', ctx.nsg_lb_key, '30000', '32767'),
          nsg_service: service.tcp_egress('Allow TCP egress from workers to OCI Services'),
          nsg_workers: nsg.all_egress('Allow ALL egress from workers to other workers', ctx.nsg_workers_key),
        } + (if ctx.is_overlay_network then {} else {
          nsg_pods: nsg.all_egress('Allow ALL egress from workers to pods', ctx.nsg_pods_key),
        }) + hub_public_lb.worker_egress(ctx),

        ingress_rules: {
          nsg_cp: nsg.tcp_ingress_any('Broad hostNetwork webhook rule: allow TCP ingress to workers from Kubernetes control plane on any port.', ctx.nsg_cp_key),
          nsg_cp_10250: nsg.tcp_ingress_src('Allow TCP ingress from control plane to workers on source port 10250', ctx.nsg_cp_key, '10250'),
          nsg_cp_12250: nsg.tcp_ingress_src('Allow TCP ingress from control plane to workers on source port 12250', ctx.nsg_cp_key, '12250'),
          nsg_cp_6443: nsg.tcp_ingress_src('Allow TCP ingress from control plane to workers on source port 6443', ctx.nsg_cp_key, '6443'),
          nsg_lb_10256: nsg.tcp_ingress('Allow TCP ingress to workers for health check from load balancer on port 10256', ctx.nsg_lb_key, '10256'),
          nsg_lb_tcp: nsg.tcp_ingress_range('Allow TCP ingress to workers from load balancers on service ports 30000-32767', ctx.nsg_lb_key, '30000', '32767'),
          nsg_lb_udp: nsg.udp_ingress_range('Allow UDP ingress to workers from load balancers on service ports 30000-32767', ctx.nsg_lb_key, '30000', '32767'),
          nsg_service: service.tcp_ingress(ctx, 'Allow TCP ingress from OCI services to workers'),
          nsg_workers: nsg.all_ingress('Allow ALL ingress to workers from other workers', ctx.nsg_workers_key),
        } + (if ctx.is_overlay_network then {} else {
          nsg_pods: nsg.all_ingress('Allow ALL ingress to workers from pods', ctx.nsg_pods_key),
        }) + hub_public_lb.worker_ingress(ctx),
      },
    }),

  vcn_specific_gateways(ctx, overlay_output=false)::
    local n = ctx.n;
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
}
