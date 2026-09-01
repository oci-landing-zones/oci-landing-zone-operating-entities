from __future__ import annotations

import unittest

from tests.gen.helpers import ensure_gen_on_path


ensure_gen_on_path()

from format_json import sort_dict_keys  # noqa: E402


class FormatJsonOrderingTests(unittest.TestCase):
    def test_blueprint_config_root_places_hub_before_environments(self) -> None:
        config = {
            "environments": {"prod": {}},
            "region_short_name": "fra",
            "hub": {"kind": "hub_e"},
            "region": "eu-frankfurt-1",
            "realm": "oc1",
        }

        self.assertEqual(
            ["realm", "region", "region_short_name", "hub", "environments"],
            sort_dict_keys(config),
        )

    def test_environments_use_lifecycle_then_alphabetical_order(self) -> None:
        environments = {
            "uat": {"projects": {}},
            "dev": {"projects": {}},
            "zeta": {"projects": {}},
            "preprod": {"projects": {}},
            "alpha": {"projects": {}},
            "prod": {"projects": {}},
            "staging": {"projects": {}},
        }

        self.assertEqual(
            ["prod", "preprod", "dev", "alpha", "staging", "uat", "zeta"],
            sort_dict_keys(environments, parent_key="environments"),
        )


if __name__ == "__main__":
    unittest.main()
