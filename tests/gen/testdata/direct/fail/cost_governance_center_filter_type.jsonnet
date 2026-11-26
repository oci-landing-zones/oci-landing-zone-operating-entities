// Cost-center scope filters must use arrays or null.
// error_contains: config.cost_governance.cost_center_assignments filters must be arrays of non-empty strings or null
(import 'gen/lib/cost_governance.libsonnet').normalize({
  "cost_center_assignments": {
    "CC1": {
      "environment": "prod"
    }
  }
})
