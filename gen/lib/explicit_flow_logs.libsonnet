// Resolve declared VCN/subnet targets using plan-time-stable configuration keys.
function(network, document)
  if !std.objectHas(document, 'logging_configuration') then document else
  local get(obj, key, fallback) = if std.objectHas(obj, key) then obj[key] else fallback;
  local cfg = network.network_configuration;
  local compartment(resource, inherited) =
    if std.objectHas(resource, 'compartment_id') && resource.compartment_id != null then
      resource.compartment_id
    else inherited;
  local targets = std.flattenArrays([
    local category = cfg.network_configuration_categories[categoryKey];
    local categoryCompartment = get(category, 'category_compartment_id', get(cfg, 'default_compartment_id', null));
    local vcns = get(category, 'vcns', {});
    [
      {
        key: key,
        category: 'vcn',
        name: vcns[key].display_name,
        compartment_id: compartment(vcns[key], categoryCompartment),
      }
      for key in std.objectFields(vcns)
    ] + std.flattenArrays([
      local vcn = vcns[vcnKey];
      local subnets = get(vcn, 'subnets', {});
      [
        {
          key: key,
          category: 'subnet',
          name: subnets[key].display_name,
          compartment_id: compartment(subnets[key], compartment(vcn, categoryCompartment)),
        }
        for key in std.objectFields(subnets)
      ]
      for vcnKey in std.objectFields(vcns)
    ])
    for categoryKey in std.objectFields(cfg.network_configuration_categories)
  ]);
  local logging = document.logging_configuration;
  local flows = get(logging, 'flow_logs', {});
  local serviceLogs = {
    [flowKey + '-' + target.key]:
      local flow = flows[flowKey];
      {
        name: target.name + '-flow-log',
        log_group_id: flow.log_group_id,
        service: 'flowlogs',
        category: target.category,
        resource_id: target.key,
        retention_duration: get(flow, 'retention_duration', 90),
      } + {
        [field]: flow[field]
        for field in ['is_enabled', 'defined_tags', 'freeform_tags']
        if std.objectHas(flow, field)
      }
    for flowKey in std.objectFields(flows)
    for target in targets
    if target.category == flows[flowKey].target_resource_type &&
       std.member(flows[flowKey].target_compartment_ids, target.compartment_id)
  };
  document + {
    logging_configuration+: {
      flow_logs: {},
      service_logs: get(logging, 'service_logs', {}) + serviceLogs,
    },
  }
