local published_profiles = import '../published_profiles.libsonnet';

{
  uc1_hub_a: {
    config: published_profiles.hub_a_prod_preprod_exacs_uc1_config,
  },
  uc1_hub_e: {
    config: published_profiles.hub_e_prod_preprod_exacs_uc1_config,
  },
  uc1: self.uc1_hub_e,
  uc2_hub_a: {
    config: published_profiles.hub_a_prod_preprod_exacs_uc2_config,
  },
  uc2_hub_e: {
    config: published_profiles.hub_e_prod_preprod_exacs_uc2_config,
  },
  uc2: self.uc2_hub_e,
  uc3_hub_a: {
    config: published_profiles.hub_a_prod_preprod_exacs_uc3_config,
  },
  uc3_hub_e: {
    config: published_profiles.hub_e_prod_preprod_exacs_uc3_config,
  },
  uc3: self.uc3_hub_e,
}
