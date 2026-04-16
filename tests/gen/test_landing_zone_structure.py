import json
import unittest

from tests.gen.helpers import REPO_ROOT, run_cmd


class LandingZoneStructureTests(unittest.TestCase):
    def test_landing_zone_and_addon_adapter_share_render_context_helper(self) -> None:
        landing_zone = (REPO_ROOT / "gen/landing_zone.libsonnet").read_text(encoding="utf-8")
        addon_published = (
            REPO_ROOT / "gen/addons/oci-hub-models/published.libsonnet"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "local render_context = import 'render_context.libsonnet';",
            landing_zone,
        )
        self.assertIn(
            "local render_context = import '../../render_context.libsonnet';",
            addon_published,
        )
        self.assertNotIn("local config = cfg_lib.normalize(raw_config);", landing_zone)
        self.assertNotIn("local normalized = cfg_lib.normalize(config);", addon_published)

    def test_spoke_rendering_is_extracted_from_landing_zone_orchestrator(self) -> None:
        landing_zone = (REPO_ROOT / "gen/landing_zone.libsonnet").read_text(encoding="utf-8")
        self.assertIn(
            "local network_spokes_builder = import 'builders/network_spokes.libsonnet';",
            landing_zone,
        )
        self.assertNotIn("local spoke_category(", landing_zone)

    def test_hub_integration_is_extracted_from_landing_zone_orchestrator(self) -> None:
        landing_zone = (REPO_ROOT / "gen/landing_zone.libsonnet").read_text(encoding="utf-8")
        landing_zone_normalized = " ".join(landing_zone.split())
        self.assertIn(
            "local hub_integration_builder = import 'builders/hub_integration.libsonnet';",
            landing_zone,
        )
        self.assertNotIn("local hub_integration_pre = {", landing_zone)
        self.assertIn("local hub_integration_post = hub_integration.post;", landing_zone)
        self.assertNotIn("local hub_integration_post = if", landing_zone_normalized)

    def test_hub_integration_post_skips_null_route_entity_id(self) -> None:
        snippet = """
local hub_integration_builder = import 'gen/builders/hub_integration.libsonnet';
hub_integration_builder({
  naming: {
    key(type, parts): '%s-%s' % [type, std.join('-', parts)],
  },
  hub: {
    post_route_tables: ['RT-HUB'],
    post_route_entity_id: null,
    post_route_entity_desc: null,
    spoke_route_tables: ['RT-HUB'],
    fw_nsg_key: null,
    has_spoke_natgw: false,
  },
  all_vcn_entries: [{
    drg_att_key: 'DRGATT-1',
    drg_att_display: 'drgatt-1',
    vcn_key: 'VCN-1',
    name: 'spoke1',
    priority: 100,
    route_key: 'route-spoke1',
    route_desc: 'Spoke1',
    vcn: '10.0.64.0/24',
    display: 'Spoke1',
  }],
}).post
"""
        rendered = run_cmd(["jsonnet", "-J", str(REPO_ROOT), "-e", snippet]).stdout
        self.assertEqual({}, json.loads(rendered))

    def test_hub_integration_post_skips_missing_route_tables(self) -> None:
        snippet = """
local hub_integration_builder = import 'gen/builders/hub_integration.libsonnet';
hub_integration_builder({
  naming: {
    key(type, parts): '%s-%s' % [type, std.join('-', parts)],
  },
  hub: {
    post_route_entity_id: 'ocid1.privateip.oc1..example',
    post_route_entity_desc: 'fw private ip',
    spoke_route_tables: ['RT-HUB'],
    fw_nsg_key: null,
    has_spoke_natgw: false,
  },
  all_vcn_entries: [{
    drg_att_key: 'DRGATT-1',
    drg_att_display: 'drgatt-1',
    vcn_key: 'VCN-1',
    name: 'spoke1',
    priority: 100,
    route_key: 'route-spoke1',
    route_desc: 'Spoke1',
    vcn: '10.0.64.0/24',
    display: 'Spoke1',
  }],
}).post
"""
        rendered = run_cmd(["jsonnet", "-J", str(REPO_ROOT), "-e", snippet]).stdout
        self.assertEqual({}, json.loads(rendered))

    def test_hub_integration_post_uses_fallback_route_entity_description(self) -> None:
        snippet = """
local hub_integration_builder = import 'gen/builders/hub_integration.libsonnet';
local post = hub_integration_builder({
  naming: {
    key(type, parts): '%s-%s' % [type, std.join('-', parts)],
  },
  hub: {
    post_route_tables: ['RT-HUB'],
    post_route_entity_id: 'ocid1.privateip.oc1..example',
    post_route_entity_desc: null,
    spoke_route_tables: ['RT-HUB'],
    fw_nsg_key: null,
    has_spoke_natgw: false,
  },
  all_vcn_entries: [{
    drg_att_key: 'DRGATT-1',
    drg_att_display: 'drgatt-1',
    vcn_key: 'VCN-1',
    name: 'spoke1',
    priority: 100,
    route_key: 'route-spoke1',
    route_desc: 'Spoke1',
    vcn: '10.0.64.0/24',
    display: 'Spoke1',
  }],
}).post;
post.network_configuration.network_configuration_categories['0-shared']
  .vcns['VCN-HUB'].route_tables['RT-HUB'].route_rules['route-spoke1'].description
"""
        rendered = run_cmd(["jsonnet", "-J", str(REPO_ROOT), "-e", snippet]).stdout
        description = json.loads(rendered)
        self.assertIn("post-route entity", description)
        self.assertNotIn("null", description)


if __name__ == "__main__":
    unittest.main()
