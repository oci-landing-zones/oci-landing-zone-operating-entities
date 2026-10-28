from __future__ import annotations

import json
import unittest
from pathlib import Path

from tests.gen.helpers import REPO_ROOT


PREFIX = 'tagns-lz-cost-governance.tag-lz-'
REQUIRED = {PREFIX + key for key in ('cost-center', 'business-unit', 'owner', 'platform', 'environment', 'project')}
FAMILIES = {
    'compartments_configuration', 'groups_configuration', 'dynamic_groups_configuration',
    'identity_domain_groups_configuration', 'identity_domain_dynamic_groups_configuration',
    'identity_domains_configuration', 'policies_configuration', 'network_configuration',
    'instances_configuration', 'cloud_guard_configuration', 'scanning_configuration',
    'security_zones_configuration', 'vaults_configuration', 'alarms_configuration',
    'events_configuration', 'home_region_events_configuration', 'logging_configuration',
    'notifications_configuration', 'service_connectors_configuration',
}
COLLECTIONS = {
    'compartments', 'children', 'groups', 'dynamic_groups', 'identity_domains', 'supplied_policies',
    'vcns', 'subnets', 'route_tables', 'security_lists', 'network_security_groups',
    'internet_gateways', 'nat_gateways', 'service_gateways', 'dynamic_routing_gateways',
    'drg_attachments', 'drg_route_tables', 'drg_route_distributions', 'l7_load_balancers',
    'alarms', 'event_rules', 'topics', 'buckets', 'service_connectors', 'targets',
    'host_recipes', 'host_targets', 'recipes', 'security_zones', 'vaults', 'keys',
    'network_firewalls', 'network_firewall_policies', 'nlbs', 'log_groups', 'flow_logs',
    'remote_peering_connections', 'instances', 'resolvers', 'views', 'zones',
    'tsig_keys', 'steering_policies', 'attached_views', 'dns_zones',
}


def walk(value, path=()):
    if isinstance(value, dict):
        yield path, value
        for key, item in value.items():
            yield from walk(item, path + (key,))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk(item, path + (str(index),))


def static_inputs():
    for root in ('addons', 'workload-extensions'):
        for filename in sorted((REPO_ROOT / root).rglob('*.json')):
            relative = filename.relative_to(REPO_ROOT)
            if any(part.startswith('.') for part in relative.parts):
                continue
            if '0_archive' in relative.parts or 'oci-learn-lz' in relative.parts:
                continue
            if (REPO_ROOT / 'gen' / relative.with_suffix('.jsonnet')).exists():
                continue
            # JSON with a runtime family is a deployable input, not a Studio or Factory config.
            value = json.loads(filename.read_text())
            if isinstance(value, dict) and FAMILIES.intersection(value):
                yield relative, value


class StaticCostTagTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = list(static_inputs())
        governance = json.loads((REPO_ROOT / 'blueprints/one-oe/runtime/one-stack/oneoe_governance.json').read_text())
        definitions = governance['tags_configuration']['namespaces']['TAGNS-LZ-COST-GOVERNANCE-KEY']['tags']
        cls.allowed = {
            'tagns-lz-cost-governance.' + tag['name']: tag['valid_values']
            for tag in definitions.values()
        }

    def assert_cost_tags(self, tags, location):
        self.assertIsInstance(tags, dict, location)
        self.assertTrue(REQUIRED.issubset(tags), location)
        for key in REQUIRED:
            self.assertIn(tags[key], self.allowed[key], location + '/' + key)

    def test_all_static_resource_and_section_defaults_are_covered(self):
        self.assertTrue(self.inputs)
        checked = 0
        for filename, value in self.inputs:
            for path, resource in walk(value):
                if not path or path[0] not in FAMILIES:
                    continue
                location = str(filename) + '/' + '/'.join(path)
                if len(path) == 1:
                    self.assert_cost_tags(resource.get('default_defined_tags'), location)
                is_resource = len(path) > 1 and path[-2] in COLLECTIONS
                is_resource |= path[-1] in ('default_security_list', 'dns_resolver')
                if is_resource and not resource.get('existing_view_id'):
                    self.assert_cost_tags(resource.get('defined_tags'), location)
                    checked += 1
        self.assertGreater(checked, 0)

    def test_known_scopes_and_existing_authorization_tags(self):
        tbac = dict(self.inputs)[Path('addons/oci-tbac/oci_open_lz_one-oe_iam.auto.tfvars.json')]
        group = tbac['groups_configuration']['groups']['GRP-LZP-PROD-PROJ2-ADMINS']
        self.assertEqual('grp-lzp-prod-proj2', group['defined_tags']['tn-lzp-proj-role.proj-admin'])
        for path, resource in walk(tbac):
            if path and 'PROJ2' in path[-1] and 'defined_tags' in resource:
                self.assertEqual('proj2', resource['defined_tags'][PREFIX + 'project'], '/'.join(path))
        finops = dict(self.inputs)[Path('addons/oci-finops/finops-setup/finops_network.auto.tfvars.json')]
        for path, resource in walk(finops):
            if 'defined_tags' in resource:
                self.assertEqual('network', resource['defined_tags'][PREFIX + 'platform'], '/'.join(path))
        for filename, value in self.inputs:
            for path, resource in walk(value):
                if path and path[-2:-1] in (('listeners',), ('backend_sets',), ('routing_policies',)):
                    self.assertNotIn('defined_tags', resource, str(filename) + '/' + '/'.join(path))


if __name__ == '__main__':
    unittest.main()
