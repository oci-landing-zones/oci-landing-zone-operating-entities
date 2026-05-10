from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
GEN_DIR = REPO_ROOT / "gen"


def ensure_gen_on_path() -> None:
    gen_dir = str(GEN_DIR)
    if gen_dir not in sys.path:
        sys.path.insert(0, gen_dir)


def run_cmd(
    cmd: list[str], *, input_text: Optional[str] = None, expect_success: bool = True
) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(
        cmd,
        cwd=REPO_ROOT,
        input=input_text,
        text=True,
        capture_output=True,
        check=False,
    )
    if expect_success and proc.returncode != 0:
        raise AssertionError(
            f"Command failed with exit code {proc.returncode}: {' '.join(cmd)}\n"
            f"stderr:\n{proc.stderr}\n"
            f"stdout:\n{proc.stdout}"
        )
    return proc


def render_config_outputs(config_file: Path) -> dict[str, dict]:
    config_path = (REPO_ROOT / config_file).resolve()
    with tempfile.TemporaryDirectory() as tmpdir:
        run_cmd(
            [
                "jsonnet",
                "--multi",
                f"{tmpdir}/",
                "--tla-code-file",
                f"config={config_path}",
                "gen/landing_zone_multi.jsonnet",
            ]
        )

        outputs: dict[str, dict] = {}
        for rendered_file in sorted(Path(tmpdir).glob("*.json")):
            outputs[rendered_file.name] = json.loads(rendered_file.read_text(encoding="utf-8"))
        return outputs


def render_config_failure(config_file: Path) -> str:
    config_path = (REPO_ROOT / config_file).resolve()
    with tempfile.TemporaryDirectory() as tmpdir:
        proc = run_cmd(
            [
                "jsonnet",
                "--multi",
                f"{tmpdir}/",
                "--tla-code-file",
                f"config={config_path}",
                "gen/landing_zone_multi.jsonnet",
            ],
            expect_success=False,
        )
    if proc.returncode == 0:
        raise AssertionError(
            f"Expected config render to fail but command succeeded: {' '.join(proc.args)}"
        )
    return proc.stderr or proc.stdout


def normalize_jsonnet_error(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        if "ERROR:" in line:
            message = line.split("ERROR:", 1)[1].strip()
            return re.sub(r"\s+", " ", message)
    if not lines:
        return ""
    return re.sub(r"\s+", " ", lines[0])


def render_direct_failure_message(jsonnet_file: Path) -> str:
    jsonnet_path = (REPO_ROOT / jsonnet_file).resolve()
    proc = run_cmd(
        ["jsonnet", "-J", str(REPO_ROOT), str(jsonnet_path)],
        expect_success=False,
    )
    if proc.returncode == 0:
        raise AssertionError(
            f"Expected direct render to fail but command succeeded: {' '.join(proc.args)}"
        )
    return normalize_jsonnet_error(proc.stderr or proc.stdout)


def render_config_failure_message(config_file: Path) -> str:
    return normalize_jsonnet_error(render_config_failure(config_file))


def render_jsonnet_object(jsonnet_file: Path) -> dict:
    jsonnet_path = (REPO_ROOT / jsonnet_file).resolve()
    proc = run_cmd(["jsonnet", "-J", str(REPO_ROOT), str(jsonnet_path)])
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise AssertionError(
            f"jsonnet output is not valid JSON for {jsonnet_file}: {exc}\nOutput:\n{proc.stdout}"
        ) from exc


def render_canonical_json(jsonnet_file: Path) -> str:
    rendered = render_jsonnet_object(jsonnet_file)
    return json.dumps(rendered, indent=2) + "\n"


def render_text_for_contains(jsonnet_file: Path) -> str:
    rendered = render_jsonnet_object(jsonnet_file)
    if isinstance(rendered, str):
        return rendered
    return json.dumps(rendered, indent=2) + "\n"


@dataclass
class FixtureDirectives:
    contains: list[str] = field(default_factory=list)
    error_contains: list[str] = field(default_factory=list)


def parse_fixture_directives(jsonnet_file: Path) -> FixtureDirectives:
    content = (REPO_ROOT / jsonnet_file).read_text(encoding="utf-8")
    directives = FixtureDirectives()
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("//"):
            body = stripped[2:].strip()
            if not body:
                continue
            key, sep, value = body.partition(":")
            if not sep:
                continue
            key = key.strip()
            value = value.strip()
            if not value:
                raise AssertionError(
                    f"{jsonnet_file.name}: directive '{key}' requires a non-empty value"
                )
            if key == "contains":
                directives.contains.append(value)
            elif key == "error_contains":
                directives.error_contains.append(value)
            continue
        break
    return directives
