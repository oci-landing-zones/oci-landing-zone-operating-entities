// Tags follow resource function, preserve authorization, and distinguish overlapping scope names.
// contains: "projection_contracts": true

local tags = import 'gen/lib/cost_tags.libsonnet';
local cfg = {
  shared_platforms: { analytics: {} },
  environments: {
    sandbox: { projects: { billing: {} }, platforms: { kubernetes: { extension: { type: 'oke_simple' } } } },
    prod: { projects: {} },
    'sandbox-eu': { projects: { 'billing-api': {} } },
  },
};
local projected = tags.apply({
  network_configuration: { vcns: {
    'VCN-SANDBOX-EU-BILLING-API-KEY': {},
    'VCN-SANDBOX-BILLING-KEY': { defined_tags: { 'role.keep': 'yes' }, subnets: { 'SN-APP-KEY': {} } },
  }, l7_load_balancers: { 'LB-PROD-KEY': { compartment_id: 'CMP-SHARED-NETWORK-KEY', listeners: { main: {} } } } },
  compartments_configuration: { compartments: { 'CMP-SHARED-ANALYTICS-KEY': {}, 'CMP-SANDBOX-KUBERNETES-KEY': {}, 'CMP-PROD-SECURITY-KEY': {} } },
  oke_clusters_configuration: { clusters: { 'OKE-SANDBOX-KUBERNETES-KEY': {
    options: { service_lb_config: { defined_tags: { 'tagns-lz-oke.platform': 'sandbox.kubernetes' } } },
  } } },
  oke_workers_configuration: { node_pools: { 'POOL-SANDBOX-KUBERNETES-KEY': { node_config_details: { image: 'unchanged' } } } },
  oke_configuration: { 'OKE-SANDBOX-KUBERNETES-KEY': {
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
  identity_domain_groups_configuration: { groups: { 'GRP-PROD-PAYMENTS-KEY': {} } },
  policies_configuration: { supplied_policies: { POLICY: {} } },
}, { environments: { prod: { projects: { payments: {} } } } });
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
