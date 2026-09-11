from __future__ import annotations

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from tests.gen.helpers import REPO_ROOT


class GenerateAtomicityTests(unittest.TestCase):
    def test_failed_default_render_preserves_existing_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            test_repo = Path(tmpdir)
            gen_dir = test_repo / "gen"
            gen_dir.mkdir()
            (test_repo / ".git" / "hooks").mkdir(parents=True)
            (test_repo / ".githooks").mkdir()

            shutil.copy2(REPO_ROOT / "gen" / "generate.sh", gen_dir / "generate.sh")
            shutil.copy2(
                REPO_ROOT / "gen" / "format_json.py", gen_dir / "format_json.py"
            )

            (gen_dir / "broken.jsonnet").write_text("{ broken: }\n", encoding="utf-8")
            generated_file = test_repo / "broken.json"
            original_content = '{"preserved": true}\n'
            generated_file.write_text(original_content, encoding="utf-8")
            env = os.environ.copy()
            env["JSONNET_BIN"] = "jsonnet"

            proc = subprocess.run(
                ["bash", "gen/generate.sh"],
                cwd=test_repo,
                text=True,
                capture_output=True,
                check=False,
                env=env,
            )

            self.assertNotEqual(0, proc.returncode)
            self.assertEqual(original_content, generated_file.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
