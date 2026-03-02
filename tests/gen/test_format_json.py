import unittest

from tests.gen.helpers import ensure_gen_on_path

ensure_gen_on_path()

import format_json


class FormatJsonTests(unittest.TestCase):
    def test_priority_list_uses_only_canonical_renamed_keys(self) -> None:
        self.assertIn("https_443", format_json.KEY_PRIORITY_ORDER)
        self.assertNotIn("http_443", format_json.KEY_PRIORITY_ORDER)
        self.assertIn("rr-vcn-fra-hub-mon-sn", format_json.KEY_PRIORITY_ORDER)
        self.assertNotIn("rt-vcn-fra-hub-mon-sn", format_json.KEY_PRIORITY_ORDER)
        self.assertNotIn("rr-vcn-fra-hub-logs-sn", format_json.KEY_PRIORITY_ORDER)
        self.assertIn("rr-fra-internet", format_json.KEY_PRIORITY_ORDER)
        self.assertNotIn("rt-fra-internet", format_json.KEY_PRIORITY_ORDER)
        self.assertNotIn("rr-internet", format_json.KEY_PRIORITY_ORDER)
        self.assertIn("rr-fra-natgw", format_json.KEY_PRIORITY_ORDER)
        self.assertNotIn("rt-fra-natgw", format_json.KEY_PRIORITY_ORDER)
        self.assertNotIn("rr-natgw", format_json.KEY_PRIORITY_ORDER)

    def test_route_rule_ordering(self) -> None:
        cases = {
            "renamed-hub-monitor-route": (
                {
                    "rr-vcn-fra-hub-mgmt-sn": {"description": "mgmt"},
                    "rr-vcn-fra-hub-mon-sn": {"description": "mon"},
                    "rr-vcn-fra-hub-dns-sn": {"description": "dns"},
                    "rr-fra-prod-projects": {"description": "prod"},
                    "rr-fra-preprod-projects": {"description": "preprod"},
                },
                [
                    "rr-vcn-fra-hub-mgmt-sn",
                    "rr-vcn-fra-hub-mon-sn",
                    "rr-vcn-fra-hub-dns-sn",
                    "rr-fra-prod-projects",
                    "rr-fra-preprod-projects",
                ],
            ),
            "renamed-internet-route": (
                {
                    "rr-fra-prod-projects": {"description": "prod"},
                    "rr-fra-internet": {"description": "internet"},
                    "rr-fra-preprod-projects": {"description": "preprod"},
                },
                ["rr-fra-internet", "rr-fra-prod-projects", "rr-fra-preprod-projects"],
            ),
            "renamed-natgw-route": (
                {
                    "rr-fra-prod-projects": {"description": "prod"},
                    "rr-fra-natgw": {"description": "natgw"},
                    "rr-fra-preprod-projects": {"description": "preprod"},
                },
                ["rr-fra-natgw", "rr-fra-prod-projects", "rr-fra-preprod-projects"],
            ),
            "prod-hub-preprod-ordering": (
                {
                    "rr-fra-preprod-projects": {"description": "preprod"},
                    "rr-fra-sgw": {"description": "sgw"},
                    "rr-fra-hub": {"description": "hub"},
                    "rr-fra-natgw": {"description": "natgw"},
                    "rr-fra-prod-projects": {"description": "prod"},
                },
                [
                    "rr-fra-natgw",
                    "rr-fra-prod-projects",
                    "rr-fra-hub",
                    "rr-fra-preprod-projects",
                    "rr-fra-sgw",
                ],
            ),
        }

        for case_name, (route_rules, expected_order) in cases.items():
            with self.subTest(case=case_name):
                self.assertEqual(
                    format_json.sort_dict_keys(route_rules, "route_rules"),
                    expected_order,
                )


if __name__ == "__main__":
    unittest.main()
