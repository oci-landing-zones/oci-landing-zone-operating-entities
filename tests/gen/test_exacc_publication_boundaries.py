from __future__ import annotations

import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


class ExaccPublicationBoundaryTests(unittest.TestCase):
    def test_generated_exacc_source_does_not_keep_branch_split_helpers(self) -> None:
        self.assertFalse((REPO_ROOT / "gen/workload-extensions/exacc/exacc_identity.libsonnet").exists())
        self.assertFalse((REPO_ROOT / "gen/workload-extensions/exacc/exacc_observability.libsonnet").exists())

    def test_single_stack_entrypoints_use_generic_landing_zone_projections(self) -> None:
        expected_projections = {
            "exacc_identity_uc1.jsonnet": "lz(profiles.single_stack.config).iam",
            "exacc_governance_uc1.jsonnet": "lz(profiles.single_stack.config).governance",
            "exacc_security_cis1_uc1.jsonnet": "lz(profiles.single_stack.config).security_cis1",
            "exacc_security_cis2_uc1.jsonnet": "lz(profiles.single_stack.config).security_cis2",
            "exacc_observability_cis1_uc1.jsonnet": "lz(profiles.single_stack.config).observability_cis1",
            "exacc_observability_cis2_uc1.jsonnet": "lz(profiles.single_stack.config).observability_cis2",
        }

        for file_name, projection in expected_projections.items():
            with self.subTest(file=file_name):
                contents = (
                    REPO_ROOT / "gen/workload-extensions/exacc/single-stack" / file_name
                ).read_text(encoding="utf-8")
                normalized = " ".join(contents.split())
                self.assertIn("local lz = import '../../../landing_zone.libsonnet';", normalized)
                self.assertIn(projection, normalized)
                self.assertNotIn("published.libsonnet", normalized)
                self.assertNotIn("published.render", normalized)

    def test_multi_stack_keeps_its_publication_adapter_local(self) -> None:
        self.assertFalse((REPO_ROOT / "gen/workload-extensions/exacc/published.libsonnet").exists())
        self.assertTrue((REPO_ROOT / "gen/workload-extensions/exacc/multi-stack/published.libsonnet").exists())

        published = (
            REPO_ROOT / "gen/workload-extensions/exacc/multi-stack/published.libsonnet"
        ).read_text(encoding="utf-8")
        self.assertIn("render_context.from_raw_config(config)", published)

        for file_name in ("exacc_identity_uc1.jsonnet", "exacc_observability_uc1.jsonnet"):
            with self.subTest(file=file_name):
                contents = (
                    REPO_ROOT / "gen/workload-extensions/exacc/multi-stack" / file_name
                ).read_text(encoding="utf-8")
                self.assertIn("local published = import './published.libsonnet';", contents)
                self.assertNotIn("../published.libsonnet", contents)

    def test_exacc_guidance_lives_in_extension_agents_file(self) -> None:
        generic_guide = (REPO_ROOT / "gen/AGENTS.md").read_text(encoding="utf-8")
        exacc_guide = (REPO_ROOT / "gen/workload-extensions/exacc/AGENTS.md").read_text(
            encoding="utf-8"
        )

        self.assertIn("workload-extensions/exacc/AGENTS.md", generic_guide)
        self.assertNotIn("notification_emails.default", generic_guide)
        self.assertNotIn("gen/workload-extensions/exacc/multi-stack/published.libsonnet", generic_guide)
        self.assertIn("notification_emails.default", exacc_guide)
        self.assertIn("gen/workload-extensions/exacc/multi-stack/published.libsonnet", exacc_guide)

    def test_published_surfaces_match_exacc_extension_shape(self) -> None:
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

    def test_multi_stack_outputs_are_extension_only(self) -> None:
        identity = render_jsonnet_object(
            "gen/workload-extensions/exacc/multi-stack/exacc_identity_uc1.jsonnet"
        )
        compartments = identity["compartments_configuration"]["compartments"]
        groups = identity["identity_domain_groups_configuration"]["groups"]
        policies = identity["policies_configuration"]["supplied_policies"]

        self.assertIn("CMP-LZ-SHARED-EXACC-KEY", compartments)
        self.assertIn("CMP-LZ-PROD-PROJ1-DB-KEY", compartments)
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

    def test_exacc_docs_do_not_reference_branch_raw_urls_or_old_content(self) -> None:
        exacc_dir = REPO_ROOT / "workload-extensions/exacc"
        self.assertFalse((exacc_dir / "content" / "OLD").exists())

        docs = sorted(exacc_dir.glob("**/*.md"))
        self.assertTrue(docs)
        for doc in docs:
            with self.subTest(doc=doc.relative_to(REPO_ROOT).as_posix()):
                text = doc.read_text(encoding="utf-8")
                self.assertNotIn("refs/heads/we_exacc_update", text)
                self.assertNotIn("we_exacc_update", text)


if __name__ == "__main__":
    unittest.main()
