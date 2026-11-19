// Budget amounts must be positive integers.
// error_contains: config.cost_governance.budgets.BUDGET-LANDINGZONE-KEY.amount must be an integer between 1 and 999999999999
(import 'gen/lib/cost_governance.libsonnet').normalize({
  "budgets": {
    "BUDGET-LANDINGZONE-KEY": {
      "amount": 0
    }
  }
})
