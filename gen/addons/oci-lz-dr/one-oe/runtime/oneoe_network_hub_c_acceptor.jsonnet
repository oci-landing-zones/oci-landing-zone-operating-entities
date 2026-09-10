local profiles = import '../profiles.libsonnet';
local dr_pair = import '../../../../dr_pair.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
local acceptor = import '../rpc_acceptor.libsonnet';

local pair_profile = profiles.rpc_pairs.hub_c;
local pair = dr_pair(pair_profile.home, pair_profile.dr);
acceptor(pair.home, pair.dr, lz(pair.home.ctx.config).network)
