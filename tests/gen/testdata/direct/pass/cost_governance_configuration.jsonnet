// FinOps configuration preserves required values, editable budgets, and cost-allocation metadata.
// contains: "configuration_contracts": true
local lz = import 'gen/landing_zone.libsonnet';
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local ns = 'TAGNS-LZ-COST-GOVERNANCE-KEY';
local render(settings, projects={}) = lz({
  cis_level: 1,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: { projects: projects }, preprod: { projects: projects } },
  cost_governance: settings,
}).governance;
local base = render({});
local required = render({ require_tag_values: true, owner_email: 'owner@example.com' });
local tags = required.tags_configuration.namespaces[ns].tags;
local custom = render({
  owner_email: 'owner@example.com',
  budget_recipients: 'finops@example.com',
  tag_value_lists: { 'tag-lz-business-unit': ['IT'], 'tag-lz-cost-center': ['CC900'] },
  cost_center_business_units: { CC900: 'IT' },
  exclude_budgets: ['BUDGET-COST-CENTER-CC12345-KEY', 'BUDGET-PROJ1-KEY'],
  budgets: { 'BUDGET-LANDINGZONE-KEY': {
    name: 'budget-team', amount: 12500,
    alert_rule: { threshold_value: 125.5, recipients: 'overridden@example.com' },
  } },
  additional_budgets: { 'BUDGET-CUSTOM-TEAM-KEY': {
    name: 'budget-cc900', amount: 900, tag_name: 'tag-lz-cost-center', tag_value: 'CC900',
    alert_rule: { threshold_value: 95 },
  } },
}, { payments: {} });
local budgets = custom.budgets_configuration.budgets;
local landingzone = budgets['BUDGET-LANDINGZONE-KEY'];
local budget_tags = budgets['BUDGET-ENV-PROD-KEY'].defined_tags;
local per_budget = render({ budgets: { 'BUDGET-LANDINGZONE-KEY': {
  alert_rule: { recipients: 'finops@example.com,owner@example.com' },
} } });
assert std.length(std.objectFields(tags)) == 6;
assert std.foldl(function(ok, key)
  local tag = tags[key];
  local defaults = std.objectValues(tag.tag_defaults);
  ok && std.length(defaults) == 1 && defaults[0].is_user_required &&
    defaults[0].compartment_ids == ['CMP-LANDINGZONE-KEY'] &&
    defaults[0].default_value == (if key == 'TAG-LZ-OWNER-KEY' then 'owner@example.com' else if key == 'TAG-LZ-PROJECT-KEY' then 'notapplicable' else 'tobedefined'),
  std.objectFields(tags), true);
assert std.foldl(function(ok, tag) ok && !std.objectValues(tag.tag_defaults)[0].is_user_required,
  std.objectValues(base.tags_configuration.namespaces[ns].tags), true);
assert !std.objectHas(required.tags_configuration.namespaces['TAGNS-LZ-ROLE-KEY'].tags['TAG-LZ-ROLE-KEY'], 'tag_defaults');
assert landingzone.name == 'budget-team' && landingzone.amount == 12500;
assert landingzone.target.values == ['CMP-LANDINGZONE-KEY'];
assert landingzone.alert_rule.threshold_value == 125.5 && landingzone.alert_rule.name == 'budget-team-125-5';
assert std.length(std.findSubstr('125.5%', landingzone.alert_rule.message)) == 1;
assert std.foldl(function(ok, budget) ok && budget.alert_rule.recipients == 'finops@example.com', std.objectValues(budgets), true);
assert per_budget.budgets_configuration.budgets['BUDGET-LANDINGZONE-KEY'].alert_rule.recipients == 'finops@example.com,owner@example.com';
assert !std.objectHas(budgets, 'BUDGET-PROJ1-KEY') && !std.objectHas(budgets, 'BUDGET-COST-CENTER-CC12345-KEY');
assert !std.objectHas(budgets, 'BUDGET-BUSINESS-UNIT-FINANCE-KEY') && !std.objectHas(budgets, 'BUDGET-BUSINESS-UNIT-RETAIL-KEY');
assert budgets['BUDGET-PROJECT-PAYMENTS-KEY'].target.values == [prefix + 'project.payments'];
assert budgets['BUDGET-PROJECT-PAYMENTS-KEY'].amount == 500;
assert budgets['BUDGET-CUSTOM-TEAM-KEY'].target == { type: 'TAG', values: [prefix + 'cost-center.CC900'] };
assert budgets['BUDGET-CUSTOM-TEAM-KEY'].amount == 900 && budgets['BUDGET-CUSTOM-TEAM-KEY'].alert_rule.threshold_value == 95;
assert custom.tags_configuration.namespaces[ns].tags['TAG-LZ-COST-CENTER-KEY'].valid_values == ['CC900', 'tobedefined'];
assert custom.tags_configuration.namespaces[ns].tags['TAG-LZ-BUSINESS-UNIT-KEY'].valid_values == ['IT', 'tobedefined'];
// A budget's allocation labels describe the budget resource, not the spend it measures.
assert budget_tags[prefix + 'environment'] == 'shared' && budget_tags[prefix + 'platform'] == 'governance';
assert budgets['BUDGET-ENV-PROD-KEY'].target.values == [prefix + 'environment.prod'];
{ configuration_contracts: true }
