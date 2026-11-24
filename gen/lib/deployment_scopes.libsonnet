// Project independent Home and Primary operations without changing regional DR semantics.
// function(outputs, scope, home_region) -> a coherent deployable file set.
function(outputs, scope, home_region)
local security_files = [key for key in std.objectFields(outputs) if std.startsWith(key, 'security_cis')];
local observability_files = [key for key in std.objectFields(outputs) if std.startsWith(key, 'observability_cis')];
local get(object, key, fallback) = if std.objectHas(object, key) then object[key] else fallback;
local home_events(document) = get(document, 'home_region_events_configuration', {});
local home_topic_ids(document) = std.set(std.flattenArrays([
  get(rule, 'destination_topic_ids', [])
  for rule in std.objectValues(get(home_events(document), 'event_rules', {}))
]));
local topic_subset(document, home) =
  local notifications = get(document, 'notifications_configuration', {});
  local ids = home_topic_ids(document);
  notifications + {
    topics: {
      [key]: notifications.topics[key]
      for key in std.objectFields(get(notifications, 'topics', {}))
      if std.member(ids, key) == home
    },
  };
if scope == 'home' then
  { [key]: outputs[key] for key in ['iam.json', 'governance.json'] if std.objectHas(outputs, key) }
  + {
    [key]: {
      cloud_guard_configuration: outputs[key].cloud_guard_configuration + { reporting_region: home_region },
    }
    for key in security_files
    if !std.endsWith(key, '_pre.json') && std.objectHas(outputs[key], 'cloud_guard_configuration')
  }
  + {
    [key]: {
      home_region_events_configuration: home_events(outputs[key]),
      notifications_configuration: topic_subset(outputs[key], true),
    }
    for key in observability_files
  }
else {
  [key]:
    local document = outputs[key];
    if std.member(security_files, key) then {
      [field]: document[field] for field in std.objectFields(document) if field != 'cloud_guard_configuration'
    }
    else if std.member(observability_files, key) then {
      [field]: document[field]
      for field in std.objectFields(document)
      if field != 'home_region_events_configuration' && field != 'notifications_configuration'
    } + { notifications_configuration: topic_subset(document, false) }
    else document
  for key in std.objectFields(outputs)
  if !std.member(['iam.json', 'governance.json'], key)
}
