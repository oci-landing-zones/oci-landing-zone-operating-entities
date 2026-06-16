local kubernetes_version = 'v1.35.2';
local services_cidr = '10.96.0.0/16';
local api_endpoint_allowed_cidrs = ['10.0.1.0/24'];
local oke_platform = {
  network: { vcn: '10.0.80.0/20' },
  extension: {
    type: 'oke_simple',
    params: {
      kubernetes_version: kubernetes_version,
      services_cidr: services_cidr,
      api_endpoint_allowed_cidrs: api_endpoint_allowed_cidrs,
    },
  },
};
local hub_oke_config(hub_kind) = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  hub: {
    kind: hub_kind,
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      platforms: {
        oke: oke_platform,
      },
    },
  },
};

{
  kubernetes_version: kubernetes_version,
  services_cidr: services_cidr,
  api_endpoint_allowed_cidrs: api_endpoint_allowed_cidrs,

  oke_platform: oke_platform,

  hub_a_prod_oke_config: hub_oke_config('hub_a'),
  hub_b_prod_oke_config: hub_oke_config('hub_b'),
  hub_c_prod_oke_config: hub_oke_config('hub_c'),
  hub_e_prod_oke_config: hub_oke_config('hub_e'),
}
