local final_network = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.jsonnet';
local acceptor = import '../rpc_acceptor.libsonnet';

acceptor(final_network)
