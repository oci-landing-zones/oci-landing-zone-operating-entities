// Adapt tag metadata only; published topology, policies and resource identifiers remain unchanged.
local cost_governance = import '../../../gen/lib/cost_governance.libsonnet';
local cost_scope = import '../../../gen/lib/cost_scope.libsonnet';
local cost_tags = import '../../../gen/lib/cost_tags.libsonnet';
local iam_template = import 'finops_iam.auto.tfvars.json';
local network_template = import 'finops_network.auto.tfvars.json';
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local without_samples(doc) = cost_tags.apply(doc, { cost_governance: { enable_tags: false } });

function(config, environment)
assert std.type(config) == 'object' && std.objectHas(config, 'cost_governance') : 'FinOps tagging requires config.cost_governance';
assert std.type(environment) == 'string' && (environment == 'shared' ||
  (std.objectHas(config, 'environments') && std.objectHas(config.environments, environment))) :
  'FinOps environment must be shared or an environment in config.environments';
local governance = cost_governance.normalize(config.cost_governance, projects=cost_governance.project_names(config));
assert !governance.enable_tags || std.objectHas(governance, 'owner_email') : 'FinOps tagging requires cost_governance.owner_email';
local tag_config = config + { environments: if std.objectHas(config, 'environments') then config.environments else {}, cost_governance: governance };
local clean_iam = without_samples(iam_template);
local root = clean_iam.compartments_configuration.compartments['CMP-LANDINGZONE-P-KEY'];
local platform = root.children['CMP-LZP-PLATFORM-KEY'];
local finops = platform.children['CMP-LZP-PLATFORM-FINOPS-KEY'];
local mark_collection(objects) = { [key]: cost_scope.mark(objects[key], environment) for key in std.objectFields(objects) };
local iam = clean_iam {
  compartments_configuration+: {
    compartments+: {
      'CMP-LANDINGZONE-P-KEY': cost_scope.mark(root, 'shared', platform='iam') {
        children+: {
          'CMP-LZP-NETWORK-KEY': cost_scope.mark(root.children['CMP-LZP-NETWORK-KEY'], 'shared', platform='network'),
          'CMP-LZP-SECURITY-KEY': cost_scope.mark(root.children['CMP-LZP-SECURITY-KEY'], 'shared', platform='security'),
          'CMP-LZP-PLATFORM-KEY': cost_scope.mark(platform, 'shared', platform='iam') {
            children+: { 'CMP-LZP-PLATFORM-FINOPS-KEY': cost_scope.mark(finops, environment, platform='finops') },
          },
        },
      },
    },
  },
  dynamic_groups_configuration+: { dynamic_groups: mark_collection(clean_iam.dynamic_groups_configuration.dynamic_groups) },
  groups_configuration+: { groups: mark_collection(clean_iam.groups_configuration.groups) },
  policies_configuration+: { supplied_policies: mark_collection(clean_iam.policies_configuration.supplied_policies) },
};
local clean_network = without_samples(network_template);
local categories = clean_network.network_configuration.network_configuration_categories;
local drg = categories.shared.non_vcn_specific_gateways.dynamic_routing_gateways['DRG-FRA-LZP-HUB-KEY'];
local network = clean_network {
  network_configuration+: {
    network_configuration_categories+: {
      finops+: {
        vcns+: { 'VCN-FRA-LZP-P-FINOPS-KEY': cost_scope.mark(categories.finops.vcns['VCN-FRA-LZP-P-FINOPS-KEY'], environment) },
      },
      shared+: {
        non_vcn_specific_gateways+: {
          dynamic_routing_gateways+: {
            'DRG-FRA-LZP-HUB-KEY': drg {
              // The attachment belongs to FinOps even though its DRG belongs to the shared hub.
              drg_attachments+: {
                'DRGATT-FRA-LZP-P-FINOPS-VCN-KEY': cost_scope.mark(drg.drg_attachments['DRGATT-FRA-LZP-P-FINOPS-VCN-KEY'], environment),
              },
            },
          },
        },
      },
    },
  },
};
local tagged = cost_tags.apply({ iam: iam, network: network }, tag_config);
local restore_defaults(doc, template, tags) = doc + {
  [section]: doc[section] + {
    default_defined_tags: tags + (if std.objectHas(doc[section], 'default_defined_tags') then doc[section].default_defined_tags else {}),
  }
  for section in std.objectFields(template)
  if std.type(template[section]) == 'object' && std.objectHas(template[section], 'default_defined_tags')
};
local rendered = if !governance.enable_tags then tagged else {
  iam: restore_defaults(tagged.iam, iam_template, tagged.iam.compartments_configuration.compartments['CMP-LANDINGZONE-P-KEY'].defined_tags),
  network: restore_defaults(tagged.network, network_template,
    tagged.network.network_configuration.network_configuration_categories.shared.vcns['VCN-FRA-LZP-HUB-KEY'].defined_tags),
};
local complete(value) =
  if std.type(value) == 'array' then std.foldl(function(ok, item) ok && complete(item), value, true)
  else if std.type(value) != 'object' then true
  else std.foldl(function(ok, key)
    local child = value[key];
    ok && (if std.member(['defined_tags', 'default_defined_tags'], key) then
      std.foldl(function(valid, dimension)
        valid && std.objectHas(child, prefix + dimension) && child[prefix + dimension] != 'tobedefined',
        ['owner', 'cost-center', 'business-unit', 'environment', 'project', 'platform'], true)
    else complete(child)), std.objectFields(value), true);
assert !governance.enable_tags || complete(rendered) :
  'FinOps tagging requires complete cost center and Business Unit assignments for shared and selected environment/platform scopes';
local rendered_finops = rendered.iam.compartments_configuration.compartments['CMP-LANDINGZONE-P-KEY'].children['CMP-LZP-PLATFORM-KEY'].children['CMP-LZP-PLATFORM-FINOPS-KEY'];
{
  'finops_iam.auto.tfvars.json': rendered.iam,
  'finops_network.auto.tfvars.json': rendered.network,
  'finops_adb.auto.tfvars.json': {
    enable_cost_governance_tags: governance.enable_tags,
    defined_tags: if governance.enable_tags then rendered.iam.groups_configuration.groups['GRP-LZP-PLATFORM-FINOPS-ADMINS'].defined_tags else {},
    database_defined_tags: if governance.enable_tags then rendered_finops.defined_tags else {},
  },
}
