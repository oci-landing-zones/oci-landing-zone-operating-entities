from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


ADDON_DIR = REPO_ROOT / "addons/oci-lz-dr/one-oe"
ENTRYPOINT = Path("gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.jsonnet")
SNAPSHOT = ADDON_DIR / "oneoe_bcdr_security.json"


class OneOeDrSecurityTests(unittest.TestCase):
    def render_dr_security(self) -> dict:
        self.assertTrue((REPO_ROOT / ENTRYPOINT).is_file())
        return render_jsonnet_object(ENTRYPOINT)

    def test_security_snapshot_matches_its_jsonnet_entrypoint(self) -> None:
        self.assertTrue((REPO_ROOT / ENTRYPOINT).is_file())
        self.assertTrue(SNAPSHOT.is_file())
        self.assertEqual(
            render_jsonnet_object(ENTRYPOINT),
            json.loads(SNAPSHOT.read_text(encoding="utf-8")),
        )

    def test_dr_security_contains_only_ams_vss(self) -> None:
        config = self.render_dr_security()
        self.assertEqual({"scanning_configuration"}, set(config))
        scanning = config["scanning_configuration"]
        self.assertEqual({"VSS-RCPH-AMS-LZ-KEY"}, set(scanning["host_recipes"]))
        self.assertEqual({"VSS-TGTH-AMS-LZ-KEY"}, set(scanning["host_targets"]))
        self.assertEqual(
            "vss-rcph-ams-lz",
            scanning["host_recipes"]["VSS-RCPH-AMS-LZ-KEY"]["name"],
        )
        self.assertEqual(
            "CMP-LANDINGZONE-KEY",
            scanning["host_targets"]["VSS-TGTH-AMS-LZ-KEY"]["target_compartment_id"],
        )

    def test_oneoe_baseline_vss_uses_fra_resource_names(self) -> None:
        config = render_jsonnet_object(
            Path("gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.jsonnet")
        )
        scanning = config["scanning_configuration"]
        self.assertEqual({"VSS-RCPH-FRA-LZ-KEY"}, set(scanning["host_recipes"]))
        self.assertEqual({"VSS-TGTH-FRA-LZ-KEY"}, set(scanning["host_targets"]))

    def test_readme_documents_vss_and_the_security_zone_boundary(self) -> None:
        content = (ADDON_DIR / "README.md").read_text(encoding="utf-8")
        for text in (
            "oneoe_bcdr_security.json",
            "Vulnerability Scanning Service (VSS)",
            "Security Zones",
            "not redeployed",
            "eu-amsterdam-1",
        ):
            self.assertIn(text, content)

    def test_orm_buttons_include_vss_in_the_configuration_file_list(self) -> None:
        content = (ADDON_DIR / "README.md").read_text(encoding="utf-8")
        self.assertIn("| CIS Level 1 | CIS Level 2 |", content)
        self.assertEqual(8, content.count('oneoe_bcdr_security.json"})'))
        self.assertIn("\n| | **Note — CIS Level 2:**", content)


if __name__ == "__main__":
    unittest.main()
