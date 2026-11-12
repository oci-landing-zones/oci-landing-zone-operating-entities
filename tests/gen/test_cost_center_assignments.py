import json
import unittest
from tests.gen.helpers import jsonnet_command, run_cmd


class CostCenterAssignmentTests(unittest.TestCase):
    def render(self, assignments, document=None):
        document = document or {
            'network_configuration': {'vcns': {
                'VCN-PROD-PAYMENTS-KEY': {}, 'VCN-PREPROD-PAYMENTS-KEY': {},
            }},
            'compartments_configuration': {'compartments': {'CMP-LANDINGZONE-KEY': {}}},
            'tags_configuration': {'namespaces': {'KEEP': {}}},
        }
        config = {'environments': {env: {'projects': {'payments': {}}} for env in ['prod', 'preprod']},
                  'cost_governance': {'cost_center_assignments': assignments}}
        return run_cmd([jsonnet_command(), '-e', "local cfg = %s; (import 'gen/lib/cost_tags.libsonnet').apply(%s, cfg { cost_governance: (import 'gen/lib/cost_governance.libsonnet').normalize(cfg.cost_governance) })" % (
            json.dumps(config), json.dumps(document))], expect_success=False)

    def test_business_unit_follows_the_assigned_cost_center(self):
        config = {'environments': {}, 'cost_governance': {
            'cost_center_assignments': {'CC12345': {}}, 'cost_center_business_units': {'CC12345': 'IT'},
        }}
        proc = run_cmd([jsonnet_command(), '-e', "(import 'gen/lib/cost_tags.libsonnet').apply({compartments_configuration:{compartments:{'CMP-LANDINGZONE-KEY':{}}}}, %s)" % json.dumps(config)])
        tags = json.loads(proc.stdout)['compartments_configuration']['compartments']['CMP-LANDINGZONE-KEY']['defined_tags']
        self.assertEqual('CC12345', tags['tagns-lz-cost-governance.tag-lz-cost-center'])
        self.assertEqual('IT', tags['tagns-lz-cost-governance.tag-lz-business-unit'])

    def test_all_active_filters_match_and_unmatched_root_stays_unchanged(self):
        proc = self.render({'CC12345': {'platform': ['network'], 'environment': ['prod'], 'project': ['payments']}})
        self.assertEqual(0, proc.returncode, proc.stderr)
        doc = json.loads(proc.stdout)
        vcns = doc['network_configuration']['vcns']
        field = 'tagns-lz-cost-governance.tag-lz-cost-center'
        self.assertEqual('CC12345', vcns['VCN-PROD-PAYMENTS-KEY']['defined_tags'][field])
        self.assertEqual('tobedefined', vcns['VCN-PREPROD-PAYMENTS-KEY']['defined_tags'][field])
        self.assertEqual('tobedefined', doc['compartments_configuration']['compartments']['CMP-LANDINGZONE-KEY']['defined_tags'][field])
        self.assertEqual({'namespaces': {'KEEP': {}}}, doc['tags_configuration'])

    def test_not_apply_and_empty_lists_skip_filters(self):
        proc = self.render({'CC12345': {'platform': None, 'environment': [], 'project': None}})
        self.assertEqual(0, proc.returncode, proc.stderr)
        doc = json.loads(proc.stdout)
        root = doc['compartments_configuration']['compartments']['CMP-LANDINGZONE-KEY']
        self.assertEqual('CC12345', root['defined_tags']['tagns-lz-cost-governance.tag-lz-cost-center'])

    def test_overlap_is_rejected_instead_of_assigning_arbitrarily(self):
        proc = self.render({'CC1': {}, 'CC2': {}})
        self.assertNotEqual(0, proc.returncode)
        self.assertIn('Multiple cost centers match', proc.stderr)

    def test_explicit_budget_cost_center_and_access_tags_are_preserved(self):
        proc = self.render({'CC1': {}}, {'budgets_configuration': {'budgets': {'BUDGET': {
            'defined_tags': {'tagns-lz-cost-governance.tag-lz-cost-center': 'CC2', 'role.keep': 'yes'},
        }}}})
        self.assertEqual(0, proc.returncode, proc.stderr)
        tags = json.loads(proc.stdout)['budgets_configuration']['budgets']['BUDGET']['defined_tags']
        self.assertEqual('CC2', tags['tagns-lz-cost-governance.tag-lz-cost-center'])
        self.assertEqual('yes', tags['role.keep'])

    def test_multiple_values_within_a_filter_are_alternatives(self):
        proc = self.render({'CC1': {'platform': ['security', 'network'], 'environment': ['prod', 'preprod']}})
        self.assertEqual(0, proc.returncode, proc.stderr)
        for resource in json.loads(proc.stdout)['network_configuration']['vcns'].values():
            self.assertEqual('CC1', resource['defined_tags']['tagns-lz-cost-governance.tag-lz-cost-center'])

    def test_invalid_filter_contract_is_rejected(self):
        for assignments in [{'CC1': {'environment': 'prod'}}, {'CC1': {'unknown': []}}, {'CC1': {'project': ['']}}, {'': {}}]:
            with self.subTest(assignments=assignments):
                proc = self.render(assignments)
                self.assertNotEqual(0, proc.returncode)
                self.assertIn('cost_center_assignments', proc.stderr)

    def test_implicit_oke_load_balancer_uses_its_own_platform(self):
        proc = self.render({'CC1': {'platform': ['network'], 'environment': ['prod']}}, {
            'oke_configuration': {'OKE-PROD-KEY': {'cluster_configuration': {}}},
        })
        self.assertEqual(0, proc.returncode, proc.stderr)
        cluster = json.loads(proc.stdout)['oke_configuration']['OKE-PROD-KEY']['cluster_configuration']
        field = 'tagns-lz-cost-governance.tag-lz-cost-center'
        self.assertEqual('tobedefined', cluster['defined_tags'][field])
        self.assertEqual('CC1', cluster['options']['service_lb_config']['defined_tags'][field])
        self.assertEqual('tobedefined', cluster['options']['persistent_volume_config']['defined_tags'][field])
