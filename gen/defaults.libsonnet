// gen/defaults.libsonnet
// Default configs for all hub types.
// Each hub type gets a complete config that can be passed to config.normalize().
local address_plan = import 'data/network-address-plan.json';
local base = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  environments: {
    prod: {
      project_network: { network: { vcn: address_plan.foundation.project_vcns.prod } },
      projects: { proj1: {} },
    },
    preprod: {
      project_network: { network: { vcn: address_plan.foundation.project_vcns.preprod } },
      projects: { proj1: {} },
    },
  },
};

{
  hub_a: base { hub: { kind: 'hub_a', network: { vcn: address_plan.foundation.hub_vcn } } },
  hub_b: base { hub: { kind: 'hub_b', network: { vcn: address_plan.foundation.hub_vcn } } },
  hub_c: base { hub: { kind: 'hub_c', network: { vcn: address_plan.foundation.hub_vcn } } },
  hub_e: base { hub: { kind: 'hub_e', network: { vcn: address_plan.foundation.hub_vcn } } },
}
