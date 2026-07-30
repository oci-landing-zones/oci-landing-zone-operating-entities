// OKE network rules preserve native-CNI pod resources and overlay-CNI omissions.
// contains: "native_has_pods_subnet": true
// contains: "native_has_pods_nsg": true
// contains: "overlay_has_pods_subnet": false
// contains: "overlay_has_pods_nsg": false
// contains: "native_pods_hub_lb_rule_count": 4
local multi = import 'gen/landing_zone_multi.jsonnet';

local base_config(cni_params) = {
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.72.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              public_load_balancer: true,
            } + cni_params,
          },
        },
      },
    },
  },
};

local rendered_vcn(cni_params) =
  multi(base_config(cni_params))['network.json']
  .network_configuration.network_configuration_categories['prod-platform-oke']
  .vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'];

local native_vcn = rendered_vcn({
  pods_cidr: '10.244.0.0/16',
});
local overlay_vcn = rendered_vcn({ cni_type: 'overlay' });
local pods_subnet_key = 'SN-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY';
local pods_nsg_key = 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY';
local workers_nsg_key = 'NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY';

{
  native_has_pods_subnet: std.objectHas(native_vcn.subnets, pods_subnet_key),
  native_has_pods_nsg: std.objectHas(native_vcn.network_security_groups, pods_nsg_key),
  overlay_has_pods_subnet: std.objectHas(overlay_vcn.subnets, pods_subnet_key),
  overlay_has_pods_nsg: std.objectHas(overlay_vcn.network_security_groups, pods_nsg_key),
  native_pods_hub_lb_rule_count:
    std.length([
      key
      for direction in ['egress_rules', 'ingress_rules']
      for key in std.objectFields(native_vcn.network_security_groups[pods_nsg_key][direction])
      if std.startsWith(key, 'hub_public_lb')
    ]),
}
