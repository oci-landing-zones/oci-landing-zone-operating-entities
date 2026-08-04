// IAM policy limit validation must fail closed when a policy references a compartment not present in the generated compartment tree.
// error_contains: generated IAM policy UNKNOWN uses unknown compartment_id CMP-NOT-IN-TREE; policy limit cannot be evaluated
local policy_limits = import 'gen/lib/policy_limits.libsonnet';

policy_limits.validate({
  compartments_configuration: {
    compartments: {
      'CMP-LANDINGZONE-KEY': {
        name: 'cmp-landingzone',
        children: {},
      },
    },
  },
  policies_configuration: {
    supplied_policies: {
      UNKNOWN: {
        compartment_id: 'CMP-NOT-IN-TREE',
        statements: ['allow group test to inspect all-resources in compartment bad'],
      },
    },
  },
}, 400)
