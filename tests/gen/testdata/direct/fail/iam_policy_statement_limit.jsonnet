// IAM rendering fails when one root-to-leaf compartment chain exceeds the 400-statement safety budget.
// error_contains: generated IAM policy statements exceed safety limit of 400 for compartment chain TENANCY-ROOT > CMP-LANDINGZONE-KEY > CMP-LZ-OE-A-KEY > CMP-LZ-OE-A-PROD-KEY
local policy_limits = import 'gen/lib/policy_limits.libsonnet';
local make_statements(prefix, count) = [
  'allow group %s%d to inspect all-resources in tenancy' % [prefix, i]
  for i in std.range(1, count)
];

policy_limits.validate({
  compartments_configuration: {
    compartments: {
      'CMP-LANDINGZONE-KEY': {
        name: 'cmp-landingzone',
        children: {
          'CMP-LZ-OE-A-KEY': {
            name: 'cmp-lz-oe-a',
            children: {
              'CMP-LZ-OE-A-PROD-KEY': { name: 'cmp-lz-oe-a-prod' },
            },
          },
        },
      },
    },
  },
  policies_configuration: {
    supplied_policies: {
      ROOT: { compartment_id: 'TENANCY-ROOT', statements: make_statements('root', 100) },
      LZ: { compartment_id: 'CMP-LANDINGZONE-KEY', statements: make_statements('lz', 201) },
      OEA: { compartment_id: 'CMP-LZ-OE-A-KEY', statements: make_statements('oea', 100) },
    },
  },
}, 400)
