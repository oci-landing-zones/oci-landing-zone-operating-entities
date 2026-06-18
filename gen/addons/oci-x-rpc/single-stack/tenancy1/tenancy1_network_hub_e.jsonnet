local one_oe_network_hub_e = import '../../../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.json';
local xrpc_network = import '../../xrpc_network_common.libsonnet';

one_oe_network_hub_e + xrpc_network.single_stack.tenancy1
