// Budget percentages must stay within the supported range.
// error_contains: config.cost_governance.budgets.BUDGET-LANDINGZONE-KEY.alert_rule.threshold_value must be greater than 0 and at most 10000
(import 'gen/lib/cost_governance.libsonnet').normalize({
  "budgets": {
    "BUDGET-LANDINGZONE-KEY": {
      "alert_rule": {
        "threshold_value": 10001
      }
    }
  }
})
