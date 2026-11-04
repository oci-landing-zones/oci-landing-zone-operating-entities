// Monthly tag and compartment budgets for the published One-OE governance artifact.
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local definitions = {
  'BUDGET-LANDINGZONE-KEY': { name: 'budget-landingzone', compartment_key: 'CMP-LANDINGZONE-KEY', compartment_name: 'cmp-landingzone', amount: 10000 },
  'BUDGET-COST-CENTER-CC12345-KEY': { name: 'budget-cost-center-cc12345', tag: 'cost-center', value: 'CC12345', amount: 5000 },
  'BUDGET-BUSINESS-UNIT-IT-KEY': { name: 'budget-business-unit-it', tag: 'business-unit', value: 'IT', amount: 5000 },
  'BUDGET-BUSINESS-UNIT-FINANCE-KEY': { name: 'budget-business-unit-finance', tag: 'business-unit', value: 'Finance', amount: 5000 },
  'BUDGET-BUSINESS-UNIT-RETAIL-KEY': { name: 'budget-business-unit-retail', tag: 'business-unit', value: 'Retail', amount: 5000 },
  'BUDGET-ENV-PROD-KEY': { name: 'budget-env-prod', tag: 'environment', value: 'prod', amount: 3000 },
  'BUDGET-ENV-PREPROD-KEY': { name: 'budget-env-preprod', tag: 'environment', value: 'preprod', amount: 2000 },
  'BUDGET-PROJ1-KEY': { name: 'budget-proj1', tag: 'project', value: 'proj1', amount: 500 },
};
local default_tags = {
  [prefix + 'cost-center']: 'tobedefined',
  [prefix + 'business-unit']: 'tobedefined',
  [prefix + 'owner']: 'tobedefined',
  [prefix + 'platform']: 'tobedefined',
  [prefix + 'environment']: 'shared',
  [prefix + 'project']: 'notapply',
};
{
  default_defined_tags: default_tags,
  budgets: {
    [key]:
      local budget = definitions[key];
      local is_compartment = std.objectHas(budget, 'compartment_key');
      local scope = if is_compartment then 'compartment %s and its child compartments' % budget.compartment_name else 'tag-lz-%s=%s' % [budget.tag, budget.value];
      {
        name: budget.name,
        description: 'Monthly budget for %s.' % scope,
        amount: budget.amount,
        target: {
          type: if is_compartment then 'COMPARTMENT' else 'TAG',
          values: [if is_compartment then budget.compartment_key else prefix + budget.tag + '.' + budget.value],
        },
        schedule: {
          reset_period: 'MONTHLY',
          processing_period_type: 'MONTH',
          day_of_month_to_begin: 1,
        },
        defined_tags: if is_compartment then default_tags else default_tags + { [prefix + budget.tag]: budget.value },
        alert_rule: {
          name: budget.name + '-80',
          threshold_metric: 'ACTUAL',
          threshold_type: 'PERCENTAGE',
          threshold_value: 80,
          recipients: 'email.address@example.com',
          message: 'Actual spending for %s has reached 80%% of the monthly budget.' % scope,
        },
      }
    for key in std.objectFields(definitions)
  },
}
