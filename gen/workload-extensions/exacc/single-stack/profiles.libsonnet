local published_profiles = import '../published_profiles.libsonnet';

{
  single_stack: {
    uc1_config: published_profiles.hub_e_prod_preprod_exacc_uc1_config,
    uc2_config: published_profiles.hub_e_prod_preprod_exacc_uc2_config,
    uc3_config: published_profiles.hub_e_prod_preprod_exacc_uc3_config,
    config: self.uc1_config,
  },
}
