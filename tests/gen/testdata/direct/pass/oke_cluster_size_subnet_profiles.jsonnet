// OKE cluster_size profiles generate fixed native and overlay subnet layouts
local multi = import 'gen/landing_zone_multi.jsonnet';

local generated_subnets(vcn_cidr, cluster_size, cni_type='native') =
  local outputs = multi({
    hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
    environments: {
      prod: {
        platforms: {
          oke: {
            network: { vcn: vcn_cidr },
            extension: {
              type: 'oke_simple',
              params: {
                kubernetes_version: 'v1.35.2',
                services_cidr: '10.96.0.0/16',
                cluster_size: cluster_size,
                cni_type: cni_type,
                api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              },
            },
          },
        },
      },
    },
  });
  local vcn =
    outputs['network.json'].network_configuration.network_configuration_categories['prod-platform-oke'].vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'];
  {
    [key]: vcn.subnets[key].cidr_block
    for key in std.sort(std.objectFields(vcn.subnets))
  };

{
  native_small: generated_subnets('10.0.16.0/20', 'small'),
  native_medium: generated_subnets('10.0.64.0/18', 'medium'),
  native_large: generated_subnets('10.1.0.0/16', 'large'),
  overlay_small: generated_subnets('10.2.16.0/20', 'small', 'overlay'),
  overlay_medium: generated_subnets('10.2.64.0/18', 'medium', 'overlay'),
  overlay_large: generated_subnets('10.3.0.0/16', 'large', 'overlay'),
}
