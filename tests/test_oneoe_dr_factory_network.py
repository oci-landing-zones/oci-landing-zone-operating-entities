from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


ADDON_ROOT = REPO_ROOT / "addons/oci-lz-dr/one-oe"
ADDON_DIR = ADDON_ROOT / "runtime"
QUESTION = "Do you want to deploy a Disaster Recovery (DR) region?"
ENTRYPOINTS = {
    "oneoe_bcdr_network_hub_a_pre.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_a_pre.jsonnet",
    "oneoe_bcdr_network_hub_a.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_a.jsonnet",
    "oneoe_bcdr_network_hub_b_pre.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_b_pre.jsonnet",
    "oneoe_bcdr_network_hub_b.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_b.jsonnet",
    "oneoe_bcdr_network_hub_c_pre.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_pre.jsonnet",
    "oneoe_bcdr_network_hub_c_backends.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_backends.jsonnet",
    "oneoe_bcdr_network_hub_c.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c.jsonnet",
    "oneoe_bcdr_network_hub_e.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_e.jsonnet",
}
REQUESTER_ENTRYPOINTS = {
    "oneoe_bcdr_network_hub_a_requester.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_a_requester.jsonnet",
    "oneoe_bcdr_network_hub_b_requester.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_b_requester.jsonnet",
    "oneoe_bcdr_network_hub_c_requester.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_requester.jsonnet",
    "oneoe_bcdr_network_hub_c_backends_requester.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_backends_requester.jsonnet",
    "oneoe_bcdr_network_hub_e_requester.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_e_requester.jsonnet",
}
REQUESTER_BASE_ENTRYPOINTS = {
    "oneoe_bcdr_network_hub_a_requester.json": ENTRYPOINTS["oneoe_bcdr_network_hub_a.json"],
    "oneoe_bcdr_network_hub_b_requester.json": ENTRYPOINTS["oneoe_bcdr_network_hub_b.json"],
    "oneoe_bcdr_network_hub_c_requester.json": ENTRYPOINTS["oneoe_bcdr_network_hub_c.json"],
    "oneoe_bcdr_network_hub_c_backends_requester.json": ENTRYPOINTS[
        "oneoe_bcdr_network_hub_c_backends.json"
    ],
    "oneoe_bcdr_network_hub_e_requester.json": ENTRYPOINTS["oneoe_bcdr_network_hub_e.json"],
}
ACCEPTOR_ENTRYPOINTS = {
    "oneoe_network_hub_a_acceptor.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_a_acceptor.jsonnet",
    "oneoe_network_hub_b_acceptor.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_b_acceptor.jsonnet",
    "oneoe_network_hub_c_acceptor.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_c_acceptor.jsonnet",
    "oneoe_network_hub_c_backends_acceptor.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_c_backends_acceptor.jsonnet",
    "oneoe_network_hub_e_acceptor.json": "gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_e_acceptor.jsonnet",
}
ACCEPTOR_BASE_ENTRYPOINTS = {
    "oneoe_network_hub_a_acceptor.json": "gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.jsonnet",
    "oneoe_network_hub_b_acceptor.json": "gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_b.jsonnet",
    "oneoe_network_hub_c_acceptor.json": "gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_c.jsonnet",
    "oneoe_network_hub_c_backends_acceptor.json": "gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_c_backends.jsonnet",
    "oneoe_network_hub_e_acceptor.json": "gen/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.jsonnet",
}


def drg(network: dict) -> dict:
    return network["network_configuration"]["network_configuration_categories"]["0-shared"][
        "non_vcn_specific_gateways"
    ]["dynamic_routing_gateways"]["DRG-AMS-LZ-HUB-KEY"]


def fra_drg(network: dict) -> dict:
    return network["network_configuration"]["network_configuration_categories"]["0-shared"][
        "non_vcn_specific_gateways"
    ]["dynamic_routing_gateways"]["DRG-FRA-LZ-HUB-KEY"]


class OneOeDrFactoryNetworkTests(unittest.TestCase):
    def test_published_network_snapshots_match_dr_jsonnet_entrypoints(self) -> None:
        for snapshot_name, entrypoint_name in ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                entrypoint = REPO_ROOT / entrypoint_name
                snapshot = ADDON_DIR / snapshot_name
                self.assertTrue(entrypoint.is_file(), f"Missing DR Jsonnet entrypoint: {entrypoint}")
                self.assertTrue(snapshot.is_file(), f"Missing generated DR snapshot: {snapshot}")
                self.assertFalse((ADDON_ROOT / snapshot_name).is_file())
                self.assertEqual(
                    render_jsonnet_object(Path(entrypoint_name)),
                    json.loads(snapshot.read_text(encoding="utf-8")),
                )

    def test_dr_network_contains_only_ams_hub_and_prod_vcns(self) -> None:
        network = render_jsonnet_object(Path(ENTRYPOINTS["oneoe_bcdr_network_hub_e.json"]))
        categories = network["network_configuration"]["network_configuration_categories"]

        self.assertEqual({"0-shared", "1-prod"}, set(categories))
        self.assertNotIn("2-preprod", categories)
        self.assertEqual(
            "10.0.192.0/21",
            categories["0-shared"]["vcns"]["VCN-AMS-LZ-HUB-KEY"]["cidr_blocks"][0],
        )
        self.assertEqual(
            "10.0.200.0/21",
            categories["1-prod"]["vcns"]["VCN-AMS-LZ-PROD-PROJECTS-KEY"]["cidr_blocks"][0],
        )

    def test_published_requester_snapshots_match_jsonnet_entrypoints(self) -> None:
        for snapshot_name, entrypoint_name in REQUESTER_ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                snapshot = ADDON_DIR / snapshot_name
                self.assertTrue((REPO_ROOT / entrypoint_name).is_file())
                self.assertTrue(snapshot.is_file())
                self.assertFalse((ADDON_ROOT / snapshot_name).is_file())
                self.assertEqual(
                    render_jsonnet_object(Path(entrypoint_name)),
                    json.loads(snapshot.read_text(encoding="utf-8")),
                )

    def test_published_acceptor_snapshots_match_jsonnet_entrypoints(self) -> None:
        for snapshot_name, entrypoint_name in ACCEPTOR_ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                snapshot = ADDON_DIR / snapshot_name
                self.assertTrue((REPO_ROOT / entrypoint_name).is_file())
                self.assertTrue(snapshot.is_file())
                self.assertFalse((ADDON_ROOT / snapshot_name).is_file())
                self.assertEqual(
                    render_jsonnet_object(Path(entrypoint_name)),
                    json.loads(snapshot.read_text(encoding="utf-8")),
                )

    def test_acceptor_artifacts_preserve_their_final_oneoe_network(self) -> None:
        for snapshot_name, entrypoint_name in ACCEPTOR_ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                base = render_jsonnet_object(Path(ACCEPTOR_BASE_ENTRYPOINTS[snapshot_name]))
                acceptor = render_jsonnet_object(Path(entrypoint_name))
                self.assertTrue(
                    set(fra_drg(base)["drg_attachments"]) <= set(fra_drg(acceptor)["drg_attachments"])
                )
                for key, distribution in fra_drg(base)["drg_route_distributions"].items():
                    acceptor_statements = fra_drg(acceptor)["drg_route_distributions"][key][
                        "statements"
                    ]
                    for statement_key, statement in distribution["statements"].items():
                        self.assertEqual(statement, acceptor_statements[statement_key])
                for key, route_table in fra_drg(base)["drg_route_tables"].items():
                    acceptor_rules = fra_drg(acceptor)["drg_route_tables"][key]["route_rules"]
                    for rule_key, rule in route_table["route_rules"].items():
                        self.assertEqual(rule, acceptor_rules[rule_key])

    def test_acceptors_add_the_fra_dr_rpc_for_prod_dr(self) -> None:
        for entrypoint_name in ACCEPTOR_ENTRYPOINTS.values():
            with self.subTest(entrypoint=entrypoint_name):
                acceptor_drg = fra_drg(render_jsonnet_object(Path(entrypoint_name)))
                rpc = acceptor_drg["remote_peering_connections"]["RPC-FRA-LZ-HUB-DR-KEY"]
                self.assertEqual("eu-amsterdam-1", rpc["peer_region_name"])
                self.assertNotIn("peer_key", rpc)
                self.assertIn("DRGATT-FRA-LZ-HUB-RPC-DR-KEY", acceptor_drg["drg_attachments"])
                self.assertIn("DRGRD-FRA-LZ-RPC-DR-KEY", acceptor_drg["drg_route_distributions"])
                self.assertIn("DRGRT-FRA-LZ-RPC-DR-KEY", acceptor_drg["drg_route_tables"])

    def test_hub_e_acceptor_routes_ams_prod_directly_to_the_drg(self) -> None:
        network = render_jsonnet_object(
            Path(ACCEPTOR_ENTRYPOINTS["oneoe_network_hub_e_acceptor.json"])
        )
        categories = network["network_configuration"]["network_configuration_categories"]
        for route_table in (
            categories["0-shared"]["vcns"]["VCN-FRA-LZ-HUB-KEY"]["route_tables"][
                "RT-FRA-LZ-HUB-LB-KEY"
            ],
            categories["0-shared"]["vcns"]["VCN-FRA-LZ-HUB-KEY"]["route_tables"][
                "RT-FRA-LZ-HUB-MGMT-KEY"
            ],
            categories["1-prod"]["vcns"]["VCN-FRA-LZ-PROD-PROJECTS-KEY"]["route_tables"][
                "RT-FRA-LZ-PROD-PROJ-GENERIC-KEY"
            ],
        ):
            route = route_table["route_rules"]["rr-fra-rpc-dr-1"]
            self.assertEqual("10.0.200.0/21", route["destination"])
            self.assertEqual("DRG-FRA-LZ-HUB-KEY", route["network_entity_key"])

    def test_firewall_acceptors_route_only_prod_through_the_hub(self) -> None:
        acceptor_route_tables = {
            "oneoe_network_hub_a_acceptor.json": "RT-FRA-LZ-HUB-FW-INT-KEY",
            "oneoe_network_hub_b_acceptor.json": "RT-FRA-LZ-HUB-FW-KEY",
            "oneoe_network_hub_c_acceptor.json": "RT-FRA-LZ-HUB-TRUST-KEY",
            "oneoe_network_hub_c_backends_acceptor.json": "RT-FRA-LZ-HUB-TRUST-KEY",
        }
        for snapshot_name, route_table_key in acceptor_route_tables.items():
            with self.subTest(snapshot=snapshot_name):
                network = render_jsonnet_object(Path(ACCEPTOR_ENTRYPOINTS[snapshot_name]))
                acceptor_drg = fra_drg(network)
                rpc_route_table = acceptor_drg["drg_route_tables"][
                    "DRGRT-FRA-LZ-RPC-DR-KEY"
                ]
                rpc_distribution = acceptor_drg["drg_route_distributions"][
                    "DRGRD-FRA-LZ-RPC-DR-KEY"
                ]
                static_route = rpc_route_table["route_rules"][
                    "DRGRT-FRA-LZ-RPC-DR-PROD-STATIC-ROUTE"
                ]
                self.assertEqual("10.0.64.0/21", static_route["destination"])
                self.assertEqual(
                    "DRGATT-FRA-LZ-HUB-VCN-KEY",
                    static_route["next_hop_drg_attachment_key"],
                )
                self.assertFalse(rpc_distribution["statements"])
                route = network["network_configuration"]["network_configuration_categories"]["0-shared"][
                    "vcns"
                ]["VCN-FRA-LZ-HUB-KEY"]["route_tables"][route_table_key]["route_rules"][
                    "rr-fra-rpc-dr-1"
                ]
                self.assertEqual("10.0.200.0/21", route["destination"])
                self.assertEqual("DRG-FRA-LZ-HUB-KEY", route["network_entity_key"])

    def test_requester_artifacts_preserve_their_final_network(self) -> None:
        for snapshot_name, entrypoint_name in REQUESTER_ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                base = render_jsonnet_object(Path(REQUESTER_BASE_ENTRYPOINTS[snapshot_name]))
                requester = render_jsonnet_object(Path(entrypoint_name))
                self.assertTrue(set(drg(base)["drg_attachments"]) <= set(drg(requester)["drg_attachments"]))
                self.assertTrue(
                    set(drg(base)["drg_route_distributions"])
                    <= set(drg(requester)["drg_route_distributions"])
                )
                self.assertTrue(set(drg(base)["drg_route_tables"]) <= set(drg(requester)["drg_route_tables"]))
                for key, distribution in drg(base)["drg_route_distributions"].items():
                    requester_statements = drg(requester)["drg_route_distributions"][key][
                        "statements"
                    ]
                    for statement_key, statement in distribution["statements"].items():
                        self.assertEqual(statement, requester_statements[statement_key])
                for key, route_table in drg(base)["drg_route_tables"].items():
                    requester_rules = drg(requester)["drg_route_tables"][key]["route_rules"]
                    for rule_key, rule in route_table["route_rules"].items():
                        self.assertEqual(rule, requester_rules[rule_key])

    def test_requester_artifacts_add_the_ams_to_fra_rpc(self) -> None:
        for entrypoint_name in REQUESTER_ENTRYPOINTS.values():
            with self.subTest(entrypoint=entrypoint_name):
                requester_drg = drg(render_jsonnet_object(Path(entrypoint_name)))
                self.assertEqual(
                    "RPC-FRA-LZ-HUB-DR-KEY",
                    requester_drg["remote_peering_connections"]["RPC-AMS-LZ-HUB-REGION-A-KEY"][
                        "peer_key"
                    ],
                )
                self.assertEqual(
                    "eu-frankfurt-1",
                    requester_drg["remote_peering_connections"]["RPC-AMS-LZ-HUB-REGION-A-KEY"][
                        "peer_region_name"
                    ],
                )
                self.assertIn("DRGATT-AMS-LZ-HUB-RPC-REGION-A-KEY", requester_drg["drg_attachments"])
                self.assertIn("DRGRD-AMS-LZ-RPC-REGION-A-KEY", requester_drg["drg_route_distributions"])
                self.assertIn("DRGRT-AMS-LZ-RPC-REGION-A-KEY", requester_drg["drg_route_tables"])

    def test_hub_e_requester_routes_frankfurt_directly_to_the_drg(self) -> None:
        network = render_jsonnet_object(
            Path(REQUESTER_ENTRYPOINTS["oneoe_bcdr_network_hub_e_requester.json"])
        )
        categories = network["network_configuration"]["network_configuration_categories"]
        for route_table in (
            categories["0-shared"]["vcns"]["VCN-AMS-LZ-HUB-KEY"]["route_tables"][
                "RT-AMS-LZ-HUB-LB-KEY"
            ],
            categories["0-shared"]["vcns"]["VCN-AMS-LZ-HUB-KEY"]["route_tables"][
                "RT-AMS-LZ-HUB-MGMT-KEY"
            ],
            categories["1-prod"]["vcns"]["VCN-AMS-LZ-PROD-PROJECTS-KEY"]["route_tables"][
                "RT-AMS-LZ-PROD-PROJ-GENERIC-KEY"
            ],
        ):
            route = route_table["route_rules"]["rr-ams-rpc-region-a-1"]
            self.assertEqual("10.0.0.0/16", route["destination"])
            self.assertEqual("DRG-AMS-LZ-HUB-KEY", route["network_entity_key"])

    def test_firewall_requesters_route_only_prod_back_to_the_hub(self) -> None:
        requester_route_tables = {
            "oneoe_bcdr_network_hub_a_requester.json": "RT-AMS-LZ-HUB-FW-INT-KEY",
            "oneoe_bcdr_network_hub_b_requester.json": "RT-AMS-LZ-HUB-FW-KEY",
            "oneoe_bcdr_network_hub_c_requester.json": "RT-AMS-LZ-HUB-TRUST-KEY",
            "oneoe_bcdr_network_hub_c_backends_requester.json": "RT-AMS-LZ-HUB-TRUST-KEY",
        }
        for snapshot_name, route_table_key in requester_route_tables.items():
            with self.subTest(snapshot=snapshot_name):
                network = render_jsonnet_object(Path(REQUESTER_ENTRYPOINTS[snapshot_name]))
                requester_drg = drg(network)
                rpc_route_table = requester_drg["drg_route_tables"][
                    "DRGRT-AMS-LZ-RPC-REGION-A-KEY"
                ]
                rpc_distribution = requester_drg["drg_route_distributions"][
                    "DRGRD-AMS-LZ-RPC-REGION-A-KEY"
                ]
                self.assertEqual(
                    "DRGATT-AMS-LZ-HUB-VCN-KEY",
                    rpc_route_table["route_rules"][
                        "DRGRT-AMS-LZ-RPC-REGION-A-PROD-STATIC-ROUTE"
                    ]["next_hop_drg_attachment_key"],
                )
                self.assertFalse(rpc_distribution["statements"])
                self.assertNotIn("DRGATT-AMS-LZ-PROD-PROJ-KEY", rpc_distribution["statements"])
                route = network["network_configuration"]["network_configuration_categories"]["0-shared"][
                    "vcns"
                ]["VCN-AMS-LZ-HUB-KEY"]["route_tables"][route_table_key]["route_rules"][
                    "rr-ams-rpc-region-a-1"
                ]
                self.assertEqual("10.0.0.0/16", route["destination"])
                self.assertEqual("DRG-AMS-LZ-HUB-KEY", route["network_entity_key"])

    def test_guided_factory_question_follows_the_oneoe_baseline(self) -> None:
        root_guidance = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        factory_readme = (REPO_ROOT / "addons/oci-lz-blueprint-factory/README.md").read_text(
            encoding="utf-8"
        )
        ai_readme = (REPO_ROOT / "addons/oci-lz-ai-agent/README.md").read_text(encoding="utf-8")
        skill = (
            REPO_ROOT / ".agents/skills/landing-zone-customer-guidance/SKILL.md"
        ).read_text(encoding="utf-8")

        self.assertIn(QUESTION, root_guidance)
        self.assertLess(
            root_guidance.index("1. **Landing zone baseline**"),
            root_guidance.index(QUESTION),
        )
        self.assertLess(root_guidance.index(QUESTION), root_guidance.index("**Region and realm**"))
        for content in (root_guidance, factory_readme, ai_readme, skill):
            self.assertIn(QUESTION, content)
            self.assertIn("eu-amsterdam-1", content)
            self.assertIn("10.0.192.0/21", content)
            self.assertIn("10.0.200.0/21", content)


if __name__ == "__main__":
    unittest.main()
