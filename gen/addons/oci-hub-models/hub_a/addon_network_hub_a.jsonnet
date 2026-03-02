// gen/addons/oci-hub-models/hub_a/addon_network_hub_a.jsonnet
local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render(profiles.hub_a.config).network
