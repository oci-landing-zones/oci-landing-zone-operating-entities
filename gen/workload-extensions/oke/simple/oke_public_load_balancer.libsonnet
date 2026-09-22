// OKE public load balancer capability and tag contract.
//
// `public_load_balancer` is deliberately opt-in. It grants a cluster resource
// principal access to the shared Hub network, so it is not a convenience
// default. Generated platform allowlists and the one-cluster OKE platform
// compartment tag form the source boundary.

{
  tag_namespace: 'tagns-lz-oke',
  platform_tag: 'tagns-lz-oke.platform',

  is_oke_platform(platform_config)::
    std.objectHas(platform_config, 'extension') &&
    platform_config.extension != null &&
    platform_config.extension.type == 'oke_simple',

  public_load_balancer_enabled(platform_config)::
    if !self.is_oke_platform(platform_config) ||
       !std.objectHas(platform_config.extension, 'params') ||
       platform_config.extension.params == null ||
       !std.objectHas(platform_config.extension.params, 'public_load_balancer') ||
       platform_config.extension.params.public_load_balancer == null then
      false
    else
      assert std.type(platform_config.extension.params.public_load_balancer) == 'boolean' :
        'oke_simple config_params.public_load_balancer must be a boolean';
      platform_config.extension.params.public_load_balancer,

  platform_tag_value(scope_name, platform_name)::
    '%s-%s' % [std.asciiLower(scope_name), std.asciiLower(platform_name)],

  has_oke_platforms(config)::
    std.length(
      [
        platform
        for env_name in std.objectFields(config.environments)
        if std.objectHas(config.environments[env_name], 'platforms') &&
           config.environments[env_name].platforms != null
        for platform_name in std.objectFields(config.environments[env_name].platforms)
        for platform in [config.environments[env_name].platforms[platform_name]]
        if self.is_oke_platform(platform)
      ]
    ) > 0,
}
