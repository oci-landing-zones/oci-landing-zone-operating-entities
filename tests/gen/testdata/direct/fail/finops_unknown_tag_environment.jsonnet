// Standalone FinOps cannot attribute resources to an environment absent from the design.
// error_contains: FinOps environment must be shared or an environment in config.environments
(import 'addons/oci-finops/finops-setup/customize_tags.jsonnet')(
  import 'tests/addons/testdata/finops_qa.jsonnet', 'uat'
)
