// Standalone FinOps requires an explicit owner when customer tags are enabled.
// error_contains: FinOps tagging requires cost_governance.owner_email
(import 'addons/oci-finops/finops-setup/customize_tags.jsonnet')({
  environments: { qa: {} }, cost_governance: { enable_tags: true },
}, 'qa')
