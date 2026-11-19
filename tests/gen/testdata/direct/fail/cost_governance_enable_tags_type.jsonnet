// FinOps activation must be boolean.
// error_contains: config.cost_governance.enable_tags must be a boolean
(import 'gen/lib/cost_governance.libsonnet').normalize({
  "enable_tags": "false"
})
