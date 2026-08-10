from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


ADDON_DIR = REPO_ROOT / "addons/oci-lz-dr/one-oe"
QUESTION = "Do you want to deploy a Disaster Recovery (DR) region?"
ENTRYPOINTS = {
    "oneoe_bcdr_network_hub_a_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_pre.jsonnet",
    "oneoe_bcdr_network_hub_a.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a.jsonnet",
    "oneoe_bcdr_network_hub_b_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_pre.jsonnet",
    "oneoe_bcdr_network_hub_b.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b.jsonnet",
    "oneoe_bcdr_network_hub_c_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_pre.jsonnet",
    "oneoe_bcdr_network_hub_c_backends.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends.jsonnet",
    "oneoe_bcdr_network_hub_c.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c.jsonnet",
    "oneoe_bcdr_network_hub_e.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.jsonnet",
}


class OneOeDrFactoryNetworkTests(unittest.TestCase):
    def test_published_network_snapshots_match_dr_jsonnet_entrypoints(self) -> None:
        for snapshot_name, entrypoint_name in ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                entrypoint = REPO_ROOT / entrypoint_name
                snapshot = ADDON_DIR / snapshot_name
                self.assertTrue(entrypoint.is_file(), f"Missing DR Jsonnet entrypoint: {entrypoint}")
                self.assertTrue(snapshot.is_file(), f"Missing generated DR snapshot: {snapshot}")
                self.assertEqual(
                    render_jsonnet_object(Path(entrypoint_name)),
                    json.loads(snapshot.read_text(encoding="utf-8")),
                )

    def test_dr_network_contains_only_ams_hub_and_prod_vcns(self) -> None:
        network = render_jsonnet_object(Path(ENTRYPOINTS["oneoe_bcdr_network_hub_e.json"]))
        categories = network["network_configuration"]["network_configuration_categories"]

        self.assertEqual({"0-shared", "1-prod"}, set(categories))
        self.assertNotIn("2-preprod", categories)
        self.assertEqual(
            "10.0.192.0/21",
            categories["0-shared"]["vcns"]["VCN-AMS-LZ-HUB-KEY"]["cidr_blocks"][0],
        )
        self.assertEqual(
            "10.0.200.0/21",
            categories["1-prod"]["vcns"]["VCN-AMS-LZ-PROD-PROJECTS-KEY"]["cidr_blocks"][0],
        )

    def test_guided_factory_question_follows_the_oneoe_baseline(self) -> None:
        root_guidance = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        factory_readme = (REPO_ROOT / "addons/oci-lz-blueprint-factory/README.md").read_text(
            encoding="utf-8"
        )
        ai_readme = (REPO_ROOT / "addons/oci-lz-ai-agent/README.md").read_text(encoding="utf-8")
        skill = (
            REPO_ROOT / ".agents/skills/landing-zone-customer-guidance/SKILL.md"
        ).read_text(encoding="utf-8")

        self.assertIn(QUESTION, root_guidance)
        self.assertLess(
            root_guidance.index("1. **Landing zone baseline**"),
            root_guidance.index(QUESTION),
        )
        self.assertLess(root_guidance.index(QUESTION), root_guidance.index("**Region and realm**"))
        for content in (root_guidance, factory_readme, ai_readme, skill):
            self.assertIn(QUESTION, content)
            self.assertIn("eu-amsterdam-1", content)
            self.assertIn("10.0.192.0/21", content)
            self.assertIn("10.0.200.0/21", content)


if __name__ == "__main__":
    unittest.main()
