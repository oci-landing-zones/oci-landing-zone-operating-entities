local exadb_iam = import './iam.libsonnet';
local exadb_observability = import './observability.libsonnet';
local exadb_project_db = import './project_db.libsonnet';
local notification_emails = import '../../lib/notification_emails.libsonnet';

{
  local supported_notification_keys = ['default', 'db_workloads', 'infra_workloads', 'projects'],
  local tag_key = 'tagns-lz-role.tag-lz-role',

  contributions(inputs)::
    local product = inputs.product;
    local params = inputs.params;
    local n = params.naming;
    local scope = params.topology;
    local scope_config =
      if std.objectHas(params, 'scope_config') then params.scope_config
      else {};
    local cfg = params.config_params;
    local descriptions = inputs.descriptions;
    local notification = notification_emails.validate(product.code, cfg, supported_notification_keys);
    local inferred_components =
      if std.objectHas(scope_config, 'extension_entry_components') then
        scope_config.extension_entry_components
      else null;
    local components = exadb_project_db.normalize_components(product, cfg, inferred_components);
    local aggregate_components =
      if std.objectHas(scope_config, 'extension_components') &&
         std.objectHas(scope_config.extension_components, product.code) then
        scope_config.extension_components[product.code]
      else components;
    local model = exadb_project_db.normalize({
      product: product,
      scope: scope,
      scope_config: scope_config,
      cfg: cfg,
      components: components,
    });
    local project_db_key(project_scope, project_name) =
      exadb_project_db.project_db_key_for_scope(product, n, project_scope, project_name);
    local project_db_name(project_scope, project_name) =
      exadb_project_db.project_db_name_for_scope(product, project_scope, project_name);
    local iam = exadb_iam.render({
      product: product,
      naming: n,
      descriptions: descriptions,
      model: model,
      tag_key: tag_key,
      project_db_key: project_db_key,
      project_db_name: project_db_name,
      components: components,
      aggregate_components: aggregate_components,
    });
    local observability = exadb_observability.render({
      product: product,
      naming: n,
      descriptions: descriptions,
      scope: scope,
      model: model,
      notification: notification,
      db_key: exadb_project_db.platform_db_key(product, n, scope),
      infra_key: exadb_project_db.platform_infra_key(product, n, scope),
      project_db_key: project_db_key,
      components: components,
    });
    {
      iam: {
        compartments_configuration+: {
          compartments+:
            exadb_project_db.platform_compartment_overlay({
              product: product,
              naming: n,
              descriptions: descriptions,
              scope: scope,
              tag_key: tag_key,
              components: components,
            })
            + exadb_project_db.project_compartment_overlay({
              product: product,
              naming: n,
              descriptions: descriptions,
              model: model,
              tag_key: tag_key,
            }),
        },
        identity_domain_groups_configuration+: {
          groups+: iam.groups,
        },
        policies_configuration+: {
          supplied_policies+: iam.policies,
        },
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
