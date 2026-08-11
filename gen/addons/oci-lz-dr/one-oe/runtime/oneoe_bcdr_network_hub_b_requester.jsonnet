local profiles = import '../profiles.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
local requester = import '../rpc_requester.libsonnet';

requester(
  profiles.hub_b,
  lz(profiles.hub_b).network,
  firewall_egress_route_table='RT-AMS-LZ-HUB-FW-KEY'
)
