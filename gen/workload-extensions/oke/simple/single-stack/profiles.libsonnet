local published_profiles = import '../published_profiles.libsonnet';

{
  single_stack: {
    cis1_config: published_profiles.cis1_config,
    iam_cis2_config: published_profiles.iam_cis2_config,
  },
}
