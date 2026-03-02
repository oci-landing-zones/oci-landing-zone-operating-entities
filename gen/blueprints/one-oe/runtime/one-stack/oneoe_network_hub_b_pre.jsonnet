local compose = import 'oneoe_compose.libsonnet';
local hub = import '../../../../addons/oci-hub-models/hub_b/addon_network_hub_b_pre.jsonnet';
local ip = import '../../../../addons/oci-hub-models/subnetting.libsonnet';

compose(hub, ip.hub_b,
  spoke_route_tables=['RT-FRA-LZ-HUB-FW-KEY', 'RT-FRA-LZ-HUB-MGMT-KEY'],
  fw_nsg_key='NSG-FRA-LZ-HUB-FW-KEY')
