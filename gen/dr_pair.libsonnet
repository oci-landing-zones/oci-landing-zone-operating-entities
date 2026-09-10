// Normalize and validate two independent regional configurations for DR RPC.
//
// function(home_raw_config, dr_raw_config) -> { home, dr }
local cidrs = import 'lib/cidrs.libsonnet';
local render_context = import 'render_context.libsonnet';

local regional_side(label, raw_config) =
  local ctx = render_context.from_raw_config(raw_config);
  local rpc_present =
    std.objectHas(ctx.config, 'disaster_recovery') &&
    std.type(ctx.config.disaster_recovery) == 'object' &&
    std.objectHas(ctx.config.disaster_recovery, 'rpc') &&
    std.type(ctx.config.disaster_recovery.rpc) == 'object' &&
    std.objectHas(ctx.config.disaster_recovery.rpc, 'advertised_cidrs');
  assert rpc_present :
    '%s disaster_recovery.rpc.advertised_cidrs must be present' % label;
  assert std.type(ctx.config.disaster_recovery.rpc.advertised_cidrs) == 'array' &&
         std.length(ctx.config.disaster_recovery.rpc.advertised_cidrs) > 0 :
    '%s disaster_recovery.rpc.advertised_cidrs must be a non-empty array' % label;
  local advertised = [
    local value = ctx.config.disaster_recovery.rpc.advertised_cidrs[i];
    cidrs.validate('%s advertised_cidrs[%d]' % [label, i], value)
    for i in std.range(
      0,
      std.length(ctx.config.disaster_recovery.rpc.advertised_cidrs) - 1
    )
  ];
  assert std.length(std.set(advertised)) == std.length(advertised) :
    '%s advertised CIDRs must not contain duplicates' % label;
  local vcn_entries =
    [{ label: '%s hub VCN' % label, cidr: ctx.config.hub.network.vcn }] +
    [
      { label: '%s VCN %s' % [label, entry.name], cidr: entry.vcn }
      for entry in ctx.all_vcn_entries
    ];
  local known_vcn_cidrs = [entry.cidr for entry in vcn_entries];
  local unknown = [
    value
    for value in advertised
    if !std.member(known_vcn_cidrs, value)
  ];
  assert std.length(unknown) == 0 :
    '%s advertised CIDR %s is not a local VCN CIDR' % [label, unknown[0]];
  {
    ctx: ctx,
    advertised_cidrs: advertised,
    vcn_entries: vcn_entries,
  };

function(home_raw_config, dr_raw_config)
  local home = regional_side('home', home_raw_config);
  local dr = regional_side('dr', dr_raw_config);
  assert home.ctx.config.region != dr.ctx.config.region :
    'DR pair regions must be different';
  assert home.ctx.config.realm == dr.ctx.config.realm :
    'DR pair must use the same OCI realm';
  assert cidrs.assert_non_overlapping(
    home.vcn_entries + dr.vcn_entries,
    'Home and DR VCN CIDRs'
  );
  {
    home: home,
    dr: dr,
  }
