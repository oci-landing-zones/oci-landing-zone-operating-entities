// Budget recipient addresses must be valid.
// error_contains: config.cost_governance.budget_recipients must contain valid email addresses
(import 'gen/lib/cost_governance.libsonnet').normalize({
  "budget_recipients": "a@b..com"
})
