from __future__ import annotations

import json
import unittest

from tests.gen.helpers import REPO_ROOT, jsonnet_command, run_cmd


class SecurityZonesTargetTests(unittest.TestCase):
    def test_rejects_landing_zone_and_shared_targets(self) -> None:
        for target in (
            "CMP-LANDINGZONE-KEY",
            "CMP-LZ-NETWORK-KEY",
            "CMP-LZ-PLATFORM-KEY",
            "CMP-LZ-SECURITY-KEY",
        ):
            with self.subTest(target=target):
                expression = (
                    "local render = import 'gen/addons/oci-security-zones/published.libsonnet'; "
                    "local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet'; "
                    "render(profiles.environment_cis1 + { target_compartment_id: "
                    + json.dumps(target)
                    + " })"
                )
                result = run_cmd(
                    [jsonnet_command(), "-J", str(REPO_ROOT), "-e", expression],
                    expect_success=False,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(
                    "must not reference the landing-zone or shared compartments",
                    result.stderr,
                )
