local hub_c = import 'oneoe_network_hub_c.jsonnet';
local backends = import '../../../../addons/oci-hub-models/hub_c/hub_c_backends_overlay.libsonnet';

hub_c + backends
