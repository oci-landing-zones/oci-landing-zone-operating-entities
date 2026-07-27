// plain and shared platforms map to the correct network compartments
// mixed platform category keys are asserted as a stable key sequence
local multi = import 'gen/landing_zone_multi.jsonnet';
local prod_plain = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        data: {
          network: {
            vcn: '10.0.80.0/21',
            subnets: { app: '10.0.80.0/24' },
          },
        },
      },
    },
  },
});
local shared_plain = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    data: {
      network: {
        vcn: '10.0.80.0/21',
        subnets: { app: '10.0.80.0/24' },
      },
    },
  },
});
local mixed = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.96.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
        data: {
          network: {
            vcn: '10.0.112.0/24',
            subnets: { main: '10.0.112.0/28' },
          },
        },
      },
    },
  },
});
{
  prod_plain_compartment:
    prod_plain['network.json'].network_configuration.network_configuration_categories['2-prod-platform-data'].category_compartment_id,
  shared_plain_compartment:
    shared_plain['network.json'].network_configuration.network_configuration_categories['2-shared-platform-data'].category_compartment_id,
  prod_oke:
    mixed['iam.json'].compartments_configuration.compartments['CMP-LANDINGZONE-KEY']
      .children['CMP-LZ-PROD-KEY'].children['CMP-LZ-PROD-PLATFORM-KEY']
      .children['CMP-LZ-PROD-OKE-KEY'].name,
  mixed_category_keys:
    std.objectFields(mixed['network.json'].network_configuration.network_configuration_categories),
}
