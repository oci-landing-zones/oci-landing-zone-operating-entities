from __future__ import annotations

import json
import unittest

from tests.gen.helpers import REPO_ROOT


DIRECTORY = REPO_ROOT / 'blueprints/one-oe/runtime/one-stack'
PREFIX = 'tagns-lz-cost-governance.tag-lz-'
REQUIRED = {PREFIX + name for name in ('cost-center', 'business-unit', 'owner', 'platform', 'environment', 'project')}
NETWORK_COLLECTIONS = {
    'vcns', 'subnets', 'route_tables', 'security_lists', 'network_security_groups',
    'internet_gateways', 'nat_gateways', 'service_gateways', 'dynamic_routing_gateways',
    'drg_attachments', 'drg_route_tables', 'drg_route_distributions', 'l7_load_balancers',
    'network_firewalls', 'network_firewall_policies', 'nlbs',
}
OBSERVABILITY_COLLECTIONS = {'alarms', 'event_rules', 'log_groups', 'flow_logs', 'topics', 'buckets', 'service_connectors'}


def resources(value, collections, path=''):
    if isinstance(value, list):
        for index, item in enumerate(value):
            yield from resources(item, collections, path + '/' + str(index))
    elif isinstance(value, dict):
        for key, item in value.items():
            location = path + '/' + key
            if key in collections and isinstance(item, dict):
                for name, resource in item.items():
                    yield location + '/' + name, resource
            if key == 'default_security_list' and isinstance(item, dict):
                yield location, item
            yield from resources(item, collections, location)


class OneOEPublishedTagCoverageTests(unittest.TestCase):
    def check_files(self, pattern, collections, platform, expected_count):
        files = sorted(DIRECTORY.glob(pattern))
        self.assertEqual(expected_count, len(files))
        for filename in files:
            with self.subTest(file=filename.name):
                found = list(resources(json.loads(filename.read_text()), collections))
                self.assertTrue(found)
                for path, resource in found:
                    tags = resource.get('defined_tags', {})
                    self.assertTrue(REQUIRED.issubset(tags), filename.name + path)
                    self.assertEqual(platform, tags[PREFIX + 'platform'], filename.name + path)

    def test_every_published_network_variant_is_tagged(self):
        self.check_files('oneoe_network*.json', NETWORK_COLLECTIONS, 'network', 5)

    def test_every_published_observability_variant_is_tagged(self):
        self.check_files('oneoe_observability*.json', OBSERVABILITY_COLLECTIONS, 'observability', 4)


if __name__ == '__main__':
    unittest.main()
