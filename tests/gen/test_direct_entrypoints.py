from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import (
    REPO_ROOT,
    render_formatted_json,
    render_jsonnet_object,
    run_cmd,
)
from tests.gen import oke_contract_validation

ADDON_PARITY_CASE_DIRS = (
    (Path("gen/addons/oci-hub-models/hub_a"), Path("addons/oci-hub-models/hub_a")),
    (Path("gen/addons/oci-hub-models/hub_b"), Path("addons/oci-hub-models/hub_b")),
    (Path("gen/addons/oci-hub-models/hub_c"), Path("addons/oci-hub-models/hub_c")),
    (Path("gen/addons/oci-hub-models/hub_e"), Path("addons/oci-hub-models/hub_e")),
)

PARITY_CASE_DIRS = (
    (Path("gen/blueprints/one-oe/runtime/one-stack"), Path("blueprints/one-oe/runtime/one-stack")),
    (
        Path("gen/workload-extensions/oke/simple/single-stack"),
        Path("workload-extensions/oke/simple/single-stack"),
    ),
    (
        Path("gen/workload-extensions/oke/simple/multi-stack"),
        Path("workload-extensions/oke/simple/multi-stack"),
    ),
) + ADDON_PARITY_CASE_DIRS


def expect_key(mapping: dict, key: str, label: str) -> dict:
    if not isinstance(mapping, dict):
        raise AssertionError(f"{label}: expected object")
    if key not in mapping:
        raise AssertionError(f"{label}: missing {key}")
    value = mapping[key]
    if not isinstance(value, dict):
        raise AssertionError(f"{label}: {key} is not an object")
    return value


def iter_nested_dicts(payload: object):
    if isinstance(payload, dict):
        yield payload
        for value in payload.values():
            yield from iter_nested_dicts(value)
    elif isinstance(payload, list):
        for value in payload:
            yield from iter_nested_dicts(value)


def kube_apiserver_cidr_ingress_rules(payload: dict) -> list[dict]:
    matches: list[dict] = []
    for entry in iter_nested_dicts(payload):
        if entry.get("src_type") != "CIDR_BLOCK":
            continue
        if entry.get("protocol") != "TCP":
            continue
        if entry.get("dst_port_min") != "6443" or entry.get("dst_port_max") != "6443":
            continue
        description = entry.get("description")
        if isinstance(description, str) and "kube-apiserver" in description:
            matches.append(entry)
    return matches


def route_rule_keys(payload: object):
    for entry in iter_nested_dicts(payload):
        route_rules = entry.get("route_rules")
        if isinstance(route_rules, dict):
            for key in route_rules:
                yield key


def route_destinations(payload: object):
    for entry in iter_nested_dicts(payload):
        destination = entry.get("destination")
        if isinstance(destination, str) and "destination_type" in entry:
            yield destination


def l7_load_balancer_backend_ips(payload: dict) -> list[str]:
    ips: list[str] = []
    for entry in iter_nested_dicts(payload):
        load_balancers = entry.get("l7_load_balancers")
        if not isinstance(load_balancers, dict):
            continue
        for load_balancer in load_balancers.values():
            backend_sets = load_balancer.get("backend_sets")
            if not isinstance(backend_sets, dict):
                continue
            for backend_set in backend_sets.values():
                backends = backend_set.get("backends")
                if not isinstance(backends, dict):
                    continue
                for backend in backends.values():
                    ip_address = backend.get("ip_address")
                    if isinstance(ip_address, str):
                        ips.append(ip_address)
    return ips


def network_firewall_address_lists(payload: dict) -> dict[str, dict]:
    address_lists: dict[str, dict] = {}
    for entry in iter_nested_dicts(payload):
        policies = entry.get("network_firewall_policies")
        if not isinstance(policies, dict):
            continue
        for policy in policies.values():
            policy_address_lists = policy.get("address_lists")
            if isinstance(policy_address_lists, dict):
                address_lists.update(policy_address_lists)
    return address_lists


class DirectEntrypointRegressionTests(unittest.TestCase):
    def test_published_jsonnet_entrypoints_match_checked_in_outputs(self) -> None:
        for gen_dir, published_dir in PARITY_CASE_DIRS:
            jsonnet_files = sorted((REPO_ROOT / gen_dir).glob("*.jsonnet"))
            self.assertTrue(
                jsonnet_files,
                f"no jsonnet entrypoints found in {gen_dir.as_posix()}",
            )
            expected_published_files = {f"{jsonnet_file.stem}.json" for jsonnet_file in jsonnet_files}
            actual_published_files = {
                published_file.name for published_file in (REPO_ROOT / published_dir).glob("*.json")
            }
            self.assertEqual(
                expected_published_files,
                actual_published_files,
                f"published outputs mismatch for {published_dir.as_posix()}",
            )
            for jsonnet_file in jsonnet_files:
                with self.subTest(jsonnet=jsonnet_file.relative_to(REPO_ROOT).as_posix()):
                    published_file = REPO_ROOT / published_dir / f"{jsonnet_file.stem}.json"
                    self.assertTrue(
                        published_file.exists(),
                        f"missing checked-in output for {jsonnet_file.relative_to(REPO_ROOT).as_posix()}",
                    )
                    actual = render_formatted_json(jsonnet_file.relative_to(REPO_ROOT))
                    self.assertEqual(actual, published_file.read_text(encoding="utf-8"))

    def assert_hub_model_addon_network_is_hub_only(self, payload: dict, label: str) -> None:
        network_configuration = expect_key(payload, "network_configuration", label)
        categories = expect_key(
            network_configuration, "network_configuration_categories", label
        )
        self.assertEqual(
            set(categories.keys()),
            {"0-shared"},
            f"{label}: unexpected network categories",
        )

        shared_category = expect_key(categories, "0-shared", f"{label} shared category")
        non_vcn_gateways = expect_key(
            shared_category, "non_vcn_specific_gateways", f"{label} shared gateways"
        )
        drgs = expect_key(
            non_vcn_gateways, "dynamic_routing_gateways", f"{label} shared gateways"
        )

        forbidden_attachments = {
            "DRGATT-FRA-LZ-PROD-PROJ-KEY",
            "DRGATT-FRA-LZ-PREPROD-PROJ-KEY",
        }
        forbidden_route_keys = {"ROUTE-TO-VCN-PROD-KEY", "ROUTE-TO-VCN-PREPROD-KEY"}
        forbidden_route_destinations = {"10.0.64.0/21", "10.0.128.0/21"}

        for drg_key, drg in drgs.items():
            drg_attachments = expect_key(
                drg, "drg_attachments", f"{label} drg {drg_key} attachments"
            )
            unexpected_attachments = set(drg_attachments) & forbidden_attachments
            self.assertFalse(
                unexpected_attachments,
                f"{label}: unexpected drg attachments {sorted(unexpected_attachments)}",
            )

            drg_distributions = expect_key(
                drg, "drg_route_distributions", f"{label} drg {drg_key} distributions"
            )
            unexpected_distributions = set(drg_distributions) & forbidden_route_keys
            self.assertFalse(
                unexpected_distributions,
                f"{label}: unexpected drg route distributions {sorted(unexpected_distributions)}",
            )

            for distribution_key, distribution in drg_distributions.items():
                statements = expect_key(
                    distribution,
                    "statements",
                    f"{label} drg {drg_key} distribution {distribution_key} statements",
                )
                for statement_key, statement in statements.items():
                    self.assertNotIn(
                        statement_key,
                        forbidden_route_keys,
                        f"{label}: unexpected statement key {statement_key}",
                    )
                    match_criteria = statement.get("match_criteria")
                    if isinstance(match_criteria, dict):
                        attachment_key = match_criteria.get("drg_attachment_key")
                        self.assertNotIn(
                            attachment_key,
                            forbidden_attachments,
                            f"{label}: unexpected drg attachment reference {attachment_key}",
                        )

        destinations = set(route_destinations(payload))
        unexpected_destinations = destinations & forbidden_route_destinations
        self.assertFalse(
            unexpected_destinations,
            f"{label}: unexpected spoke route destinations {sorted(unexpected_destinations)}",
        )

        backend_ips = l7_load_balancer_backend_ips(payload)
        self.assertIn("10.0.64.10", backend_ips, f"{label}: missing prod example backend1 ip")
        self.assertIn("10.0.64.20", backend_ips, f"{label}: missing prod example backend2 ip")

        if label.startswith("hub-a") or label.startswith("hub-b"):
            address_lists = network_firewall_address_lists(payload)
            prod = expect_key(address_lists, "NFW-FRA-LZ-ADDRLIST-PROD-KEY", label)
            preprod = expect_key(address_lists, "NFW-FRA-LZ-ADDRLIST-PREPROD-KEY", label)
            spokes = expect_key(address_lists, "NFW-FRA-LZ-ADDRLIST-SPOKES-KEY", label)
            self.assertEqual(prod.get("addresses"), ["10.0.64.0/21"], f"{label}: wrong prod example cidr")
            self.assertEqual(
                preprod.get("addresses"),
                ["10.0.128.0/21"],
                f"{label}: wrong preprod example cidr",
            )
            self.assertEqual(
                spokes.get("addresses"),
                ["10.0.64.0/21", "10.0.128.0/21"],
                f"{label}: wrong aggregate spokes example cidrs",
            )

    def assert_hub_model_addon_iam_is_shared_only(self, payload: dict, label: str) -> None:
        compartments = expect_key(payload, "compartments_configuration", label)
        root_compartments = expect_key(compartments, "compartments", f"{label} compartments")
        landing_zone = expect_key(root_compartments, "CMP-LANDINGZONE-KEY", f"{label} landing zone")
        children = expect_key(landing_zone, "children", f"{label} landing zone children")
        self.assertEqual(
            set(children.keys()),
            {"CMP-LZ-NETWORK-KEY", "CMP-LZ-PLATFORM-KEY", "CMP-LZ-SECURITY-KEY"},
            f"{label}: unexpected landing zone children",
        )

        groups = expect_key(
            expect_key(
                payload, "identity_domain_groups_configuration", f"{label} identity groups"
            ),
            "groups",
            f"{label} groups",
        )
        policies = expect_key(
            expect_key(payload, "policies_configuration", f"{label} policies configuration"),
            "supplied_policies",
            f"{label} supplied policies",
        )

        forbidden_env_markers = ("-PROD-", "-PREPROD-")
        self.assertFalse(
            any(marker in key for key in groups for marker in forbidden_env_markers),
            f"{label}: unexpected environment-scoped groups {sorted(key for key in groups if any(marker in key for marker in forbidden_env_markers))}",
        )
        self.assertFalse(
            any(marker in key for key in policies for marker in forbidden_env_markers),
            f"{label}: unexpected environment-scoped policies {sorted(key for key in policies if any(marker in key for marker in forbidden_env_markers))}",
        )

    def test_hub_model_addon_network_entrypoints_remain_hub_only(self) -> None:
        payloads = {
            "hub-a-pre": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_a/addon_network_hub_a_pre.jsonnet")
            ),
            "hub-a": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_a/addon_network_hub_a.jsonnet")
            ),
            "hub-b-pre": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_b/addon_network_hub_b_pre.jsonnet")
            ),
            "hub-b": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_b/addon_network_hub_b.jsonnet")
            ),
            "hub-c-pre": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_c/addon_network_hub_c_pre.jsonnet")
            ),
            "hub-c": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_c/addon_network_hub_c.jsonnet")
            ),
            "hub-c-backends": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_c/addon_network_hub_c_backends.jsonnet")
            ),
            "hub-e": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_e/addon_network_hub_e.jsonnet")
            ),
        }

        for label, payload in payloads.items():
            with self.subTest(case=label):
                self.assert_hub_model_addon_network_is_hub_only(payload, label)

    def test_hub_model_addon_iam_entrypoints_remain_shared_only(self) -> None:
        payloads = {
            "hub-a-iam": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_a/addon_iam.jsonnet")
            ),
            "hub-b-iam": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_b/addon_iam.jsonnet")
            ),
            "hub-c-iam": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_c/addon_iam.jsonnet")
            ),
            "hub-e-iam": render_jsonnet_object(
                Path("gen/addons/oci-hub-models/hub_e/addon_iam.jsonnet")
            ),
        }

        for label, payload in payloads.items():
            with self.subTest(case=label):
                self.assert_hub_model_addon_iam_is_shared_only(payload, label)

    def test_hub_c_addon_backends_entrypoint_preserves_pre_network_configuration(self) -> None:
        network_pre = render_jsonnet_object(
            Path("gen/addons/oci-hub-models/hub_c/addon_network_hub_c_pre.jsonnet")
        )
        network_backends = render_jsonnet_object(
            Path("gen/addons/oci-hub-models/hub_c/addon_network_hub_c_backends.jsonnet")
        )

        self.assertEqual(
            network_pre["network_configuration"],
            network_backends["network_configuration"],
            "hub-c-backends should only add NLB backend targets on top of the pre network configuration",
        )

    def test_oneoe_network_entrypoints_project_canonical_network_fields(self) -> None:
        expected_projections = {
            "oneoe_network_hub_a.jsonnet": ".network",
            "oneoe_network_hub_b.jsonnet": ".network",
            "oneoe_network_hub_c.jsonnet": ".network",
            "oneoe_network_hub_e.jsonnet": ".network",
            "oneoe_network_hub_a_pre.jsonnet": ".network_pre",
            "oneoe_network_hub_b_pre.jsonnet": ".network_pre",
            "oneoe_network_hub_c_pre.jsonnet": ".network_pre",
        }

        base = REPO_ROOT / "gen/blueprints/one-oe/runtime/one-stack"
        for file_name, projection in expected_projections.items():
            with self.subTest(file=file_name):
                contents = (base / file_name).read_text(encoding="utf-8")
                normalized = " ".join(contents.split())
                self.assertIn("local lz = import '../../../../landing_zone.libsonnet';", normalized)
                self.assertIn(projection, normalized)
                self.assertNotIn(".network_post", normalized)

    def test_generated_route_rules_use_rr_prefix(self) -> None:
        payloads = {
            "hub-a": render_jsonnet_object(
                Path("gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.jsonnet")
            ),
            "hub-e": render_jsonnet_object(
                Path("gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.jsonnet")
            ),
            "oke-single-stack": render_jsonnet_object(
                Path("gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet")
            ),
            "oke-multi-stack": render_jsonnet_object(
                Path("gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet")
            ),
        }

        for label, payload in payloads.items():
            with self.subTest(case=label):
                keys = list(route_rule_keys(payload))
                self.assertTrue(keys, f"{label}: expected route rules to be present")
                self.assertFalse(
                    any(key.startswith("rt-") for key in keys),
                    f"{label}: found route-rule keys with route-table prefix: {sorted(key for key in keys if key.startswith('rt-'))}",
                )
                self.assertTrue(
                    any(key.startswith("rr-") for key in keys),
                    f"{label}: expected rr-prefixed route-rule keys",
                )

    def assert_control_plane_route_destination(
        self, cp_route_rules: dict, route_key: str, expected_destination: str
    ) -> None:
        route = expect_key(
            cp_route_rules, route_key, "prod-platform-oke control plane route rules"
        )
        self.assertEqual(route.get("destination"), expected_destination)

    def assert_vcn_cni_policy(self, supplied_policies: dict) -> None:
        # The OKE VCN-CNI policy grants any-user tenancy-wide permissions and is
        # security-sensitive (privilege escalation risk). Verify the policy exists,
        # is scoped to TENANCY-ROOT (matching the documented intent), and that every
        # statement constrains the principal to OKE clusters.
        vcn_cni = expect_key(
            supplied_policies, "PCY-LZ-PROD-PLATFORM-OKE-VCN-CNI-KEY", "supplied policies"
        )
        self.assertEqual(vcn_cni.get("compartment_id"), "TENANCY-ROOT")
        statements = vcn_cni.get("statements")
        self.assertIsInstance(statements, list, "vcn-cni statements is not a list")
        self.assertGreater(len(statements), 0, "vcn-cni policy has no statements")
        for statement in statements:
            self.assertTrue(
                statement.startswith("allow any-user "),
                "vcn-cni statement must start with 'allow any-user': %s" % statement,
            )
            self.assertIn(
                "request.principal.type = 'cluster'",
                statement,
                "vcn-cni statement must constrain principal to clusters: %s" % statement,
            )

    def test_oke_singlestack_contract(self) -> None:
        network = render_jsonnet_object(
            Path("gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet")
        )
        identity = render_jsonnet_object(
            Path("gen/workload-extensions/oke/simple/single-stack/oke_identity.jsonnet")
        )
        clusters = render_jsonnet_object(
            Path("gen/workload-extensions/oke/simple/single-stack/oke_clusters.jsonnet")
        )
        workers = render_jsonnet_object(
            Path("gen/workload-extensions/oke/simple/single-stack/oke_workers.jsonnet")
        )

        network_configuration = expect_key(network, "network_configuration", "network")
        categories = expect_key(
            network_configuration, "network_configuration_categories", "network configuration"
        )
        self.assertEqual(
            set(categories.keys()), {"0-shared", "1-prod", "2-preprod", "prod-platform-oke"}
        )
        prod_platform_oke = expect_key(categories, "prod-platform-oke", "network categories")
        self.assertEqual(prod_platform_oke.get("category_compartment_id"), "CMP-LZ-PROD-NETWORK-KEY")
        vcns = expect_key(prod_platform_oke, "vcns", "prod-platform-oke")
        vcn = expect_key(vcns, "VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY", "prod-platform-oke vcns")
        oke_contract_validation.assert_numeric_icmp_values(
            vcn, "prod-platform-oke.VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY"
        )
        route_tables = expect_key(vcn, "route_tables", "prod-platform-oke vcn")
        cp_route_rules = expect_key(
            expect_key(route_tables, "RT-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY", "prod-platform-oke route tables"),
            "route_rules",
            "prod-platform-oke control plane route table",
        )
        self.assert_control_plane_route_destination(cp_route_rules, "rr-fra-hub", "10.0.0.0/21")
        self.assert_control_plane_route_destination(
            cp_route_rules, "rr-fra-prod-projects", "10.0.64.0/21"
        )
        self.assert_control_plane_route_destination(
            cp_route_rules, "rr-fra-preprod-projects", "10.0.128.0/21"
        )

        shared_category = expect_key(categories, "0-shared", "network categories")
        non_vcn = expect_key(shared_category, "non_vcn_specific_gateways", "shared network")
        drgs = expect_key(non_vcn, "dynamic_routing_gateways", "shared network")
        drg = expect_key(drgs, "DRG-FRA-LZ-HUB-KEY", "shared network drg")
        distributions = expect_key(drg, "drg_route_distributions", "shared network drg")
        hub_distribution = expect_key(
            distributions, "DRGRD-FRA-LZ-HUB-KEY", "shared network drg route distributions"
        )
        statements = expect_key(hub_distribution, "statements", "shared network drg distribution")
        self.assertEqual(expect_key(statements, "ROUTE-TO-VCN-PROD-KEY", "drg statements").get("priority"), 10)
        self.assertEqual(
            expect_key(statements, "ROUTE-TO-VCN-PREPROD-KEY", "drg statements").get("priority"), 20
        )
        self.assertEqual(
            expect_key(statements, "ROUTE-TO-VCN-PROD-PLATFORM-OKE-KEY", "drg statements").get(
                "priority"
            ),
            30,
        )

        groups_configuration = expect_key(
            identity, "identity_domain_groups_configuration", "identity groups"
        )
        groups = expect_key(groups_configuration, "groups", "identity groups")
        self.assertIn("GRP-LZ-PREPROD-PROJ1-ADMIN-KEY", groups)
        policies_configuration = expect_key(identity, "policies_configuration", "identity policies")
        supplied_policies = expect_key(policies_configuration, "supplied_policies", "identity policies")
        self.assertIn("PCY-LZ-PREPROD-PROJ1-ADMIN-KEY", supplied_policies)
        self.assert_vcn_cni_policy(supplied_policies)

        clusters_configuration = expect_key(clusters, "oke_clusters_configuration", "clusters")
        cluster_entries = expect_key(clusters_configuration, "clusters", "clusters")
        cluster = expect_key(
            cluster_entries, "OKE-CLUSTER-FRA-LZ-PROD-PLATFORM-OKE-KEY", "cluster entries"
        )
        self.assertEqual(cluster.get("name"), "oke-cluster-fra-lz-prod-platform-oke")
        cluster_networking = expect_key(cluster, "networking", "cluster networking")
        self.assertEqual(
            cluster_networking.get("api_endpoint_subnet_id"),
            "SN-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY",
        )

        workers_configuration = expect_key(workers, "oke_workers_configuration", "workers")
        node_pools = expect_key(workers_configuration, "node_pools", "workers node pools")
        node_pool = expect_key(
            node_pools, "NODEPOOL-FRA-LZ-PROD-PLATFORM-OKE-1-KEY", "workers node pools"
        )
        self.assertEqual(node_pool.get("name"), "nodepool-fra-lz-prod-platform-oke-1")
        node_pool_networking = expect_key(node_pool, "networking", "node pool networking")
        self.assertEqual(
            node_pool_networking.get("pods_subnet_id"), "SN-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY"
        )
        self.assertEqual(
            node_pool_networking.get("workers_subnet_id"),
            "SN-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY",
        )

    def test_oke_multistack_contract(self) -> None:
        network = render_jsonnet_object(
            Path("gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet")
        )
        identity = render_jsonnet_object(
            Path("gen/workload-extensions/oke/simple/multi-stack/oke_identity.jsonnet")
        )
        clusters = render_jsonnet_object(
            Path("gen/workload-extensions/oke/simple/multi-stack/oke_clusters.jsonnet")
        )
        workers = render_jsonnet_object(
            Path("gen/workload-extensions/oke/simple/multi-stack/oke_workers.jsonnet")
        )

        network_configuration = expect_key(network, "network_configuration", "network")
        categories = expect_key(
            network_configuration, "network_configuration_categories", "network configuration"
        )
        self.assertNotIn("oke", categories)
        prod_platform_oke = expect_key(categories, "prod-platform-oke", "network categories")
        oke_contract_validation.assert_numeric_icmp_values(prod_platform_oke, "prod-platform-oke")

        vcns = expect_key(prod_platform_oke, "vcns", "prod-platform-oke")
        self.assertEqual(
            set(vcns.keys()),
            {"VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY"},
        )
        vcn = expect_key(vcns, "VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY", "prod-platform-oke vcns")
        subnets = expect_key(vcn, "subnets", "prod-platform-oke vcn")
        self.assertEqual(
            set(subnets.keys()),
            {
                "SN-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY",
                "SN-FRA-LZ-PROD-PLATFORM-OKE-INT-LB-KEY",
                "SN-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY",
                "SN-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY",
            },
        )
        route_tables = expect_key(vcn, "route_tables", "prod-platform-oke vcn")
        self.assertEqual(
            set(route_tables.keys()),
            {
                "RT-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY",
                "RT-FRA-LZ-PROD-PLATFORM-OKE-INT-LB-KEY",
                "RT-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY",
                "RT-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY",
            },
        )
        cp_route_rules = expect_key(
            expect_key(route_tables, "RT-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY", "prod-platform-oke route tables"),
            "route_rules",
            "prod-platform-oke control plane route table",
        )
        self.assert_control_plane_route_destination(cp_route_rules, "rr-fra-hub", "10.0.0.0/21")
        self.assert_control_plane_route_destination(
            cp_route_rules, "rr-fra-prod-projects", "10.0.64.0/21"
        )
        self.assert_control_plane_route_destination(
            cp_route_rules, "rr-fra-preprod-projects", "10.0.128.0/21"
        )
        non_vcn = expect_key(
            prod_platform_oke, "non_vcn_specific_gateways", "prod-platform-oke"
        )
        injected_drgs = expect_key(
            non_vcn, "inject_into_existing_drgs", "prod-platform-oke non-vcn gateways"
        )
        injected_drg = expect_key(
            injected_drgs, "DRG-FRA-LZ-HUB-KEY", "prod-platform-oke injected DRGs"
        )
        self.assertEqual(injected_drg.get("drg_id"), "DRG-FRA-LZ-HUB-KEY")
        self.assertNotIn("drg_key", injected_drg)
        drg_attachments = expect_key(
            injected_drg, "drg_attachments", "prod-platform-oke injected DRG"
        )
        self.assertIn("DRGATT-FRA-LZ-PROD-PLATFORM-OKE-KEY", drg_attachments)

        groups_configuration = expect_key(identity, "groups_configuration", "identity groups")
        groups = expect_key(groups_configuration, "groups", "identity groups")
        for group_key in (
            "GRP-LZ-PROD-PLATFORM-OKE-ADMINS-KEY",
            "GRP-LZ-PROD-PLATFORM-OKE-RBAC-ADMIN-KEY",
            "GRP-LZ-PROD-PLATFORM-OKE-RBAC-VIEWER-KEY",
        ):
            self.assertIn(group_key, groups)

        policies_configuration = expect_key(identity, "policies_configuration", "identity")
        supplied_policies = expect_key(policies_configuration, "supplied_policies", "identity")
        admins = expect_key(
            supplied_policies, "PCY-LZ-PROD-PLATFORM-OKE-ADMINS-KEY", "supplied policies"
        )
        admin_statements = admins.get("statements")
        self.assertIsInstance(admin_statements, list, "admins statements is not a list")
        for statement in admin_statements:
            self.assertTrue(statement.startswith("allow group "), statement)

        rbac = expect_key(
            supplied_policies, "PCY-LZ-PROD-PLATFORM-OKE-RBAC-ROLE-KEY", "supplied policies"
        )
        rbac_statements = rbac.get("statements")
        self.assertIsInstance(rbac_statements, list, "rbac statements is not a list")
        for statement in rbac_statements:
            self.assertTrue(statement.startswith("allow group "), statement)

        self.assert_vcn_cni_policy(supplied_policies)

        clusters_configuration = expect_key(clusters, "oke_clusters_configuration", "clusters")
        cluster_entries = expect_key(clusters_configuration, "clusters", "clusters")
        self.assertEqual(
            set(cluster_entries.keys()), {"OKE-CLUSTER-FRA-LZ-PROD-PLATFORM-OKE-KEY"}
        )

        workers_configuration = expect_key(workers, "oke_workers_configuration", "workers")
        node_pools = expect_key(workers_configuration, "node_pools", "workers")
        self.assertEqual(set(node_pools.keys()), {"NODEPOOL-FRA-LZ-PROD-PLATFORM-OKE-1-KEY"})

        observability_files = sorted(
            (REPO_ROOT / "gen/workload-extensions/oke/simple/multi-stack").glob(
                "oke_observability_*.jsonnet"
            )
        )
        self.assertTrue(observability_files, "no OKE multistack observability entrypoints found")
        for observability_file in observability_files:
            with self.subTest(observability=observability_file.relative_to(REPO_ROOT).as_posix()):
                observability = render_jsonnet_object(observability_file.relative_to(REPO_ROOT))
                events_configuration = expect_key(observability, "events_configuration", "observability")
                event_rules = expect_key(events_configuration, "event_rules", "observability events")
                self.assertIn("RUL-LZ-PREPROD-NOTIFY-NETWORK-KEY", event_rules)
                self.assertIn("RUL-LZ-PREPROD-NOTIFY-SECURITY-KEY", event_rules)

                if observability_file.stem.endswith("_pre"):
                    continue

                logging_configuration = expect_key(
                    observability, "logging_configuration", "observability logging"
                )
                flow_logs = expect_key(logging_configuration, "flow_logs", "observability flow logs")
                self.assertIn("LOG-LZ-PREPROD-SUBNET-FLOW-KEY", flow_logs)
                self.assertIn("LOG-LZ-PREPROD-VCN-FLOW-KEY", flow_logs)
                log_groups = expect_key(logging_configuration, "log_groups", "observability log groups")
                self.assertIn("LGRP-LZ-PREPROD-VCN-FLOW-KEY", log_groups)

    def test_migrated_oke_kube_apiserver_cidr_ingress_is_private(self) -> None:
        rendered_cases = {
            "single-stack": render_jsonnet_object(
                Path("gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet")
            ),
            "multi-stack": render_jsonnet_object(
                Path("gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet")
            ),
        }

        for label, payload in rendered_cases.items():
            with self.subTest(case=label):
                rules = kube_apiserver_cidr_ingress_rules(payload)
                self.assertTrue(rules, f"{label}: expected kube-apiserver CIDR ingress rule")
                for rule in rules:
                    self.assertEqual(rule.get("src"), "10.0.0.0/8")
                    description = rule.get("description")
                    self.assertIsInstance(description, str)
                    self.assertNotIn("0.0.0.0/0", description)

    def test_root_cloud_guard_target_naming(self) -> None:
        cases = (
            Path("gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.jsonnet"),
            Path("gen/workload-extensions/oke/simple/single-stack/oke_security_cis1.jsonnet"),
        )
        for jsonnet_file in cases:
            with self.subTest(jsonnet=jsonnet_file.as_posix()):
                rendered = render_jsonnet_object(jsonnet_file)
                cloud_guard = expect_key(rendered, "cloud_guard_configuration", "cloud guard")
                targets = expect_key(cloud_guard, "targets", "cloud guard targets")
                self.assertIn("CG-TGT-ROOT-KEY", targets)
                self.assertNotIn("CG-TGT-LZ-ROOT-KEY", targets)
                root_target = expect_key(targets, "CG-TGT-ROOT-KEY", "cloud guard targets")
                self.assertEqual(root_target.get("name"), "cg-tgt-root")
                target_names = [target.get("name") for target in targets.values() if isinstance(target, dict)]
                self.assertNotIn("cg-tgt-lz-root", target_names)

    def test_host_ip_derivation_uses_non_zero_subnet_base(self) -> None:
        rendered = render_jsonnet_object(
            Path("tests/gen/testdata/direct/pass/non_zero_host_subnet_ips.jsonnet")
        )
        self.assertEqual(
            rendered,
            {
                "host10": "10.0.64.138",
                "host20": "10.0.64.148",
                "narrow_host20": "10.0.64.142",
                "bastion": "10.0.64.251/32",
                "nfw": "10.0.64.138",
                "narrow_bastion": "10.0.64.142/32",
                "narrow_nfw": "10.0.64.138",
            },
        )

    def test_iam_security_observability_governance_are_hub_invariant(self) -> None:
        # The one-stack security/observability/iam/governance entrypoints all hardcode
        # `profiles.hub_a.config` even though the chosen hub does not affect their output.
        # Lock in this invariance so a future change that accidentally couples one of these
        # builders to hub-specific config (e.g., reading config.hub.kind) is caught by tests
        # rather than silently changing only the hub_a-rendered outputs.
        snippet = """
local lz = import 'gen/landing_zone.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local kinds = ['hub_a', 'hub_b', 'hub_c', 'hub_e'];
local outputs = ['iam', 'governance', 'security_cis1', 'security_cis1_pre', 'security_cis2', 'security_cis2_pre', 'observability_cis1', 'observability_cis1_pre', 'observability_cis2', 'observability_cis2_pre'];
local baseline = lz(defaults.hub_a);
{
  [out]: {
    [k]: lz(defaults[k])[out] == baseline[out]
    for k in kinds
  }
  for out in outputs
}
"""
        rendered = json.loads(
            run_cmd(["jsonnet", "-J", str(REPO_ROOT), "-e", snippet]).stdout
        )
        for output_name, hub_results in rendered.items():
            for hub_kind, equal in hub_results.items():
                self.assertTrue(
                    equal,
                    f"{output_name} differs between hub_a and {hub_kind} — "
                    "shared output is no longer hub-invariant",
                )

    def test_auto_subnets_rollover_increments_across_octet_boundary(self) -> None:
        fixture_path = (
            REPO_ROOT / Path("tests/gen/testdata/direct/pass/auto_subnets_octet_rollover.jsonnet")
        )
        rendered = json.loads(
            run_cmd(["jsonnet", "-J", str(REPO_ROOT), str(fixture_path)]).stdout
        )
        self.assertEqual(
            rendered,
            {
                "a": "10.0.252.0/24",
                "b": "10.0.253.0/24",
                "c": "10.0.254.0/24",
                "d": "10.0.255.0/24",
                "e": "10.1.0.0/24",
                "f": "10.1.1.0/24",
                "g": "10.1.2.0/24",
                "h": "10.1.3.0/24",
            },
        )


if __name__ == "__main__":
            unittest.main()
