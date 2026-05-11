from __future__ import annotations

from pathlib import Path
import unittest

from tests.gen.helpers import (
    REPO_ROOT,
    parse_fixture_directives,
    render_direct_failure_message,
    render_text_for_contains,
)


FIXTURE_ROOT = Path(__file__).resolve().parent / "testdata" / "fixture_runner"
PASS_DIR = FIXTURE_ROOT / "pass"
FAIL_DIR = FIXTURE_ROOT / "fail"


class FixtureRunnerTests(unittest.TestCase):
    def test_contains_directive_checks_rendered_text(self) -> None:
        case = PASS_DIR / "contains_source_text.jsonnet"
        directives = parse_fixture_directives(case.relative_to(REPO_ROOT))
        actual = render_text_for_contains(case.relative_to(REPO_ROOT))

        self.assertEqual(["local render_context = import 'render_context.libsonnet';"], directives.contains)
        for substring in directives.contains:
            self.assertIn(substring, actual)

    def test_error_contains_directive_checks_normalized_failure(self) -> None:
        case = FAIL_DIR / "error_contains_message.jsonnet"
        directives = parse_fixture_directives(case.relative_to(REPO_ROOT))
        actual = render_direct_failure_message(case.relative_to(REPO_ROOT))

        self.assertEqual(["fixture-runner-sentinel"], directives.error_contains)
        for substring in directives.error_contains:
            self.assertIn(substring, actual)


if __name__ == "__main__":
    unittest.main()
