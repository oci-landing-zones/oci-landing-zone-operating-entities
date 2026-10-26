"""Static role-boundary checks; live OCI authorization tests are still required."""

import json
from pathlib import Path
import re
import unittest


CONFIG_DIR = Path(__file__).resolve().parents[1]
FINOPS = "compartment cmp-landingzone:cmp-lz-platform:cmp-finops"
NETWORK = "compartment cmp-landingzone:cmp-lz-network"
GROUPS = {"grp-lz-finops-db-admins", "grp-lz-finops-oac-admins"}
STATEMENT = re.compile(
    r"Allow group (?P<principal>\S+) to (?P<verb>inspect|read|use|manage) "
    r"(?P<resource>[\w-]+) in (?P<scope>.*?)(?: where (?P<condition>.*))?$",
    re.IGNORECASE,
)


class FinOpsIamBoundaries(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.grants = []
        for path in CONFIG_DIR.glob("*.json"):
            config = json.loads(path.read_text())
            policies = config.get("policies_configuration", {}).get("supplied_policies", {})
            for policy in policies.values():
                for statement in policy["statements"]:
                    if not statement.lower().startswith("allow group "):
                        continue
                    match = STATEMENT.fullmatch(statement)
                    if match is None:
                        raise AssertionError(f"Unrecognized group policy: {statement}")
                    grant = match.groupdict()
                    grant["group"] = grant.pop("principal").split("/")[-1].strip("'")
                    cls.grants.append(grant)

    def test_only_db_and_oac_admin_groups_are_defined_and_referenced(self):
        config = json.loads((CONFIG_DIR / "finops_iam.json").read_text())
        groups = config["identity_domain_groups_configuration"]["groups"]
        self.assertEqual({group["name"] for group in groups.values()}, GROUPS)
        for grant in self.grants:
            with self.subTest(grant=grant):
                self.assertIn(grant["group"], GROUPS)

    def test_bastion_permissions_stay_in_finops(self):
        for grant in self.grants:
            if grant["resource"].startswith("bastion"):
                with self.subTest(grant=grant):
                    self.assertEqual(grant["scope"], FINOPS)
                    # The aggregate would bypass the separate session restriction.
                    self.assertNotEqual(grant["resource"], "bastion-family")
                    if grant["resource"] == "bastion":
                        self.assertEqual(grant["verb"], "use")

    def test_sessions_require_finops_destination_and_port_forwarding(self):
        network = json.loads((CONFIG_DIR / "finops_network.json").read_text())
        categories = network["network_configuration"]["network_configuration_categories"]
        vcns = [vcn for category in categories.values() for vcn in category.get("vcns", {}).values()]
        self.assertEqual(len(vcns), 1)
        cidrs = ", ".join(f"'{cidr}'" for cidr in vcns[0]["cidr_blocks"])
        expected = (
            "ALL {target.bastion-session.type = 'port_forwarding', "
            f"target.bastion-session.ip in [{cidrs}]" + "}"
        )
        for group in GROUPS:
            grants = [g for g in self.grants if g["group"] == group and g["scope"] == FINOPS]
            with self.subTest(group=group):
                capabilities = {(g["verb"], g["resource"]) for g in grants}
                self.assertIn(("use", "bastion"), capabilities)
                self.assertIn(("manage", "bastion-session"), capabilities)
                for grant in grants:
                    if grant["resource"] == "bastion-session" and grant["verb"] in {"use", "manage"}:
                        self.assertEqual(grant["condition"], expected)

    def test_session_listing_and_details_do_not_require_destination_attributes(self):
        # ListSessions has no individual target IP/type to satisfy create conditions.
        for group in GROUPS:
            with self.subTest(group=group):
                self.assertTrue(any(
                    grant["group"] == group
                    and grant["scope"] == FINOPS
                    and grant["resource"] == "bastion-session"
                    and grant["verb"] in {"read", "use", "manage"}
                    and grant["condition"] is None
                    for grant in self.grants
                ), "Missing session read access independent of target IP/type")

    def test_no_human_role_manages_shared_vcn_topology(self):
        infrastructure = {
            "all-resources", "virtual-network-family", "vcns", "subnets",
            "route-tables", "security-lists", "dhcp-options", "network-security-groups",
            "drgs", "drg-route-tables", "drg-attachments", "internet-gateways",
            "nat-gateways", "service-gateways", "network-firewall-family",
            "network-firewalls", "network-firewall-policies",
        }
        for grant in self.grants:
            with self.subTest(grant=grant):
                self.assertIn(grant["scope"], {FINOPS, NETWORK})
                self.assertFalse(grant["verb"] == "manage" and grant["resource"] in infrastructure)


if __name__ == "__main__":
    unittest.main()
