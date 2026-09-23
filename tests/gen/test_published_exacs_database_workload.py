from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKLOAD_ROOT = REPO_ROOT / "workload-extensions/exacs/database-workload"
SINGLE_STACK_SECTIONS = {
    "cloud_exadata_infrastructures_configuration",
    "cloud_vm_clusters_configuration",
    "cloud_db_homes_configuration",
    "databases_configuration",
    "pluggable_databases_configuration",
}
MULTI_STACK_SECTIONS = {
    "exacs_cloud_exadata_infrastructure.json": {"cloud_exadata_infrastructures_configuration"},
    "exacs_cloud_exadata_vmclusters.json": {"cloud_vm_clusters_configuration"},
    "exacs_cloud_exadata_databases.json": {
        "cloud_db_homes_configuration",
        "databases_configuration",
        "pluggable_databases_configuration",
    },
}
SINGLE_STACK_FOUNDATION_FILES = {
    "exacs_governance_uc1.json",
    "exacs_identity_uc1.json",
    "exacs_network_hub_e.json",
    "exacs_observability_cis1_uc1_pre.json",
    "exacs_security_cis1_uc1.json",
}


class PublishedExacsDatabaseWorkloadTests(unittest.TestCase):
    def test_uc1_single_stack_snapshot_is_one_combined_operation(self) -> None:
        stack_dir = WORKLOAD_ROOT / "single-stack"
        document = json.loads(
            (stack_dir / "exacs_cloud_exadata_database.json").read_text(encoding="utf-8")
        )

        self.assertEqual({"cloud_exadata_database_configuration"}, set(document))
        configuration = document["cloud_exadata_database_configuration"]
        self.assertEqual(SINGLE_STACK_SECTIONS, set(configuration))
        self.assertIn(
            "ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID",
            json.dumps(document),
        )
        self.assertIn(
            "ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY",
            json.dumps(document),
        )

    def test_uc1_multi_stack_snapshots_keep_isolated_operations(self) -> None:
        stack_dir = WORKLOAD_ROOT / "multi-stack"
        for filename, expected_sections in MULTI_STACK_SECTIONS.items():
            with self.subTest(document=filename):
                document = json.loads((stack_dir / filename).read_text(encoding="utf-8"))
                self.assertEqual({"cloud_exadata_database_configuration"}, set(document))
                self.assertEqual(
                    expected_sections,
                    set(document["cloud_exadata_database_configuration"]),
                )

    def test_uc1_single_stack_workload_matches_its_foundation_contract(self) -> None:
        foundation_dir = REPO_ROOT / "workload-extensions/exacs/single-stack"
        workload_document = json.loads(
            (
                WORKLOAD_ROOT / "single-stack/exacs_cloud_exadata_database.json"
            ).read_text(encoding="utf-8")
        )
        foundation_documents = {
            filename: json.loads((foundation_dir / filename).read_text(encoding="utf-8"))
            for filename in SINGLE_STACK_FOUNDATION_FILES
        }

        top_level_roots = Counter(workload_document.keys())
        for document in foundation_documents.values():
            top_level_roots.update(document.keys())
        self.assertEqual(
            1,
            top_level_roots["cloud_exadata_database_configuration"],
            "the single-stack package must have one Cloud Exadata root document",
        )

        serialized_identity = json.dumps(
            foundation_documents["exacs_identity_uc1.json"]
        )
        serialized_network = json.dumps(
            foundation_documents["exacs_network_hub_e.json"]
        )
        for logical_key in {
            "CMP-LZ-SHARED-EXACS-INFRA-KEY",
            "CMP-LZ-SHARED-EXACS-DB-KEY",
        }:
            with self.subTest(compartment_key=logical_key):
                self.assertIn(logical_key, serialized_identity)
                self.assertIn(logical_key, json.dumps(workload_document))
        for logical_key in {
            "SN-FRA-LZ-SHARED-PLATFORM-EXACS-DB-KEY",
            "SN-FRA-LZ-SHARED-PLATFORM-EXACS-BACKUP-KEY",
        }:
            with self.subTest(subnet_key=logical_key):
                self.assertIn(logical_key, serialized_network)
                self.assertIn(logical_key, json.dumps(workload_document))

    def test_documentation_contract(self) -> None:
        root_readme = (WORKLOAD_ROOT / "readme.md").read_text(encoding="utf-8")
        required_root_markers = {
            "single-stack",
            "multi-stack",
            "Blueprint Factory",
            "REPLACE_WITH_SECRET_OCID",
            "REPLACE_WITH_APPROVED_PUBLIC_KEY",
        }
        for marker in required_root_markers:
            with self.subTest(root_marker=marker):
                self.assertIn(marker, root_readme)

        single_stack_readme = (WORKLOAD_ROOT / "single-stack/readme.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("ExaCS single-stack foundation", single_stack_readme)
        for marker in {
            "exacs_cloud_exadata_database.json",
            "one Resource Manager stack",
            "one Terraform state",
            "final observability re-apply",
            "plan removal",
        }:
            with self.subTest(single_stack_marker=marker):
                self.assertIn(marker, single_stack_readme)
        for filename in MULTI_STACK_SECTIONS:
            with self.subTest(obsolete_single_stack_file=filename):
                self.assertNotIn(filename, single_stack_readme)

        multi_stack_readme = (WORKLOAD_ROOT / "multi-stack/readme.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("ExaCS multi-stack foundation", multi_stack_readme)
        for filename in MULTI_STACK_SECTIONS:
            with self.subTest(multi_stack_file=filename):
                self.assertIn(filename, multi_stack_readme)
        self.assertIn("cloud_exadata_database_output.json", multi_stack_readme)

        self.assertIn("hub post-update", multi_stack_readme)

        exacs_readme = (
            REPO_ROOT / "workload-extensions/exacs/readme.md"
        ).read_text(encoding="utf-8")
        self.assertIn("database-workload/", exacs_readme)
        self.assertIn("unmodified foundation quickstart remains foundation-only", exacs_readme)

        foundation_single_stack_readme = (
            REPO_ROOT / "workload-extensions/exacs/single-stack/readme.md"
        ).read_text(encoding="utf-8")
        for marker in {
            "exacs_cloud_exadata_database.json",
            "absent from the public convenience buttons",
            "retain that workload JSON unchanged",
        }:
            with self.subTest(foundation_single_stack_marker=marker):
                self.assertIn(marker, foundation_single_stack_readme)


if __name__ == "__main__":
    unittest.main()
