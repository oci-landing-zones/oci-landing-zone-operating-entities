// IAM policy statement budget is per root-to-leaf compartment chain, not global across peer OEs.
local policy_limits = import 'gen/lib/policy_limits.libsonnet';
local make_statements(prefix, count) = [
  'allow group %s%d to inspect all-resources in tenancy' % [prefix, i]
  for i in std.range(1, count)
];

local iam = {
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
          'CMP-LZ-OE-B-KEY': {
            name: 'cmp-lz-oe-b',
            children: {
              'CMP-LZ-OE-B-PROD-KEY': { name: 'cmp-lz-oe-b-prod' },
            },
          },
        },
      },
    },
  },
  policies_configuration: {
    supplied_policies: {
      ROOT: { compartment_id: 'TENANCY-ROOT', statements: make_statements('root', 100) },
      OEA: { compartment_id: 'CMP-LZ-OE-A-KEY', statements: make_statements('oea', 300) },
      OEB: { compartment_id: 'CMP-LZ-OE-B-KEY', statements: make_statements('oeb', 300) },
    },
  },
};

local checked = policy_limits.validate(iam, 400);

{
  policy_count: policy_limits.policy_statement_count(iam),
  max_chain_statement_count: policy_limits.max_chain_statement_count(iam),
  returned_iam: std.objectHas(checked, 'policies_configuration'),
}
