local profiles = import '../profiles.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
local requester = import '../rpc_requester.libsonnet';

requester(
  profiles.hub_c,
  lz(profiles.hub_c).network_backends,
  firewall_egress_route_table='RT-AMS-LZ-HUB-TRUST-KEY'
)
