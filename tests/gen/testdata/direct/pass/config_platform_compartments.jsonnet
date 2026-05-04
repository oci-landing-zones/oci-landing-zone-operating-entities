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
local shared_oke = multi({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    oke: {
      network: { vcn: '10.0.80.0/21' },
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
});
local mixed = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.96.0/21' },
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
            vcn: '10.0.104.0/24',
            subnets: { main: '10.0.104.0/28' },
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
  shared_oke: {
    platform_children:
      std.sort(std.objectFields(
        shared_oke['iam.json'].compartments_configuration.compartments['CMP-LANDINGZONE-KEY']
          .children['CMP-LZ-PLATFORM-KEY'].children
      )),
    category_compartment_id:
      shared_oke['network.json'].network_configuration.network_configuration_categories['shared-platform-oke'].category_compartment_id,
  },
  mixed_category_keys:
    std.objectFields(mixed['network.json'].network_configuration.network_configuration_categories),
}
