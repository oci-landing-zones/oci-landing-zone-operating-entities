from pathlib import Path
import unittest

from tests.gen.helpers import render_config_outputs


class GeneratorConfigPassCases(unittest.TestCase):
    def assert_single_stage_network_output(self, outputs: dict) -> dict:
        self.assertIn("network.json", outputs)
        self.assertNotIn("network_pre.json", outputs)
        self.assertNotIn("network_post.json", outputs)
        return outputs["network.json"]

    def assert_staged_network_outputs(self, outputs: dict) -> tuple[dict, dict]:
        self.assertIn("network_pre.json", outputs)
        self.assertIn("network.json", outputs)
        self.assertNotIn("network_post.json", outputs)
        return outputs["network_pre.json"], outputs["network.json"]

    def assert_shared_platform_oke(self, outputs: dict) -> None:
        self.assertIn("iam.json", outputs)
        network = self.assert_single_stage_network_output(outputs)

        iam = outputs["iam.json"]
        landingzone_children = iam["compartments_configuration"]["compartments"]["CMP-LANDINGZONE-KEY"]["children"]
        self.assertIn("CMP-LZ-PLATFORM-KEY", landingzone_children)
        platform_children = landingzone_children["CMP-LZ-PLATFORM-KEY"]["children"]
        self.assertIn("CMP-LZ-SHARED-PLATFORM-OKE-KEY", platform_children)
        self.assertEqual(platform_children["CMP-LZ-SHARED-PLATFORM-OKE-KEY"]["name"], "cmp-lz-platform-oke")
        self.assertEqual(
            platform_children["CMP-LZ-SHARED-PLATFORM-OKE-KEY"]["description"],
            "Shared Platform Oke Compartment",
        )

        policy_text = "\n".join(
            iam["policies_configuration"]["supplied_policies"]["PCY-LZ-SHARED-PLATFORM-OKE-ADMINS-KEY"]["statements"]
        )
        self.assertIn("cmp-landingzone:cmp-lz-platform:cmp-lz-platform-oke", policy_text)
        self.assertNotIn("cmp-landingzone:cmp-lz-shared", policy_text)

        categories = network["network_configuration"]["network_configuration_categories"]
        self.assertIn("shared-platform-oke", categories)
        self.assertEqual(categories["shared-platform-oke"]["category_compartment_id"], "CMP-LZ-NETWORK-KEY")

    def assert_default_region_outputs(self, outputs: dict) -> None:
        network = self.assert_single_stage_network_output(outputs)
        self.assertIn("security_cis1.json", outputs)
        categories = network["network_configuration"]["network_configuration_categories"]
        drgs = categories["0-shared"]["non_vcn_specific_gateways"]["dynamic_routing_gateways"]
        self.assertIn("DRG-FRA-LZ-HUB-KEY", drgs)

        prod_projects_vcn = categories["1-prod"]["vcns"]["VCN-FRA-LZ-PROD-PROJECTS-KEY"]
        prod_projects_routes = prod_projects_vcn["route_tables"]["RT-FRA-LZ-PROD-PROJ-GENERIC-KEY"]["route_rules"]
        self.assertIn("rr-fra-hub", prod_projects_routes)
        self.assertEqual(prod_projects_routes["rr-fra-hub"]["destination"], "10.0.0.0/21")
        self.assertIn("rr-fra-natgw", prod_projects_routes)
        self.assertEqual(prod_projects_routes["rr-fra-natgw"]["destination"], "0.0.0.0/0")
        self.assertNotIn("rr-fra-drg", prod_projects_routes)

        nat_gateways = prod_projects_vcn["vcn_specific_gateways"]["nat_gateways"]
        self.assertIn("NGW-FRA-LZ-PROD-PROJ-KEY", nat_gateways)

        self.assertEqual(
            outputs["security_cis1.json"]["cloud_guard_configuration"]["reporting_region"],
            "eu-frankfurt-1",
        )

    def assert_nonprod_outputs(self, outputs: dict) -> None:
        self.assertIn("security_cis1.json", outputs)
        security_zone_keys = set(outputs["security_cis1.json"]["security_zones_configuration"]["security_zones"].keys())
        self.assertNotIn("SZ-TGT-LZ-PREPROD-ENVIRONMENT-NETWORK-KEY", security_zone_keys)
        self.assertNotIn("SZ-TGT-LZ-PREPROD-PROJ1-KEY", security_zone_keys)
        self.assertNotIn("SZ-TGT-LZ-PREPROD-PLATFORM-OKE-KEY", security_zone_keys)

    def assert_plain_platform_network_compartment(
        self, outputs: dict, category_key: str, expected_compartment: str
    ) -> None:
        network = self.assert_single_stage_network_output(outputs)
        categories = network["network_configuration"]["network_configuration_categories"]
        self.assertIn(category_key, categories)
        self.assertEqual(categories[category_key]["category_compartment_id"], expected_compartment)

    def assert_prod_plain_platform(self, outputs: dict) -> None:
        self.assert_plain_platform_network_compartment(
            outputs,
            "2-prod-platform-data",
            "CMP-LZ-PROD-NETWORK-KEY",
        )

    def assert_shared_plain_platform(self, outputs: dict) -> None:
        self.assert_plain_platform_network_compartment(
            outputs,
            "2-shared-platform-data",
            "CMP-LZ-NETWORK-KEY",
        )

    def assert_prod_preprod_hub_a(self, outputs: dict) -> None:
        network_pre, network = self.assert_staged_network_outputs(outputs)
        categories = network_pre["network_configuration"]["network_configuration_categories"]
        self.assertIn("1-prod", categories)
        self.assertIn("2-preprod", categories)
        self.assertNotIn("1-preprod", categories)
        self.assertNotIn("2-prod", categories)
        self.assertEqual(categories["1-prod"]["category_compartment_id"], "CMP-LZ-PROD-NETWORK-KEY")
        self.assertEqual(categories["2-preprod"]["category_compartment_id"], "CMP-LZ-PREPROD-NETWORK-KEY")

        load_balancer = categories["0-shared"]["non_vcn_specific_gateways"]["l7_load_balancers"]["LB-FRA-LZ-PROD-01-KEY"]
        backend_sets = load_balancer["backend_sets"]
        self.assertEqual(
            backend_sets["LBBKST-FRA-LZ-PROD-01-KEY"]["backends"]["LBBE-FRA-LZ-PROD-01-KEY"]["ip_address"],
            "10.0.64.10",
        )
        self.assertEqual(
            backend_sets["LBBKST-FRA-LZ-PROD-02-KEY"]["backends"]["LBBE-FRA-LZ-PROD-02-KEY"]["ip_address"],
            "10.0.64.20",
        )

        statements = (
            categories["0-shared"]["non_vcn_specific_gateways"]["dynamic_routing_gateways"]["DRG-FRA-LZ-HUB-KEY"][
                "drg_route_distributions"
            ]["DRGRD-FRA-LZ-HUB-KEY"]["statements"]
        )
        self.assertEqual(statements["ROUTE-TO-VCN-PROD-KEY"]["priority"], 10)
        self.assertEqual(statements["ROUTE-TO-VCN-PREPROD-KEY"]["priority"], 20)
        self.assertEqual(statements["ROUTE-TO-VCN-PROD-PLATFORM-OKE-KEY"]["priority"], 30)
        self.assertEqual(statements["ROUTE-TO-VCN-PREPROD-PLATFORM-OKE-KEY"]["priority"], 40)

        self.assertEqual(
            statements["ROUTE-TO-VCN-PROD-KEY"]["match_criteria"]["drg_attachment_key"],
            "DRGATT-FRA-LZ-PROD-PROJ-KEY",
        )
        self.assertEqual(
            statements["ROUTE-TO-VCN-PREPROD-KEY"]["match_criteria"]["drg_attachment_key"],
            "DRGATT-FRA-LZ-PREPROD-PROJ-KEY",
        )
        self.assertEqual(
            statements["ROUTE-TO-VCN-PROD-PLATFORM-OKE-KEY"]["match_criteria"]["drg_attachment_key"],
            "DRGATT-FRA-LZ-PROD-PLATFORM-OKE-KEY",
        )
        self.assertEqual(
            statements["ROUTE-TO-VCN-PREPROD-PLATFORM-OKE-KEY"]["match_criteria"]["drg_attachment_key"],
            "DRGATT-FRA-LZ-PREPROD-PLATFORM-OKE-KEY",
        )

        final_categories = network["network_configuration"]["network_configuration_categories"]
        self.assertIn("0-shared", final_categories)

    def assert_null_realm_defaults(self, outputs: dict) -> None:
        self.assert_default_region_outputs(outputs)
        self.assertIn("iam.json", outputs)
        supplied_policies = outputs["iam.json"]["policies_configuration"]["supplied_policies"]
        self.assertIn("PCY-LZ-NETWORK-ADMIN-KEY", supplied_policies)

    def assert_mixed_platform_types(self, outputs: dict) -> None:
        network = self.assert_single_stage_network_output(outputs)
        categories = network["network_configuration"]["network_configuration_categories"]
        self.assertEqual(
            list(categories.keys()),
            ["0-shared", "1-prod", "2-prod-platform-data", "prod-platform-oke"],
        )

    def assert_disjoint_hub_route_oke(self, outputs: dict) -> None:
        network = self.assert_single_stage_network_output(outputs)
        categories = network["network_configuration"]["network_configuration_categories"]
        route_rules = categories["prod-platform-oke"]["vcns"]["VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY"][
            "route_tables"
        ]["RT-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY"]["route_rules"]
        self.assertEqual(route_rules["rr-fra-hub"]["destination"], "10.0.0.0/21")
        self.assertEqual(route_rules["rr-fra-prod-projects"]["destination"], "10.1.64.0/21")
        self.assertEqual(route_rules["rr-fra-preprod-projects"]["destination"], "10.3.64.0/21")

    def test_pass_cases(self) -> None:
        cases = [
            ("disjoint_hub_route_oke.jsonnet", self.assert_disjoint_hub_route_oke),
            ("default_region_defaults.jsonnet", self.assert_default_region_outputs),
            ("mixed_platform_types.jsonnet", self.assert_mixed_platform_types),
            ("null_realm_defaults.jsonnet", self.assert_null_realm_defaults),
            ("null_region_defaults.jsonnet", self.assert_default_region_outputs),
            ("preprod_oke.jsonnet", self.assert_nonprod_outputs),
            ("prod_oke.jsonnet", self.assert_default_region_outputs),
            ("prod_plain_platform.jsonnet", self.assert_prod_plain_platform),
            ("prod_preprod_hub_a.jsonnet", self.assert_prod_preprod_hub_a),
            ("shared_platform_oke.jsonnet", self.assert_shared_platform_oke),
            ("shared_platform_plain.jsonnet", self.assert_shared_plain_platform),
            ("unordered_envs_oke.jsonnet", self.assert_default_region_outputs),
        ]
        pass_dir = Path(__file__).resolve().parent / "testdata" / "configs" / "pass"
        expected_fixtures = {fixture_name for fixture_name, _ in cases}
        discovered_fixtures = {path.name for path in pass_dir.glob("*.jsonnet")}
        self.assertSetEqual(
            discovered_fixtures,
            expected_fixtures,
            "pass fixture set drifted from test_pass_cases coverage",
        )
        for fixture_name, assert_case in cases:
            with self.subTest(fixture=fixture_name):
                outputs = render_config_outputs(pass_dir / fixture_name)
                assert_case(outputs)


if __name__ == "__main__":
    unittest.main()
