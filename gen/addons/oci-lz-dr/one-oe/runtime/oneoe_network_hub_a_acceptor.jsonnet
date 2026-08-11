local final_network = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.jsonnet';
local acceptor = import '../rpc_acceptor.libsonnet';

acceptor(final_network, firewall_egress_route_table='RT-FRA-LZ-HUB-FW-INT-KEY')
