local published_profiles = import '../published_profiles.libsonnet';

{
  multi_stack: {
    config: published_profiles.hub_e_prod_preprod_exacc_config,
    uc1_config: published_profiles.hub_e_prod_preprod_exacc_uc1_config,
    uc2_config: published_profiles.hub_e_prod_preprod_exacc_uc2_config,
    uc3_config: published_profiles.hub_e_prod_preprod_exacc_uc3_config,
  },
}
