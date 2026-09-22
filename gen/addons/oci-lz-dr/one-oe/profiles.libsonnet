local home_base = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  cis_level: 2,
  stack_scope: 'complete',
  security_targets: ['prod'],
  remote_peering_connections: {
    dr: {
      remote_cidrs: ['10.0.192.0/21', '10.0.200.0/21'],
      peer_region_name: 'eu-amsterdam-1',
    },
  },
  environments: {
    prod: {
      project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
    preprod: {
      project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
    },
  },
};

local dr_base = {
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  realm: 'oc1',
  cis_level: 2,
  stack_scope: 'regional',
  remote_peering_connections: {
    home: {
      remote_cidrs: ['10.0.0.0/21', '10.0.64.0/21', '10.0.128.0/21'],
      peer_id: 'RPC-FRA-LZ-HUB-DR-KEY',
      peer_region_name: 'eu-frankfurt-1',
    },
  },
  environments: {
    prod: {
      project_network: { network: { vcn: '10.0.200.0/21' } },
      projects: { proj1: {} },
    },
  },
};

local pair(kind) =
  local home = home_base + {
    hub: { kind: kind, network: { vcn: '10.0.0.0/21' } },
  };
  local dr = dr_base + {
    hub: { kind: kind, network: { vcn: '10.0.192.0/21' } },
  };
  { home: home, dr: dr };

local hub_a = pair('hub_a');
local hub_b = pair('hub_b');
local hub_c = pair('hub_c');

{
  home_hub_a: hub_a.home,
  home_hub_b: hub_b.home,
  home_hub_c: hub_c.home,
  hub_a: hub_a.dr,
  hub_b: hub_b.dr,
  hub_c: hub_c.dr,
}
