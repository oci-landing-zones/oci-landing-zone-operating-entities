// Published One-OE cost tags and governance for single-apply Tag Default ordering.
local lz = import '../../../../landing_zone.libsonnet';
local namespace = 'tagns-lz-cost-governance';
local collections = [
  'compartments', 'children', 'groups', 'identity_domains', 'supplied_policies',
  'vcns', 'subnets', 'route_tables', 'security_lists', 'network_security_groups',
  'internet_gateways', 'nat_gateways', 'service_gateways',
  'dynamic_routing_gateways', 'drg_attachments', 'drg_route_tables',
  'drg_route_distributions', 'l7_load_balancers', 'alarms', 'event_rules',
  'topics', 'buckets', 'service_connectors',
  'targets', 'host_recipes', 'host_targets', 'recipes', 'security_zones', 'vaults', 'keys',
  'network_firewalls', 'network_firewall_policies', 'nlbs', 'log_groups', 'flow_logs',
];

local values(path, platform='none') =
  local words = std.asciiUpper(std.join('/', path));
  local contains(word) = std.length(std.findSubstr(word, words)) > 0;
  local resourceKey = if std.length(path) > 0 then std.asciiUpper(path[std.length(path) - 1]) else '';
  local compartmentPlatform =
    if std.startsWith(resourceKey, 'CMP-') && std.endsWith(resourceKey, '-NETWORK-KEY') then 'network'
    else if std.startsWith(resourceKey, 'CMP-') && std.endsWith(resourceKey, '-SECURITY-KEY') then 'security'
    else 'none';
  {
    [namespace + '.tag-lz-cost-center']: 'none',
    [namespace + '.tag-lz-business-unit']: 'none',
    [namespace + '.tag-lz-owner']: 'none',
    [namespace + '.tag-lz-platform']: if platform == 'none' then compartmentPlatform else platform,
    [namespace + '.tag-lz-environment']: if contains('PREPROD') then 'preprod' else if contains('PROD') then 'prod' else 'shared',
    [namespace + '.tag-lz-project']: if contains('PROJ1') then 'proj1' else 'none',
  };

local existingTags(resource, field='defined_tags') =
  if std.objectHas(resource, field) && resource[field] != null then resource[field] else {};
local tagResources(obj, path=[], platform='none') =
  if std.type(obj) == 'array' then [tagResources(v, path, platform) for v in obj]
  else if std.type(obj) != 'object' then obj
  else {
    [key]:
      local childPath = path + [key];
      local value = obj[key];
      if std.member(collections, key) && std.type(value) == 'object' then {
        [name]: tagResources(value[name], childPath + [name], platform) + {
          defined_tags: existingTags(value[name]) + values(childPath + [name], platform),
        }
        for name in std.objectFields(value)
      }
      else if key == 'default_security_list' && std.type(value) == 'object' then
        tagResources(value, childPath, platform) + { defined_tags: existingTags(value) + values(childPath, platform) }
      else tagResources(value, childPath, platform)
    for key in std.objectFields(obj)
  };

// Module-created security resources, such as cloned recipes, use section defaults.
local tagSecurity(doc) =
  local tagged = tagResources(doc, platform='security');
  {
    [family]: tagged[family] + {
      default_defined_tags: existingTags(tagged[family], 'default_defined_tags') + values([], platform='security'),
    }
    for family in std.objectFields(tagged)
  };

local tagObservability(doc) =
  local tagged = tagResources(doc, platform='observability');
  {
    [family]: tagged[family] + {
      default_defined_tags: existingTags(tagged[family], 'default_defined_tags') + values([], platform='observability'),
    }
    for family in std.objectFields(tagged)
  };

local requiredGovernance(governance) =
  local cfg = governance.tags_configuration;
  local costKey = 'TAGNS-LZ-COST-GOVERNANCE-KEY';
  local cost = cfg.namespaces[costKey];
  governance + {
    tags_configuration: cfg + {
      namespaces: cfg.namespaces + {
        [costKey]: cost + {
          tags: {
            [key]: cost.tags[key] + {
              tag_defaults: {
                [key + '-REQUIRED']: {
                  compartment_ids: ['CMP-LANDINGZONE-KEY'],
                  default_value: 'none',
                  is_user_required: true,
                },
              },
            }
            for key in std.objectFields(cost.tags)
          },
        },
      },
    },
  };

function(profile) {
  local rendered = lz(profile.config),
  iam: tagResources(rendered.iam),
  network: tagResources(rendered.network, platform='network'),
  network_backends: tagResources(rendered.network_backends, platform='network'),
  observability_cis1: tagObservability(rendered.observability_cis1),
  observability_cis1_pre: tagObservability(rendered.observability_cis1_pre),
  observability_cis2: tagObservability(rendered.observability_cis2),
  observability_cis2_pre: tagObservability(rendered.observability_cis2_pre),
  security_cis1: tagSecurity(rendered.security_cis1),
  security_cis1_pre: tagSecurity(rendered.security_cis1_pre),
  security_cis2: tagSecurity(rendered.security_cis2),
  security_cis2_pre: tagSecurity(rendered.security_cis2_pre),
  governance: requiredGovernance(rendered.governance),
}
