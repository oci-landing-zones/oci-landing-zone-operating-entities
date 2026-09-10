local defaults = import '../../../defaults.libsonnet';

local base = {
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  realm: 'oc1',
  environments: {
    prod: {
      shared_project_network: {
        network: {
          vcn: '10.0.200.0/21',
        },
      },
      projects: {
        proj1: {},
      },
    },
  },
  disaster_recovery: {
    rpc: {
      advertised_cidrs: ['10.0.200.0/21'],
    },
  },
};

local profile(kind) = base + {
  hub: {
    kind: kind,
    network: {
      vcn: '10.0.192.0/21',
    },
  },
};
local hub_a = profile('hub_a');
local hub_b = profile('hub_b');
local hub_c = profile('hub_c');
local hub_e = profile('hub_e');
local home_profile(kind) = defaults[kind] + {
  disaster_recovery: {
    rpc: {
      advertised_cidrs: [
        '10.0.0.0/21',
        '10.0.64.0/21',
        '10.0.128.0/21',
      ],
    },
  },
};
local dr_profiles = {
  hub_a: hub_a,
  hub_b: hub_b,
  hub_c: hub_c,
  hub_e: hub_e,
};

{
  hub_a: hub_a,
  hub_b: hub_b,
  hub_c: hub_c,
  hub_e: hub_e,
  kms_pair: {
    home: defaults.hub_a,
    dr: hub_a,
  },
  rpc_pairs: {
    [kind]: {
      home: home_profile(kind),
      dr: dr_profiles[kind],
    }
    for kind in std.objectFields(dr_profiles)
  },
}
