// OKE worker cloud-init always grows the root filesystem and CIS2 also installs oci-fss-utils for OL8/OL9.
// contains: "cis1_boot_volume_size": 60
// contains: "cis1_shell_header": true
// contains: "cis1_growfs": true
// contains: "cis1_oke_bootstrap": true
// contains: "cis1_fss_utils": false
// contains: "cis2_boot_volume_size": 80
// contains: "cis2_growfs": true
// contains: "cis2_fss_utils": true
// contains: "cis2_runtime_repo_selection": true
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
  local node_pools = outputs['oke_workers.json'].oke_workers_configuration.node_pools;
  node_pools[std.objectFields(node_pools)[0]].node_config_details;

local cis1 = render(1);
local cis2 = render(2, 80);
local has(script, value) = std.length(std.findSubstr(value, script)) > 0;

{
  cis1_boot_volume_size: cis1.boot_volume_size,
  cis1_shell_header: std.startsWith(cis1.cloud_init.heredoc_script, '#!/bin/bash\n'),
  cis1_growfs: has(cis1.cloud_init.heredoc_script, 'oci-growfs -y'),
  cis1_oke_bootstrap: has(cis1.cloud_init.heredoc_script, 'metadata/oke_init_script'),
  cis1_fss_utils: has(cis1.cloud_init.heredoc_script, 'oci-fss-utils'),
  cis2_boot_volume_size: cis2.boot_volume_size,
  cis2_growfs: has(cis2.cloud_init.heredoc_script, 'oci-growfs -y'),
  cis2_fss_utils: has(cis2.cloud_init.heredoc_script, 'oci-fss-utils'),
  cis2_runtime_repo_selection:
    has(cis2.cloud_init.heredoc_script, 'ol${VERSION_ID%%.*}_developer'),
}
