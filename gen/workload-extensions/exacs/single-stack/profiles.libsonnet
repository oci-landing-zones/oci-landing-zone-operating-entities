local published_profiles = import '../published_profiles.libsonnet';

{
  uc1: {
    config: published_profiles.hub_e_prod_preprod_exacs_uc1_config,
  },
  uc2: {
    config: published_profiles.hub_e_prod_preprod_exacs_uc2_config,
  },
  uc3: {
    config: published_profiles.hub_e_prod_preprod_exacs_uc3_config,
  },
}
