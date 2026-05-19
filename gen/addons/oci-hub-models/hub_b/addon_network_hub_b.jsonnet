// gen/addons/oci-hub-models/hub_b/addon_network_hub_b.jsonnet
local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render(profiles.hub_b.config).network
