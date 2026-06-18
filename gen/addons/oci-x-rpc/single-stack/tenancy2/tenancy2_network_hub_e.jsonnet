local one_oe_network_hub_e = import '../../../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.json';
local xrpc_network = import '../../xrpc_network_common.libsonnet';

local cidr_rebase(value, from, to) =
  if std.type(value) == 'object' then
    { [k]: cidr_rebase(value[k], from, to) for k in std.objectFields(value) }
  else if std.type(value) == 'array' then
    [cidr_rebase(v, from, to) for v in value]
  else if std.type(value) == 'string' then
    std.strReplace(value, from, to)
  else
    value;

local one_oe_network_hub_e_tenancy2 = cidr_rebase(one_oe_network_hub_e, '10.0.', '10.1.');

one_oe_network_hub_e_tenancy2 + xrpc_network.single_stack.tenancy2
