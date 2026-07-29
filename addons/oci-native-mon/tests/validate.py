#!/usr/bin/env python3
"""Validate the OCI native database observability add-on contracts."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).parents[1]
PIN = "v0.3.1"
COMMIT = "1e54f354f6a79fd0279f95413b88aed75013bdc7"
errors: list[str] = []

json_paths = set(ROOT.rglob("*.json")) | set(ROOT.rglob("*.json.template"))
for path in sorted(json_paths):
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{path.relative_to(ROOT)}: invalid JSON: {exc}")

spec_path = Path(sys.argv[1]) if len(sys.argv) == 2 else ROOT / "addon-spec.json"
spec = json.loads(spec_path.read_text(encoding="utf-8"))


def exact_keys(document: object, expected: set[str], location: str) -> bool:
    if not isinstance(document, dict):
        errors.append(f"{location}: must be an object")
        return False
    if set(document) != expected:
        errors.append(f"{location}: expected keys {sorted(expected)}")
        return False
    return True


exact_keys(
    spec,
    {"schema_version", "name", "module", "scale", "products", "target_catalog"},
    "spec",
)
exact_keys(
    spec.get("module"),
    {"source", "version", "commit", "role"},
    "spec.module",
)
exact_keys(
    spec.get("scale"),
    {
        "maximum_targets_per_manifest",
        "maximum_targets_per_wave",
        "state_boundary",
    },
    "spec.scale",
)
if exact_keys(
    spec.get("products"),
    {"database_management", "operations_insights", "log_analytics"},
    "spec.products",
):
    for name, product in spec["products"].items():
        allowed = {"platforms", "requires", "foundation_only"}
        required = {"platforms"}
        if not isinstance(product, dict) or not required <= set(product) or set(product) - allowed:
            errors.append(f"spec.products.{name}: invalid product shape")
            continue
        for field in set(product) & allowed:
            values = product[field]
            if (
                not isinstance(values, list)
                or any(not isinstance(value, str) or not value for value in values)
                or len(values) != len(set(values))
            ):
                errors.append(f"spec.products.{name}.{field}: must be unique strings")

if spec.get("schema_version") != "1.0" or spec.get("name") != (
    "oci-native-database-observability"
):
    errors.append("addon-spec.json: identity contract drift")
module = spec.get("module", {})
scale = spec.get("scale", {})
products = spec.get("products", {})
if module.get("source") != (
    "github.com/adibirzu/terraform-oci-database-observability"
):
    errors.append("addon-spec.json: unexpected module source")
if module.get("version") != PIN:
    errors.append("addon-spec.json: unexpected module pin")
if module.get("commit") != COMMIT:
    errors.append("addon-spec.json: unexpected module commit")
if not re.fullmatch(r"[0-9a-f]{40}", str(module.get("commit", ""))):
    errors.append("addon-spec.json: module commit must be a full SHA")
if module.get("role") != "landing_zone_automation_dependency":
    errors.append("addon-spec.json: module role must remain LZ automation only")
if scale != {
    "maximum_targets_per_manifest": 1000,
    "maximum_targets_per_wave": 200,
    "state_boundary": "one OCI Resource Manager stack state per wave",
}:
    errors.append("addon-spec.json: scale contract drift")
if products.get("operations_insights", {}).get("requires") != [
    "database_management"
]:
    errors.append("addon-spec.json: OPSI dependency contract drift")
if "AUTONOMOUS_DATABASE" not in products.get("log_analytics", {}).get(
    "foundation_only", []
):
    errors.append("addon-spec.json: Autonomous boundary drift")
expected_catalog = {
    "Autonomous database": "scenario-autonomous-databases/terraform",
    "Base Database": "scenario-base-databases/terraform",
    "EXACS": "scenario-exacs-databases/terraform",
    "EXACC": "scenario-exacc-databases/terraform",
    "External Databases": "scenario-external-databases/terraform",
}
if spec.get("target_catalog") != expected_catalog:
    errors.append("addon-spec.json: Database Management target catalog drift")
required_root_files = {
    ".terraform.lock.hcl",
    "README.md",
    "main.tf",
    "outputs.tf",
    "providers.tf",
    "schema.yaml",
    "terraform.auto.tfvars.json.template",
    "variables.tf",
    "versions.tf",
}
for path in expected_catalog.values():
    target_root = ROOT / path
    if not target_root.is_dir():
        errors.append(f"addon-spec.json: missing Terraform target root {path}")
        continue
    missing = required_root_files - {entry.name for entry in target_root.iterdir()}
    if missing:
        errors.append(
            f"addon-spec.json: incomplete Terraform target root {path}: "
            f"missing {sorted(missing)}"
        )
    hcl = "\n".join(
        item.read_text(encoding="utf-8") for item in target_root.glob("*.tf")
    )
    if re.search(r'backend\s+"oci"', hcl):
        errors.append(f"{path}: must let OCI Resource Manager own backend state")
    if re.search(r'variable\s+"[^"]*password[^"]*"', hcl, re.IGNORECASE):
        errors.append(f"{path}: plaintext password variables are prohibited")

mapping = (ROOT / "database-management-addons.md").read_text(encoding="utf-8")
for target, path in expected_catalog.items():
    if target not in mapping or path not in mapping:
        errors.append(
            f"database-management-addons.md: missing catalog mapping for {target}"
        )

deployment_roots = {
    ROOT / "fleet-onboarding",
    ROOT / "foundation-policy",
    *(ROOT / path for path in expected_catalog.values()),
}
for deployment_root in sorted(deployment_roots):
    schema_path = deployment_root / "schema.yaml"
    if not schema_path.is_file() or schema_path.is_symlink():
        errors.append(
            f"{deployment_root.relative_to(ROOT)}: missing regular schema.yaml"
        )
        continue
    schema_text = schema_path.read_text(encoding="utf-8")
    if "\t" in schema_text:
        errors.append(f"{schema_path.relative_to(ROOT)}: YAML tabs are prohibited")
    for required_fragment in (
        "schemaVersion: 1.1.0",
        "allowViewState: false",
        "\nvariableGroups:",
        "\nvariables:",
    ):
        if required_fragment not in schema_text:
            errors.append(
                f"{schema_path.relative_to(ROOT)}: missing {required_fragment.strip()}"
            )
    group_section, _, variable_section = schema_text.partition("\nvariables:")
    grouped_variables = set(
        re.findall(r"^      - ([A-Za-z][A-Za-z0-9_]*)$", group_section, re.MULTILINE)
    )
    declared_schema_variables = set(
        re.findall(r"^  ([A-Za-z][A-Za-z0-9_]*):$", variable_section, re.MULTILINE)
    )
    unknown_grouped = grouped_variables - declared_schema_variables
    if unknown_grouped:
        errors.append(
            f"{schema_path.relative_to(ROOT)}: grouped variables are undeclared: "
            f"{sorted(unknown_grouped)}"
        )

main = (ROOT / "fleet-onboarding/main.tf").read_text(encoding="utf-8")
if f"?ref={COMMIT}" not in main:
    errors.append("fleet-onboarding/main.tf: module pin does not match specification")

literal_ocid = re.compile(r"ocid1\.[a-z0-9.-]+\.[a-z0-9]+", re.IGNORECASE)
for path in sorted(ROOT.rglob("*")):
    if not path.is_file() or path.suffix.lower() not in {".md", ".json", ".tf"}:
        continue
    text = path.read_text(encoding="utf-8")
    if literal_ocid.search(text):
        errors.append(f"{path.relative_to(ROOT)}: contains a tenancy-specific OCID")

for path in sorted(ROOT.rglob("*.md")):
    text = path.read_text(encoding="utf-8")
    for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
        if target.startswith(("http://", "https://", "#", "/")):
            continue
        relative = target.split("#", 1)[0]
        if relative and not (path.parent / relative).resolve().exists():
            errors.append(f"{path.relative_to(ROOT)}: broken link {target}")

if errors:
    print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
    raise SystemExit(1)

print("OCI native database observability add-on contracts are valid.")
