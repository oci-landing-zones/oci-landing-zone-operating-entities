from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_config_outputs, render_jsonnet_object


class OkePublicationBoundaryTests(unittest.TestCase):
    def test_removed_oke_legacy_helpers_are_not_part_of_live_surface(self) -> None:
        self.assertFalse(
            (REPO_ROOT / "gen/workload-extensions/oke/simple/oke_network.libsonnet").exists()
        )
        self.assertFalse(
            (REPO_ROOT / "gen/workload-extensions/oke/simple/oke_identity.libsonnet").exists()
        )

        conventions = (REPO_ROOT / "gen/CONVENTIONS.md").read_text(encoding="utf-8")
        self.assertNotIn("oke_network.libsonnet", conventions)
        self.assertNotIn("oke_identity.libsonnet", conventions)
        self.assertNotIn("oke_*.libsonnet", conventions)

    def test_published_profiles_do_not_inject_publication_mode_into_extension_params(self) -> None:
        rendered = render_jsonnet_object(
            Path("tests/gen/testdata/direct/pass/oke_profile_params.jsonnet")
        )
        self.assertNotIn("published_contract", rendered["single_stack"])
        self.assertNotIn("published_contract", rendered["multi_stack"])

    def test_generic_config_mode_emits_generic_oke_files_only(self) -> None:
        outputs = render_config_outputs(Path("tests/gen/testdata/configs/pass/prod_oke.jsonnet"))
        self.assertIn("network.json", outputs)
        self.assertNotIn("network_pre.json", outputs)
        self.assertIn("oke_clusters.json", outputs)
        self.assertIn("oke_workers.json", outputs)
        self.assertNotIn("oke_network.json", outputs)
        self.assertNotIn("oke_identity.json", outputs)

        categories = outputs["network.json"]["network_configuration"]["network_configuration_categories"]
        self.assertIn("prod-platform-oke", categories)

        prod_platform_children = (
            outputs["iam.json"]["compartments_configuration"]["compartments"]["CMP-LANDINGZONE-KEY"][
                "children"
            ]["CMP-LZ-PROD-KEY"]["children"]["CMP-LZ-PROD-PLATFORM-KEY"]["children"]
        )
        self.assertIn("CMP-LZ-PROD-PLATFORM-OKE-KEY", prod_platform_children)

    def test_generic_config_mode_uses_semantic_environment_order(self) -> None:
        outputs = render_config_outputs(
            Path("tests/gen/testdata/configs/pass/unordered_envs_oke.jsonnet")
        )
        self.assertIn("network.json", outputs)
        self.assertNotIn("network_pre.json", outputs)
        categories = outputs["network.json"]["network_configuration"]["network_configuration_categories"]
        self.assertEqual(
            list(categories.keys()),
            ["0-shared", "1-prod", "2-preprod", "3-dev", "4-qa", "prod-platform-oke"],
        )

        statements = (
            categories["0-shared"]["non_vcn_specific_gateways"]["dynamic_routing_gateways"][
                "DRG-FRA-LZ-HUB-KEY"
            ]["drg_route_distributions"]["DRGRD-FRA-LZ-HUB-KEY"]["statements"]
        )
        self.assertEqual(statements["ROUTE-TO-VCN-PROD-KEY"]["priority"], 10)
        self.assertEqual(statements["ROUTE-TO-VCN-PREPROD-KEY"]["priority"], 20)
        self.assertEqual(statements["ROUTE-TO-VCN-DEV-KEY"]["priority"], 30)
        self.assertEqual(statements["ROUTE-TO-VCN-QA-KEY"]["priority"], 40)
        self.assertEqual(statements["ROUTE-TO-VCN-PROD-PLATFORM-OKE-KEY"]["priority"], 50)

    def test_single_stack_entrypoints_use_generic_landing_zone_projections(self) -> None:
        expected_projections = {
            "oke_network.jsonnet": "lz(profiles.single_stack.config).network",
            "oke_identity.jsonnet": "lz(profiles.single_stack.config).iam",
        }

        for file_name, projection in expected_projections.items():
            with self.subTest(file=file_name):
                contents = (
                    REPO_ROOT / "gen/workload-extensions/oke/simple/single-stack" / file_name
                ).read_text(encoding="utf-8")
                normalized = " ".join(contents.split())
                self.assertIn(
                    "local lz = import '../../../../landing_zone.libsonnet';",
                    normalized,
                )
                self.assertIn(projection, normalized)
                self.assertNotIn("published.libsonnet", normalized)
                self.assertNotIn("published.render", normalized)

    def test_multi_stack_keeps_its_publication_adapter_local(self) -> None:
        self.assertFalse(
            (REPO_ROOT / "gen/workload-extensions/oke/simple/published.libsonnet").exists()
        )
        self.assertTrue(
            (REPO_ROOT / "gen/workload-extensions/oke/simple/multi-stack/published.libsonnet").exists()
        )

        for file_name in ("oke_network.jsonnet", "oke_identity.jsonnet"):
            with self.subTest(file=file_name):
                contents = (
                    REPO_ROOT / "gen/workload-extensions/oke/simple/multi-stack" / file_name
                ).read_text(encoding="utf-8")
                self.assertIn("local published = import './published.libsonnet';", contents)
                self.assertNotIn("../published.libsonnet", contents)

    def test_conventions_document_multistack_owned_oke_published_adapter(self) -> None:
        conventions = (REPO_ROOT / "gen/CONVENTIONS.md").read_text(encoding="utf-8")
        self.assertIn(
            "gen/workload-extensions/oke/simple/multi-stack/published.libsonnet",
            conventions,
        )
        self.assertNotIn(
            "gen/workload-extensions/oke/simple/published.libsonnet",
            conventions,
        )
