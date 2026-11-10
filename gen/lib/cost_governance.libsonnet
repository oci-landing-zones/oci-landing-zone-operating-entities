local validation = import 'validation.libsonnet';
local budgets = import 'cost_budgets.libsonnet';
local namespace_key = 'TAGNS-LZ-COST-GOVERNANCE-KEY';
local tag_names = ['tag-lz-cost-center', 'tag-lz-business-unit', 'tag-lz-owner', 'tag-lz-platform', 'tag-lz-environment', 'tag-lz-project'];
local letters = 'abcdefghijklmnopqrstuvwxyz';
local alphanumeric = letters + '0123456789';
local chars_in(text, allowed) = std.length([char for char in std.stringChars(std.asciiLower(text)) if std.length(std.findSubstr(char, allowed)) == 0]) == 0;
local valid_email(address) =
  local parts = std.split(address, '@');
  if std.length(parts) != 2 then false else
  local user_part = parts[0];
  local labels = std.split(parts[1], '.');
  std.length(address) <= 254 && std.length(user_part) > 0 && std.length(user_part) <= 64 &&
  !std.startsWith(user_part, '.') && !std.endsWith(user_part, '.') && std.length(std.findSubstr('..', user_part)) == 0 &&
  chars_in(user_part, "abcdefghijklmnopqrstuvwxyz0123456789.!#$%&'*+/=?^_`{|}~-") &&
  std.length(labels) >= 2 && std.length(labels[std.length(labels) - 1]) >= 2 && chars_in(labels[std.length(labels) - 1], letters) &&
  std.length([label for label in labels if std.length(label) == 0 || std.length(label) > 63 ||
    !chars_in(label, alphanumeric + '-') || std.startsWith(label, '-') || std.endsWith(label, '-')]) == 0;
local email_list(value, label) =
  assert std.type(value) == 'string' : label + ' must be a string';
  local separated = std.foldl(function(text, separator) std.strReplace(text, separator, ','), [';', ' ', '\t', '\r', '\n'], value);
  local addresses = [address for address in std.split(separated, ',') if address != ''];
  assert std.length([address for address in addresses if !valid_email(address)]) == 0 : label + ' must contain valid email addresses';
  std.join(',', addresses);
local name(value, label) =
  assert std.type(value) == 'string' && std.length(value) > 0 : label + ' must be a non-empty string';
  local alphabet = 'abcdefghijklmnopqrstuvwxyz';
  assert std.length(std.findSubstr(std.substr(value, 0, 1), '0123456789')) == 0 &&
         std.length([letter for letter in std.stringChars(std.asciiLower(value))
           if std.length(std.findSubstr(letter, alphabet + '0123456789_-')) == 0]) == 0 :
    label + ' must contain letters, numbers, underscores or hyphens and must not start with a number';
  value;

{
  project_names(config)::
    local envs = if std.objectHas(config, 'environments') then config.environments else {};
    std.set(std.flattenArrays([std.objectFields(envs[env].projects) for env in std.objectFields(envs) if std.objectHas(envs[env], 'projects')])),

  normalize(raw, projects=[])::
    local label = 'config.cost_governance';
    local cfg = validation.allowed_keys(validation.object(raw, label), label, ['require_tag_values', 'owner_email', 'budget_recipients', 'budgets', 'exclude_budgets', 'additional_budgets', 'tag_value_lists']);
    local required = if std.objectHas(cfg, 'require_tag_values') then cfg.require_tag_values else false;
    assert std.type(required) == 'boolean' : label + '.require_tag_values must be a boolean';
    local excluded = validation.array(if std.objectHas(cfg, 'exclude_budgets') then cfg.exclude_budgets else [], label + '.exclude_budgets');
    local inherited_keys = std.objectFields(budgets(projects=projects).budgets);
    local additional = validation.object(if std.objectHas(cfg, 'additional_budgets') then cfg.additional_budgets else {}, label + '.additional_budgets');
    assert std.length([key for key in std.objectFields(additional) if !std.startsWith(key, 'BUDGET-CUSTOM-') || !std.endsWith(key, '-KEY') || !chars_in(key, alphanumeric + '_-') || std.length(key) <= 18]) == 0 : label + '.additional_budgets requires BUDGET-CUSTOM-<ID>-KEY keys';
    local known_keys = inherited_keys + std.objectFields(additional);
    local lists = validation.allowed_keys(validation.object(if std.objectHas(cfg, 'tag_value_lists') then cfg.tag_value_lists else {}, label + '.tag_value_lists'), label + '.tag_value_lists', tag_names);
    assert std.length([key for key in excluded if std.type(key) != 'string' || !std.member(known_keys, key)]) == 0 : label + '.exclude_budgets must contain known budget keys';
    local overrides = validation.allowed_keys(
      validation.object(if std.objectHas(cfg, 'budgets') then cfg.budgets else {}, label + '.budgets'),
      label + '.budgets', inherited_keys
    );
    local entries = overrides + {
      [key]:
        local entry = validation.allowed_keys(validation.object(additional[key], label + '.additional_budgets.' + key), label + '.additional_budgets.' + key, ['name', 'amount', 'alert_rule', 'tag_name', 'tag_value']);
        assert std.objectHas(entry, 'name') && std.objectHas(entry, 'amount') : label + '.additional_budgets requires name and amount';
        assert std.objectHas(entry, 'tag_name') && std.member(tag_names, entry.tag_name) : label + '.additional_budgets requires a known FinOps tag_name';
        assert std.objectHas(entry, 'tag_value') && std.type(entry.tag_value) == 'string' && std.length(std.stripChars(entry.tag_value, ' \t\n\r')) > 0 : label + '.additional_budgets requires a non-empty tag_value';
        { [field]: entry[field] for field in std.objectFields(entry) if !std.member(['tag_name', 'tag_value'], field) }
      for key in std.objectFields(additional)
    };
    {
      require_tag_values: required,
      [if std.objectHas(cfg, 'owner_email') then 'owner_email']:
        assert std.type(cfg.owner_email) == 'string' && valid_email(cfg.owner_email) : label + '.owner_email must be one valid email address';
        cfg.owner_email,
      exclude_budgets: std.set(excluded),
      [if std.objectHas(cfg, 'budget_recipients') then 'budget_recipients']: email_list(cfg.budget_recipients, label + '.budget_recipients'),
      tag_value_lists: {
        [tag]:
          local values = validation.array(lists[tag], label + '.tag_value_lists.' + tag);
          assert std.length(values) > 0 && std.length([v for v in values if std.type(v) != 'string' || v == '' || v != std.stripChars(v, ' \t\n\r') || std.length(std.findSubstr('\n', v)) > 0 || std.length(std.findSubstr('\r', v)) > 0]) == 0 : label + '.tag_value_lists requires non-empty string lists';
          std.set(values)
        for tag in std.objectFields(lists)
      },
      additional_budgets: {
        [key]: { tag_name: additional[key].tag_name, tag_value: additional[key].tag_value }
        for key in std.objectFields(additional)
      },
      budgets: {
        [key]:
          local path = label + '.budgets.' + key;
          local entry = validation.allowed_keys(validation.object(entries[key], path), path, ['name', 'amount', 'alert_rule']);
          local alert = validation.allowed_keys(validation.object(if std.objectHas(entry, 'alert_rule') then entry.alert_rule else {}, path + '.alert_rule'), path + '.alert_rule', ['threshold_value', 'recipients']);
          entry + {
            [if std.objectHas(entry, 'name') then 'name']: name(entry.name, path + '.name'),
            [if std.objectHas(entry, 'amount') then 'amount']:
              assert std.type(entry.amount) == 'number' && entry.amount >= 1 && entry.amount <= 999999999999 && std.floor(entry.amount) == entry.amount :
                path + '.amount must be an integer between 1 and 999999999999';
              entry.amount,
            alert_rule: alert + {
              [if std.objectHas(alert, 'threshold_value') then 'threshold_value']:
                assert std.type(alert.threshold_value) == 'number' && alert.threshold_value > 0 && alert.threshold_value <= 10000 &&
                       std.abs(alert.threshold_value * 100 - std.floor(alert.threshold_value * 100 + 0.5)) < 0.000001 :
                  path + '.alert_rule.threshold_value must be greater than 0 and at most 10000, with up to two decimals';
                alert.threshold_value,
              [if std.objectHas(alert, 'recipients') then 'recipients']: email_list(alert.recipients, path + '.alert_rule.recipients'),
            },
          }
        for key in std.objectFields(entries)
      },
    },

  apply(governance, config, projects=[])::
    local namespace = governance.tags_configuration.namespaces[namespace_key];
    local rendered_budgets = budgets(overrides=config.budgets, recipients=if std.objectHas(config, 'budget_recipients') then config.budget_recipients else null, excluded=config.exclude_budgets, projects=projects, additional=config.additional_budgets);
    governance + {
      tags_configuration+: {
        namespaces+: {
          [namespace_key]+: {
            tags: {
              [key]: namespace.tags[key] + {
                valid_values:
                  local tag = namespace.tags[key];
                  local field = namespace.name + '.' + tag.name;
                  local base = if key == 'TAG-LZ-OWNER-KEY' && std.objectHas(config, 'owner_email') then [config.owner_email] else if std.objectHas(config.tag_value_lists, tag.name) then config.tag_value_lists[tag.name] else tag.valid_values;
                  // Keep assigned values and defaults valid when users replace a LOV.
                  local protected = (if std.member(['TAG-LZ-PLATFORM-KEY', 'TAG-LZ-ENVIRONMENT-KEY', 'TAG-LZ-PROJECT-KEY'], key) then tag.valid_values else ['tobedefined']) +
                    [rendered_budgets.budgets[budget].defined_tags[field] for budget in std.objectFields(rendered_budgets.budgets) if std.objectHas(rendered_budgets.budgets[budget].defined_tags, field)];
                  base + std.set([v for v in protected if !std.member(base, v)]),
                tag_defaults: {
                  [key + '-REQUIRED']: {
                    compartment_ids: ['CMP-LANDINGZONE-KEY'],
                    default_value: if key == 'TAG-LZ-OWNER-KEY' && std.objectHas(config, 'owner_email') then config.owner_email else if key == 'TAG-LZ-PROJECT-KEY' then 'notapplicable' else 'tobedefined',
                    is_user_required: config.require_tag_values,
                  },
                },
              }
              for key in std.objectFields(namespace.tags)
            },
          },
        },
      },
      budgets_configuration: rendered_budgets,
    },
}
