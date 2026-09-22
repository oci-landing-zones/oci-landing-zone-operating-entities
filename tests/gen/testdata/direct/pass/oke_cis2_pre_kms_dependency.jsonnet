// Config-driven CIS2 pre-security output must create the OKE key before cluster and worker deployment.
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  cis_level: 2,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    validation: {
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
});
local key = 'KEY-FRA-LZ-VALIDATION-OKE-KUBE-SECRETS-KEY';
local cluster =
  outputs['oke_clusters.json'].oke_clusters_configuration.clusters['CLR-FRA-LZ-VALIDATION-OKE-KEY'];
local worker =
  outputs['oke_workers.json'].oke_workers_configuration.node_pools['NDP-FRA-LZ-VALIDATION-OKE-KEY'];
local pre_keys = outputs['security_cis2_pre.json'].vaults_configuration.keys;
local final_keys = outputs['security_cis2.json'].vaults_configuration.keys;
{
  cluster_key_resolves_from_pre:
    cluster.encryption.kube_secret_kms_key_id == key && std.objectHas(pre_keys, key),
  final_retains_pre_key: std.objectHas(final_keys, key) && final_keys[key] == pre_keys[key],
  pre_key: pre_keys[key],
  worker_key_resolves_from_pre:
    worker.node_config_details.encryption.kms_key_id == key && std.objectHas(pre_keys, key),
}
