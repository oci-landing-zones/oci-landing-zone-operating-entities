// Internal ownership context. Hidden fields survive composition but never enter JSON.
local naming = import '../naming.libsonnet';
local topology = import '../topology.libsonnet';
local shared = { environment: 'shared', project: 'notapplicable' };

{
  shared:: shared,
  value(environment, project='notapplicable'):: { environment: environment, project: project },
  mark(obj, environment, project='notapplicable', platform=null):: obj + {
    _cost_scope:: self_scope.value(environment, project),
    [if platform != null then '_cost_platform']:: platform,
  },
  local self_scope = self,

  platform_kind(platform)::
    local kind = if std.objectHas(platform, 'extension') then platform.extension.type else null;
    if kind == 'oke_simple' then 'oke' else if kind != null then kind else 'iam',

  for_object(obj, inherited, index)::
    if std.objectHasAll(obj, '_cost_scope') then obj._cost_scope
    else local references = [
      obj[field]
      for field in ['compartment_id', 'category_compartment_id', 'default_compartment_id', 'parent_id']
      if std.objectHas(obj, field) && std.type(obj[field]) == 'string' && std.objectHas(index, obj[field])
    ];
    if std.length(references) > 0 then index[references[0]] else inherited,

  index(doc, config)::
    // Compartment keys and paths are landing-zone-global, independent of region.
    local n = naming('');
    local topo = topology(config, n);
    local entries = topo.ordered_env_entries();
    local base = {
      'CMP-LANDINGZONE-KEY': shared + { platform: 'iam' },
      [n.key_global('CMP', ['NETWORK'])]: shared + { platform: 'network' },
      [n.key_global('CMP', ['SECURITY'])]: shared + { platform: 'security' },
      [n.key_global('CMP', ['PLATFORM'])]: shared + { platform: 'iam' },
    } + std.foldl(function(acc, entry) acc + {
      [topo.env_compartment_key(entry)]: self_scope.value(entry.env_name) + { platform: 'iam' },
    } + {
      [topo.env_child_compartment_key(entry, child)]: self_scope.value(entry.env_name) + {
        platform: if child == 'NETWORK' then 'network' else if child == 'SECURITY' then 'security' else 'iam',
      }
      for child in ['NETWORK', 'SECURITY', 'PLATFORM', 'PROJECTS']
    } + {
      [topo.env_platform(entry, name).compartment_key]: self_scope.value(entry.env_name) + { platform: self_scope.platform_kind(entry.env.platforms[name]) }
      for name in (if std.objectHas(entry.env, 'platforms') then std.objectFields(entry.env.platforms) else [])
    }, entries, {}) + {
      [topo.shared_platform(name).compartment_key]: shared + { platform: self_scope.platform_kind(config.shared_platforms[name]) }
      for name in (if std.objectHas(config, 'shared_platforms') then std.objectFields(config.shared_platforms) else [])
    };
    local collect(nodes, inherited) = std.foldl(function(acc, key)
      local obj = nodes[key];
      local scope =
        if std.objectHasAll(obj, '_cost_scope') then obj._cost_scope
        else if std.objectHas(base, key) then base[key]
        else self_scope.for_object(obj, inherited, base);
      acc + { [key]: scope } +
      (if std.objectHas(obj, 'children') then collect(obj.children, scope) else {}),
      std.objectFields(nodes), {});
    local documents = [doc] + [
      doc[field]
      for field in std.objectFields(doc)
      if std.type(doc[field]) == 'object' && std.objectHas(doc[field], 'compartments_configuration')
    ];
    // Prefer common references; project resources carry explicit scope when keys overlap.
    std.foldl(function(acc, document)
      if std.objectHas(document, 'compartments_configuration') && std.objectHas(document.compartments_configuration, 'compartments') then
        acc + collect(document.compartments_configuration.compartments, shared)
      else acc, documents, {}) + base,
}
