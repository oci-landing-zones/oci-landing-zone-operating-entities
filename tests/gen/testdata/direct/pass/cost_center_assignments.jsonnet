// Cost-center filters intersect across dimensions and map each center to its Business Unit.
// contains: "assignment_contracts": true
local tags = import 'gen/lib/cost_tags.libsonnet';
local contract = import 'gen/lib/cost_governance.libsonnet';
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local document = {
  network_configuration: { vcns: { 'VCN-PROD-PAYMENTS-KEY': {}, 'VCN-PREPROD-PAYMENTS-KEY': {} } },
  compartments_configuration: { compartments: { 'CMP-LANDINGZONE-KEY': {} } },
  tags_configuration: { namespaces: { KEEP: {} } },
};
local apply(assignments, doc=document) = tags.apply(doc, {
  environments: { [env]: { projects: { payments: {} } } for env in ['prod', 'preprod'] },
  cost_governance: contract.normalize({
    cost_center_assignments: assignments,
    cost_center_business_units: { CC1: 'IT' },
  }),
});
local scoped = apply({ CC1: { platform: ['network'], environment: ['prod'], project: ['payments'] } });
local alternatives = apply({ CC1: { platform: ['security', 'network'], environment: ['prod', 'preprod'] } });
local unrestricted = apply({ CC1: { platform: null, environment: [], project: null } });
local explicit = apply({ CC1: {} }, { budgets_configuration: { budgets: { BUDGET: {
  defined_tags: { [prefix + 'cost-center']: 'CC2', 'role.keep': 'yes' },
} } } });
local implicit = apply({ CC1: { platform: ['network'], environment: ['prod'] } }, {
  oke_configuration: { 'OKE-PROD-KEY': { cluster_configuration: {} } },
}).oke_configuration['OKE-PROD-KEY'].cluster_configuration;
assert scoped.network_configuration.vcns['VCN-PROD-PAYMENTS-KEY'].defined_tags[prefix + 'cost-center'] == 'CC1';
assert scoped.network_configuration.vcns['VCN-PROD-PAYMENTS-KEY'].defined_tags[prefix + 'business-unit'] == 'IT';
assert scoped.network_configuration.vcns['VCN-PREPROD-PAYMENTS-KEY'].defined_tags[prefix + 'cost-center'] == 'tobedefined';
assert scoped.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].defined_tags[prefix + 'cost-center'] == 'tobedefined';
assert scoped.tags_configuration == document.tags_configuration;
assert std.foldl(function(ok, vcn) ok && vcn.defined_tags[prefix + 'cost-center'] == 'CC1', std.objectValues(alternatives.network_configuration.vcns), true);
assert unrestricted.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].defined_tags[prefix + 'cost-center'] == 'CC1';
assert explicit.budgets_configuration.budgets.BUDGET.defined_tags == { [prefix + 'cost-center']: 'CC2', 'role.keep': 'yes' };
assert implicit.defined_tags[prefix + 'cost-center'] == 'tobedefined';
assert implicit.options.service_lb_config.defined_tags[prefix + 'cost-center'] == 'CC1';
assert implicit.options.persistent_volume_config.defined_tags[prefix + 'cost-center'] == 'tobedefined';
{ assignment_contracts: true }
