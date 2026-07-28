from __future__ import annotations

from pathlib import Path
import unittest

from tests.gen.helpers import render_config_outputs


CONTRACT_ROOT = Path("tests/gen/testdata/contracts")
COMMON_FILES = {
    "governance.json",
    "iam.json",
    "network.json",
    "observability_cis2.json",
    "observability_cis2_pre.json",
    "security_cis2.json",
    "security_cis2_pre.json",
}


class MultiOeOutputInventoryTests(unittest.TestCase):
    def assert_inventory(
        self,
        hub_kind: str,
        conditional_files: set[str],
    ) -> None:
        outputs = render_config_outputs(
            CONTRACT_ROOT / f"multi_oe_{hub_kind}.jsonnet"
        )
        self.assertEqual(COMMON_FILES | conditional_files, set(outputs))

    def test_hub_e_emits_seven_foundation_files(self) -> None:
        self.assert_inventory("hub_e", set())

    def test_hub_a_emits_pre_network_file(self) -> None:
        self.assert_inventory("hub_a", {"network_pre.json"})

    def test_hub_b_emits_pre_network_file(self) -> None:
        self.assert_inventory("hub_b", {"network_pre.json"})

    def test_hub_c_emits_pre_network_and_backend_alternative(self) -> None:
        self.assert_inventory(
            "hub_c",
            {"network_pre.json", "network_backends.json"},
        )


if __name__ == "__main__":
    unittest.main()
