local pre = import 'addon_network_hub_c_pre.jsonnet';
local backends = import 'hub_c_backends_overlay.libsonnet';

pre + backends
