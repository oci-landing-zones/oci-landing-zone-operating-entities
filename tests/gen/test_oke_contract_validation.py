import unittest

from tests.gen import oke_contract_validation


class NumericIcmpValidationTests(unittest.TestCase):
    def test_accepts_numeric_icmp_fields(self) -> None:
        payload = {
            "network_security_groups": {
                "cp": {
                    "ingress_rules": {
                        "nsg_workers_icmp": {
                            "protocol": "ICMP",
                            "icmp_type": 3,
                            "icmp_code": 4,
                        },
                    },
                },
            },
        }

        oke_contract_validation.assert_numeric_icmp_values(payload, "payload")

    def test_rejects_string_icmp_fields(self) -> None:
        payload = {
            "network_security_groups": {
                "cp": {
                    "ingress_rules": {
                        "nsg_workers_icmp": {
                            "protocol": "ICMP",
                            "icmp_type": "3",
                            "icmp_code": "4",
                        },
                    },
                },
            },
        }

        with self.assertRaisesRegex(AssertionError, "expected numeric ICMP values"):
            oke_contract_validation.assert_numeric_icmp_values(payload, "payload")


if __name__ == "__main__":
    unittest.main()
