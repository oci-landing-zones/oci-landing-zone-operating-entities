local compartments = import '../exadb/project_db.libsonnet';
local iam_builder = import './iam.libsonnet';
local observability_builder = import './observability.libsonnet';

{
  contributions(inputs)::
    local params = inputs.params;
    local scope_config = if std.objectHas(params, 'scope_config') then params.scope_config else {};
    local components = compartments.normalize_components(
      inputs.product,
      params.config_params,
      if std.objectHas(scope_config, 'extension_entry_components') then
        scope_config.extension_entry_components
      else null
    );
    local product = {
      code: 'exaxs',
      tags: {
        admin: 'lz-exaxs-admin',
        infra: 'lz-exaxs-infra-admin',
        db: 'lz-exaxs-db-admin',
      },
    };
    local iam = iam_builder.render({
      naming: params.naming,
      scope: params.topology,
      scope_config: scope_config,
      components: components,
    });
    local observability = observability_builder.render({
      naming: params.naming,
      scope: params.topology,
      components: components,
      config_params: params.config_params,
    });
    {
      iam: {
        compartments_configuration+: {
          compartments+: compartments.platform_compartment_overlay({
            product: product,
            naming: params.naming,
            descriptions: inputs.descriptions,
            scope: params.topology,
            tag_key: 'tagns-lz-role.tag-lz-role',
            components: components,
          }),
        },
        identity_domain_groups_configuration+: { groups+: iam.groups },
        policies_configuration+: { supplied_policies+: iam.policies },
      },
      observability_cis1: {
        alarms_configuration+: { alarms+: observability.alarms },
        events_configuration+: { event_rules+: observability.event_rules },
        notifications_configuration+: { topics+: observability.topics },
      },
      observability_cis2: {
        alarms_configuration+: { alarms+: observability.alarms },
        events_configuration+: { event_rules+: observability.event_rules },
        notifications_configuration+: { topics+: observability.topics },
      },
    },
}
