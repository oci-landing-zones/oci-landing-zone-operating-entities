local profiles = import '../profiles.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
local requester = import '../rpc_requester.libsonnet';

requester(profiles.hub_e, lz(profiles.hub_e).network)
