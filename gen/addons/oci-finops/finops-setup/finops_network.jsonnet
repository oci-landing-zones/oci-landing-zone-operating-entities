local one_oe_network_hub_e = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.json';
local finops_network = import '../finops_network.libsonnet';

one_oe_network_hub_e + finops_network
