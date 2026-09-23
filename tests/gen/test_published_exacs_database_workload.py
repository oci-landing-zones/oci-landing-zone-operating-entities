from __future__ import annotations

import json
from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKLOAD_ROOT = REPO_ROOT / "workload-extensions/exacs/database-workload"
EXPECTED_SECTIONS = {
    "exacs_cloud_exadata_infrastructure.json": {"cloud_exadata_infrastructures_configuration"},
    "exacs_cloud_exadata_vmclusters.json": {"cloud_vm_clusters_configuration"},
    "exacs_cloud_exadata_databases.json": {
        "cloud_db_homes_configuration",
        "databases_configuration",
        "pluggable_databases_configuration",
    },
}


class PublishedExacsDatabaseWorkloadTests(unittest.TestCase):
    def test_uc1_snapshots_have_isolated_operations_and_required_placeholders(self) -> None:
        for stack_name in ("single-stack", "multi-stack"):
            with self.subTest(stack=stack_name):
                stack_dir = WORKLOAD_ROOT / stack_name
                documents = {
                    filename: json.loads((stack_dir / filename).read_text(encoding="utf-8"))
                    for filename in EXPECTED_SECTIONS
                }

                for filename, expected_sections in EXPECTED_SECTIONS.items():
                    with self.subTest(stack=stack_name, document=filename):
                        document = documents[filename]
                        self.assertEqual(
                            {"cloud_exadata_database_configuration"}, set(document)
                        )
                        self.assertEqual(
                            expected_sections,
                            set(document["cloud_exadata_database_configuration"]),
                        )

                database = documents["exacs_cloud_exadata_databases.json"]
                self.assertIn(
                    "ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID",
                    json.dumps(database),
                )
                vmclusters = documents["exacs_cloud_exadata_vmclusters.json"]
                self.assertIn(
                    "ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY",
                    json.dumps(vmclusters),
                )

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

        stack_readmes = {
            "single-stack": "ExaCS single-stack foundation",
            "multi-stack": "ExaCS multi-stack foundation",
        }
        for stack_name, foundation_marker in stack_readmes.items():
            with self.subTest(stack=stack_name):
                readme = (WORKLOAD_ROOT / stack_name / "readme.md").read_text(
                    encoding="utf-8"
                )
                for filename in EXPECTED_SECTIONS:
                    self.assertIn(filename, readme)
                self.assertIn("cloud_exadata_database_output.json", readme)
                self.assertIn(foundation_marker, readme)

        multi_stack_readme = (WORKLOAD_ROOT / "multi-stack/readme.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("hub post-update", multi_stack_readme)

        exacs_readme = (
            REPO_ROOT / "workload-extensions/exacs/readme.md"
        ).read_text(encoding="utf-8")
        self.assertIn("database-workload/", exacs_readme)


if __name__ == "__main__":
    unittest.main()
