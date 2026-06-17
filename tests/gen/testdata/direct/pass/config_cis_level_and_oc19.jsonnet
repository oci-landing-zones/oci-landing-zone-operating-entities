// config-mode can select CIS level 1 outputs and render OC19 realm-specific constants
local multi = import 'gen/landing_zone_multi.jsonnet';
local base_config = {
  region: 'eu-frankfurt-2',
  region_short_name: 'str',
  realm: 'oc19',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
};
local outputs = multi(base_config + { cis_level: 1 });
local default_cis_outputs = multi(base_config);
local service_policy =
  outputs['iam.json'].policies_configuration.supplied_policies['PCY-SERVICES-ADMIN-KEY'];
local cost_policy =
  outputs['iam.json'].policies_configuration.supplied_policies['PCY-COST-ADMIN-KEY'];
local security_recipes =
  outputs['security_cis1.json'].security_zones_configuration.recipes;
local observability_bucket =
  outputs['observability_cis1.json'].service_connectors_configuration.buckets['BKT-LZ-SERVICE-CONNECTOR-KEY'];
local cis2_vault_key =
  default_cis_outputs['security_cis2.json'].vaults_configuration.keys['KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY'];
{
  cis2_output_files: std.sort(std.objectFields(default_cis_outputs)),
  cis2_vault_service_grantees: cis2_vault_key.service_grantees,
  cost_policy_statements: cost_policy.statements,
  observability_bucket_cis_level: observability_bucket.cis_level,
  output_files: std.sort(std.objectFields(outputs)),
  services_key_policy_statement: service_policy.statements[std.length(service_policy.statements) - 1],
  shared_network_policy_ocid:
    security_recipes['SZ-RCP-LZ-02-SHARED-NETWORK-KEY'].security_policies_ocids[0],
}
