local home_config = import 'oneoe-hube-dr-home.jsonnet';
local dr_config = import 'oneoe-hube-dr-ams.jsonnet';
local lz = import 'gen/landing_zone.libsonnet';
local acceptor = import 'gen/addons/oci-lz-dr/one-oe/rpc_acceptor.libsonnet';
local requester = import 'gen/addons/oci-lz-dr/one-oe/rpc_requester.libsonnet';
local security = import 'gen/addons/oci-lz-dr/one-oe/security.libsonnet';
local observability = import 'gen/addons/oci-lz-dr/one-oe/observability.libsonnet';

local home = lz(home_config);
local dr = lz(dr_config);
local dr_observability = observability(dr_config);

{
  'home/network_acceptor.json': acceptor(home.network),
  'dr/network.json': dr.network,
  'dr/network_requester.json': requester(dr_config, dr.network),
  'dr/security.json': security(dr_config),
  'dr/observability_pre.json': dr_observability.cis2_pre,
  'dr/observability.json': dr_observability.cis2,
}
