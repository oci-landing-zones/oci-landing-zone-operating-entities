from __future__ import annotations

from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, parse_fixture_directives


FIXTURE_ROOT = REPO_ROOT / "tests/gen/testdata"
DEPLOYER_PASS_DIRS = (
    FIXTURE_ROOT / "direct/pass",
    FIXTURE_ROOT / "configs/pass",
)
DEPLOYER_FAIL_DIRS = (
    FIXTURE_ROOT / "direct/fail",
    FIXTURE_ROOT / "configs/fail",
)
DEPLOYER_DIRS = DEPLOYER_PASS_DIRS + DEPLOYER_FAIL_DIRS


class FixtureInventoryTests(unittest.TestCase):
    def test_deployer_pass_fixtures_have_behavior_signal(self) -> None:
        cases = sorted(path for fixture_dir in DEPLOYER_PASS_DIRS for path in fixture_dir.glob("*.jsonnet"))
        self.assertTrue(cases, "no deployer pass fixtures found")

        missing = []
        for case in cases:
            directives = parse_fixture_directives(case.relative_to(REPO_ROOT))
            if not directives.contains and not case.with_suffix(".out").exists():
                missing.append(case.relative_to(REPO_ROOT).as_posix())

        self.assertEqual([], missing)

    def test_deployer_fail_contracts_are_unique(self) -> None:
        cases = sorted(path for fixture_dir in DEPLOYER_FAIL_DIRS for path in fixture_dir.glob("*.jsonnet"))
        self.assertTrue(cases, "no deployer fail fixtures found")

        by_contract: dict[str, list[str]] = {}
        for case in cases:
            directives = parse_fixture_directives(case.relative_to(REPO_ROOT))
            if directives.error_contains:
                contract = "\n".join(directives.error_contains)
            else:
                out_file = case.with_suffix(".out")
                self.assertTrue(out_file.exists(), f"missing fail contract for {case.name}")
                contract = out_file.read_text(encoding="utf-8").strip()
            by_contract.setdefault(contract, []).append(case.relative_to(REPO_ROOT).as_posix())

        duplicates = {
            contract: paths
            for contract, paths in by_contract.items()
            if len(paths) > 1
        }
        self.assertEqual({}, duplicates)

    def test_fixture_runner_sentinels_are_not_deployer_fixtures(self) -> None:
        misplaced = sorted(
            path.relative_to(REPO_ROOT).as_posix()
            for fixture_dir in DEPLOYER_DIRS
            for path in fixture_dir.glob("fixture_runner*.jsonnet")
        )

        self.assertEqual([], misplaced)


if __name__ == "__main__":
    unittest.main()

