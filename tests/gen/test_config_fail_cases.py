from pathlib import Path
import unittest

from tests.gen.helpers import render_config_failure


class GeneratorConfigFailCases(unittest.TestCase):
    def test_fail_cases(self) -> None:
        fail_fixtures_dir = Path(__file__).resolve().parent / "testdata" / "configs" / "fail"
        cases = [
            ("missing_environments.jsonnet", "config.environments is required"),
            ("overflow_platform_oke.jsonnet", "Subnet allocation exceeds VCN 10.0.80.0/24"),
            ("platform_extension_missing_params.jsonnet", "Platform oke.extension.params is required"),
            ("platform_extension_missing_type.jsonnet", "Platform oke.extension.type is required"),
            ("platform_extension_null_params.jsonnet", "Platform oke.extension.params must be an object"),
            ("platform_extension_null.jsonnet", "Platform oke.extension must be an object"),
            ("platform_missing_network.jsonnet", "Platform data.network is required"),
            (
                "shared_project_network_missing_network.jsonnet",
                "Environment prod.shared_project_network.network is required",
            ),
            (
                "shared_project_network_missing_vcn.jsonnet",
                "Environment prod.shared_project_network.network.vcn is required",
            ),
            (
                "shared_project_network_null.jsonnet",
                "Environment prod.shared_project_network.network is required",
            ),
        ]
        expected_fixtures = {fixture_name for fixture_name, _ in cases}
        discovered_fixtures = {path.name for path in fail_fixtures_dir.glob("*.jsonnet")}
        self.assertSetEqual(expected_fixtures, discovered_fixtures)

        for fixture_name, expected_error in cases:
            with self.subTest(fixture=fixture_name):
                failure_details = render_config_failure(
                    fail_fixtures_dir / fixture_name
                )
                self.assertIn(expected_error, failure_details)


if __name__ == "__main__":
    unittest.main()
