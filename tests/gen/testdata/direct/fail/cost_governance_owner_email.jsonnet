// Owner must be one valid email address.
// error_contains: config.cost_governance.owner_email must be one valid email address
(import 'gen/lib/cost_governance.libsonnet').normalize({
  "owner_email": "one@example.com,two@example.com"
})
