import json
import unittest

from tests.gen.helpers import REPO_ROOT, run_cmd


class HubLoadBalancerNamingTests(unittest.TestCase):
    def test_routing_policy_names_use_underscores(self) -> None:
        snippet = """
local hub_lb = import 'gen/hub/hub_lb.libsonnet';
local naming = import 'gen/naming.libsonnet';
local n = naming('fra');
local lb = hub_lb._l7_load_balancer(n, {
  backend1_ip: '10.0.0.10',
  backend2_ip: '10.0.0.11',
});
lb['LB-FRA-LZ-PROD-01-KEY'].routing_policies['LBRT-FRA-LZ-PROD-01-KEY'].name
"""
        rendered = run_cmd(["jsonnet", "-J", str(REPO_ROOT), "-e", snippet]).stdout
        name = json.loads(rendered)
        self.assertEqual(name, "lbrt_fra_lz_prod_01")
        self.assertNotIn("-", name)


if __name__ == "__main__":
    unittest.main()
