// Overlapping cost-center filters must fail instead of assigning a center arbitrarily.
// error_contains: Multiple cost centers match a resource: CC1, CC2
local contract = import 'gen/lib/cost_governance.libsonnet';
(import 'gen/lib/cost_tags.libsonnet').apply({
  compartments_configuration: { compartments: { 'CMP-LANDINGZONE-KEY': {} } },
}, { environments: {}, cost_governance: contract.normalize({ cost_center_assignments: { CC1: {}, CC2: {} } }) })
