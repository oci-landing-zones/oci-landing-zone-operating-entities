// gen/workload-extensions/exacc/exacc_builder.libsonnet
// Config-driven ExaDB-C@C workload extension.

local descriptions = import './descriptions.libsonnet';
local exadb_iam = import '../exadb/iam.libsonnet';
local exadb_observability = import '../exadb/observability.libsonnet';
local exadb_project_db = import '../exadb/project_db.libsonnet';
local products = import '../exadb/products.libsonnet';
local notification_emails = import '../../lib/notification_emails.libsonnet';

{
  metadata(params):: {
    requires_network: false,
  },

  render(params)::
    assert std.objectHas(params, 'topology') : 'exacc requires topology scope semantics';
    assert std.objectHas(params, 'config_params') : 'exacc requires config_params';
    local n = params.naming;
    local scope = params.topology;
    local scope_config =
      if std.objectHas(params, 'scope_config') then params.scope_config
      else {};
    local cfg = params.config_params;

    local supported_notification_keys = ['default', 'db_workloads', 'infra_workloads', 'projects'];
    local notification = notification_emails.validate('exacc', cfg, supported_notification_keys);

    local project_db = exadb_project_db.normalize({
      product: products.exacc,
      scope: scope,
      scope_config: scope_config,
      cfg: cfg,
    });

    local tag_key = 'tagns-lz-role.tag-lz-role';
    local product = products.exacc;
    local db_key = exadb_project_db.platform_db_key(product, n, scope);
    local infra_key = exadb_project_db.platform_infra_key(product, n, scope);
    local platform_overlay = exadb_project_db.platform_compartment_overlay({
      product: product,
      naming: n,
      descriptions: descriptions,
      scope: scope,
      tag_key: tag_key,
    });
    local project_db_key(env_name, project_name) =
      exadb_project_db.project_db_key(product, n, env_name, project_name);
    local project_db_name(env_name, project_name) =
      exadb_project_db.project_db_name(product, env_name, project_name);
    local project_db_overlay = exadb_project_db.project_compartment_overlay({
      product: product,
      naming: n,
      descriptions: descriptions,
      model: project_db,
      tag_key: tag_key,
    });
    local iam = exadb_iam.render({
      product: product,
      naming: n,
      descriptions: descriptions,
      model: project_db,
      tag_key: tag_key,
      project_db_key: project_db_key,
      project_db_name: project_db_name,
    });
    local observability = exadb_observability.render({
      product: product,
      naming: n,
      descriptions: descriptions,
      scope: scope,
      model: project_db,
      notification: notification,
      db_key: db_key,
      infra_key: infra_key,
      project_db_key: project_db_key,
    });

    {
      contributions: {
        iam: {
          compartments_configuration+: {
            compartments+: platform_overlay + project_db_overlay,
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
    },
}
