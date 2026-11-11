// Final phase only: the cost namespace and definitions already exist from governance_pre.
function(governance, config)
local cost_tags = import 'cost_tags.libsonnet';
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local labels = cost_tags.apply({
  notifications_configuration: {
    default_defined_tags: {
      [prefix + 'platform']: 'governance',
      [prefix + 'environment']: 'shared',
      [prefix + 'project']: 'notapplicable',
    },
  },
}, config).notifications_configuration.default_defined_tags;
local existing(resource) = if std.objectHas(resource, 'defined_tags') && resource.defined_tags != null then resource.defined_tags else {};
governance + {
  tags_configuration+: {
    namespaces: {
      [key]:
        local namespace = governance.tags_configuration.namespaces[key];
        namespace + {
          defined_tags: existing(namespace) + labels,
          tags: {
            [tag]: namespace.tags[tag] + { defined_tags: existing(namespace.tags[tag]) + labels }
            for tag in std.objectFields(namespace.tags)
          },
        }
      for key in std.objectFields(governance.tags_configuration.namespaces)
    },
  },
}
