// Standalone FinOps must not emit shared resources with unresolved business values.
// error_contains: FinOps tagging requires complete cost center and Business Unit assignments for shared and selected environment/platform scopes
local cfg = import 'tests/addons/testdata/finops_qa.jsonnet';
(import 'addons/oci-finops/finops-setup/customize_tags.jsonnet')(cfg + {
  cost_governance+: { cost_center_assignments: { QA: { environment: ['qa'] } }, cost_center_business_units: { QA: 'QA' } },
}, 'qa')
