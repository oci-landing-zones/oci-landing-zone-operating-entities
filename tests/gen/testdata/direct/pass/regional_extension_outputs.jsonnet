// Regional stacks retain every registered extension's regional contributions.
// contains: "failures": []
local generate = import 'gen/landing_zone_multi.jsonnet';
local lz = import 'gen/landing_zone.libsonnet';
local extension_configs = {
  oke: import 'tests/gen/testdata/configs/pass/platform_extension_public_load_balancer.jsonnet',
  ocvs: (import 'gen/workload-extensions/ocvs/published_profiles.libsonnet').prod_hub_e.config,
  exacs: import 'tests/gen/testdata/configs/pass/prod_preprod_exacs_uc1.jsonnet',
  exacc: import 'tests/gen/testdata/configs/pass/prod_preprod_exacc_uc1.jsonnet',
};
local configs = extension_configs + {
  mixed: extension_configs.exacs + {
    environments+: {
      prod+: {
        platforms: {
          oke: extension_configs.oke.environments.prod.platforms.oke,
          ocvs: extension_configs.ocvs.environments.prod.platforms.ocvs + {
            network: { vcn: '10.0.160.0/21' },
          },
          exacc: extension_configs.exacc.environments.prod.platforms.exacc,
        },
      },
    },
    shared_platforms+: extension_configs.exacc.shared_platforms,
  },
};
local render(kind, cis) =
  local config = configs[kind] + {
    region: 'eu-amsterdam-1',
    region_short_name: 'ams',
    stack_scope: 'regional',
    cis_level: cis,
  };
  local core = lz(config);
  local outputs = generate(config);
  local security = outputs['security_cis%d.json' % cis];
  local security_pre = outputs['security_cis%d_pre.json' % cis];
  local observability = outputs['observability_cis%d.json' % cis];
  local expected_extra = if std.objectHas(core, 'extra') then core.extra else {};
  local expected_topics = [
    key
    for key in std.objectFields(core['observability_cis%d' % cis].notifications_configuration.topics)
    if !std.member(['NOTT-LZ-CLOUDGUARD-KEY', 'NOTT-LZ-IAM-KEY'], key)
  ];
  [
    {
      name: '%s CIS%d lost workload files' % [kind, cis],
      ok: std.length([
        key
        for key in std.objectFields(expected_extra)
        if std.objectHas(outputs, key + '.json') && outputs[key + '.json'] == expected_extra[key]
      ]) == std.length(std.objectFields(expected_extra)),
    },
    {
      name: '%s CIS%d lost network or observability contributions' % [kind, cis],
      ok: outputs['network.json'] == core.network &&
          std.objectFields(observability.notifications_configuration.topics) == expected_topics &&
          observability.events_configuration == core['observability_cis%d' % cis].events_configuration,
    },
    {
      name: '%s CIS%d emits home-owned resources' % [kind, cis],
      ok: !std.objectHas(outputs, 'iam.json') && !std.objectHas(outputs, 'governance.json') &&
          !std.objectHas(security, 'cloud_guard_configuration') &&
          !std.objectHas(security, 'security_zones_configuration') &&
          !std.objectHas(security_pre, 'cloud_guard_configuration') &&
          !std.objectHas(observability, 'home_region_events_configuration'),
    },
    {
      name: '%s CIS%d has incorrect regional Vault ownership' % [kind, cis],
      ok: if cis == 1 then !std.objectHas(security, 'vaults_configuration') else
        std.objectHas(security, 'vaults_configuration') &&
        security_pre.vaults_configuration == security.vaults_configuration &&
        std.objectHas(security.vaults_configuration.vaults, 'VLT-LZ-SHARED-SECURITY-KEY') &&
        std.length([
          key
          for key in std.objectValues(security.vaults_configuration.keys)
          if std.objectHas(key, 'service_grantees') || std.objectHas(key, 'group_grantees')
        ]) == 0 &&
        !std.objectHas(security.vaults_configuration, 'existing_key_grants'),
    },
  ] + if (kind == 'oke' || kind == 'mixed') && cis == 2 then [
    {
      name: 'regional OKE encryption references do not resolve to regional keys',
      ok:
        local cluster = std.objectValues(outputs['oke_clusters.json'].oke_clusters_configuration.clusters)[0];
        local worker = std.objectValues(outputs['oke_workers.json'].oke_workers_configuration.node_pools)[0];
        local keys = security.vaults_configuration.keys;
        std.objectHas(keys, cluster.encryption.kube_secret_kms_key_id) &&
        std.objectHas(keys, worker.node_config_details.encryption.kms_key_id) &&
        keys[cluster.encryption.kube_secret_kms_key_id].compartment_id == cluster.compartment_id,
    },
  ] else [];
local checks = std.flattenArrays([
  render(kind, cis)
  for kind in std.objectFields(configs)
  for cis in [1, 2]
]);
{
  failures: [check.name for check in checks if !check.ok],
}
