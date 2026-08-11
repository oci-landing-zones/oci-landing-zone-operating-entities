local profiles = import '../profiles.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
local requester = import '../rpc_requester.libsonnet';

requester(
  profiles.hub_a,
  lz(profiles.hub_a).network,
  firewall_egress_route_table='RT-AMS-LZ-HUB-FW-INT-KEY'
)
