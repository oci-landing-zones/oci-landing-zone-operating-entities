import json
import unittest

from tests.gen.helpers import jsonnet_command, run_cmd


class OneOEBudgetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.governance = json.loads(run_cmd([
            jsonnet_command(), 'gen/blueprints/one-oe/runtime/one-stack/oneoe_governance.jsonnet',
        ]).stdout)

    def test_agreed_budget_targets_and_amounts(self):
        budgets = self.governance['budgets_configuration']['budgets']
        actual = {
            budget['target']['values'][0]: budget['amount']
            for budget in budgets.values()
        }
        prefix = 'tagns-lz-cost-governance.tag-lz-'
        self.assertEqual({
            prefix + 'project.proj1': 500,
            prefix + 'environment.prod': 3000,
            prefix + 'environment.preprod': 2000,
            prefix + 'business-unit.IT': 5000,
            prefix + 'cost-center.CC12345': 5000,
        }, actual)
        self.assertEqual(5, len(budgets))
        for budget in budgets.values():
            self.assertEqual('TAG', budget['target']['type'])
            self.assertEqual(1, len(budget['target']['values']))
            self.assertEqual({'reset_period': 'MONTHLY', 'processing_period_type': 'MONTH',
                              'day_of_month_to_begin': 1}, budget['schedule'])

    def test_alerts_and_resource_metadata(self):
        definitions = self.governance['tags_configuration']['namespaces']['TAGNS-LZ-COST-GOVERNANCE-KEY']['tags']
        allowed = {'tagns-lz-cost-governance.' + tag['name']: tag['valid_values']
                   for tag in definitions.values()}
        for budget in self.governance['budgets_configuration']['budgets'].values():
            alert = budget['alert_rule']
            self.assertEqual('ACTUAL', alert['threshold_metric'])
            self.assertEqual('PERCENTAGE', alert['threshold_type'])
            self.assertEqual(80, alert['threshold_value'])
            self.assertEqual('email.address@example.com', alert['recipients'])
            self.assertEqual(set(allowed), set(budget['defined_tags']))
            target_key, target_value = budget['target']['values'][0].rsplit('.', 1)
            self.assertEqual(target_value, budget['defined_tags'][target_key])
            for key, value in budget['defined_tags'].items():
                self.assertIn(value, allowed[key])
        # Budget creation must not tag the namespace with its own definitions.
        self.assertNotIn('default_defined_tags', self.governance['tags_configuration'])
