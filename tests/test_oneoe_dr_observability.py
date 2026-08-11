from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


ADDON_DIR = REPO_ROOT / "addons/oci-lz-dr/one-oe"
README = ADDON_DIR / "README.md"
ENTRYPOINTS = {
    "oneoe_bcdr_observability_cis1_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.jsonnet",
    "oneoe_bcdr_observability_cis1.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1.jsonnet",
    "oneoe_bcdr_observability_cis2_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.jsonnet",
    "oneoe_bcdr_observability_cis2.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.jsonnet",
}
ONEOE_OBSERVABILITY = "gen/blueprints/one-oe/runtime/one-stack/oneoe_observability_cis1.jsonnet"
BUCKET_KEY = "BKT-AMS-LZ-SERVICE-CONNECTOR-KEY"
BUCKET_NAME = "bkt-ams-lz-service-connector"
KMS_KEY = "KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY"


class OneOeDrObservabilityTests(unittest.TestCase):
    def render(self, snapshot_name: str) -> dict:
        return render_jsonnet_object(Path(ENTRYPOINTS[snapshot_name]))

    def test_published_snapshots_match_jsonnet_entrypoints(self) -> None:
        for snapshot_name, entrypoint_name in ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                snapshot = ADDON_DIR / snapshot_name
                self.assertTrue((REPO_ROOT / entrypoint_name).is_file())
                self.assertTrue(snapshot.is_file())
                self.assertEqual(
                    render_jsonnet_object(Path(entrypoint_name)),
                    json.loads(snapshot.read_text(encoding="utf-8")),
                )

    def test_replication_bucket_is_created_without_a_service_connector(self) -> None:
        for snapshot_name in ENTRYPOINTS:
            with self.subTest(snapshot=snapshot_name):
                config = self.render(snapshot_name)["service_connectors_configuration"]
                bucket = config["buckets"][BUCKET_KEY]
                self.assertEqual(BUCKET_NAME, bucket["name"])
                self.assertEqual({}, config["service_connectors"])
                self.assertEqual("2" if "cis2" in snapshot_name else "1", bucket["cis_level"])

    def test_cis2_bucket_uses_the_replicated_vault_key_reference(self) -> None:
        for snapshot_name in (
            "oneoe_bcdr_observability_cis2_pre.json",
            "oneoe_bcdr_observability_cis2.json",
        ):
            bucket = self.render(snapshot_name)["service_connectors_configuration"]["buckets"][BUCKET_KEY]
            self.assertEqual(KMS_KEY, bucket["kms_key_id"])

    def test_only_ams_hub_and_prod_flow_logs_are_emitted_after_staging(self) -> None:
        pre = self.render("oneoe_bcdr_observability_cis1_pre.json")
        final = self.render("oneoe_bcdr_observability_cis1.json")
        self.assertNotIn("logging_configuration", pre)
        self.assertEqual(
            {
                "LOG-AMS-LZ-SUBNET-FLOW-KEY",
                "LOG-AMS-LZ-VCN-FLOW-KEY",
                "LOG-AMS-LZ-PROD-SUBNET-FLOW-KEY",
                "LOG-AMS-LZ-PROD-VCN-FLOW-KEY",
            },
            set(final["logging_configuration"]["flow_logs"]),
        )
        self.assertNotIn("PREPROD", json.dumps(final))

    def test_dr_observability_is_regional_and_does_not_redeploy_home_events(self) -> None:
        config = self.render("oneoe_bcdr_observability_cis1.json")
        self.assertNotIn("home_region_events_configuration", config)
        for section, resource_key in (
            ("alarms_configuration", "alarms"),
            ("events_configuration", "event_rules"),
            ("notifications_configuration", "topics"),
            ("logging_configuration", "flow_logs"),
        ):
            with self.subTest(section=section):
                self.assertTrue(
                    all("-AMS-LZ-" in key for key in config[section][resource_key]),
                    config[section][resource_key],
                )

    def test_oneoe_observability_uses_the_home_region_in_regional_resource_names(self) -> None:
        config = render_jsonnet_object(Path(ONEOE_OBSERVABILITY))
        for section, resource_key in (
            ("alarms_configuration", "alarms"),
            ("events_configuration", "event_rules"),
            ("notifications_configuration", "topics"),
            ("service_connectors_configuration", "buckets"),
            ("logging_configuration", "flow_logs"),
        ):
            with self.subTest(section=section):
                self.assertTrue(
                    all("-FRA-LZ-" in key for key in config[section][resource_key]),
                    config[section][resource_key],
                )

    def test_readme_documents_the_replication_boundary(self) -> None:
        content = README.read_text(encoding="utf-8")
        for required_text in (
            "Manual post-deployment configuration required",
            BUCKET_NAME,
            "bkt-fra-lz-service-connector",
            "replication policy",
            "output dependency files",
            "separate from the Service Connector bucket replication",
            "for Hub E, after its initial network configuration is applied",
            'alt="Generic two-region One-OE disaster recovery architecture',
            "*Figure 1: Generic two-region One-OE disaster recovery architecture.*",
            "*Figure 2: Home-region One-OE stack in Frankfurt.",
            "*Figure 3: DR-region BCDR stack in Amsterdam.",
            "orm_deployment_dr_region.png",
            'alt="OCI Resource Manager BCDR stack in Amsterdam',
            "Clear the Run apply check box",
            "## 1. Overview",
            "## 4. Deployment model",
            "regional VSS",
            "kms_dependency",
            "Service Connector",
            "eu-amsterdam-1",
            "home-region events",
            "oneoe_bcdr_observability_cis1_pre.json",
            "oneoe_bcdr_observability_cis2_pre.json",
        ):
            self.assertIn(required_text, content)
        for unexpected_text in ("outtput", "8tack", "an replicated"):
            self.assertNotIn(unexpected_text, content)


if __name__ == "__main__":
    unittest.main()
