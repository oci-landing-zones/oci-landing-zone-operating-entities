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
  notifications_configuration: { topics: { 'TOPIC-SANDBOX-KEY': { subscriptions: [{ protocol: 'EMAIL' }] } } },
  cloud_guard_configuration: { targets: { 'CG-TARGET-KEY': {} } },
  ocvs_configuration: { ocvs_clusters: { 'SDDC-SANDBOX-KEY': { networking: { route_tables: { uplink: 'RT-EXISTING-KEY' } } } } },
  tags_configuration: { namespaces: { existing: {} } },
}, cfg)
''']).stdout)

    def value(self, resource, name):
        return resource['defined_tags']['tagns-lz-cost-governance.tag-lz-' + name]

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
        self.assertEqual('notapply', self.value(lb, 'project'))
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

    def test_compartment_classification_and_module_defaults(self):
        cmps = self.doc['compartments_configuration']['compartments']
        self.assertEqual('oke', self.value(cmps['CMP-SANDBOX-KUBERNETES-KEY'], 'platform'))
        self.assertEqual('security', self.value(cmps['CMP-PROD-SECURITY-KEY'], 'platform'))
        self.assertEqual('tobedefined', self.value(cmps['CMP-SHARED-ANALYTICS-KEY'], 'platform'))
        obs = self.doc['notifications_configuration']
        self.assertEqual('observability', obs['default_defined_tags']['tagns-lz-cost-governance.tag-lz-platform'])
        self.assertNotIn('defined_tags', obs['topics']['TOPIC-SANDBOX-KEY']['subscriptions'][0])
        self.assertEqual({'namespaces': {'existing': {}}}, self.doc['tags_configuration'])
