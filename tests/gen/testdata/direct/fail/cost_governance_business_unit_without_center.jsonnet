// Every configured Business Unit needs a Cost Center.
// error_contains: config.cost_governance: each Business Unit must have at least one cost center
(import 'gen/lib/cost_governance.libsonnet').normalize({
  "tag_value_lists": {
    "tag-lz-business-unit": [
      "IT"
    ]
  },
  "cost_center_business_units": {}
})
