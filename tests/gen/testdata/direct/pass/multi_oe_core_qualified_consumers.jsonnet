// Qualified Multi-OE scopes drive platform lookup and generated compartment references.
local landing_zone = import 'gen/landing_zone.libsonnet';
local render_context = import 'gen/render_context.libsonnet';
local raw = {
  cis_level: 2,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    beta: {
      dns: 'bb',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.80.0/21' } },
          platforms: {
            data: {
              network: {
                vcn: '10.0.96.0/21',
                subnets: { app: '10.0.96.0/24' },
              },
            },
          },
        },
      },
    },
    alpha: {
      dns: 'aa',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
        },
      },
    },
  },
  security_targets: ['beta-prod'],
};
local ctx = render_context.from_raw_config(raw);
local result = landing_zone(raw);
local root_children = result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local zones = result.security_cis2.security_zones_configuration.security_zones;
local event_rules = result.observability_cis2.events_configuration.event_rules;
local flow_logs = result.observability_cis2.logging_configuration.flow_logs;
{
  alpha_environments: std.objectFields(root_children['CMP-LZ-ALPHA-KEY'].children),
  beta_platform_lookup: ctx.env_platform_entry('beta-prod', 'data').scope.qualified_name,
  network_category_keys:
    std.objectFields(result.network.network_configuration.network_configuration_categories),
  platform_category_compartment:
    result.network.network_configuration.network_configuration_categories['3-beta-prod-platform-data']
      .category_compartment_id,
  security_environment_targets: [
    key
    for key in std.objectFields(zones)
    if std.length(std.findSubstr('ENVIRONMENT', key)) > 0
  ],
  has_qualified_network_event:
    std.objectHas(event_rules, 'RUL-LZ-BETA-PROD-NOTIFY-NETWORK-KEY'),
  has_qualified_flow_log:
    std.objectHas(flow_logs, 'LOG-LZ-BETA-PROD-VCN-FLOW-KEY'),
}
