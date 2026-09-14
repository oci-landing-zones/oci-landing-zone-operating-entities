from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from tests.gen.helpers import REPO_ROOT, jsonnet_command, render_dr_config_outputs, run_cmd


HOME_CONFIG = Path("tests/gen/testdata/dr/home_hub_b.jsonnet")
DR_CONFIG = Path("tests/gen/testdata/dr/dr_hub_b.jsonnet")
PUBLISHED_DR_SOURCE_DIR = REPO_ROOT / "gen/addons/oci-lz-dr/one-oe/runtime"
PUBLISHED_DR_OUTPUT_DIR = REPO_ROOT / "addons/oci-lz-dr/one-oe/runtime"


class DrConfigTests(unittest.TestCase):
    def test_published_oneoe_dr_preset_excludes_hub_e(self) -> None:
        for directory in (PUBLISHED_DR_SOURCE_DIR, PUBLISHED_DR_OUTPUT_DIR):
            self.assertTrue(directory.is_dir())
            self.assertEqual([], sorted(directory.glob("*hub_e*")))

        profile_surface = json.loads(
            run_cmd(
                [
                    jsonnet_command(),
                    "-J",
                    str(REPO_ROOT),
                    "-e",
                    "local p = import 'gen/addons/oci-lz-dr/one-oe/profiles.libsonnet'; "
                    "{ profiles: std.objectFields(p), rpc_pairs: std.objectFields(p.rpc_pairs) }",
                ]
            ).stdout
        )
        self.assertEqual(
            {"hub_a", "hub_b", "hub_c", "kms_pair", "rpc_pairs"},
            set(profile_surface["profiles"]),
        )
        self.assertEqual(
            {"hub_a", "hub_b", "hub_c"}, set(profile_surface["rpc_pairs"])
        )

    def test_home_side_owns_only_home_network_outputs(self) -> None:
        outputs = render_dr_config_outputs(HOME_CONFIG, DR_CONFIG, "home")

        self.assertEqual(
            {"network.json", "network_pre.json", "network_rpc_acceptor.json"},
            set(outputs),
        )

    def test_dr_side_owns_only_dr_network_outputs(self) -> None:
        outputs = render_dr_config_outputs(HOME_CONFIG, DR_CONFIG, "dr")

        self.assertEqual(
            {"network.json", "network_pre.json", "network_rpc_requester.json"},
            set(outputs),
        )
        self.assertNotIn("iam.json", outputs)
        self.assertNotIn("governance.json", outputs)
        self.assertNotIn("security_cis2.json", outputs)

    def test_dr_cli_publishes_both_sides_atomically(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "generated"
            run_cmd(
                [
                    "bash",
                    "gen/generate.sh",
                    "--dr-config",
                    str(HOME_CONFIG),
                    str(DR_CONFIG),
                    str(output_path),
                ]
            )
            self.assertTrue(
                (output_path / "home/network_rpc_acceptor.json").is_file()
            )
            self.assertTrue(
                (output_path / "dr/network_rpc_requester.json").is_file()
            )

    def test_dr_cli_does_not_publish_partial_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "generated"
            proc = run_cmd(
                [
                    "bash",
                    "gen/generate.sh",
                    "--dr-config",
                    str(HOME_CONFIG),
                    "tests/gen/testdata/direct/fail/oneoe_dr_pair_cross_realm.jsonnet",
                    str(output_path),
                ],
                expect_success=False,
            )
            self.assertNotEqual(0, proc.returncode)
            self.assertFalse(output_path.exists())


if __name__ == "__main__":
    unittest.main()
