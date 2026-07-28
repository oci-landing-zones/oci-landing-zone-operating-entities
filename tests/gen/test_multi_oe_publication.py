from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object
from tests.gen.test_fixture_cases import run_fixture_cases


SOURCE_DIR = REPO_ROOT / "gen" / "blueprints" / "multi-oe" / "generic" / "runtime"
OUTPUT_DIR = REPO_ROOT / "blueprints" / "multi-oe" / "generic" / "runtime"
EXPECTED_STEMS = (
    "multioe_governance",
    "multioe_iam",
    "multioe_network_hub_a",
    "multioe_network_hub_a_pre",
    "multioe_network_hub_b",
    "multioe_network_hub_b_pre",
    "multioe_network_hub_c",
    "multioe_network_hub_c_backends",
    "multioe_network_hub_c_pre",
    "multioe_network_hub_e",
    "multioe_observability_cis1",
    "multioe_observability_cis1_pre",
    "multioe_observability_cis2",
    "multioe_observability_cis2_pre",
    "multioe_security_cis1",
    "multioe_security_cis1_pre",
    "multioe_security_cis2",
    "multioe_security_cis2_pre",
)


class MultiOePublicationTests(unittest.TestCase):
    def test_source_and_output_inventories_are_exact(self) -> None:
        source_names = tuple(
            path.name for path in sorted(SOURCE_DIR.glob("*.jsonnet"))
        )
        output_names = tuple(path.name for path in sorted(OUTPUT_DIR.glob("*.json")))

        self.assertEqual(
            tuple(f"{stem}.jsonnet" for stem in EXPECTED_STEMS), source_names
        )
        self.assertEqual(tuple(f"{stem}.json" for stem in EXPECTED_STEMS), output_names)
        self.assertEqual(18, len(source_names))
        self.assertEqual(18, len(output_names))

    def test_entrypoints_are_thin_and_profile_owned(self) -> None:
        expected_prefix = (
            "local profiles = import './profiles.libsonnet';\n"
            "local lz = import '../../../../landing_zone.libsonnet';\n"
        )
        for stem in EXPECTED_STEMS:
            source = SOURCE_DIR / f"{stem}.jsonnet"
            with self.subTest(entrypoint=source.name):
                text = source.read_text(encoding="utf-8")
                self.assertTrue(text.startswith(expected_prefix))
                self.assertEqual(3, len(text.splitlines()))

    def test_rendered_entrypoints_match_committed_snapshots(self) -> None:
        sources = tuple(SOURCE_DIR / f"{stem}.jsonnet" for stem in EXPECTED_STEMS)
        for source, result in run_fixture_cases(sources, self._render_snapshot_pair):
            with self.subTest(entrypoint=source.name):
                actual, expected = result.unwrap()
                self.assertEqual(expected, actual)

    def test_no_multi_stack_publication_exists(self) -> None:
        self.assertFalse((OUTPUT_DIR / "multi-stack").exists())
        self.assertFalse(
            (
                REPO_ROOT
                / "gen"
                / "blueprints"
                / "multi-oe"
                / "generic"
                / "multi-stack"
            ).exists()
        )

    @staticmethod
    def _render_snapshot_pair(source: Path) -> tuple[dict, dict]:
        output = OUTPUT_DIR / f"{source.stem}.json"
        actual = render_jsonnet_object(source.relative_to(REPO_ROOT))
        expected = json.loads(output.read_text(encoding="utf-8"))
        return actual, expected


if __name__ == "__main__":
    unittest.main()
