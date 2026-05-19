// gen/addons/oci-hub-models/hub_c/addon_network_hub_c_pre.jsonnet
local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render(profiles.hub_c.config).network_pre
