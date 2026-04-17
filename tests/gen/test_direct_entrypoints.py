from __future__ import annotations

from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_formatted_json

ADDON_PARITY_CASE_DIRS = (
    (Path("gen/addons/oci-hub-models/hub_a"), Path("addons/oci-hub-models/hub_a")),
    (Path("gen/addons/oci-hub-models/hub_b"), Path("addons/oci-hub-models/hub_b")),
    (Path("gen/addons/oci-hub-models/hub_c"), Path("addons/oci-hub-models/hub_c")),
    (Path("gen/addons/oci-hub-models/hub_e"), Path("addons/oci-hub-models/hub_e")),
)

PARITY_CASE_DIRS = (
    (Path("gen/blueprints/one-oe/runtime/one-stack"), Path("blueprints/one-oe/runtime/one-stack")),
    (
        Path("gen/workload-extensions/oke/simple/single-stack"),
        Path("workload-extensions/oke/simple/single-stack"),
    ),
    (
        Path("gen/workload-extensions/oke/simple/multi-stack"),
        Path("workload-extensions/oke/simple/multi-stack"),
    ),
) + ADDON_PARITY_CASE_DIRS


class DirectEntrypointParityTests(unittest.TestCase):
    def test_published_jsonnet_entrypoints_match_checked_in_outputs(self) -> None:
        for gen_dir, published_dir in PARITY_CASE_DIRS:
            jsonnet_files = sorted((REPO_ROOT / gen_dir).glob("*.jsonnet"))
            self.assertTrue(
                jsonnet_files,
                f"no jsonnet entrypoints found in {gen_dir.as_posix()}",
            )
            expected_published_files = {f"{jsonnet_file.stem}.json" for jsonnet_file in jsonnet_files}
            actual_published_files = {
                published_file.name for published_file in (REPO_ROOT / published_dir).glob("*.json")
            }
            self.assertEqual(
                expected_published_files,
                actual_published_files,
                f"published outputs mismatch for {published_dir.as_posix()}",
            )
            for jsonnet_file in jsonnet_files:
                with self.subTest(jsonnet=jsonnet_file.relative_to(REPO_ROOT).as_posix()):
                    published_file = REPO_ROOT / published_dir / f"{jsonnet_file.stem}.json"
                    self.assertTrue(
                        published_file.exists(),
                        f"missing checked-in output for {jsonnet_file.relative_to(REPO_ROOT).as_posix()}",
                    )
                    actual = render_formatted_json(jsonnet_file.relative_to(REPO_ROOT))
                    self.assertEqual(actual, published_file.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
