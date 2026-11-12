import json
import unittest
from tests.gen.helpers import jsonnet_command, run_cmd


class GovernanceTagBootstrapTests(unittest.TestCase):
    def render(self, enabled=True):
        config = {'hub': {'kind': 'hub_e', 'network': {'vcn': '10.0.0.0/21'}}, 'cost_governance': {
            'tag_resource_labels': enabled, 'require_tag_values': True, 'owner_email': 'owner@example.com',
            'cost_center_assignments': {'CC12345': {}},
        }}
        proc = run_cmd([jsonnet_command(), '-e', "local out=(import 'gen/landing_zone_multi.jsonnet')(%s); { [file]: out[file] for file in std.objectFields(out) if std.startsWith(file, 'governance') }" % json.dumps(config)], expect_success=False)
        self.assertEqual(0, proc.returncode, proc.stderr)
        return json.loads(proc.stdout)

    def test_bootstrap_creates_tags_before_the_final_phase_labels_them(self):
        outputs = self.render()
        self.assertIn('governance_pre.json', outputs)
        final, pre = outputs['governance.json'], outputs['governance_pre.json']
        self.assertEqual(final['budgets_configuration'], pre['budgets_configuration'])
        for key, namespace in final['tags_configuration']['namespaces'].items():
            original = pre['tags_configuration']['namespaces'][key]
            self.assertNotIn('defined_tags', original)
            for resource in [namespace, *namespace['tags'].values()]:
                tags = resource['defined_tags']
                for name, expected in [('platform', 'governance'), ('environment', 'shared'), ('project', 'notapplicable'), ('owner', 'owner@example.com'), ('cost-center', 'CC12345')]:
                    self.assertEqual(expected, tags['tagns-lz-cost-governance.tag-lz-' + name])
            for tag in original['tags'].values():
                self.assertNotIn('defined_tags', tag)

    def test_factory_can_keep_the_previous_unlabelled_bootstrap_contract(self):
        outputs = self.render(False)
        self.assertNotIn('governance_pre.json', outputs)
        self.assertNotIn('defined_tags', outputs['governance.json']['tags_configuration']['namespaces']['TAGNS-LZ-COST-GOVERNANCE-KEY'])
