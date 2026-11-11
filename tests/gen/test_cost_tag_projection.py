import json
import unittest
from tests.gen.helpers import jsonnet_command, run_cmd


class CostTagProjectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = json.loads(run_cmd([jsonnet_command(), '-e', r'''
local tags = import 'gen/lib/cost_tags.libsonnet';
local cfg = {
  shared_platforms: { analytics: {} },
  environments: {
    sandbox: { projects: { billing: {} }, platforms: { kubernetes: { extension: { type: 'oke_simple' } } } },
    prod: { projects: {} },
    'sandbox-eu': { projects: { 'billing-api': {} } },
  },
};
tags.apply({
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
}, cfg)
''']).stdout)

    def value(self, resource, name):
        return resource['defined_tags']['tagns-lz-cost-governance.tag-lz-' + name]

    def test_general_iam_resources_use_iam_and_specialized_compartments_keep_their_platform(self):
        doc = json.loads(run_cmd([jsonnet_command(), '-e', """
(import 'gen/lib/cost_tags.libsonnet').apply({
  compartments_configuration: { compartments: {
    'CMP-LANDINGZONE-KEY': {}, 'CMP-LZ-NETWORK-KEY': {}, 'CMP-LZ-SECURITY-KEY': {},
  } },
  identity_domains_configuration: { identity_domains: { DOMAIN: {} } },
  identity_domain_groups_configuration: { groups: { GROUP: {} } },
  policies_configuration: { supplied_policies: { POLICY: {} } },
}, { environments: {} })
"""]).stdout)
        compartments = doc['compartments_configuration']['compartments']
        self.assertEqual('iam', self.value(compartments['CMP-LANDINGZONE-KEY'], 'platform'))
        self.assertEqual('network', self.value(compartments['CMP-LZ-NETWORK-KEY'], 'platform'))
        self.assertEqual('security', self.value(compartments['CMP-LZ-SECURITY-KEY'], 'platform'))
        for family, collection, key in [('identity_domains_configuration', 'identity_domains', 'DOMAIN'), ('identity_domain_groups_configuration', 'groups', 'GROUP'), ('policies_configuration', 'supplied_policies', 'POLICY')]:
            self.assertEqual('iam', self.value(doc[family][collection][key], 'platform'))

    def test_project_admin_groups_are_shared_but_keep_their_project(self):
        doc = json.loads(run_cmd([jsonnet_command(), '-e', """
(import 'gen/lib/cost_tags.libsonnet').apply({identity_domain_groups_configuration:{groups:{'GRP-PROD-PAYMENTS-KEY':{}}}}, {environments:{prod:{projects:{payments:{}}}}})
"""]).stdout)
        group = doc['identity_domain_groups_configuration']['groups']['GRP-PROD-PAYMENTS-KEY']
        self.assertEqual('iam', self.value(group, 'platform'))
        self.assertEqual('shared', self.value(group, 'environment'))
        self.assertEqual('payments', self.value(group, 'project'))

    def test_custom_environment_project_and_authorization_preserved(self):
        vcn = self.doc['network_configuration']['vcns']['VCN-SANDBOX-BILLING-KEY']
        self.assertEqual('sandbox', self.value(vcn, 'environment'))
        self.assertEqual('billing', self.value(vcn, 'project'))
        self.assertEqual('network', self.value(vcn, 'platform'))
        self.assertEqual('yes', vcn['defined_tags']['role.keep'])
        self.assertEqual('billing', self.value(vcn['subnets']['SN-APP-KEY'], 'project'))

    def test_longer_environment_and_project_names_win(self):
        vcn = self.doc['network_configuration']['vcns']['VCN-SANDBOX-EU-BILLING-API-KEY']
        self.assertEqual('sandbox-eu', self.value(vcn, 'environment'))
        self.assertEqual('billing-api', self.value(vcn, 'project'))

    def test_lb_scope_does_not_blindly_follow_shared_compartment(self):
        lb = self.doc['network_configuration']['l7_load_balancers']['LB-PROD-KEY']
        self.assertEqual('prod', self.value(lb, 'environment'))
        self.assertEqual('notapplicable', self.value(lb, 'project'))
        self.assertNotIn('defined_tags', lb['listeners']['main'])

    def test_oke_implicit_resources_keep_authorization(self):
        cluster = self.doc['oke_clusters_configuration']['clusters']['OKE-SANDBOX-KUBERNETES-KEY']
        opts = cluster['options']
        self.assertEqual('oke', self.value(cluster, 'platform'))
        self.assertEqual('network', self.value(opts['service_lb_config'], 'platform'))
        self.assertEqual('sandbox.kubernetes', opts['service_lb_config']['defined_tags']['tagns-lz-oke.platform'])
        self.assertEqual('oke', self.value(opts['persistent_volume_config'], 'platform'))
        node = self.doc['oke_workers_configuration']['node_pools']['POOL-SANDBOX-KUBERNETES-KEY']['node_config_details']
        self.assertEqual('oke', self.value(node, 'platform'))
        self.assertEqual('unchanged', node['image'])

    def test_network_identifier_maps_are_references(self):
        networking = self.doc['ocvs_configuration']['ocvs_clusters']['SDDC-SANDBOX-KEY']['networking']
        self.assertEqual({'uplink': 'RT-EXISTING-KEY'}, networking['route_tables'])

    def test_consolidated_oke_tags_clusters_pools_and_implicit_resources(self):
        entry = self.doc['oke_configuration']['OKE-SANDBOX-KUBERNETES-KEY']
        cluster = entry['cluster_configuration']
        required = {'tagns-lz-cost-governance.tag-lz-' + name for name in
                    ('cost-center', 'business-unit', 'owner', 'platform', 'environment', 'project')}
        self.assertTrue(required.issubset(cluster.get('defined_tags', {})))
        self.assertEqual('oke', self.value(cluster, 'platform'))
        self.assertEqual('sandbox', self.value(cluster, 'environment'))
        self.assertEqual('cluster', cluster['defined_tags']['role.keep'])
        opts = cluster['options']
        self.assertEqual('oke', self.value(opts['persistent_volume_config'], 'platform'))
        self.assertEqual('network', self.value(opts['service_lb_config'], 'platform'))
        self.assertEqual('sandbox.kubernetes', opts['service_lb_config']['defined_tags']['tagns-lz-oke.platform'])
        pool = entry['workers_configuration']['worker_pools']['POOL-SANDBOX-KUBERNETES-KEY']
        self.assertTrue(required.issubset(pool.get('defined_tags', {})))
        self.assertTrue(required.issubset(pool.get('node_defined_tags', {})))
        self.assertEqual('pool', pool['defined_tags']['role.keep'])
        self.assertEqual('node', pool['node_defined_tags']['role.keep'])
        self.assertEqual('sandbox', pool['node_defined_tags']['tagns-lz-cost-governance.tag-lz-environment'])
        self.assertNotIn('defined_tags', entry)
        self.assertNotIn('default_defined_tags', self.doc['oke_configuration'])

    def test_compartment_classification_and_module_defaults(self):
        cmps = self.doc['compartments_configuration']['compartments']
        self.assertEqual('oke', self.value(cmps['CMP-SANDBOX-KUBERNETES-KEY'], 'platform'))
        self.assertEqual('security', self.value(cmps['CMP-PROD-SECURITY-KEY'], 'platform'))
        self.assertEqual('iam', self.value(cmps['CMP-SHARED-ANALYTICS-KEY'], 'platform'))
        obs = self.doc['notifications_configuration']
        self.assertEqual('observability', obs['default_defined_tags']['tagns-lz-cost-governance.tag-lz-platform'])
        self.assertNotIn('defined_tags', obs['topics']['TOPIC-SANDBOX-KEY']['subscriptions'][0])
        self.assertEqual({'namespaces': {'existing': {}}}, self.doc['tags_configuration'])
