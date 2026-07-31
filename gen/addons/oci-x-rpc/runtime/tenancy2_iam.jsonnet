local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.manual_iam_reference(
  profiles.oe1_reference,
  profiles.manual_iam_options.oe1
)
