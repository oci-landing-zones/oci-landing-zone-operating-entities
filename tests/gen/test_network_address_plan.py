from __future__ import annotations

import ipaddress
import json
import unittest

from tests.gen.helpers import REPO_ROOT, jsonnet_command, run_cmd


CATALOG = REPO_ROOT / "gen/data/network-address-plan.json"


class NetworkAddressPlanTests(unittest.TestCase):
    def test_catalog_has_canonical_disjoint_reference_reservations(self) -> None:
        self.assertTrue(CATALOG.exists(), "shared address-plan catalog is missing")
        plan = json.loads(CATALOG.read_text())
        self.assertEqual(
            {"shared": "10.0.32.0/21", "prod": "10.0.112.0/21", "preprod": "10.0.176.0/21"},
            plan["platforms"]["exaxs"],
        )
        ranges = [plan["foundation"]["hub_vcn"]]
        ranges += list(plan["foundation"]["project_vcns"].values())
        ranges += list(plan["hub_reservations"].values())
        for product in plan["platforms"]:
            ranges += list(plan["platforms"][product].values())
        networks = [ipaddress.ip_network(cidr, strict=True) for cidr in ranges]
        for index, first in enumerate(networks):
            for second in networks[index + 1:]:
                self.assertFalse(first.overlaps(second), f"{first} overlaps {second}")

    def test_uat_reservations_and_oke_auto_profile_remain_distinct(self) -> None:
        plan = json.loads(CATALOG.read_text())
        for product, cidr in {"ebs": "10.1.136.0/21", "oke_simple": "10.1.144.0/21", "ocvs": "10.1.152.0/21"}.items():
            self.assertEqual(cidr, plan["platforms"][product]["uat"])
        expression = """
            local oke = import 'gen/workload-extensions/oke/simple/published_profiles.libsonnet';
            local ocvs = import 'gen/workload-extensions/ocvs/published_profiles.libsonnet';
            {
              oke: oke.oke_platform.network.vcn,
              ocvs: ocvs.prod_hub_e.config.environments.prod.platforms.ocvs.network.vcn,
            }
        """
        result = run_cmd([jsonnet_command(), "-J", str(REPO_ROOT), "-e", expression])
        profiles = json.loads(result.stdout)
        # The automatic OKE /20 deliberately spans both reserved /21 slots.
        self.assertEqual("10.0.80.0/20", profiles["oke"])
        self.assertEqual("10.0.88.0/21", profiles["ocvs"])

    def test_reference_table_contains_every_catalog_reservation(self) -> None:
        plan = json.loads(CATALOG.read_text())
        table = (REPO_ROOT / "addons/oci-lz-blueprint-factory/network-address-plan.md").read_text()
        ranges = [plan["foundation"]["hub_vcn"]]
        ranges += list(plan["foundation"]["project_vcns"].values())
        ranges += list(plan["hub_reservations"].values())
        for scopes in plan["platforms"].values():
            ranges += list(scopes.values())
        for cidr in ranges:
            self.assertIn(f"`{cidr}`", table)

    def test_published_exadata_uc1_profiles_compose_without_cidr_overlaps(self) -> None:
        expression = """
            local xs = import 'gen/workload-extensions/exaxs/published_profiles.libsonnet';
            local cs = import 'gen/workload-extensions/exacs/single-stack/profiles.libsonnet';
            local normalize = import 'gen/config.libsonnet';
            local config = normalize.normalize(xs.uc1 {
              shared_platforms+: { exacs: cs.uc1.config.shared_platforms.exacs },
            });
            {
              exacs: config.shared_platforms.exacs.network.vcn,
              exaxs: config.shared_platforms.exaxs.network.vcn,
            }
        """
        result = run_cmd([jsonnet_command(), "-J", str(REPO_ROOT), "-e", expression])
        self.assertEqual(
            {"exacs": "10.0.24.0/21", "exaxs": "10.0.32.0/21"},
            json.loads(result.stdout),
        )

    def test_custom_platform_cidr_is_not_replaced_by_reference_plan(self) -> None:
        expression = """
            local profiles = import 'gen/workload-extensions/exaxs/published_profiles.libsonnet';
            local normalize = import 'gen/config.libsonnet';
            normalize.normalize(profiles.uc1 {
              shared_platforms+: { exaxs+: { network: { vcn: '10.240.0.0/21' } } },
            }).shared_platforms.exaxs.network.vcn
        """
        result = run_cmd([jsonnet_command(), "-J", str(REPO_ROOT), "-e", expression])
        self.assertEqual("10.240.0.0/21", json.loads(result.stdout))


if __name__ == "__main__":
    unittest.main()
