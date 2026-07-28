// Multi-OE root validation and normalization.

local collections = import './collections.libsonnet';
local validation = import './validation.libsonnet';
local lowercase_letters = std.stringChars('abcdefghijklmnopqrstuvwxyz');
local key_tail_chars = lowercase_letters + std.stringChars('0123456789_');
local reserved_normalized_names = {
  network: 'a fixed root IAM compartment',
  platform: 'a fixed root IAM compartment',
  security: 'a fixed root IAM compartment',
  shared: 'the shared platform IAM compartment namespace',
};
local all_chars_in(value, allowed) =
  collections.all([std.member(allowed, char) for char in std.stringChars(value)]);
local duplicate_values(values) = collections.unique([
  value
  for value in values
  if std.length([other for other in values if other == value]) > 1
]);

{
  normalize_name(name):: std.strReplace(name, '_', '-'),

  qualified_environment_name(oe_name, env_name)::
    if oe_name == null then env_name
    else '%s-%s' % [self.normalize_name(oe_name), env_name],

  // normalize(config, normalize_environments) -> root state
  // `normalize_environments` is the config-owned environment schema path.
  normalize(config, normalize_environments)::
    local has_environments = std.objectHas(config, 'environments') && config.environments != null;
    local has_operating_entities =
      std.objectHas(config, 'operating_entities') && config.operating_entities != null;
    assert has_environments || has_operating_entities :
      'config must define environments or operating_entities';
    assert !(has_environments && has_operating_entities) :
      'config cannot define both environments and operating_entities';

    if has_environments then
      local environments = validation.object(config.environments, 'config.environments');
      assert std.length(std.objectFields(environments)) > 0 :
        'config.environments must have at least one environment';
      local normalized_environments = normalize_environments(environments, null);
      {
        mode: 'one_oe',
        config_fields: { environments: normalized_environments },
        environment_scopes: [{
          oe_name: null,
          environments: normalized_environments,
        }],
        target_names: std.objectFields(normalized_environments),
      }
    else
      local operating_entities = validation.object(
        config.operating_entities,
        'config.operating_entities'
      );
      local oe_names = std.sort(std.objectFields(operating_entities));
      assert std.length(oe_names) > 0 :
        'config.operating_entities must have at least one operating entity';
      local invalid_keys = [
        name
        for name in oe_names
        if std.length(name) == 0 ||
           !std.member(lowercase_letters, name[0]) ||
           !all_chars_in(name, key_tail_chars)
      ];
      assert std.length(invalid_keys) == 0 :
        'config.operating_entities key must match [a-z][a-z0-9_]*: %s' % invalid_keys[0];
      local reserved_keys = [
        name
        for name in oe_names
        if std.objectHas(reserved_normalized_names, $.normalize_name(name))
      ];
      assert std.length(reserved_keys) == 0 :
        'config.operating_entities.%s uses reserved normalized name "%s" for %s' % [
          reserved_keys[0],
          $.normalize_name(reserved_keys[0]),
          reserved_normalized_names[$.normalize_name(reserved_keys[0])],
        ];

      local validated = {
        [oe_name]:
          local label = 'config.operating_entities.%s' % oe_name;
          local oe = validation.object(operating_entities[oe_name], label);
          local dns = validation.required(oe, 'dns', '%s.dns' % label);
          assert std.type(dns) == 'string' && std.length(dns) == 2 &&
                 all_chars_in(dns, lowercase_letters) :
            '%s.dns must be exactly two lowercase letters' % label;
          local display_name =
            if std.objectHas(oe, 'display_name') && oe.display_name != null then oe.display_name
            else oe_name;
          assert std.type(display_name) == 'string' && display_name != '' :
            '%s.display_name must be a non-empty string' % label;
          local environments = validation.required_object(
            oe,
            'environments',
            '%s.environments' % label
          );
          assert std.length(std.objectFields(environments)) > 0 :
            '%s.environments must have at least one environment' % label;
          oe + {
            dns: dns,
            display_name: display_name,
            environments: environments,
          }
        for oe_name in oe_names
      };
      local dns_values = [validated[name].dns for name in oe_names];
      local duplicate_dns = duplicate_values(dns_values);
      assert std.length(duplicate_dns) == 0 :
        'config.operating_entities dns values must be unique: %s' % std.join(', ', duplicate_dns);

      local normalized = {
        [oe_name]: validated[oe_name] + {
          environments: normalize_environments(validated[oe_name].environments, oe_name),
        }
        for oe_name in oe_names
      };
      local environment_scopes = [
        {
          oe_name: oe_name,
          environments: normalized[oe_name].environments,
        }
        for oe_name in oe_names
      ];
      local qualified_names = std.flattenArrays([
        [
          $.qualified_environment_name(oe_name, env_name)
          for env_name in std.objectFields(normalized[oe_name].environments)
        ]
        for oe_name in oe_names
      ]);
      local duplicate_qualified_names = duplicate_values(qualified_names);
      assert std.length(duplicate_qualified_names) == 0 :
        'config.operating_entities generates duplicate qualified environment names: %s' %
        std.join(', ', duplicate_qualified_names);
      {
        mode: 'multi_oe',
        config_fields: { operating_entities: normalized },
        environment_scopes: environment_scopes,
        target_names: qualified_names,
      },
}
