import unittest

from tests.gen.helpers import REPO_ROOT, render_config_outputs


class OkePublicationBoundaryTests(unittest.TestCase):
    def test_agents_guide_does_not_reference_removed_oke_split_output_helpers(self) -> None:
        self.assertFalse(
            (REPO_ROOT / "gen/workload-extensions/oke/simple/oke_network.libsonnet").exists()
        )
        self.assertFalse(
            (REPO_ROOT / "gen/workload-extensions/oke/simple/oke_identity.libsonnet").exists()
        )

        agents_guide = (REPO_ROOT / "gen/AGENTS.md").read_text(encoding="utf-8")
        self.assertNotIn("oke_network.libsonnet", agents_guide)
        self.assertNotIn("oke_identity.libsonnet", agents_guide)
        self.assertNotIn("oke_*.libsonnet", agents_guide)

    def test_generic_config_mode_uses_semantic_environment_order(self) -> None:
        outputs = render_config_outputs("tests/gen/testdata/configs/pass/unordered_envs_oke.jsonnet")
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

    def test_agents_guide_documents_multistack_owned_oke_published_adapter(self) -> None:
        agents_guide = (REPO_ROOT / "gen/AGENTS.md").read_text(encoding="utf-8")
        self.assertIn(
            "gen/workload-extensions/oke/simple/multi-stack/published.libsonnet",
            agents_guide,
        )
        self.assertNotIn(
            "gen/workload-extensions/oke/simple/published.libsonnet",
            agents_guide,
        )

    def test_multistack_docs_use_live_drg_spokes_key(self) -> None:
        expected_key = "DRGRT-FRA-LZ-SPOKES-KEY"
        readme = (
            REPO_ROOT / "workload-extensions/oke/simple/multi-stack/readme.md"
        ).read_text(encoding="utf-8")
        hub_updates = (
            REPO_ROOT / "workload-extensions/oke/simple/multi-stack/network-hub-updates.md"
        ).read_text(encoding="utf-8")
        network = (
            REPO_ROOT / "workload-extensions/oke/simple/multi-stack/oke_network.json"
        ).read_text(encoding="utf-8")

        self.assertIn(expected_key, readme)
        self.assertIn(expected_key, network)
        self.assertIn(expected_key, hub_updates)
        self.assertNotIn("DRGRT-FRA-LZP-SPOKES-KEY", hub_updates)

    def test_single_stack_published_surface_includes_security_and_observability_outputs(self) -> None:
        single_stack_dir = REPO_ROOT / "workload-extensions/oke/simple/single-stack"
        json_files = {path.name for path in single_stack_dir.glob("*.json")}

        expected_files = {
            # core deployment inputs
            "oke_identity.json",
            "oke_network.json",
            "oke_governance.json",
            "oke_clusters.json",
            "oke_workers.json",
            # published companion security/observability outputs
            "oke_security_cis1.json",
            "oke_security_cis1_pre.json",
            "oke_security_cis2.json",
            "oke_security_cis2_pre.json",
            "oke_observability_cis1.json",
            "oke_observability_cis1_pre.json",
            "oke_observability_cis2.json",
            "oke_observability_cis2_pre.json",
        }

        self.assertEqual(expected_files, json_files)

    def test_multi_stack_published_surface_includes_security_and_observability_outputs(self) -> None:
        multi_stack_dir = REPO_ROOT / "workload-extensions/oke/simple/multi-stack"
        json_files = {path.name for path in multi_stack_dir.glob("*.json")}

        expected_files = {
            # core deployment inputs
            "oke_identity.json",
            "oke_network.json",
            "oke_clusters.json",
            "oke_workers.json",
            # published companion security/observability outputs
            "oke_security_cis1.json",
            "oke_security_cis1_pre.json",
            "oke_security_cis2.json",
            "oke_security_cis2_pre.json",
            "oke_observability_cis1.json",
            "oke_observability_cis1_pre.json",
            "oke_observability_cis2.json",
            "oke_observability_cis2_pre.json",
        }

        self.assertEqual(expected_files, json_files)

    def test_readmes_document_security_and_observability_companion_outputs(self) -> None:
        readmes = {
            "single": {
                "text": (
                    REPO_ROOT / "workload-extensions/oke/simple/single-stack/readme.md"
                ).read_text(encoding="utf-8"),
                "companions": (
                    "oke_security_cis1.json",
                    "oke_security_cis1_pre.json",
                    "oke_security_cis2.json",
                    "oke_security_cis2_pre.json",
                    "oke_observability_cis1.json",
                    "oke_observability_cis1_pre.json",
                    "oke_observability_cis2.json",
                    "oke_observability_cis2_pre.json",
                ),
            },
            "multi": {
                "text": (
                    REPO_ROOT / "workload-extensions/oke/simple/multi-stack/readme.md"
                ).read_text(encoding="utf-8"),
                "companions": (
                    "oke_security_cis1.json",
                    "oke_security_cis1_pre.json",
                    "oke_security_cis2.json",
                    "oke_security_cis2_pre.json",
                    "oke_observability_cis1.json",
                    "oke_observability_cis1_pre.json",
                    "oke_observability_cis2.json",
                    "oke_observability_cis2_pre.json",
                ),
            },
        }

        for label, data in readmes.items():
            for companion in data["companions"]:
                with self.subTest(readme=label, file=companion):
                    self.assertIn(companion, data["text"])

    def test_single_stack_readme_uses_current_oke_cluster_payload_shape(self) -> None:
        readme = (
            REPO_ROOT / "workload-extensions/oke/simple/single-stack/readme.md"
        ).read_text(encoding="utf-8")
        self.assertIn("oke_clusters_configuration", readme)
        self.assertIn("options.kubernetes_network_config.services_cidr", readme)
        self.assertNotIn('"clusters_configuration": {', readme)

    def test_guides_tell_investigators_to_follow_the_published_orchestrator_tag(self) -> None:
        expected_phrase = "exact orchestrator tag referenced by the published OKE docs"
        for relpath in (
            "AGENTS.md",
            "gen/AGENTS.md",
            "gen/workload-extensions/oke/AGENTS.md",
        ):
            with self.subTest(path=relpath):
                text = (REPO_ROOT / relpath).read_text(encoding="utf-8")
                self.assertIn(expected_phrase, text)
