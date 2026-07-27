// gen/workload-extensions/oke/simple/oke_builder.libsonnet
// Internal OKE builder used by the generic extension wrapper and published adapters.
//
// Contract:
//   {
//     metadata(params):: { default_subnets, subnet_order },
//     render(params):: { metadata, contributions },
//   }
//   params.config_params — {kubernetes_version, services_cidr, api_endpoint_allowed_cidrs, worker_image?, pods_cidr?, cni_type?, cni?, cluster_size?, public_load_balancer?}
//   params.network       — {vcn: 'cidr', subnets: {name: cidr}}
//   params.naming        — naming object
//   params.topology      — platform scope semantics from topology.libsonnet
//   params.routing       — explicit DRG route targets (null when not hub-backed)

local oke_workers = import './oke_workers.libsonnet';
local oke_clusters = import './oke_clusters.libsonnet';
local oke_network = import './oke_network.libsonnet';
local oke_iam = import './oke_iam.libsonnet';
local oke_iam_shared = import './oke_iam_shared.libsonnet';
local oke_compartments = import './oke_compartments.libsonnet';
local oke_governance = import './oke_governance.libsonnet';
local oke_security = import './oke_security.libsonnet';
local oke_context = import './oke_context.libsonnet';

{
  metadata(params):: {
    assert params.topology.scope_type == 'environment' :
      'oke_simple is supported only under environments.<environment>.platforms',
    local raw_cni_type =
      if std.objectHas(params.config_params, 'cni_type') && params.config_params.cni_type != null then
        params.config_params.cni_type
      else
        'native',
    local cni_type =
      assert std.type(raw_cni_type) == 'string' :
        'config_params.cni_type must be a string';
      assert std.member(['native', 'overlay'], raw_cni_type) :
        'config_params.cni_type must be one of: native, overlay';
      raw_cni_type,
    local is_overlay_network = cni_type == 'overlay',
    local raw_cluster_size =
      if std.objectHas(params.config_params, 'cluster_size') && params.config_params.cluster_size != null then
        params.config_params.cluster_size
      else
        null,
    local cluster_size =
      if raw_cluster_size != null then
        assert std.type(raw_cluster_size) == 'string' :
          'config_params.cluster_size must be a string';
        assert std.member(['small', 'medium', 'large'], raw_cluster_size) :
          'config_params.cluster_size must be one of: small, medium, large';
        raw_cluster_size
      else
        null,
    local vcn_prefix =
      std.parseInt(std.split(params.platform_config.network.vcn, '/')[1]),
    local cluster_vcn_prefix = {
      small: 20,
      medium: 18,
      large: 16,
    },
    local has_manual_subnets =
      std.objectHas(params.platform_config.network, 'subnets') &&
      params.platform_config.network.subnets != null,
    assert cluster_size == null ||
           !has_manual_subnets :
      'config_params.cluster_size cannot be used together with platform network.subnets',
    local auto_cluster_size =
      if cluster_size == null then 'small'
      else cluster_size,
    assert has_manual_subnets || vcn_prefix == cluster_vcn_prefix[auto_cluster_size] :
      if cluster_size == null then
        'OKE auto-subnet profile %s requires platform network.vcn prefix /%d' % [
          auto_cluster_size,
          cluster_vcn_prefix[auto_cluster_size],
        ]
      else
        'config_params.cluster_size %s requires platform network.vcn prefix /%d' % [
          cluster_size,
          cluster_vcn_prefix[cluster_size],
        ],
    local sized_profiles = {
      small: {
        subnets: {
          'control-plane': '/29',
          'int-lb': '/26',
          workers: '/23',
        } + (if is_overlay_network then {} else {
          pods: '/21',
        }),
        order: if is_overlay_network then ['workers', 'int-lb', 'control-plane'] else ['pods', 'workers', 'int-lb', 'control-plane'],
      },
      medium: {
        subnets: {
          'control-plane': '/29',
          'int-lb': '/25',
          workers: '/22',
        } + (if is_overlay_network then {} else {
          pods: '/19',
        }),
        order: if is_overlay_network then ['workers', 'int-lb', 'control-plane'] else ['pods', 'workers', 'int-lb', 'control-plane'],
      },
      large: {
        subnets: {
          'control-plane': '/29',
          'int-lb': '/24',
          workers: '/19',
        } + (if is_overlay_network then {} else {
          pods: '/17',
        }),
        order: if is_overlay_network then ['workers', 'int-lb', 'control-plane'] else ['pods', 'workers', 'int-lb', 'control-plane'],
      },
    },
    local subnet_profile =
      sized_profiles[auto_cluster_size],
    default_subnets:
      subnet_profile.subnets,
    // Explicit array order for sequential CIDR allocation in subnets.auto_subnets.
    subnet_order: subnet_profile.order,
  },

  render(params)::
    local metadata = self.metadata(params);
    local ctx = oke_context.build(params, metadata);
    {
      metadata: metadata,

      contributions: {
        oke_workers: oke_workers(ctx),
        oke_clusters: oke_clusters(ctx),
        network_pre: oke_network(ctx),
        iam: oke_iam(ctx),
        security_cis2: if ctx.cis_level == 2 then oke_security(ctx) else {},
      },
    },
  aggregate(results)::
    local contexts = [
      oke_context.build(result.render_params, result.metadata)
      for result in results
    ];
    {
      iam: oke_compartments(contexts) + oke_iam_shared(contexts),
      governance: oke_governance,
    },
}
