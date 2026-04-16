from pathlib import Path
import unittest

from tests.gen.helpers import render_jsonnet_object


class TopologySemanticsTests(unittest.TestCase):
    def test_topology_exposes_semantic_environment_order(self) -> None:
        rendered = render_jsonnet_object(
            Path("tests/gen/testdata/direct/pass/topology_ordering.jsonnet")
        )
        self.assertEqual(rendered["ordered_env_names"], ["prod", "preprod", "dev", "qa"])
        self.assertEqual(rendered["ordered_spoke_env_names"], ["prod", "preprod", "dev", "qa"])
        self.assertEqual(rendered["security_target_env_names"], ["prod", "preprod", "dev", "qa"])
