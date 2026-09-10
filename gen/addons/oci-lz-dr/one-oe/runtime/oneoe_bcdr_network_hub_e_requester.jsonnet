local profiles = import '../profiles.libsonnet';
local dr_pair = import '../../../../dr_pair.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
local requester = import '../rpc_requester.libsonnet';

local pair_profile = profiles.rpc_pairs.hub_e;
local pair = dr_pair(pair_profile.home, pair_profile.dr);
requester(pair.dr, pair.home, lz(pair.dr.ctx.config).network)
