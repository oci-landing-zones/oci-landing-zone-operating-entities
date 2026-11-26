// Tags follow resource function, preserve authorization, and distinguish overlapping scope names.
// contains: "projection_contracts": true

local tags = import 'gen/lib/cost_tags.libsonnet';
local scope = import 'gen/lib/cost_scope.libsonnet';
local cfg = {
  shared_platforms: { analytics: {} },
  environments: {
    sandbox: { projects: { billing: {} }, platforms: { kubernetes: { extension: { type: 'oke_simple' } } } },
    prod: { projects: {} },
    'sandbox-eu': { projects: { 'billing-api': {} } },
  },
};
local collision_config = (import 'gen/defaults.libsonnet').hub_e {
  environments: {
    prod: { projects: {} },
    dev: {
      projects: { network: { subnets: { data: '10.1.5.0/24' } }, prod: {} },
      project_network: { network: { vcn: '10.1.0.0/21' } },
    },
  },
  cost_governance: {
    enable_tags: true,
    cost_center_assignments: {
      NETWORK_PROJECT: { project: ['network'] },
      PROD_PROJECT: { project: ['prod'] },
    },
  },
};
local collision_result = (import 'gen/landing_zone.libsonnet')(collision_config);
local published_collision = (import 'gen/blueprints/one-oe/runtime/one-stack/output_builder.libsonnet')({ config: collision_config });
local collision_children = collision_result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local dev_projects = collision_children['CMP-LZ-DEV-KEY'].children['CMP-LZ-DEV-PROJECTS-KEY'].children;
local shared_network = collision_children['CMP-LZ-NETWORK-KEY'];
local hub_vcn = collision_result.network.network_configuration.network_configuration_categories['0-shared'].vcns['VCN-FRA-LZ-HUB-KEY'];
local projected = tags.apply({
  network_configuration: { vcns: {
    'VCN-SANDBOX-EU-BILLING-API-KEY': scope.mark({}, 'sandbox-eu', 'billing-api'),
    'VCN-SANDBOX-BILLING-KEY': { _cost_scope:: scope.value('sandbox', 'billing'), defined_tags: { 'role.keep': 'yes' }, subnets: { 'SN-APP-KEY': {} } },
  }, l7_load_balancers: { 'LB-PROD-KEY': { _cost_scope:: scope.value('prod'), compartment_id: 'CMP-SHARED-NETWORK-KEY', listeners: { main: {} } } } },
  compartments_configuration: { compartments: { 'CMP-SHARED-ANALYTICS-KEY': {}, 'CMP-SANDBOX-KUBERNETES-KEY': scope.mark({}, 'sandbox', platform='oke'), 'CMP-PROD-SECURITY-KEY': scope.mark({}, 'prod', platform='security') } },
  oke_clusters_configuration: { clusters: { 'OKE-SANDBOX-KUBERNETES-KEY': { _cost_scope:: scope.value('sandbox'),
    options: { service_lb_config: { defined_tags: { 'tagns-lz-oke.platform': 'sandbox.kubernetes' } } },
  } } },
  oke_workers_configuration: { node_pools: { 'POOL-SANDBOX-KUBERNETES-KEY': { _cost_scope:: scope.value('sandbox'), node_config_details: { image: 'unchanged' } } } },
  oke_configuration: { 'OKE-SANDBOX-KUBERNETES-KEY': { _cost_scope:: scope.value('sandbox'),
    cluster_configuration: {
      defined_tags: { 'role.keep': 'cluster' },
      options: { service_lb_config: { defined_tags: { 'tagns-lz-oke.platform': 'sandbox.kubernetes' } } },
    },
    workers_configuration: { worker_pools: { 'POOL-SANDBOX-KUBERNETES-KEY': {
      defined_tags: { 'role.keep': 'pool' },
      node_defined_tags: { 'role.keep': 'node' },
    } } },
  } },
  notifications_configuration: { topics: { 'TOPIC-SANDBOX-KEY': { subscriptions: [{ protocol: 'EMAIL' }] } } },
  cloud_guard_configuration: { targets: { 'CG-TARGET-KEY': {} } },
  ocvs_configuration: { ocvs_clusters: { 'SDDC-SANDBOX-KEY': { networking: { route_tables: { uplink: 'RT-EXISTING-KEY' } } } } },
  tags_configuration: { namespaces: { existing: {} } },
}, cfg);
local prefix = 'tagns-lz-cost-governance.tag-lz-';
local value(resource, dimension) = resource.defined_tags[prefix + dimension];
local vcns = projected.network_configuration.vcns;
local lb = projected.network_configuration.l7_load_balancers['LB-PROD-KEY'];
local cluster = projected.oke_configuration['OKE-SANDBOX-KUBERNETES-KEY'].cluster_configuration;
local pool = projected.oke_configuration['OKE-SANDBOX-KUBERNETES-KEY'].workers_configuration.worker_pools['POOL-SANDBOX-KUBERNETES-KEY'];
local iam = tags.apply({
  compartments_configuration: { compartments: { 'CMP-LANDINGZONE-KEY': {}, 'CMP-LZ-NETWORK-KEY': {}, 'CMP-LZ-SECURITY-KEY': {} } },
  identity_domains_configuration: { identity_domains: { DOMAIN: {} } },
  identity_domain_groups_configuration: { groups: { 'GRP-PROD-PAYMENTS-KEY': scope.mark({}, 'shared', 'payments') } },
  policies_configuration: { supplied_policies: { POLICY: {} } },
}, { environments: { prod: { projects: { payments: {} } } } });
assert published_collision.network == collision_result.network : 'Published adapters must retain topology scopes';
assert value(shared_network, 'project') == 'notapplicable' : 'Shared network is not owned by the network project';
assert value(hub_vcn, 'project') == 'notapplicable' : 'network_configuration must not select the network project';
assert value(dev_projects['CMP-LZ-DEV-PROD-KEY'], 'environment') == 'dev' : 'A project named prod must retain its dev environment';
assert value(dev_projects['CMP-LZ-DEV-PROD-KEY'], 'project') == 'prod';
assert value(dev_projects['CMP-LZ-DEV-PROD-KEY'], 'cost-center') == 'PROD_PROJECT';
assert value(dev_projects['CMP-LZ-DEV-NETWORK-KEY'], 'project') == 'network';
assert value(shared_network, 'cost-center') == 'tobedefined';
assert value(dev_projects['CMP-LZ-DEV-NETWORK-KEY'], 'platform') == 'iam';
local dev_vcn = collision_result.network.network_configuration.network_configuration_categories['1-dev'].vcns['VCN-FRA-LZ-DEV-PROJECTS-KEY'];
assert value(dev_vcn.subnets['SN-FRA-LZ-DEV-NETWORK-DATA-KEY'], 'project') == 'network';
assert value(dev_vcn.subnets['SN-FRA-LZ-DEV-APP-KEY'], 'project') == 'notapplicable';
assert value(dev_vcn.network_security_groups['NSG-FRA-LZ-DEV-PROD-APP-KEY'], 'environment') == 'dev';
assert value(dev_vcn.network_security_groups['NSG-FRA-LZ-DEV-PROD-APP-KEY'], 'project') == 'prod';
assert !std.objectHas(dev_projects['CMP-LZ-DEV-PROD-KEY'], '_cost_scope');
assert value(vcns['VCN-SANDBOX-BILLING-KEY'], 'environment') == 'sandbox';
assert value(vcns['VCN-SANDBOX-BILLING-KEY'], 'project') == 'billing';
assert value(vcns['VCN-SANDBOX-BILLING-KEY'], 'platform') == 'network';
assert vcns['VCN-SANDBOX-BILLING-KEY'].defined_tags['role.keep'] == 'yes';
assert value(vcns['VCN-SANDBOX-BILLING-KEY'].subnets['SN-APP-KEY'], 'project') == 'billing';
assert value(vcns['VCN-SANDBOX-EU-BILLING-API-KEY'], 'environment') == 'sandbox-eu';
assert value(vcns['VCN-SANDBOX-EU-BILLING-API-KEY'], 'project') == 'billing-api';
assert value(lb, 'environment') == 'prod' && value(lb, 'project') == 'notapplicable';
assert !std.objectHas(lb.listeners.main, 'defined_tags');
assert value(cluster, 'platform') == 'oke' && value(cluster, 'environment') == 'sandbox';
assert cluster.defined_tags['role.keep'] == 'cluster';
assert value(cluster.options.service_lb_config, 'platform') == 'network';
assert cluster.options.service_lb_config.defined_tags['tagns-lz-oke.platform'] == 'sandbox.kubernetes';
assert value(cluster.options.persistent_volume_config, 'platform') == 'oke';
assert value(pool, 'platform') == 'oke' && value(pool, 'environment') == 'sandbox';
assert pool.defined_tags['role.keep'] == 'pool' && pool.node_defined_tags['role.keep'] == 'node';
assert pool.node_defined_tags[prefix + 'environment'] == 'sandbox';
assert value(projected.oke_clusters_configuration.clusters['OKE-SANDBOX-KUBERNETES-KEY'].options.service_lb_config, 'platform') == 'network';
assert projected.oke_clusters_configuration.clusters['OKE-SANDBOX-KUBERNETES-KEY'].options.service_lb_config.defined_tags['tagns-lz-oke.platform'] == 'sandbox.kubernetes';
assert projected.oke_workers_configuration.node_pools['POOL-SANDBOX-KUBERNETES-KEY'].node_config_details.image == 'unchanged';
assert value(projected.oke_workers_configuration.node_pools['POOL-SANDBOX-KUBERNETES-KEY'].node_config_details, 'platform') == 'oke';
assert projected.ocvs_configuration.ocvs_clusters['SDDC-SANDBOX-KEY'].networking.route_tables == { uplink: 'RT-EXISTING-KEY' };
assert !std.objectHas(projected.oke_configuration, 'default_defined_tags');
assert !std.objectHas(projected.notifications_configuration.topics['TOPIC-SANDBOX-KEY'].subscriptions[0], 'defined_tags');
assert projected.tags_configuration == { namespaces: { existing: {} } };
assert value(projected.compartments_configuration.compartments['CMP-SANDBOX-KUBERNETES-KEY'], 'platform') == 'oke';
assert value(iam.compartments_configuration.compartments['CMP-LZ-NETWORK-KEY'], 'platform') == 'network';
assert value(iam.compartments_configuration.compartments['CMP-LZ-SECURITY-KEY'], 'platform') == 'security';
assert value(iam.identity_domains_configuration.identity_domains.DOMAIN, 'platform') == 'iam';
assert value(iam.policies_configuration.supplied_policies.POLICY, 'platform') == 'iam';
assert value(iam.identity_domain_groups_configuration.groups['GRP-PROD-PAYMENTS-KEY'], 'environment') == 'shared';
assert value(iam.identity_domain_groups_configuration.groups['GRP-PROD-PAYMENTS-KEY'], 'project') == 'payments';
{ projection_contracts: true }
