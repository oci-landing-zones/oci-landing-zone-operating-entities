local naming = import "../../../../../gen/naming.libsonnet";
local topology = import "../../../../../gen/topology.libsonnet";

local config = {
  region_short_name: 'fra',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    qa: {
      shared_project_network: { network: { vcn: '10.0.96.0/21' } },
      projects: { proj1: {} },
    },
    dev: {
      shared_project_network: { network: { vcn: '10.0.88.0/21' } },
      projects: { proj1: {} },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.80.0/21' } },
      projects: { proj1: {} },
    },
    prod: {
      shared_project_network: { network: { vcn: '10.0.72.0/21' } },
      projects: { proj1: {} },
    },
  },
};

local topo = topology(config, naming('fra'));

{
  ordered_env_names: topo.ordered_env_names(),
  ordered_spoke_env_names: topo.ordered_spoke_env_names(),
  security_target_env_names: topo.security_target_env_names(),
}
