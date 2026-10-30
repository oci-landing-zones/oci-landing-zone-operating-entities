// Additional VCN-local NSG for bidirectional access to configured peer VCNs.
{
  cidrs(ctx):: ctx.peer_vcn_cidrs,
  key(ctx):: ctx.n.key('NSG', ctx.key_segments + ['PEERING']),
  worker_ids(ctx):: if ctx.worker_spoke_access && std.length(self.cidrs(ctx)) > 0 then [self.key(ctx)] else [],
  pod_ids(ctx):: if !ctx.is_overlay_network && ctx.pod_spoke_access && std.length(self.cidrs(ctx)) > 0 then [self.key(ctx)] else [],
  resources(ctx)::
    local cidrs = self.cidrs(ctx);
    if std.length(self.worker_ids(ctx) + self.pod_ids(ctx)) == 0 then {} else {
      [self.key(ctx)]: {
        display_name: ctx.n.display('nsg', ctx.display_segments + ['peering']),
        ingress_rules: {
          ['peer-%d' % i]: {
            description: 'Allow ingress from peered VCN ' + cidrs[i],
            protocol: 'ALL', src: cidrs[i], src_type: 'CIDR_BLOCK', stateless: true,
          }
          for i in std.range(0, std.length(cidrs) - 1)
        },
        egress_rules: {
          ['peer-%d' % i]: {
            description: 'Allow egress to peered VCN ' + cidrs[i],
            protocol: 'ALL', dst: cidrs[i], dst_type: 'CIDR_BLOCK', stateless: true,
          }
          for i in std.range(0, std.length(cidrs) - 1)
        },
      },
    },
}
