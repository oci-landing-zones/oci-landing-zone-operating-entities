local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.manual_iam_reference(
  profiles.connectivity_hub_reference,
  profiles.manual_iam_options.connectivity_hub
)
