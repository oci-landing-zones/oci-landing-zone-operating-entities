local published_profiles = import '../published_profiles.libsonnet';

{
  single_stack: {
    config: published_profiles.hub_e_prod_preprod_exacc_config,
  },
}
