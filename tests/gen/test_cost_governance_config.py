import json
import unittest

from tests.gen.helpers import jsonnet_command, run_cmd


class CostGovernanceConfigTests(unittest.TestCase):
    def render(self, settings, projects=None):
        config = {'hub': {'kind': 'hub_e', 'network': {'vcn': '10.0.0.0/21'}}, 'cost_governance': settings}
        if projects:
            config['environments'] = {env: {'projects': {project: {} for project in projects}} for env in ['prod', 'preprod']}
        return json.loads(run_cmd([jsonnet_command(), '-e',
            "(import 'gen/landing_zone.libsonnet')(%s).governance" % json.dumps(config)]).stdout)

    def test_removed_business_unit_does_not_return_through_an_inherited_budget(self):
        doc = self.render({'tag_value_lists': {'tag-lz-business-unit': ['IT']}})
        budgets = doc['budgets_configuration']['budgets']
        self.assertIn('BUDGET-BUSINESS-UNIT-IT-KEY', budgets)
        self.assertNotIn('BUDGET-BUSINESS-UNIT-RETAIL-KEY', budgets)
        self.assertNotIn('BUDGET-BUSINESS-UNIT-FINANCE-KEY', budgets)
        tag = doc['tags_configuration']['namespaces']['TAGNS-LZ-COST-GOVERNANCE-KEY']['tags']['TAG-LZ-BUSINESS-UNIT-KEY']
        self.assertEqual(['IT', 'tobedefined'], tag['valid_values'])

    def test_platform_target_does_not_change_the_budget_own_governance_platform(self):
        doc = self.render({'additional_budgets': {'BUDGET-CUSTOM-NETWORK-KEY': {
            'name': 'budget-network', 'amount': 100, 'tag_name': 'tag-lz-platform', 'tag_value': 'network',
        }}})
        budget = doc['budgets_configuration']['budgets']['BUDGET-CUSTOM-NETWORK-KEY']
        self.assertEqual(['tagns-lz-cost-governance.tag-lz-platform.network'], budget['target']['values'])
        self.assertEqual('governance', budget['defined_tags']['tagns-lz-cost-governance.tag-lz-platform'])

    def test_budget_environment_is_shared_while_its_target_stays_prod(self):
        doc = self.render({})
        budget = doc['budgets_configuration']['budgets']['BUDGET-ENV-PROD-KEY']
        self.assertEqual('shared', budget['defined_tags']['tagns-lz-cost-governance.tag-lz-environment'])
        self.assertEqual(['tagns-lz-cost-governance.tag-lz-environment.prod'], budget['target']['values'])

    def test_each_configured_business_unit_requires_a_cost_center(self):
        with self.assertRaises(AssertionError):
            self.render({'tag_value_lists': {'tag-lz-business-unit': ['IT']}, 'cost_center_business_units': {}})

    def test_all_budgets_use_governance_platform(self):
        doc = self.render({})
        field = 'tagns-lz-cost-governance.tag-lz-platform'
        self.assertEqual('governance', doc['budgets_configuration']['default_defined_tags'][field])
        for budget in doc['budgets_configuration']['budgets'].values():
            self.assertEqual('governance', budget['defined_tags'][field])
        values = doc['tags_configuration']['namespaces']['TAGNS-LZ-COST-GOVERNANCE-KEY']['tags']['TAG-LZ-PLATFORM-KEY']['valid_values']
        self.assertIn('governance', values)
        self.assertIn('iam', values)

    def test_both_tag_modes_keep_all_six_defaults_and_values(self):
        for required in (False, True):
            with self.subTest(required=required):
                doc = self.render({'require_tag_values': required})
                tags = doc['tags_configuration']['namespaces']['TAGNS-LZ-COST-GOVERNANCE-KEY']['tags']
                self.assertEqual(6, len(tags))
                for key, tag in tags.items():
                    default = next(iter(tag['tag_defaults'].values()))
                    self.assertIs(required, default['is_user_required'])
                    self.assertEqual('notapplicable' if key == 'TAG-LZ-PROJECT-KEY' else 'tobedefined', default['default_value'])
                self.assertNotIn('tag_defaults', doc['tags_configuration']['namespaces']['TAGNS-LZ-ROLE-KEY']['tags']['TAG-LZ-ROLE-KEY'])

    def test_owner_email_updates_default_and_allowed_values(self):
        doc = self.render({'owner_email': 'owner@example.com'})
        owner = doc['tags_configuration']['namespaces']['TAGNS-LZ-COST-GOVERNANCE-KEY']['tags']['TAG-LZ-OWNER-KEY']
        self.assertIn('owner@example.com', owner['valid_values'])
        self.assertEqual('owner@example.com', next(iter(owner['tag_defaults'].values()))['default_value'])
        for invalid in ['', 'invalid', 'one@example.com,two@example.com', ' owner@example.com', None, []]:
            with self.subTest(owner=invalid):
                with self.assertRaises(AssertionError):
                    self.render({'owner_email': invalid})

    def test_owner_overrides_nested_workload_tags_but_preserves_other_tags(self):
        owner_key = 'tagns-lz-cost-governance.tag-lz-owner'
        role_key = 'tagns-lz-role.tag-lz-role'
        old = {owner_key: 'old@example.com', role_key: 'admin'}
        doc = {
            'oke_configuration': {'clusters': {'CLUSTER': {
                'defined_tags': old,
                'options': {'persistent_volume_config': {'defined_tags': old}, 'service_lb_config': {'defined_tags': old}},
            }}, 'worker_pools': {'POOL': {'node_defined_tags': old}},
                'node_pools': {'NODES': {'node_config_details': {'defined_tags': old}}}},
            'budgets_configuration': {'budgets': {'BUDGET': {'defined_tags': old}}},
        }
        code = "(import 'gen/lib/cost_tags.libsonnet').apply(%s, %s)" % (json.dumps(doc), json.dumps({
            'environments': {}, 'cost_governance': {'owner_email': 'owner@example.com'},
        }))
        rendered = json.loads(run_cmd([jsonnet_command(), '-e', code]).stdout)
        unchanged = json.loads(run_cmd([jsonnet_command(), '-e',
            "(import 'gen/lib/cost_tags.libsonnet').apply(%s, {environments: {}})" % json.dumps(doc)]).stdout)
        self.assertEqual('old@example.com', unchanged['oke_configuration']['clusters']['CLUSTER']['defined_tags'][owner_key])

        checked = []
        def walk(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    if key in ['defined_tags', 'default_defined_tags', 'node_defined_tags']:
                        self.assertEqual('owner@example.com', child[owner_key])
                        if role_key in child:
                            self.assertEqual('admin', child[role_key])
                        checked.append(child)
                    else:
                        walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)
        walk(rendered)
        self.assertGreaterEqual(len(checked), 8)

    def test_budget_overrides_keep_targets_and_update_alert_text(self):
        doc = self.render({'budgets': {'BUDGET-LANDINGZONE-KEY': {
            'name': 'budget-team', 'amount': 12500,
            'alert_rule': {'threshold_value': 125.5, 'recipients': 'finops@example.com,owner@example.com'},
        }}})
        budgets = doc['budgets_configuration']['budgets']
        self.assertEqual(8, len(budgets))
        budget = budgets['BUDGET-LANDINGZONE-KEY']
        self.assertEqual('budget-team', budget['name'])
        self.assertEqual(12500, budget['amount'])
        self.assertEqual(['CMP-LANDINGZONE-KEY'], budget['target']['values'])
        self.assertEqual(125.5, budget['alert_rule']['threshold_value'])
        self.assertEqual('budget-team-125-5', budget['alert_rule']['name'])
        self.assertEqual('finops@example.com,owner@example.com', budget['alert_rule']['recipients'])
        self.assertIn('125.5%', budget['alert_rule']['message'])
        self.assertNotIn('80%', budget['alert_rule']['message'])
        self.assertEqual(500, budgets['BUDGET-PROJ1-KEY']['amount'])

    def test_invalid_settings_fail_before_generation(self):
        for settings in [
            {'require_tag_values': 'true'},
            {'budget_recipients': 'a@.'},
            {'budget_recipients': 'a@b..com'},
            {'budgets': None},
            {'budgets': {'BUDGET-LANDINGZONE-KEY': {'alert_rule': None}}},
            {'budgets': {'UNKNOWN': {}}},
            {'budgets': {'BUDGET-LANDINGZONE-KEY': {'amount': 0}}},
            {'budgets': {'BUDGET-LANDINGZONE-KEY': {'amount': 1.5}}},
            {'budgets': {'BUDGET-LANDINGZONE-KEY': {'alert_rule': {'threshold_value': 10001}}}},
            {'budgets': {'BUDGET-LANDINGZONE-KEY': {'alert_rule': {'recipients': ['a@example.com']}}}},
        ]:
            with self.subTest(settings=settings):
                with self.assertRaises(AssertionError):
                    self.render(settings)

    def test_single_email_applies_to_every_inherited_budget(self):
        doc = self.render({'budget_recipients': 'finops@example.com', 'budgets': {
            'BUDGET-LANDINGZONE-KEY': {'alert_rule': {'recipients': 'individual@example.com'}},
        }})
        budgets = doc['budgets_configuration']['budgets']
        self.assertEqual(8, len(budgets))
        self.assertEqual({'finops@example.com'}, {budget['alert_rule']['recipients'] for budget in budgets.values()})

    def test_excluded_budgets_are_absent_from_generated_governance(self):
        doc = self.render({'exclude_budgets': ['BUDGET-LANDINGZONE-KEY', 'BUDGET-PROJ1-KEY']})
        budgets = doc['budgets_configuration']['budgets']
        self.assertEqual(6, len(budgets))
        self.assertNotIn('BUDGET-LANDINGZONE-KEY', budgets)
        self.assertNotIn('BUDGET-PROJ1-KEY', budgets)

    def test_new_projects_receive_one_budget_each_and_can_be_excluded(self):
        key = 'BUDGET-PROJECT-PAYMENTS-KEY'
        doc = self.render({'budget_recipients': 'finops@example.com'}, projects=['proj1', 'payments'])
        budgets = doc['budgets_configuration']['budgets']
        self.assertEqual(9, len(budgets))
        self.assertEqual(500, budgets[key]['amount'])
        self.assertEqual(['tagns-lz-cost-governance.tag-lz-project.payments'], budgets[key]['target']['values'])
        doc = self.render({'exclude_budgets': [key]}, projects=['proj1', 'payments'])
        self.assertNotIn(key, doc['budgets_configuration']['budgets'])

    def test_custom_tag_budget_and_editable_lov(self):
        doc = self.render({
            'tag_value_lists': {'tag-lz-cost-center': ['tobedefined', 'CC900']},
            'exclude_budgets': ['BUDGET-COST-CENTER-CC12345-KEY'],
            'budget_recipients': 'finops@example.com',
            'additional_budgets': {'BUDGET-CUSTOM-TEAM-KEY': {
                'name': 'budget-team', 'amount': 900,
                'tag_name': 'tag-lz-cost-center', 'tag_value': 'CC900',
                'alert_rule': {'threshold_value': 95},
            }},
        })
        tags = doc['tags_configuration']['namespaces']['TAGNS-LZ-COST-GOVERNANCE-KEY']['tags']
        self.assertEqual(['CC900', 'tobedefined'], tags['TAG-LZ-COST-CENTER-KEY']['valid_values'])
        budget = doc['budgets_configuration']['budgets']['BUDGET-CUSTOM-TEAM-KEY']
        self.assertEqual({'type': 'TAG', 'values': ['tagns-lz-cost-governance.tag-lz-cost-center.CC900']}, budget['target'])
        self.assertEqual(900, budget['amount'])
        self.assertEqual('finops@example.com', budget['alert_rule']['recipients'])
        self.assertEqual(95, budget['alert_rule']['threshold_value'])
