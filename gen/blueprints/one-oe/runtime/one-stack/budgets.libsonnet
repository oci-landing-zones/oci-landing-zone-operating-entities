// Monthly tag budgets for the published One-OE governance artifact.
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local definitions = {
  'BUDGET-PROJ1-KEY': { name: 'budget-proj1', tag: 'project', value: 'proj1', amount: 500 },
  'BUDGET-ENV-PROD-KEY': { name: 'budget-env-prod', tag: 'environment', value: 'prod', amount: 3000 },
  'BUDGET-ENV-PREPROD-KEY': { name: 'budget-env-preprod', tag: 'environment', value: 'preprod', amount: 2000 },
  'BUDGET-BUSINESS-UNIT-IT-KEY': { name: 'budget-business-unit-it', tag: 'business-unit', value: 'IT', amount: 5000 },
  'BUDGET-COST-CENTER-CC12345-KEY': { name: 'budget-cost-center-cc12345', tag: 'cost-center', value: 'CC12345', amount: 5000 },
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
      {
        name: budget.name,
        description: 'Monthly budget for tag-lz-%s=%s.' % [budget.tag, budget.value],
        amount: budget.amount,
        target: {
          type: 'TAG',
          values: [prefix + budget.tag + '.' + budget.value],
        },
        schedule: {
          reset_period: 'MONTHLY',
          processing_period_type: 'MONTH',
          day_of_month_to_begin: 1,
        },
        defined_tags: default_tags { [prefix + budget.tag]: budget.value },
        alert_rule: {
          name: budget.name + '-80',
          threshold_metric: 'ACTUAL',
          threshold_type: 'PERCENTAGE',
          threshold_value: 80,
          recipients: 'email.address@example.com',
          message: 'Actual spending for tag-lz-%s=%s has reached 80%% of the monthly budget.' % [budget.tag, budget.value],
        },
      }
    for key in std.objectFields(definitions)
  },
}
