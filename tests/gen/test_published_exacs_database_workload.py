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
    "infrastructure": {"cloud_exadata_infrastructures_configuration"},
    "vmclusters": {"cloud_vm_clusters_configuration"},
    "databases": {
        "cloud_db_homes_configuration",
        "databases_configuration",
        "pluggable_databases_configuration",
    },
}


def published_name(stage: str, use_case: str) -> str:
    return f"exacs_cloud_exadata_{stage}_{use_case}.json"


SINGLE_STACK_FOUNDATION_FILES = {
    "exacs_governance_uc1.json",
    "exacs_identity_uc1.json",
    "exacs_network_hub_e.json",
    "exacs_observability_cis1_uc1_pre.json",
    "exacs_security_cis1_uc1.json",
}


class PublishedExacsDatabaseWorkloadTests(unittest.TestCase):
    def test_uc3_snapshots_have_two_isolated_environment_chains(self) -> None:
        single_path = WORKLOAD_ROOT / "single-stack/exacs_cloud_exadata_database_uc3.json"
        single = json.loads(single_path.read_text(encoding="utf-8"))
        self.assertEqual({"cloud_exadata_database_configuration"}, set(single))
        root = single["cloud_exadata_database_configuration"]
        self.assertEqual(SINGLE_STACK_SECTIONS, set(root))

        combined = {}
        for stage, sections in MULTI_STACK_SECTIONS.items():
            path = WORKLOAD_ROOT / "multi-stack" / published_name(stage, "uc3")
            document = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual({"cloud_exadata_database_configuration"}, set(document))
            operation = document["cloud_exadata_database_configuration"]
            self.assertEqual(sections, set(operation))
            combined.update(operation)
        self.assertEqual(root, combined)

        infra = root["cloud_exadata_infrastructures_configuration"]["cloud_exadata_infrastructures"]
        vmcs = root["cloud_vm_clusters_configuration"]
        homes = root["cloud_db_homes_configuration"]
        cdbs = root["databases_configuration"]
        pdbs = root["pluggable_databases_configuration"]
        for resources, prefix in ((infra, "infra"), (vmcs, "vmc"), (homes, "dbhome"),
                                  (cdbs, "cdb"), (pdbs, "pdb")):
            self.assertEqual({f"{prefix}_prod", f"{prefix}_preprod"}, set(resources))

        foundation_dirs = [
            (REPO_ROOT / "workload-extensions/exacs/single-stack", "exacs_identity_uc3.json",
             "exacs_network_hub_e_uc3.json"),
            (REPO_ROOT / "workload-extensions/exacs/multi-stack", "exacs_identity_uc3.json",
             "exacs_network_uc3_a.json"),
            (REPO_ROOT / "workload-extensions/exacs/multi-stack", "exacs_identity_uc3.json",
             "exacs_network_uc3_e.json"),
        ]
        for env in ("prod", "preprod"):
            label = env.upper()
            vmc = vmcs[f"vmc_{env}"]
            self.assertEqual(f"infra_{env}", vmc["exadata_infrastructure_id"])
            self.assertEqual(f"CMP-LZ-{label}-EXACS-INFRA-KEY", infra[f"infra_{env}"]["compartment_id"])
            self.assertEqual(f"exacs-infra-{env}", infra[f"infra_{env}"]["display_name"])
            self.assertEqual("Exadata.X11M", infra[f"infra_{env}"]["shape"])
            self.assertEqual(f"CMP-LZ-{label}-EXACS-DB-KEY", vmc["compartment_id"])
            self.assertEqual(f"SN-FRA-LZ-{label}-PLATFORM-EXACS-DB-KEY", vmc["subnet_id"])
            self.assertEqual(f"SN-FRA-LZ-{label}-PLATFORM-EXACS-BACKUP-KEY", vmc["backup_subnet_id"])
            self.assertEqual(2, vmc["cpu_core_count"])
            self.assertEqual("19.0.0.0", vmc["gi_version"])
            self.assertEqual(f"exacs{env}", vmc["hostname"])
            self.assertEqual(["ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY"], vmc["ssh_public_keys"])
            self.assertEqual(f"vmc_{env}", homes[f"dbhome_{env}"]["vm_cluster_id"])
            self.assertEqual("19.0.0.0", homes[f"dbhome_{env}"]["db_version"])
            self.assertEqual(f"dbhome_{env}", cdbs[f"cdb_{env}"]["db_home_id"])
            self.assertEqual("ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID",
                             cdbs[f"cdb_{env}"]["database"]["admin_password_secret_id"])
            self.assertEqual(f"cdb_{env}", pdbs[f"pdb_{env}"]["container_database_id"])
            for directory, identity_name, network_name in foundation_dirs:
                identity = json.dumps(json.loads((directory / identity_name).read_text()))
                network = json.dumps(json.loads((directory / network_name).read_text()))
                self.assertIn(infra[f"infra_{env}"]["compartment_id"], identity)
                self.assertIn(vmc["compartment_id"], identity)
                self.assertIn(vmc["subnet_id"], network)
                self.assertIn(vmc["backup_subnet_id"], network)
        self.assertEqual("CDBPROD", cdbs["cdb_prod"]["database"]["db_name"])
        self.assertEqual("CDBPREP", cdbs["cdb_preprod"]["database"]["db_name"])
        self.assertEqual("PDBPROD", pdbs["pdb_prod"]["pdb_name"])
        self.assertEqual("PDBPREP", pdbs["pdb_preprod"]["pdb_name"])
        self.assertNotIn("autonomous", json.dumps(root).lower())
        self.assertNotIn("shared", json.dumps(root).lower())

    def test_uc2_snapshots_match_shared_infra_and_environment_chains(self) -> None:
        single = json.loads((WORKLOAD_ROOT / "single-stack/exacs_cloud_exadata_database_uc2.json").read_text())
        root = single["cloud_exadata_database_configuration"]
        self.assertEqual(SINGLE_STACK_SECTIONS, set(root))
        multi = {}
        for stage, sections in MULTI_STACK_SECTIONS.items():
            uc2_name = published_name(stage, "uc2")
            doc = json.loads((WORKLOAD_ROOT / "multi-stack" / uc2_name).read_text())
            self.assertEqual({"cloud_exadata_database_configuration"}, set(doc))
            self.assertEqual(sections, set(doc["cloud_exadata_database_configuration"]))
            multi.update(doc["cloud_exadata_database_configuration"])
        self.assertEqual(root, multi)
        infra = root["cloud_exadata_infrastructures_configuration"]["cloud_exadata_infrastructures"]
        self.assertEqual({"infra_shared"}, set(infra))
        self.assertEqual("CMP-LZ-SHARED-EXACS-INFRA-KEY", infra["infra_shared"]["compartment_id"])
        vmcs = root["cloud_vm_clusters_configuration"]
        homes = root["cloud_db_homes_configuration"]
        cdbs = root["databases_configuration"]
        pdbs = root["pluggable_databases_configuration"]
        self.assertEqual({"vmc_prod", "vmc_preprod"}, set(vmcs))
        self.assertEqual({"dbhome_prod", "dbhome_preprod"}, set(homes))
        self.assertEqual({"cdb_prod", "cdb_preprod"}, set(cdbs))
        self.assertEqual({"pdb_prod", "pdb_preprod"}, set(pdbs))
        identity = json.loads((REPO_ROOT / "workload-extensions/exacs/single-stack/exacs_identity_uc2.json").read_text())
        network = json.loads((REPO_ROOT / "workload-extensions/exacs/single-stack/exacs_network_hub_e_uc2.json").read_text())
        for env in ("prod", "preprod"):
            with self.subTest(env=env):
                vmc = vmcs[f"vmc_{env}"]
                env_key = env.upper()
                self.assertEqual("infra_shared", vmc["exadata_infrastructure_id"])
                self.assertEqual(f"exacs{env}", vmc["hostname"])
                self.assertEqual(f"CMP-LZ-{env_key}-EXACS-DB-KEY", vmc["compartment_id"])
                self.assertEqual(f"SN-FRA-LZ-{env_key}-PLATFORM-EXACS-DB-KEY", vmc["subnet_id"])
                self.assertEqual(f"SN-FRA-LZ-{env_key}-PLATFORM-EXACS-BACKUP-KEY", vmc["backup_subnet_id"])
                self.assertIn(vmc["compartment_id"], json.dumps(identity))
                self.assertIn(vmc["subnet_id"], json.dumps(network))
                self.assertIn(vmc["backup_subnet_id"], json.dumps(network))
                multi_identity = json.loads((REPO_ROOT / "workload-extensions/exacs/multi-stack/exacs_identity_uc2.json").read_text())
                multi_network = json.loads((REPO_ROOT / "workload-extensions/exacs/multi-stack/exacs_network_uc2_e.json").read_text())
                self.assertIn(vmc["compartment_id"], json.dumps(multi_identity))
                self.assertIn(vmc["subnet_id"], json.dumps(multi_network))
                self.assertIn(vmc["backup_subnet_id"], json.dumps(multi_network))
                self.assertEqual(f"vmc_{env}", homes[f"dbhome_{env}"]["vm_cluster_id"])
                self.assertEqual(f"dbhome_{env}", cdbs[f"cdb_{env}"]["db_home_id"])
                self.assertEqual(f"cdb_{env}", pdbs[f"pdb_{env}"]["container_database_id"])
        self.assertEqual("CDBPROD", cdbs["cdb_prod"]["database"]["db_name"])
        self.assertEqual("CDBPREP", cdbs["cdb_preprod"]["database"]["db_name"])
        serialized = json.dumps(root)
        self.assertIn("REPLACE_WITH_SECRET_OCID", serialized)
        self.assertIn("REPLACE_WITH_APPROVED_PUBLIC_KEY", serialized)
        self.assertNotIn("autonomous", serialized.lower())

    def test_uc1_single_stack_snapshot_is_one_combined_operation(self) -> None:
        stack_dir = WORKLOAD_ROOT / "single-stack"
        document = json.loads(
            (stack_dir / published_name("database", "uc1")).read_text(encoding="utf-8")
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
        for stage, expected_sections in MULTI_STACK_SECTIONS.items():
            with self.subTest(stage=stage):
                path = stack_dir / published_name(stage, "uc1")
                document = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual({"cloud_exadata_database_configuration"}, set(document))
                self.assertEqual(
                    expected_sections,
                    set(document["cloud_exadata_database_configuration"]),
                )

    def test_uc1_single_stack_workload_matches_its_foundation_contract(self) -> None:
        foundation_dir = REPO_ROOT / "workload-extensions/exacs/single-stack"
        workload_document = json.loads(
            (
                WORKLOAD_ROOT / "single-stack" / published_name("database", "uc1")
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
            "exacs_cloud_exadata_database_uc1.json",
            "one Resource Manager stack",
            "one Terraform state",
            "final observability re-apply",
            "plan removal",
            "existing foundation state",
            "known compartment and subnet OCIDs",
            "Do not include the workload in the initial foundation plan",
        }:
            with self.subTest(single_stack_marker=marker):
                self.assertIn(marker, single_stack_readme)
        for stage in MULTI_STACK_SECTIONS:
            with self.subTest(obsolete_single_stack_file=stage):
                self.assertNotIn(published_name(stage, "uc1"), single_stack_readme)

        self.assertIn("Complete the foundation first", single_stack_readme)
        self.assertIn("Add the workload to the same stack", single_stack_readme)
        self.assertLess(
            single_stack_readme.index("Complete the foundation first"),
            single_stack_readme.index("Add the workload to the same stack"),
        )

        multi_stack_readme = (WORKLOAD_ROOT / "multi-stack/readme.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("ExaCS multi-stack foundation", multi_stack_readme)
        for stage in MULTI_STACK_SECTIONS:
            with self.subTest(multi_stack_file=stage):
                self.assertIn(published_name(stage, "uc1"), multi_stack_readme)
        self.assertIn("cloud_exadata_database_output.json", multi_stack_readme)

        self.assertIn("hub post-update", multi_stack_readme)

        exacs_readme = (
            REPO_ROOT / "workload-extensions/exacs/readme.md"
        ).read_text(encoding="utf-8")
        self.assertIn("database-workload/", exacs_readme)
        self.assertIn("unmodified foundation quickstart remains foundation-only", exacs_readme)
        for guide in (root_readme, exacs_readme):
            self.assertIn("foundation first", guide)

        foundation_single_stack_readme = (
            REPO_ROOT / "workload-extensions/exacs/single-stack/readme.md"
        ).read_text(encoding="utf-8")
        for marker in {
            "exacs_cloud_exadata_database_uc1.json",
            "absent from the public convenience buttons",
            "retain that workload JSON unchanged",
            "foundation first",
            "Do not include the workload in the initial foundation plan",
        }:
            with self.subTest(foundation_single_stack_marker=marker):
                self.assertIn(marker, foundation_single_stack_readme)

        published_guides = (
            root_readme, single_stack_readme, multi_stack_readme,
            foundation_single_stack_readme,
        )
        for stage in ("database", *MULTI_STACK_SECTIONS):
            old_name = f"exacs_cloud_exadata_{stage}.json"
            for guide in published_guides:
                self.assertNotIn(old_name, guide)

        factory_guide = (WORKLOAD_ROOT / "blueprint-factory.md").read_text(encoding="utf-8")
        self.assertIn("config mode keeps the generic filenames", factory_guide)
        for stage in MULTI_STACK_SECTIONS:
            self.assertIn(f"exacs_cloud_exadata_{stage}.json", factory_guide)

    def test_repeated_configuration_roots_are_unsupported(self) -> None:
        factory_guide = (WORKLOAD_ROOT / "blueprint-factory.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("Repeated top-level roots are unsupported", factory_guide)
        self.assertIn("duplicate object key", factory_guide)
        self.assertNotIn("keeps the first document", factory_guide)

    def test_published_names_cover_only_uc1_through_uc3(self) -> None:
        for stack, stages in (("single-stack", ("database",)),
                              ("multi-stack", tuple(MULTI_STACK_SECTIONS))):
            expected = {
                published_name(stage, use_case)
                for stage in stages
                for use_case in ("uc1", "uc2", "uc3")
            }
            actual = {
                path.name for path in (WORKLOAD_ROOT / stack).glob("exacs_cloud_exadata_*.json")
            }
            self.assertEqual(expected, actual)
            source_dir = REPO_ROOT / "gen/workload-extensions/exacs/database-workload" / stack
            source_names = {
                path.name for path in source_dir.glob("exacs_cloud_exadata_*.jsonnet")
            }
            self.assertEqual({name + "net" for name in expected}, source_names)


if __name__ == "__main__":
    unittest.main()
