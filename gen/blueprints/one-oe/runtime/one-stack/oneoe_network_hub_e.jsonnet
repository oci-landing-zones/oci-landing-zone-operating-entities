local compose = import 'oneoe_compose.libsonnet';
local hub = import '../../../../addons/oci-hub-models/hub_e/addon_network_hub_e.jsonnet';
local ip = import '../../../../addons/oci-hub-models/subnetting.libsonnet';

compose(hub, ip.hub_e,
  spoke_route_tables=['RT-FRA-LZ-HUB-LB-KEY', 'RT-FRA-LZ-HUB-MGMT-KEY'],
  has_spoke_natgw=true)
