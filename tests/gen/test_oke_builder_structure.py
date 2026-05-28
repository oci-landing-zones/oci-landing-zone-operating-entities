from pathlib import Path
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
OKE_SIMPLE_DIR = REPO_ROOT / "gen/workload-extensions/oke/simple"


class OkeBuilderStructureTests(unittest.TestCase):
    def test_oke_builder_is_small_wrapper_over_output_builders(self) -> None:
        output_builder_names = (
            "oke_workers",
            "oke_clusters",
            "oke_network",
            "oke_iam",
        )

        builder_text = (OKE_SIMPLE_DIR / "oke_builder.libsonnet").read_text(
            encoding="utf-8"
        )

        for builder_name in output_builder_names:
            builder_path = OKE_SIMPLE_DIR / f"{builder_name}.libsonnet"
            with self.subTest(output_builder=builder_name):
                self.assertTrue(builder_path.exists(), f"missing {builder_path}")
                self.assertIn(
                    f"import './{builder_name}.libsonnet'",
                    builder_text,
                    f"oke_builder.libsonnet must import {builder_name}.libsonnet",
                )
                self.assertNotIn(
                    "contribution(ctx)",
                    builder_path.read_text(encoding="utf-8"),
                    f"{builder_name}.libsonnet should expose a top-level output builder",
                )

        self.assertLessEqual(
            len(builder_text.splitlines()),
            160,
            "oke_builder.libsonnet should remain an orchestration wrapper",
        )

    def test_published_oke_profiles_and_output_builders_are_separate(self) -> None:
        stack_names = ("single-stack", "multi-stack")

        for stack_name in stack_names:
            stack_dir = OKE_SIMPLE_DIR / stack_name
            with self.subTest(stack=stack_name):
                self.assertTrue((stack_dir / "profiles.libsonnet").exists())
                self.assertTrue((stack_dir / "output_builder.libsonnet").exists())

            for entrypoint in sorted(stack_dir.glob("*.jsonnet")):
                text = entrypoint.read_text(encoding="utf-8")
                with self.subTest(entrypoint=entrypoint.relative_to(REPO_ROOT).as_posix()):
                    self.assertIn("import './profiles.libsonnet'", text)
                    self.assertIn("import './output_builder.libsonnet'", text)
                    self.assertNotIn("landing_zone.libsonnet", text)
                    self.assertNotIn("published.libsonnet", text)


if __name__ == "__main__":
    unittest.main()
