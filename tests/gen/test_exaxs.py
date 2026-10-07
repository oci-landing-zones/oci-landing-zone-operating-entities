from __future__ import annotations

import json
import unittest

from tests.gen.helpers import REPO_ROOT, jsonnet_command, run_cmd


SOURCE = REPO_ROOT / "gen/workload-extensions/exaxs/single-stack"
PUBLISHED = REPO_ROOT / "workload-extensions/exaxs/single-stack"


class ExaxsGeneratorTests(unittest.TestCase):
    def test_published_single_stack_json_matches_jsonnet(self) -> None:
        sources = sorted(SOURCE.glob("*.jsonnet"))
        self.assertEqual(29, len(sources))
        for source in sources:
            with self.subTest(source=source.name):
                rendered = json.loads(run_cmd([jsonnet_command(), str(source)]).stdout)
                published = json.loads(
                    (PUBLISHED / f"{source.stem}.json").read_text(encoding="utf-8")
                )
                self.assertEqual(published, rendered)

    def test_placement_and_policy_boundaries(self) -> None:
        expected = {1: (1, 1), 2: (1, 2), 3: (2, 2)}
        for uc, (vault_count, db_count) in expected.items():
            with self.subTest(use_case=uc):
                data = self._published(f"exaxs_identity_uc{uc}.json")
                root = data["compartments_configuration"]["compartments"][
                    "CMP-LANDINGZONE-KEY"
                ]
                compartments = self._compartment_paths(root["children"])
                self.assertEqual(
                    vault_count,
                    sum(key.endswith("EXAXS-INFRA-KEY") for key in compartments),
                )
                self.assertEqual(
                    db_count,
                    sum(key.endswith("EXAXS-DB-KEY") for key in compartments),
                )
                policies = data["policies_configuration"]["supplied_policies"]
                exaxs_policies = {
                    key: policy for key, policy in policies.items() if "EXAXS" in key
                }
                self.assertTrue(exaxs_policies)
                for policy in exaxs_policies.values():
                    self.assertEqual("CMP-LANDINGZONE-KEY", policy["compartment_id"])
                    for statement in policy["statements"]:
                        path = statement.split(" in compartment ", 1)[1].split(
                            " where ", 1
                        )[0]
                        self.assertIn(path, compartments.values())
                        self.assertNotIn("autonomous", statement.lower())
                        self.assertNotIn("cloud-exadata", statement.lower())
                if uc == 2:
                    env_infra = exaxs_policies["PCY-LZ-PROD-EXAXS-INFRA-ADMIN-KEY"]
                    self.assertTrue(
                        any(
                            "use exascale-db-storage-vaults in compartment "
                            "cmp-lz-platform:cmp-lz-shared-exaxs:cmp-lz-shared-exaxs-infra"
                            in statement
                            for statement in env_infra["statements"]
                        )
                    )

    def test_exaxs_events_reach_existing_topics(self) -> None:
        for uc in (1, 2, 3):
            with self.subTest(use_case=uc):
                data = self._published(f"exaxs_observability_cis2_uc{uc}.json")
                topics = data["notifications_configuration"]["topics"]
                rules = data["events_configuration"]["event_rules"]
                exaxs_rules = {key: value for key, value in rules.items() if "EXAXS" in key}
                self.assertTrue(exaxs_rules)
                for rule in exaxs_rules.values():
                    self.assertTrue(rule["supplied_events"])
                    self.assertTrue(all(topic in topics for topic in rule["destination_topic_ids"]))
                    self.assertFalse(
                        any("autonomous" in event.lower() for event in rule["supplied_events"])
                    )

    @staticmethod
    def _published(name: str) -> dict:
        return json.loads((PUBLISHED / name).read_text(encoding="utf-8"))

    @staticmethod
    def _compartment_paths(children: dict) -> dict[str, str]:
        paths: dict[str, str] = {}

        def visit(nodes: dict, parents: list[str]) -> None:
            for key, value in nodes.items():
                names = parents + [value["name"]]
                paths[key] = ":".join(names)
                visit(value.get("children", {}), names)

        visit(children, [])
        return paths


if __name__ == "__main__":
    unittest.main()
