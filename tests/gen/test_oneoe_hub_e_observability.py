from __future__ import annotations

import json
import unittest

from tests.gen.helpers import REPO_ROOT, jsonnet_command, render_jsonnet_object, run_cmd


DIRECTORY = REPO_ROOT / 'blueprints/one-oe/runtime/one-stack'
SOURCE = 'gen/blueprints/one-oe/runtime/one-stack'
TAG_PREFIX = 'tagns-lz-cost-governance.tag-lz-'


class OneOEObservabilityTests(unittest.TestCase):
    def test_only_two_common_observability_files_are_published(self):
        self.assertEqual(
            {'oneoe_observability_cis1.json', 'oneoe_observability_cis2.json'},
            {path.name for path in DIRECTORY.glob('oneoe_observability*.json')},
        )

    def test_complete_files_cover_every_hub_e_network_target(self):
        network = json.loads((DIRECTORY / 'oneoe_network_hub_e.json').read_text())
        targets = {}
        for category in network['network_configuration']['network_configuration_categories'].values():
            for key, vcn in category.get('vcns', {}).items():
                targets[key] = ('vcn', vcn['defined_tags'][TAG_PREFIX + 'environment'])
                for subnet_key, subnet in vcn.get('subnets', {}).items():
                    targets[subnet_key] = ('subnet', subnet['defined_tags'][TAG_PREFIX + 'environment'])

        for cis in (1, 2):
            with self.subTest(cis=cis):
                document = render_jsonnet_object(f'{SOURCE}/oneoe_observability_cis{cis}.jsonnet')
                logging = document['logging_configuration']
                self.assertFalse(logging.get('flow_logs'))
                logs = logging['service_logs']
                self.assertEqual(15, len(logs))
                self.assertEqual(set(targets), {log['resource_id'] for log in logs.values()})
                for log in logs.values():
                    category, environment = targets[log['resource_id']]
                    self.assertEqual('flowlogs', log['service'])
                    self.assertEqual(category, log['category'])
                    self.assertIn(log['log_group_id'], logging['log_groups'])
                    self.assertGreaterEqual(log['retention_duration'], 90)
                    self.assertEqual(environment, log['defined_tags'][TAG_PREFIX + 'environment'])
                    self.assertEqual('observability', log['defined_tags'][TAG_PREFIX + 'platform'])
                    self.assertEqual(6, len(log['defined_tags']))

                code = f"""
local profiles = import '{SOURCE}/profiles.libsonnet';
local publish = import '{SOURCE}/output_builder.libsonnet';
publish(profiles.hub_e).observability_cis{cis}
"""
                baseline = json.loads(run_cmd([jsonnet_command(), '-e', code]).stdout)
                self.assertEqual(set(baseline), set(document))
                for family in baseline:
                    if family != 'logging_configuration':
                        self.assertEqual(baseline[family], document[family])
                self.assertEqual(baseline['logging_configuration']['log_groups'], logging['log_groups'])

                for hub in 'abce':
                    other = json.loads((DIRECTORY / f'oneoe_network_hub_{hub}.json').read_text())
                    vcns = {}
                    subnets = set()
                    for category in other['network_configuration']['network_configuration_categories'].values():
                        for key, vcn in category.get('vcns', {}).items():
                            vcns[key] = vcn
                            subnets.update(vcn.get('subnets', {}))
                    self.assertEqual(set(vcns), {log['resource_id'] for log in logs.values() if log['category'] == 'vcn'})
                    self.assertTrue({log['resource_id'] for log in logs.values() if log['category'] == 'subnet'}.issubset(subnets))


if __name__ == '__main__':
    unittest.main()
