local lz = import '../../../landing_zone.libsonnet';

local filter_object(obj, keep_fn) = {
  [key]: obj[key]
  for key in std.objectFields(obj)
  if keep_fn(key, obj[key])
};

local is_network_compartment(value) =
  std.type(value) == 'string'
  && std.length(std.findSubstr('CMP-LZ-', value)) > 0
  && std.length(std.findSubstr('-NETWORK-KEY', value)) > 0;

local strip_network_observability(doc) =
  local without_logging = {
    [key]: doc[key]
    for key in std.objectFields(doc)
    if key != 'logging_configuration'
  };
  without_logging {
    alarms_configuration+: {
      default_compartment_id: 'CMP-LZ-SECURITY-KEY',
      alarms: filter_object(
        doc.alarms_configuration.alarms,
        function(key, alarm)
          key != 'AL-LZ-NETWORK-LB-KEY'
          && !(std.objectHas(alarm, 'compartment_id') && is_network_compartment(alarm.compartment_id))
      ),
    },
    events_configuration+: {
      event_rules: filter_object(
        doc.events_configuration.event_rules,
        function(key, rule)
          !(std.objectHas(rule, 'compartment_id') && is_network_compartment(rule.compartment_id))
      ),
    },
    notifications_configuration+: {
      topics: filter_object(
        doc.notifications_configuration.topics,
        function(key, topic) key != 'NOTT-LZ-NETWORK-KEY'
      ),
    },
  };

{
  render(config)::
    local rendered = lz(config);
    {
      iam: rendered.iam,
      governance: rendered.governance,
      security_cis1_pre: rendered.security_cis1_pre,
      security_cis1: rendered.security_cis1,
      security_cis2_pre: rendered.security_cis2_pre,
      security_cis2: rendered.security_cis2,
      observability_cis1: strip_network_observability(rendered.observability_cis1),
      observability_cis2: strip_network_observability(rendered.observability_cis2),
    },
}
