// Worker and pod routes follow their own peer allowlists and automatic LB responses.
local lz = import 'gen/landing_zone.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local normalize = (import 'gen/config.libsonnet').normalize;
local platform = (import 'gen/workload-extensions/oke/simple/published_profiles.libsonnet').oke_platform;
local rules(kind, worker, pod, public_lb) =
  local config = defaults[kind] {
    environments+: { prod+: { platforms+: { oke: platform {
      extension+: { params+: {
        worker_internet_access: false, pod_internet_access: false,
        worker_spoke_access: worker, pod_spoke_access: pod,
        peer_vcn_cidrs: ['10.90.0.0/24'], public_load_balancer: public_lb,
      } },
    } } } },
  };
  lz(config).network.network_configuration.network_configuration_categories['prod-platform-oke']
    .vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'].route_tables;
local destinations(tables, role) = std.sort([
  rule.destination
  for rule in std.objectValues(tables['RT-FRA-LZ-PROD-PLATFORM-OKE-' + role + '-KEY'].route_rules)
  if rule.destination_type == 'CIDR_BLOCK'
]);
local checked(kind) =
  local workers = rules(kind, true, false, false);
  local pods = rules(kind, false, true, false);
  local lb = rules(kind, false, false, true);
  assert destinations(workers, 'WORKERS') == ['10.90.0.0/24'];
  assert destinations(workers, 'PODS') == [];
  assert destinations(pods, 'WORKERS') == [];
  assert destinations(pods, 'PODS') == ['10.90.0.0/24'];
  assert destinations(lb, 'WORKERS') == [normalize(defaults[kind]).hub.network.subnets.lb];
  assert destinations(lb, 'PODS') == [normalize(defaults[kind]).hub.network.subnets.lb];
  true;
{ [kind]: checked(kind) for kind in ['hub_a', 'hub_b', 'hub_c', 'hub_e'] }
