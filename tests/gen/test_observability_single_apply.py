from __future__ import annotations

import json
import unittest

from tests.gen.helpers import REPO_ROOT, jsonnet_command, run_cmd


class ObservabilitySingleApplyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        code = """
local factory = import 'gen/landing_zone_multi.jsonnet';
local okeProfiles = import 'gen/workload-extensions/oke/simple/multi-stack/profiles.libsonnet';
local oke = import 'gen/workload-extensions/oke/simple/multi-stack/output_builder.libsonnet';
local exacsProfiles = import 'gen/workload-extensions/exacs/multi-stack/profiles.libsonnet';
local exacs = import 'gen/workload-extensions/exacs/multi-stack/published.libsonnet';
local exaccProfiles = import 'gen/workload-extensions/exacc/single-stack/profiles.libsonnet';
local exacc = import 'gen/workload-extensions/exacc/single-stack/published.libsonnet';
local drProfiles = import 'gen/addons/oci-lz-dr/one-oe/profiles.libsonnet';
local get(obj, key, fallback) = if std.objectHas(obj, key) then obj[key] else fallback;
local inventory(network, obs) = {
  targets: std.sort(std.flattenArrays([
    std.flattenArrays([
      [key] + std.objectFields(get(category.vcns[key], 'subnets', {}))
      for key in std.objectFields(get(category, 'vcns', {}))
    ])
    for category in std.objectValues(network.network_configuration.network_configuration_categories)
  ])),
  logs: get(get(obs, 'logging_configuration', {}), 'service_logs', {}),
  discovery: get(get(obs, 'logging_configuration', {}), 'flow_logs', {}),
};
local generated = factory(okeProfiles.multi_stack.cis1_config);
local okeMulti = oke(okeProfiles.multi_stack);
local exacsMulti = exacs.render(exacsProfiles.uc1.config);
local dr = factory(drProfiles.hub_a);
local rpc = factory(import 'addons/oci-lz-blueprint-factory/examples/05-xrpc-cross-tenancy-acceptor.json');
local exaccSingle = exacc.render(exaccProfiles.single_stack.uc1_config);
{
  factory_files: std.objectFields(generated),
  factory: inventory(generated['network.json'], generated['observability_cis1.json']),
  oke_multi: inventory(okeMulti.oke_network, okeMulti.oke_observability_cis1),
  exacs_multi: inventory(exacsMulti.network, exacsMulti.observability),
  rpc_files: std.objectFields(rpc),
  rpc: inventory(rpc['network.json'], rpc['observability_cis2.json']),
  dr_files: std.objectFields(dr),
  dr: inventory(dr['network.json'], dr['observability_cis2.json']),
  exacc_has_logging: std.objectHas(exaccSingle.observability_cis1, 'logging_configuration'),
}
"""
        cls.data = json.loads(run_cmd([jsonnet_command(), '-e', code]).stdout)

    def test_factory_and_dr_emit_complete_observability_only(self):
        for key in ('factory_files', 'dr_files', 'rpc_files'):
            files = self.data[key]
            self.assertFalse(any('observability' in name and '_pre' in name for name in files))
            self.assertTrue(any('security' in name and '_pre' in name for name in files))

    def test_flow_logs_cover_only_owned_network_targets_with_stable_keys(self):
        for name in ('factory', 'oke_multi', 'exacs_multi', 'dr', 'rpc'):
            with self.subTest(scope=name):
                case = self.data[name]
                self.assertFalse(case['discovery'])
                self.assertEqual(len(case['targets']), len(case['logs']))
                self.assertEqual(set(case['targets']), {log['resource_id'] for log in case['logs'].values()})
                for key, log in case['logs'].items():
                    self.assertNotIn('ocid1.', key)
                    self.assertEqual('flowlogs', log['service'])
                    self.assertEqual(6, len(log['defined_tags']))

    def test_networkless_exacc_stays_networkless(self):
        self.assertFalse(self.data['exacc_has_logging'])

    def test_retired_observability_entrypoints_are_not_published(self):
        for relative in ('gen/workload-extensions/oke', 'gen/workload-extensions/exacs', 'gen/addons/oci-lz-dr'):
            self.assertFalse(list((REPO_ROOT / relative).rglob('*observability*_pre.jsonnet')), relative)


if __name__ == '__main__':
    unittest.main()
