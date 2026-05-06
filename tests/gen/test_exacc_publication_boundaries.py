from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


class ExaccPublicationBoundaryTests(unittest.TestCase):
    def test_publication_layout_and_surface_contract(self) -> None:
        self.assertFalse((REPO_ROOT / "gen/workload-extensions/exacc/exacc_identity.libsonnet").exists())
        self.assertFalse((REPO_ROOT / "gen/workload-extensions/exacc/exacc_observability.libsonnet").exists())
        self.assertFalse((REPO_ROOT / "gen/workload-extensions/exacc/published.libsonnet").exists())
        self.assertTrue((REPO_ROOT / "gen/workload-extensions/exacc/single-stack/published.libsonnet").exists())
        self.assertTrue((REPO_ROOT / "gen/workload-extensions/exacc/multi-stack/published.libsonnet").exists())

        expected = {
            "single-stack": {
                "exacc_identity_uc1.json",
                "exacc_governance_uc1.json",
                "exacc_security_cis1_uc1.json",
                "exacc_security_cis2_uc1.json",
                "exacc_observability_cis1_uc1.json",
                "exacc_observability_cis2_uc1.json",
            },
            "multi-stack": {
                "exacc_identity_uc1.json",
                "exacc_observability_uc1.json",
            },
        }

        for dirname, expected_files in expected.items():
            with self.subTest(dirname=dirname):
                published_dir = REPO_ROOT / "workload-extensions/exacc" / dirname
                actual = {path.name for path in published_dir.glob("*.json")}
                self.assertEqual(expected_files, actual)

    def test_single_stack_security_outputs_strip_network_zone_targets(self) -> None:
        for entrypoint, expected_target in (
            ("exacc_security_cis1_uc1.jsonnet", "SZ-TGT-LZ-CIS-L1-KEY"),
            ("exacc_security_cis2_uc1.jsonnet", "SZ-TGT-LZ-CIS-L2-KEY"),
        ):
            with self.subTest(entrypoint=entrypoint):
                security = render_jsonnet_object(
                    Path("gen/workload-extensions/exacc/single-stack") / entrypoint
                )
                zones = security["security_zones_configuration"]["security_zones"]
                self.assertEqual([expected_target], sorted(zones))
                self.assertNotIn("SZ-TGT-LZ-SHARED-NETWORK-KEY", zones)

    def test_single_stack_observability_outputs_strip_network_scoped_artifacts(self) -> None:
        forbidden = (
            "CMP-LZ-NETWORK-KEY",
            "CMP-LZ-PROD-NETWORK-KEY",
            "CMP-LZ-PREPROD-NETWORK-KEY",
            "LOG-LZ-SUBNET-FLOW-KEY",
            "LOG-LZ-VCN-FLOW-KEY",
            "LOG-LZ-PROD-SUBNET-FLOW-KEY",
            "LOG-LZ-PROD-VCN-FLOW-KEY",
            "LOG-LZ-PREPROD-SUBNET-FLOW-KEY",
            "LOG-LZ-PREPROD-VCN-FLOW-KEY",
            "LGRP-LZ-VCN-FLOW-KEY",
            "LGRP-LZ-PROD-VCN-FLOW-KEY",
            "LGRP-LZ-PREPROD-VCN-FLOW-KEY",
        )

        for entrypoint in (
            "exacc_observability_cis1_uc1.jsonnet",
            "exacc_observability_cis2_uc1.jsonnet",
        ):
            with self.subTest(entrypoint=entrypoint):
                observability = render_jsonnet_object(
                    Path("gen/workload-extensions/exacc/single-stack") / entrypoint
                )
                rendered = json.dumps(observability, sort_keys=True)
                for value in forbidden:
                    self.assertNotIn(value, rendered)

    def test_multi_stack_outputs_are_extension_only(self) -> None:
        identity = render_jsonnet_object(
            "gen/workload-extensions/exacc/multi-stack/exacc_identity_uc1.jsonnet"
        )
        compartments = identity["compartments_configuration"]["compartments"]
        groups = identity["identity_domain_groups_configuration"]["groups"]
        policies = identity["policies_configuration"]["supplied_policies"]

        self.assertIn("CMP-LZ-SHARED-EXACC-KEY", compartments)
        self.assertIn("CMP-LZ-PROD-PROJ1-DB-KEY", compartments)
        self.assertEqual(
            "Shared Platform ExaDB-C@C Compartment",
            compartments["CMP-LZ-SHARED-EXACC-KEY"]["description"],
        )
        self.assertEqual(
            "Pre-Production environment, Project 1 ExaDB-C@C database compartment",
            compartments["CMP-LZ-PREPROD-PROJ1-DB-KEY"]["description"],
        )
        self.assertNotIn("CMP-LANDINGZONE-KEY", compartments)
        self.assertNotIn("CMP-LZ-NETWORK-KEY", compartments)
        self.assertNotIn("GRP-LZ-NETWORK-ADMIN-KEY", groups)
        self.assertNotIn("PCY-LZ-NETWORK-ADMIN-KEY", policies)

        observability = render_jsonnet_object(
            "gen/workload-extensions/exacc/multi-stack/exacc_observability_uc1.jsonnet"
        )
        self.assertIn(
            "RUL-LZ-NOTIFICATION-PLATFORM-EXACC-DB-KEY",
            observability["events_configuration"]["event_rules"],
        )
        self.assertNotIn("service_connectors_configuration", observability)
        self.assertNotIn("NOTT-LZ-IAM-KEY", observability["notifications_configuration"]["topics"])
        self.assertEqual(
            "Topic for shared ExaDB-C@C database workload notifications.",
            observability["notifications_configuration"]["topics"][
                "NOTT-LZ-EXACC-DB-WORKLOADS-KEY"
            ]["description"],
        )


if __name__ == "__main__":
    unittest.main()
