locals {
  cost_governance_tags = var.enable_cost_governance_tags ? {
    "tagns-lz-cost-governance.tag-lz-cost-center"   = "tobedefined"
    "tagns-lz-cost-governance.tag-lz-business-unit" = "tobedefined"
    "tagns-lz-cost-governance.tag-lz-owner"         = "tobedefined"
    "tagns-lz-cost-governance.tag-lz-platform"      = "tobedefined"
    "tagns-lz-cost-governance.tag-lz-environment"   = "tobedefined"
    "tagns-lz-cost-governance.tag-lz-project"       = "notapplicable"
  } : {}
  iam_defined_tags = merge(local.cost_governance_tags, var.defined_tags)
  database_defined_tags = merge(local.iam_defined_tags, var.database_defined_tags, var.enable_cost_governance_tags ? {
    "tagns-lz-cost-governance.tag-lz-platform" = "finops"
  } : {})
}
