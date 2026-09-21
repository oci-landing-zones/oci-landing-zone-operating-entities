// omitted and empty environments emit the same shared Landing Zone and hub resource inventory
// contains: "omitted_environments_matches_empty": true
// contains: "no_environment_compartments": true
// contains: "categories": [
// contains: "0-shared"
local multi = import 'gen/landing_zone_multi.jsonnet';
local config = import 'addons/oci-lz-blueprint-factory/examples/00-no-environments.json';
local outputs = multi(config);
local explicit_empty_outputs = multi(config + { environments: {} });
local keys(value) = std.sort(std.objectFields(value));

local network = outputs['network.json'].network_configuration.network_configuration_categories;
local shared = network['0-shared'];
local hub_vcn = shared.vcns['VCN-FRA-LZ-HUB-KEY'];
local hub_gateways = hub_vcn.vcn_specific_gateways;
local non_vcn_gateways = shared.non_vcn_specific_gateways;
local drgs = non_vcn_gateways.dynamic_routing_gateways;
local hub_drg = drgs['DRG-FRA-LZ-HUB-KEY'];
local route_distributions = hub_drg.drg_route_distributions;
local load_balancers = non_vcn_gateways.l7_load_balancers;
local hub_lb = load_balancers['LB-FRA-LZ-PROD-01-KEY'];
local backend_sets = hub_lb.backend_sets;

local iam = outputs['iam.json'];
local landing_zone_compartment =
  iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'];

local observability_pre = outputs['observability_cis2_pre.json'];
local observability = outputs['observability_cis2.json'];
local security_pre = outputs['security_cis2_pre.json'];
local security = outputs['security_cis2.json'];

{
  omitted_environments_matches_empty: outputs == explicit_empty_outputs,
  no_environment_compartments:
    std.length([
      key
      for key in keys(iam.compartments_configuration.compartments)
      if key != 'CMP-LANDINGZONE-KEY'
    ]) == 0,
  output_files: keys(outputs),

  network: {
    categories: keys(network),
    vcns: keys(shared.vcns),
    subnets: keys(hub_vcn.subnets),
    route_tables: keys(hub_vcn.route_tables),
    security_lists: keys(hub_vcn.security_lists),
    network_security_groups: keys(hub_vcn.network_security_groups),
    internet_gateways: keys(hub_gateways.internet_gateways),
    nat_gateways: keys(hub_gateways.nat_gateways),
    service_gateways: keys(hub_gateways.service_gateways),
    dynamic_routing_gateways: keys(drgs),
    drg_attachments: keys(hub_drg.drg_attachments),
    drg_route_distributions: keys(route_distributions),
    drg_route_distribution_statements: {
      hub: keys(route_distributions['DRGRD-FRA-LZ-HUB-KEY'].statements),
      spoke: keys(route_distributions['DRGRD-FRA-LZ-SPOKE-KEY'].statements),
    },
    drg_route_tables: keys(hub_drg.drg_route_tables),
    l7_load_balancers: keys(load_balancers),
    load_balancer_listeners: keys(hub_lb.listeners),
    load_balancer_backend_sets: keys(backend_sets),
    load_balancer_backends: {
      first: keys(backend_sets['LBBKST-FRA-LZ-PROD-01-KEY'].backends),
      second: keys(backend_sets['LBBKST-FRA-LZ-PROD-02-KEY'].backends),
    },
    load_balancer_backend_ips: [
      backend_sets['LBBKST-FRA-LZ-PROD-01-KEY'].backends['LBBE-FRA-LZ-PROD-01-KEY'].ip_address,
      backend_sets['LBBKST-FRA-LZ-PROD-02-KEY'].backends['LBBE-FRA-LZ-PROD-02-KEY'].ip_address,
    ],
    load_balancer_routing_policies: keys(hub_lb.routing_policies),
  },

  iam: {
    compartments: keys(iam.compartments_configuration.compartments),
    landing_zone_children: keys(landing_zone_compartment.children),
    identity_domains: keys(iam.identity_domains_configuration.identity_domains),
    groups: keys(iam.identity_domain_groups_configuration.groups),
    policies: keys(iam.policies_configuration.supplied_policies),
  },

  governance: {
    tag_namespaces: keys(outputs['governance.json'].tags_configuration.namespaces),
    role_tags: keys(
      outputs['governance.json'].tags_configuration.namespaces['TAGNS-LZ-ROLE-KEY'].tags
    ),
  },

  security: {
    cloud_guard_targets: keys(security.cloud_guard_configuration.targets),
    host_recipes: keys(security.scanning_configuration.host_recipes),
    host_targets: keys(security.scanning_configuration.host_targets),
    recipes: keys(security.security_zones_configuration.recipes),
    pre_security_zones: keys(security_pre.security_zones_configuration.security_zones),
    security_zones: keys(security.security_zones_configuration.security_zones),
    vaults: keys(security.vaults_configuration.vaults),
    keys: keys(security.vaults_configuration.keys),
  },

  observability: {
    alarms: keys(observability.alarms_configuration.alarms),
    event_rules: keys(observability.events_configuration.event_rules),
    home_region_event_rules: keys(observability.home_region_events_configuration.event_rules),
    flow_logs: keys(observability.logging_configuration.flow_logs),
    log_groups: keys(observability.logging_configuration.log_groups),
    topics: keys(observability.notifications_configuration.topics),
    buckets: keys(observability.service_connectors_configuration.buckets),
    service_connectors: keys(observability.service_connectors_configuration.service_connectors),
    pre_has_logging: std.objectHas(observability_pre, 'logging_configuration'),
  },
}
