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
      // Published OKE packages allow Kubernetes Services to create public OCI
      // Load Balancers in the prepared Hub subnet.
      // Customer guidance requires controlled Service changes and OCI
      // integration validation before production use.
      public_load_balancer: true,
    },
  },
};
local hub_e_prod_oke_base_config = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  hub: {
    kind: 'hub_e',
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
local cis1_config = hub_e_prod_oke_base_config + {
  cis_level: 1,
};
local iam_cis2_config = hub_e_prod_oke_base_config + {
  cis_level: 2,
};

{
  kubernetes_version: kubernetes_version,
  services_cidr: services_cidr,
  api_endpoint_allowed_cidrs: api_endpoint_allowed_cidrs,

  oke_platform: oke_platform,

  cis1_config: cis1_config,
  iam_cis2_config: iam_cis2_config,
}
