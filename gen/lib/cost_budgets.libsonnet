// Shared monthly One-OE budget defaults and reviewed overrides.
function(overrides={}, recipients=null, excluded=[], projects=[], additional={})
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
local safe_project(project) = std.join('', [if std.length(std.findSubstr(std.asciiLower(char), 'abcdefghijklmnopqrstuvwxyz0123456789_-')) > 0 then char else '-' for char in std.stringChars(project)]);
local all_definitions = definitions + {
  ['BUDGET-PROJECT-' + std.asciiUpper(safe_project(project)) + '-KEY']: {
    name: 'budget-' + safe_project(project), tag: 'project', value: project,
    amount: definitions['BUDGET-PROJ1-KEY'].amount,
  }
  for project in std.set(projects)
  if project != 'proj1'
};
local extra_definitions = {
  [key]: { name: overrides[key].name, amount: overrides[key].amount, tag: std.substr(additional[key].tag_name, 7, std.length(additional[key].tag_name) - 7), value: additional[key].tag_value }
  for key in std.objectFields(additional)
};
local resolved_definitions = all_definitions + extra_definitions;
local default_tags = {
  [prefix + 'cost-center']: 'tobedefined',
  [prefix + 'business-unit']: 'tobedefined',
  [prefix + 'owner']: 'tobedefined',
  [prefix + 'platform']: 'governance',
  [prefix + 'environment']: 'shared',
  [prefix + 'project']: 'notapplicable',
};
{
  default_defined_tags: default_tags,
  budgets: {
    [key]:
      local base = resolved_definitions[key];
      local custom = if std.objectHas(overrides, key) then overrides[key] else {};
      local alert = if std.objectHas(custom, 'alert_rule') then custom.alert_rule else {};
      local threshold = if std.objectHas(alert, 'threshold_value') then alert.threshold_value else 80;
      local budget = base + {
        name: if std.objectHas(custom, 'name') then custom.name else base.name,
        amount: if std.objectHas(custom, 'amount') then custom.amount else base.amount,
      };
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
        defined_tags: (if is_compartment then default_tags else default_tags + { [prefix + budget.tag]: budget.value }) + { [prefix + 'platform']: 'governance', [prefix + 'environment']: 'shared' },
        alert_rule: {
          name: budget.name + '-' + std.strReplace(std.toString(threshold), '.', '-'),
          threshold_metric: 'ACTUAL',
          threshold_type: 'PERCENTAGE',
          threshold_value: threshold,
          recipients: if recipients != null then recipients else if std.objectHas(alert, 'recipients') then alert.recipients else 'email.address@example.com',
          message: 'Actual spending for %s has reached %s%% of the monthly budget.' % [scope, std.toString(threshold)],
        },
      }
    for key in std.objectFields(resolved_definitions)
    if !std.member(excluded, key)
  },
}
