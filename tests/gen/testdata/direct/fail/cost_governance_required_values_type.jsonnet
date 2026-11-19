// Required-value selection must be boolean.
// error_contains: config.cost_governance.require_tag_values must be a boolean
(import 'gen/lib/cost_governance.libsonnet').normalize({
  "require_tag_values": "true"
})
