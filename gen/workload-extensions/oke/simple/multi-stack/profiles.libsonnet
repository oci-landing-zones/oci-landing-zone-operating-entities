local published_profiles = import '../published_profiles.libsonnet';

{
  multi_stack: {
    config: published_profiles.hub_e_prod_oke_config,
  },
}
