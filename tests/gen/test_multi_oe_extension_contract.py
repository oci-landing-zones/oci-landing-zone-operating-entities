from __future__ import annotations

from collections import defaultdict
import json
from pathlib import Path
from typing import Union
import unittest

from tests.gen.helpers import REPO_ROOT, render_config_outputs


CONTRACT_CONFIG = Path(
    "tests/gen/testdata/contracts/multi_oe_all_extensions.jsonnet"
)

# terraform-oci-modules-orchestrator v2.1.3, commit
# 34202e837e9df015ddaaa4fce0ab62bb6e3883de.
# Source: https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/blob/v2.1.3/variables.tf
ORCHESTRATOR_V2_1_3_ROOT_KEYS = frozenset(
    {
        "alarms_configuration",
        "autonomous_databases_configuration",
        "bastions_configuration",
        "budgets_configuration",
        "cloud_exadata_database_configuration",
        "cloud_guard_configuration",
        "compartments_configuration",
        "dynamic_groups_configuration",
        "events_configuration",
        "groups_configuration",
        "home_region_events_configuration",
        "identity_domain_applications_configuration",
        "identity_domain_dynamic_groups_configuration",
        "identity_domain_groups_configuration",
        "identity_domain_identity_providers_configuration",
        "identity_domains_configuration",
        "instances_configuration",
        "logging_configuration",
        "network_configuration",
        "nlb_configuration",
        "notifications_configuration",
        "object_storage_configuration",
        "ocvs_configuration",
        "oke_clusters_configuration",
        "oke_workers_configuration",
        "policies_configuration",
        "scanning_configuration",
        "security_zones_configuration",
        "service_connectors_configuration",
        "storage_configuration",
        "streams_configuration",
        "tags_configuration",
        "vaults_configuration",
        "zpr_configuration",
    }
)

EXPECTED_OUTPUT_FILES = frozenset(
    {
        "governance.json",
        "iam.json",
        "network.json",
        "observability_cis2.json",
        "observability_cis2_pre.json",
        "ocvs.json",
        "oke_clusters.json",
        "oke_workers.json",
        "security_cis2.json",
        "security_cis2_pre.json",
    }
)


def nested_compartment_keys(compartments: dict) -> set[str]:
    keys: set[str] = set()

    def visit(nodes: dict) -> None:
        for key, value in nodes.items():
            keys.add(key)
            children = value.get("children", {})
            if isinstance(children, dict):
                visit(children)

    visit(compartments)
    return keys


def network_resource_keys(network_configuration: dict) -> dict[str, set[str]]:
    resources = {
        "vcns": set(),
        "subnets": set(),
        "network_security_groups": set(),
        "route_tables": set(),
    }
    categories = network_configuration["network_configuration_categories"]
    for category in categories.values():
        for vcn_key, vcn in category.get("vcns", {}).items():
            resources["vcns"].add(vcn_key)
            resources["subnets"].update(vcn.get("subnets", {}))
            resources["network_security_groups"].update(
                vcn.get("network_security_groups", {})
            )
            resources["route_tables"].update(vcn.get("route_tables", {}))
    return resources


def assert_dependency_refs(
    test_case: unittest.TestCase,
    value: Union[str, list[str]],
    available: set[str],
) -> None:
    references = value if isinstance(value, list) else [value]
    for reference in references:
        test_case.assertIn(reference, available)


class MultiOeExtensionContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.outputs = render_config_outputs(CONTRACT_CONFIG)

    def test_integrated_output_inventory_is_exact(self) -> None:
        self.assertEqual(EXPECTED_OUTPUT_FILES, frozenset(self.outputs))

    def test_each_deployment_stage_has_unique_root_families(self) -> None:
        common = {
            "governance.json",
            "iam.json",
            "network.json",
            "ocvs.json",
            "oke_clusters.json",
            "oke_workers.json",
        }
        stages = (
            common | {"observability_cis2_pre.json", "security_cis2_pre.json"},
            common | {"observability_cis2.json", "security_cis2.json"},
        )

        for stage in stages:
            with self.subTest(stage=sorted(stage)):
                owners: dict[str, list[str]] = defaultdict(list)
                for filename in stage:
                    for family in self.outputs[filename]:
                        owners[family].append(filename)
                duplicates = {
                    family: sorted(files)
                    for family, files in owners.items()
                    if len(files) > 1
                }
                self.assertEqual({}, duplicates)

    def test_all_emitted_families_match_pinned_orchestrator_root(self) -> None:
        emitted = {
            family
            for payload in self.outputs.values()
            for family in payload
        }
        self.assertEqual(
            set(),
            emitted - ORCHESTRATOR_V2_1_3_ROOT_KEYS,
            "generated configuration family is absent from Orchestrator v2.1.3",
        )
        self.assertIn("oke_clusters_configuration", emitted)
        self.assertIn("oke_workers_configuration", emitted)
        self.assertIn("ocvs_configuration", emitted)

    def test_qualified_extension_dependencies_resolve(self) -> None:
        iam = self.outputs["iam.json"]
        compartment_keys = nested_compartment_keys(
            iam["compartments_configuration"]["compartments"]
        )
        resources = network_resource_keys(
            self.outputs["network.json"]["network_configuration"]
        )

        clusters = self.outputs["oke_clusters.json"][
            "oke_clusters_configuration"
        ]["clusters"]
        workers = self.outputs["oke_workers.json"]["oke_workers_configuration"][
            "node_pools"
        ]
        ocvs_clusters = self.outputs["ocvs.json"]["ocvs_configuration"][
            "ocvs_clusters"
        ]

        self.assertEqual(2, len(clusters))
        self.assertEqual(2, len(workers))
        self.assertEqual(2, len(ocvs_clusters))
        for qualifier in ("ALPHA-PROD", "BETA-PROD"):
            self.assertTrue(any(qualifier in key for key in clusters))
            self.assertTrue(any(qualifier in key for key in workers))
            self.assertTrue(any(qualifier in key for key in ocvs_clusters))
            for extension in ("EXACC", "EXACS", "OCVS", "OKE"):
                self.assertTrue(
                    any(
                        qualifier in key and extension in key
                        for key in compartment_keys
                    ),
                    f"missing {qualifier} {extension} compartment",
                )

        for cluster in clusters.values():
            self.assertIn(cluster["compartment_id"], compartment_keys)
            networking = cluster["networking"]
            assert_dependency_refs(
                self,
                networking["api_endpoint_subnet_id"],
                resources["subnets"],
            )
            assert_dependency_refs(
                self,
                networking["services_subnet_id"],
                resources["subnets"],
            )
            assert_dependency_refs(
                self,
                networking["vcn_id"],
                resources["vcns"],
            )
            assert_dependency_refs(
                self,
                networking["api_endpoint_nsg_ids"],
                resources["network_security_groups"],
            )

        for node_pool in workers.values():
            self.assertIn(node_pool["compartment_id"], compartment_keys)
            self.assertIn(node_pool["cluster_id"], clusters)
            networking = node_pool["networking"]
            assert_dependency_refs(
                self,
                networking["workers_subnet_id"],
                resources["subnets"],
            )
            assert_dependency_refs(
                self,
                networking["workers_nsg_ids"],
                resources["network_security_groups"],
            )
            if "pods_subnet_id" in networking:
                assert_dependency_refs(
                    self,
                    networking["pods_subnet_id"],
                    resources["subnets"],
                )
            assert_dependency_refs(
                self,
                networking.get("pods_nsg_ids", []),
                resources["network_security_groups"],
            )

        for cluster in ocvs_clusters.values():
            self.assertIn(cluster["compartment_id"], compartment_keys)
            networking = cluster["networking"]
            self.assertIn(networking["vcn_id"], resources["vcns"])
            self.assertIn(networking["subnet_id"], resources["subnets"])
            for nsg_key in networking["nsgs"].values():
                self.assertIn(nsg_key, resources["network_security_groups"])
            for route_table_key in networking["route_tables"].values():
                self.assertIn(route_table_key, resources["route_tables"])

    def test_exadata_observability_is_qualified_for_both_oes(self) -> None:
        observability = self.outputs["observability_cis2.json"]
        rendered = json.dumps(observability, sort_keys=True)
        for qualifier in ("ALPHA-PROD", "BETA-PROD"):
            self.assertIn(f"{qualifier}-EXACC", rendered)
            self.assertIn(f"{qualifier}-EXACS", rendered)
            self.assertIn(
                f"AL-LZ-{qualifier}-CPUUTIL-KEY",
                observability["alarms_configuration"]["alarms"],
            )


if __name__ == "__main__":
    unittest.main()
