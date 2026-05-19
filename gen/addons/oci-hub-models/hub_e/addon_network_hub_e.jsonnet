// gen/addons/oci-hub-models/hub_e/addon_network_hub_e.jsonnet
local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render(profiles.hub_e.config).network
