// Multi-OE ExaCS qualifies identical prod/exacs platform networks, database tiers, IAM, and observability.
// contains: "alpha_vcn": "VCN-FRA-LZ-ALPHA-PROD-PLATFORM-EXACS-KEY"
// contains: "beta_vcn": "VCN-FRA-LZ-BETA-PROD-PLATFORM-EXACS-KEY"
// contains: "alpha_vcn_dns": "vcnfralzalpxc"
// contains: "beta_vcn_dns": "vcnfralzbepxc"
local landing_zone = import 'gen/landing_zone.libsonnet';

local exacs_platform(vcn) = {
  network: { vcn: vcn },
  extension: {
    type: 'exacs',
    params: {
      project_db_compartments: ['proj1'],
      notification_emails: {
        default: ['exacs-platform@example.com'],
        projects: ['exacs-projects@example.com'],
      },
    },
  },
};

local result = landing_zone({
  cis_level: 1,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      display_name: 'Alpha',
      dns: 'al',
      environments: {
        prod: {
          projects: { proj1: {} },
          platforms: { exacs: exacs_platform('10.2.16.0/21') },
        },
      },
    },
    beta: {
      display_name: 'Beta',
      dns: 'be',
      environments: {
        prod: {
          projects: { proj1: {} },
          platforms: { exacs: exacs_platform('10.3.16.0/21') },
        },
      },
    },
  },
});

local root = result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local alpha_env = root['CMP-LZ-ALPHA-KEY'].children['CMP-LZ-ALPHA-PROD-KEY'].children;
local beta_env = root['CMP-LZ-BETA-KEY'].children['CMP-LZ-BETA-PROD-KEY'].children;
local categories = result.network.network_configuration.network_configuration_categories;
local alpha_vcn_key = 'VCN-FRA-LZ-ALPHA-PROD-PLATFORM-EXACS-KEY';
local beta_vcn_key = 'VCN-FRA-LZ-BETA-PROD-PLATFORM-EXACS-KEY';
local alpha_vcn = categories['alpha-prod-platform-exacs'].vcns[alpha_vcn_key];
local beta_vcn = categories['beta-prod-platform-exacs'].vcns[beta_vcn_key];
local policies = result.iam.policies_configuration.supplied_policies;
local topics = result.observability_cis1.notifications_configuration.topics;

assert std.objectHas(
  alpha_env['CMP-LZ-ALPHA-PROD-PROJECTS-KEY']
    .children['CMP-LZ-ALPHA-PROD-PROJ1-KEY'].children,
  'CMP-LZ-ALPHA-PROD-PROJ1-EXACS-DB-KEY'
);
assert std.objectHas(
  beta_env['CMP-LZ-BETA-PROD-PROJECTS-KEY']
    .children['CMP-LZ-BETA-PROD-PROJ1-KEY'].children,
  'CMP-LZ-BETA-PROD-PROJ1-EXACS-DB-KEY'
);
assert std.objectHas(policies, 'PCY-LZ-ALPHA-PROD-EXACS-PROJ1-ADMIN-KEY');
assert std.objectHas(policies, 'PCY-LZ-BETA-PROD-EXACS-PROJ1-ADMIN-KEY');
assert std.objectHas(topics, 'NOTT-LZ-ALPHA-PROD-EXACS-PROJECTS-KEY');
assert std.objectHas(topics, 'NOTT-LZ-BETA-PROD-EXACS-PROJECTS-KEY');
assert alpha_vcn.dns_label != beta_vcn.dns_label;

{
  alpha_vcn: alpha_vcn_key,
  beta_vcn: beta_vcn_key,
  alpha_vcn_dns: alpha_vcn.dns_label,
  beta_vcn_dns: beta_vcn.dns_label,
}
