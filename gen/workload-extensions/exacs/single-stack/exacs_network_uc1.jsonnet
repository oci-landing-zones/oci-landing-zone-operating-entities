local compose = import './oneoe_exacs_compose.libsonnet';
local hub = import '../../../../gen/addons/oci-hub-models/hub_e/addon_network_hub_e.jsonnet';
local ip = import '../../../../gen/addons/oci-hub-models/subnetting.libsonnet';

compose(hub, ip.hub_e,
  spoke_route_tables=['RT-FRA-LZ-HUB-LB-KEY', 'RT-FRA-LZ-HUB-FW-INT-KEY', 'RT-FRA-LZ-HUB-MGMT-KEY'],
  fw_nsg_key='NSG-FRA-LZ-HUB-FW-INT-KEY')