// OKE network Hub public load balancer rule bundles.

local cidr = (import './oke_network_rule_factories.libsonnet').cidr;

{
  pod_ingress(ctx):: if ctx.hub_lb_cidr == null then {} else {
    hub_public_lb_tcp: cidr.tcp_ingress(
      'Allow TCP ingress to pods from Hub public LB subnet %s. OKE can create public LBs there; cross-VCN rule uses CIDR instead of NSG.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr
    ),
    hub_public_lb_udp: cidr.udp_ingress(
      'Allow UDP ingress to pods from Hub public LB subnet %s. OKE can create public LBs there; cross-VCN rule uses CIDR instead of NSG.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr
    ),
  },

  pod_egress(ctx):: if ctx.hub_lb_cidr == null then {} else {
    hub_public_lb_tcp: cidr.tcp_egress(
      'Return pair: allow TCP egress from pods to Hub public LB subnet %s for public LB traffic responses.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr
    ),
    hub_public_lb_udp: cidr.udp_egress(
      'Return pair: allow UDP egress from pods to Hub public LB subnet %s for public LB traffic responses.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr
    ),
  },

  worker_ingress(ctx):: if ctx.hub_lb_cidr == null then {} else {
    hub_public_lb_10256: cidr.tcp_ingress_dst(
      'Allow TCP ingress to workers from Hub public LB subnet %s for health checks on port 10256. Cross-VCN rule uses CIDR instead of NSG.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '10256'
    ),
    hub_public_lb_tcp: cidr.tcp_ingress_dst_range(
      'Allow TCP ingress to workers from Hub public LB subnet %s on NodePort ports 30000-32767. Mirrors internal LB rule using CIDR.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '30000',
      '32767'
    ),
    hub_public_lb_udp: cidr.udp_ingress_dst_range(
      'Allow UDP ingress to workers from Hub public LB subnet %s on NodePort ports 30000-32767. Mirrors internal LB rule using CIDR.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '30000',
      '32767'
    ),
  },

  worker_egress(ctx):: if ctx.hub_lb_cidr == null then {} else {
    hub_public_lb_10256: cidr.tcp_egress_src(
      'Return pair: allow TCP egress from workers to Hub public LB subnet %s with source port 10256 for health checks.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '10256'
    ),
    hub_public_lb_tcp: cidr.tcp_egress_src_range(
      'Return pair: allow TCP egress from workers to Hub public LB subnet %s with source ports 30000-32767 for NodePort responses.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '30000',
      '32767'
    ),
    hub_public_lb_udp: cidr.udp_egress_src_range(
      'Return pair: allow UDP egress from workers to Hub public LB subnet %s with source ports 30000-32767 for NodePort responses.' % ctx.hub_lb_cidr,
      ctx.hub_lb_cidr,
      '30000',
      '32767'
    ),
  },
}
