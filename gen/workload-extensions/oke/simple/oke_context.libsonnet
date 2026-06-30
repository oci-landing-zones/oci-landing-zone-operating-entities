// OKE render context and customer-authored parameter validation.

local cidrs = import '../../../lib/cidrs.libsonnet';

{
  build(params, metadata)::
  assert std.objectHas(params.config_params, 'kubernetes_version') : 'oke_simple requires config_params.kubernetes_version';
  assert std.objectHas(params.config_params, 'services_cidr') : 'oke_simple requires config_params.services_cidr';
  assert std.objectHas(params.config_params, 'api_endpoint_allowed_cidrs') :
    'oke_simple requires config_params.api_endpoint_allowed_cidrs';

	  local n = params.naming;
	  local scope = params.topology;
	  local env = scope.qualified_name;
	  local env_long_title = scope.scope_long_title;
	  local plat = scope.platform_name;
	  local key_segments = scope.key_segments + ['PLATFORM', plat];
	  local display_segments = scope.name_segments + [plat];
	  local cmp_key = scope.compartment_key;
  local routing = if std.objectHas(params, 'routing') then params.routing else null;
  local has_hub = routing != null && routing.hub != null;
  local hub_lb_cidr =
    if routing != null && std.objectHas(routing, 'hub_lb_cidr') then routing.hub_lb_cidr
    else null;
  local internet_default_target =
    if routing != null && std.objectHas(routing, 'internet_default_target')
    then routing.internet_default_target
    else 'local_natgw';
  local use_local_natgw = internet_default_target == 'local_natgw';
	  local category_key = '%s-platform-%s' % [std.asciiLower(scope.qualified_name), std.asciiLower(plat)];
  local services_cidr =
    local validated = cidrs.validate('config_params.services_cidr', params.config_params.services_cidr);
    assert !cidrs.overlaps(validated, params.network.vcn) :
      'config_params.services_cidr must not overlap platform VCN';
    validated;
  local api_endpoint_allowed_cidrs_param = params.config_params.api_endpoint_allowed_cidrs;
  assert api_endpoint_allowed_cidrs_param != null && std.type(api_endpoint_allowed_cidrs_param) == 'array' :
    'config_params.api_endpoint_allowed_cidrs must be an array';
  assert std.length(api_endpoint_allowed_cidrs_param) > 0 :
    'config_params.api_endpoint_allowed_cidrs must contain at least one CIDR';
  local api_endpoint_allowed_cidrs = [
    cidrs.validate('config_params.api_endpoint_allowed_cidrs[%d]' % i, api_endpoint_allowed_cidrs_param[i])
    for i in std.range(0, std.length(api_endpoint_allowed_cidrs_param) - 1)
  ];
  local api_endpoint_rule_key(i) =
    if std.length(api_endpoint_allowed_cidrs) == 1 then 'nsg_api_6443'
    else 'nsg_api_6443_%d' % (i + 1);
  local api_endpoint_ingress_rules = {
    [api_endpoint_rule_key(i)]: {
      description: 'Allow TCP ingress to kube-apiserver from API endpoint source CIDR %s on port 6443 for private admin access.' % api_endpoint_allowed_cidrs[i],
      protocol: 'TCP',
      dst_port_max: '6443',
      dst_port_min: '6443',
      src: api_endpoint_allowed_cidrs[i],
      src_type: 'CIDR_BLOCK',
      stateless: true,
    }
    for i in std.range(0, std.length(api_endpoint_allowed_cidrs) - 1)
  };
  local api_endpoint_egress_rules = {
    [api_endpoint_rule_key(i)]: {
      description: 'Allow TCP egress from kube-apiserver to API endpoint source CIDR %s on source port 6443 for private admin access responses.' % api_endpoint_allowed_cidrs[i],
      protocol: 'TCP',
      dst: api_endpoint_allowed_cidrs[i],
      dst_type: 'CIDR_BLOCK',
      src_port_max: '6443',
      src_port_min: '6443',
      stateless: true,
    }
    for i in std.range(0, std.length(api_endpoint_allowed_cidrs) - 1)
  };
  local cni_type =
    if std.objectHas(params.config_params, 'cni_type') && params.config_params.cni_type != null then
      assert std.type(params.config_params.cni_type) == 'string' :
        'config_params.cni_type must be a string';
      assert std.member(['native', 'overlay'], params.config_params.cni_type) :
        'config_params.cni_type must be one of: native, overlay';
      params.config_params.cni_type
    else
      'native';
  local cni =
    if std.objectHas(params.config_params, 'cni') && params.config_params.cni != null then
      assert std.type(params.config_params.cni) == 'string' :
        'config_params.cni must be a string';
      assert std.member(['vcn_native', 'flannel'], params.config_params.cni) :
        'config_params.cni must be one of: vcn_native, flannel';
      params.config_params.cni
    else if cni_type == 'overlay' then
      'flannel'
    else
      'vcn_native';
  assert cni_type != 'native' || cni == 'vcn_native' :
    'config_params.cni_type native requires config_params.cni vcn_native';
  assert cni_type != 'overlay' || cni == 'flannel' :
    'config_params.cni_type overlay requires config_params.cni flannel';
  local cluster_size =
    if std.objectHas(params.config_params, 'cluster_size') && params.config_params.cluster_size != null then
      params.config_params.cluster_size
    else
      null;
  local is_overlay_network = cni_type == 'overlay';
  local cluster_cni_type =
    if cni == 'vcn_native' then 'native'
    else 'flannel';
  local optional_cluster_kubernetes_network_config =
    if is_overlay_network || (std.objectHas(params.config_params, 'pods_cidr') && params.config_params.pods_cidr != null) then
      local raw_pods_cidr =
        if std.objectHas(params.config_params, 'pods_cidr') && params.config_params.pods_cidr != null then
          params.config_params.pods_cidr
        else
          '10.244.0.0/16';
      local pods_cidr = cidrs.validate('config_params.pods_cidr', raw_pods_cidr);
      assert !cidrs.overlaps(pods_cidr, services_cidr) :
        if is_overlay_network then
          'config_params.pods_cidr for overlay must not overlap config_params.services_cidr'
        else
          'config_params.pods_cidr must not overlap config_params.services_cidr';
      { pods_cidr: pods_cidr }
    else
      {};
  local worker_image =
    if std.objectHas(params.config_params, 'worker_image') && params.config_params.worker_image != null then
      assert std.type(params.config_params.worker_image) == 'string' :
        'config_params.worker_image must be a string';
      params.config_params.worker_image
    else
      '8.10';
	  local sn_key(suffix) =
	    n.key('SN', key_segments + [suffix]);
	  local rt_key(suffix) =
	    n.key('RT', key_segments + [suffix]);
  local checked_oke_name(label, value, max_len) =
    assert std.length(value) <= max_len :
      '%s must be %d characters or less: %s (%d)' % [label, max_len, value, std.length(value)];
    value;
  local cluster_key =
    n.key('CLR', display_segments);
  local cluster_name =
    checked_oke_name('OKE cluster name', n.display('clr', display_segments), 32);
  local node_pool_key =
    n.key('NDP', display_segments);
  local node_pool_name =
    checked_oke_name('OKE node pool name', n.display('ndp', display_segments), 32);
  {
    params: params,
    metadata: metadata,
    n: n,
	    scope: scope,
	    env: env,
    env_long_title: env_long_title,
	    plat: plat,
	    key_segments: key_segments,
	    display_segments: display_segments,
    cmp_key: cmp_key,
    routing: routing,
    has_hub: has_hub,
    hub_lb_cidr: hub_lb_cidr,
    internet_default_target: internet_default_target,
    use_local_natgw: use_local_natgw,
    category_key: category_key,
    services_cidr: services_cidr,
    api_endpoint_ingress_rules: api_endpoint_ingress_rules,
    api_endpoint_egress_rules: api_endpoint_egress_rules,
    cni_type: cni_type,
    cni: cni,
    cluster_size: cluster_size,
    cluster_cni_type: cluster_cni_type,
    is_overlay_network: is_overlay_network,
    optional_cluster_kubernetes_network_config: optional_cluster_kubernetes_network_config,
    worker_image: worker_image,
    cluster_key: cluster_key,
    cluster_name: cluster_name,
    node_pool_key: node_pool_key,
    node_pool_name: node_pool_name,
    subnets: params.network.subnets,
	    vcn_key: n.key('VCN', key_segments),
	    sgw_key: n.key('SGW', key_segments),
	    ngw_key: n.key('NGW', key_segments),
    drg_key: n.key('DRG', ['HUB']),
    sn_cp_key: sn_key('CP'),
    sn_lb_key: sn_key('INT-LB'),
    sn_pods_key: sn_key('PODS'),
    sn_workers_key: sn_key('WORKERS'),
    rt_cp_key: rt_key('CP'),
    rt_lb_key: rt_key('INT-LB'),
    rt_pods_key: rt_key('PODS'),
    rt_workers_key: rt_key('WORKERS'),
	    sl_cp_key: n.key('SL', key_segments + ['CP']),
	    sl_lb_key: n.key('SL', key_segments + ['INT-LB']),
	    sl_pods_key: n.key('SL', key_segments + ['PODS']),
	    sl_workers_key: n.key('SL', key_segments + ['WORKERS']),
	    nsg_cp_key: n.key('NSG', key_segments + ['CP']),
	    nsg_lb_key: n.key('NSG', key_segments + ['INT-LB']),
	    nsg_pods_key: n.key('NSG', key_segments + ['PODS']),
	    nsg_workers_key: n.key('NSG', key_segments + ['WORKERS']),
    dns: scope.dns,
  },
}
