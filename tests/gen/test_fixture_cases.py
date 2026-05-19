from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
import json
import os
from pathlib import Path
from typing import Callable, Generic, Iterable, Optional, TypeVar
import unittest

from tests.gen.helpers import (
    REPO_ROOT,
    render_canonical_json,
    render_config_outputs,
    render_config_failure_message,
    render_direct_failure_message,
    render_text_for_contains,
    parse_fixture_directives,
)


FIXTURE_ROOT = Path(__file__).resolve().parent / "testdata"
DIRECT_PASS_DIR = FIXTURE_ROOT / "direct" / "pass"
DIRECT_FAIL_DIR = FIXTURE_ROOT / "direct" / "fail"
CONFIG_PASS_DIR = FIXTURE_ROOT / "configs" / "pass"
CONFIG_FAIL_DIR = FIXTURE_ROOT / "configs" / "fail"

T = TypeVar("T")
R = TypeVar("R")


@dataclass
class FixtureRunResult(Generic[R]):
    value: Optional[R] = None
    error: Optional[BaseException] = None

    def unwrap(self) -> R:
        if self.error is not None:
            raise self.error
        return self.value  # type: ignore[return-value]


def fixture_worker_count(case_count: int) -> int:
    return max(1, min(case_count, os.cpu_count() or 1))


def run_fixture_cases(
    cases: Iterable[T],
    worker: Callable[[T], R],
) -> list[tuple[T, FixtureRunResult[R]]]:
    ordered_cases = list(cases)
    if len(ordered_cases) <= 1:
        return [(case, _run_fixture_case(worker, case)) for case in ordered_cases]

    with ThreadPoolExecutor(max_workers=fixture_worker_count(len(ordered_cases))) as executor:
        results_by_case = {
            case: executor.submit(_run_fixture_case, worker, case)
            for case in ordered_cases
        }
        return [(case, results_by_case[case].result()) for case in ordered_cases]


def _run_fixture_case(worker: Callable[[T], R], case: T) -> FixtureRunResult[R]:
    try:
        return FixtureRunResult(value=worker(case))
    except BaseException as exc:
        return FixtureRunResult(error=exc)


class FixtureCaseTests(unittest.TestCase):
    def test_fixture_jsonnet_files_start_with_plain_header_comments(self) -> None:
        fixture_dirs = (
            DIRECT_PASS_DIR,
            DIRECT_FAIL_DIR,
            CONFIG_PASS_DIR,
            CONFIG_FAIL_DIR,
        )
        cases = sorted(path for fixture_dir in fixture_dirs for path in fixture_dir.glob("*.jsonnet"))
        self.assertTrue(cases, "no jsonnet fixtures found")

        for case in cases:
            with self.subTest(case=case.relative_to(REPO_ROOT).as_posix()):
                lines = case.read_text(encoding="utf-8").splitlines()
                first_non_empty = next((line.strip() for line in lines if line.strip()), None)
                self.assertIsNotNone(first_non_empty, f"{case.name} is empty")
                self.assertTrue(
                    first_non_empty.startswith("//"),
                    f"{case.name} must start with a plain-language header comment",
                )
                self.assertFalse(
                    first_non_empty.startswith("// contains:")
                    or first_non_empty.startswith("// error_contains:"),
                    f"{case.name} must explain intent before any directives",
                )

    def assert_fail_fixture(
        self,
        case: Path,
        render_fn: Callable[[Path], str],
    ) -> None:
        directives = parse_fixture_directives(case)
        self.assert_directives_allow_only(
            case,
            directives,
            allow_contains=False,
            allow_error_contains=True,
        )
        if directives.error_contains:
            expected = case.with_suffix(".out")
            self.assertFalse(
                expected.exists(),
                f"{case.name} uses error_contains directives and must not have a .out file",
            )
            actual = render_fn(case.relative_to(REPO_ROOT))
            for substring in directives.error_contains:
                self.assertIn(
                    substring,
                    actual,
                    f"{case.name} expected failure output to contain {substring}",
                )
            return
        self.assert_text_fixture_pair(case, render_fn(case.relative_to(REPO_ROOT)))

    def assert_text_fixture_pair(self, case: Path, actual: str) -> None:
        expected = case.with_suffix(".out")
        self.assertTrue(expected.exists(), f"missing fixture output for {case.name}")
        self.assertEqual(actual, expected.read_text(encoding="utf-8"))

    def assert_directives_allow_only(
        self,
        case: Path,
        directives,
        *,
        allow_contains: bool,
        allow_error_contains: bool,
    ) -> None:
        if directives.contains and directives.error_contains:
            self.fail(
                f"{case.name} mixes contains and error_contains directives; fixtures must pick one mode"
            )
        if directives.contains and not allow_contains:
            self.fail(f"{case.name} may not use contains directives in this fixture class")
        if directives.error_contains and not allow_error_contains:
            self.fail(f"{case.name} may not use error_contains directives in this fixture class")

    def test_direct_pass_cases(self) -> None:
        cases = sorted(DIRECT_PASS_DIR.glob("*.jsonnet"))
        self.assertTrue(cases, "no direct pass cases found")
        for case, result in run_fixture_cases(cases, self.assert_direct_pass_fixture):
            with self.subTest(case=case.relative_to(REPO_ROOT).as_posix()):
                result.unwrap()

    def assert_direct_pass_fixture(self, case: Path) -> None:
        directives = parse_fixture_directives(case)
        self.assert_directives_allow_only(
            case,
            directives,
            allow_contains=True,
            allow_error_contains=False,
        )
        if directives.contains:
            expected = case.with_suffix(".out")
            self.assertFalse(
                expected.exists(),
                f"{case.name} uses contains directives and must not have a .out file",
            )
            actual = render_text_for_contains(case.relative_to(REPO_ROOT))
            for substring in directives.contains:
                self.assertIn(
                    substring,
                    actual,
                    f"{case.name} expected to contain directive value {substring}",
                )
            return
        self.assert_text_fixture_pair(
            case,
            render_canonical_json(case.relative_to(REPO_ROOT)),
        )

    def test_direct_fail_cases(self) -> None:
        cases = sorted(DIRECT_FAIL_DIR.glob("*.jsonnet"))
        self.assertTrue(cases, "no direct fail cases found")
        for case, result in run_fixture_cases(
            cases,
            lambda case: self.assert_fail_fixture(case, render_direct_failure_message),
        ):
            with self.subTest(case=case.relative_to(REPO_ROOT).as_posix()):
                result.unwrap()

    def test_config_fail_cases(self) -> None:
        cases = sorted(CONFIG_FAIL_DIR.glob("*.jsonnet"))
        self.assertTrue(cases, "no config fail cases found")
        for case, result in run_fixture_cases(
            cases,
            lambda case: self.assert_fail_fixture(case, render_config_failure_message),
        ):
            with self.subTest(case=case.relative_to(REPO_ROOT).as_posix()):
                result.unwrap()

    def test_config_pass_cases(self) -> None:
        cases = sorted(CONFIG_PASS_DIR.glob("*.jsonnet"))
        self.assertTrue(cases, "no config pass cases found")
        for case, result in run_fixture_cases(cases, self.assert_config_pass_fixture):
            with self.subTest(case=case.relative_to(REPO_ROOT).as_posix()):
                result.unwrap()

    def assert_config_pass_fixture(self, case: Path) -> None:
        directives = parse_fixture_directives(case)
        self.assert_directives_allow_only(
            case,
            directives,
            allow_contains=True,
            allow_error_contains=False,
        )
        outputs = render_config_outputs(case.relative_to(REPO_ROOT))
        self.assertIn("network.json", outputs)
        self.assertIn("iam.json", outputs)
        self.assertTrue(
            directives.contains or case.with_suffix(".out").exists(),
            f"{case.name} must use contains directives or a .out summary",
        )
        if directives.contains:
            expected = case.with_suffix(".out")
            self.assertFalse(
                expected.exists(),
                f"{case.name} uses contains directives and must not have a .out file",
            )
            actual = json.dumps(outputs, indent=2)
            for substring in directives.contains:
                self.assertIn(
                    substring,
                    actual,
                    f"{case.name} expected config output to contain {substring}",
                )
            return
        self.assert_text_fixture_pair(case, json.dumps(outputs, indent=2) + "\n")


if __name__ == "__main__":
    unittest.main()
