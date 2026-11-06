// Upstream grows the filesystem and bootstraps OKE; only CIS2 adds FSS installation cloud-config.
// contains: "cis1_boot_volume_size": 60
// contains: "cis1_cloud_init_absent": true
// contains: "cis2_boot_volume_size": 80
// contains: "cis2_cloud_init_count": 1
// contains: "cis2_content_type": "text/cloud-config"
// contains: "cis2_cloud_config_header": true
// contains: "cis2_fss_utils": true
// contains: "cis2_runtime_repo_selection": true
// contains: "upstream_bootstrap_override_failures": []
// contains: "custom_bootstrap_commands_absent": true
local multi = import 'gen/landing_zone_multi.jsonnet';

local render(cis_level, worker_boot_volume_size=null) =
  local outputs = multi({
    cis_level: cis_level,
    hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
    environments: {
      prod: {
        platforms: {
          oke: {
            network: { vcn: '10.0.80.0/20' },
            extension: {
              type: 'oke_simple',
              params: {
                kubernetes_version: 'v1.35.2',
                services_cidr: '10.96.0.0/16',
                api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              } + if worker_boot_volume_size == null then {} else {
                worker_boot_volume_size: worker_boot_volume_size,
              },
            },
          },
        },
      },
    },
  });
  local deployment = std.objectValues(outputs['oke.json'].oke_configuration)[0];
  assert !std.objectHas(deployment.workers_configuration, 'default_disable_default_cloud_init') ||
         deployment.workers_configuration.default_disable_default_cloud_init == false;
  assert !std.objectHas(deployment.workers_configuration, 'default_node_metadata') ||
         !std.objectHas(deployment.workers_configuration.default_node_metadata, 'user_data');
  std.objectValues(deployment.workers_configuration.worker_pools)[0];

local cis1 = render(1);
local cis2 = render(2, 80);
local has(script, value) = std.length(std.findSubstr(value, script)) > 0;

{
  cis1_boot_volume_size: cis1.boot_volume_size,
  cis1_cloud_init_absent: !std.objectHas(cis1, 'cloud_init'),
  cis2_boot_volume_size: cis2.boot_volume_size,
  cis2_cloud_init_count: std.length(cis2.cloud_init),
  cis2_content_type: cis2.cloud_init[0].content_type,
  cis2_cloud_config_header: std.startsWith(cis2.cloud_init[0].content, '#cloud-config\n'),
  cis2_fss_utils: has(cis2.cloud_init[0].content, 'dnf install -y') && has(cis2.cloud_init[0].content, 'oci-fss-utils'),
  cis2_runtime_repo_selection:
    has(cis2.cloud_init[0].content, '. /etc/os-release') &&
    has(cis2.cloud_init[0].content, 'ol${VERSION_ID%%.*}_developer'),
  upstream_bootstrap_override_failures: [
    level
    for level in ['cis1', 'cis2']
    for worker in [if level == 'cis1' then cis1 else cis2]
    if std.objectHas(worker, 'user_data') ||
       (std.objectHas(worker, 'node_metadata') && std.objectHas(worker.node_metadata, 'user_data')) ||
       (std.objectHas(worker, 'disable_default_cloud_init') && worker.disable_default_cloud_init != false)
  ],
  custom_bootstrap_commands_absent:
    !has(cis2.cloud_init[0].content, 'oci-growfs') &&
    !has(cis2.cloud_init[0].content, 'oke_init_script'),
}
