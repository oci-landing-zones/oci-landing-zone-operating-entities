import json
import unittest

from tests.gen.helpers import REPO_ROOT, run_cmd


class HubNetworkFirewallNamingTests(unittest.TestCase):
    def test_service_list_keeps_key_but_uses_full_display_name(self) -> None:
        snippet = """
local hub_nfw = import 'gen/hub/hub_nfw.libsonnet';
local naming = import 'gen/naming.libsonnet';
local n = naming('fra');
local service_lists = hub_nfw._nfw_service_lists(n);
local key = std.objectFields(service_lists)[0];
{
  key: key,
  name: service_lists[key].name,
}
"""
        rendered = run_cmd(["jsonnet", "-J", str(REPO_ROOT), "-e", snippet]).stdout
        service_list = json.loads(rendered)
        self.assertEqual(service_list["key"], "NFW-FRA-LZ-SERLIST-01-KEY")
        self.assertEqual(service_list["name"], "nfw-fra-lz-servicelist-01")


if __name__ == "__main__":
    unittest.main()
