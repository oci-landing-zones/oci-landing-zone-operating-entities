// gen/defaults.libsonnet
// Default configs for all hub types.
// Each hub type gets a complete config that can be passed to config.normalize().
local base = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
    },
  },
};

{
  hub_a: base { hub: { kind: 'hub_a', network: { vcn: '10.0.0.0/21' } } },
  hub_b: base { hub: { kind: 'hub_b', network: { vcn: '10.0.0.0/21' } } },
  hub_c: base { hub: { kind: 'hub_c', network: { vcn: '10.0.0.0/21' } } },
  hub_e: base { hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } } },
}
