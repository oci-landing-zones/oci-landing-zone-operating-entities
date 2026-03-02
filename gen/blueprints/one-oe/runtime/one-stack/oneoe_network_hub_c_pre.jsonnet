local compose = import 'oneoe_compose.libsonnet';
local hub = import '../../../../addons/oci-hub-models/hub_c/addon_network_hub_c_pre.jsonnet';
local ip = import '../../../../addons/oci-hub-models/subnetting.libsonnet';

compose(hub, ip.hub_c,
  spoke_route_tables=['RT-FRA-LZ-HUB-LB-KEY', 'RT-FRA-LZ-HUB-MGMT-KEY', 'RT-FRA-LZ-HUB-TRUST-KEY'],
  fw_nsg_key='NSG-FRA-LZ-HUB-TRUST-NLB-KEY')
