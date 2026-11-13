"""Shared SQL installation, OCI authentication and input helpers for the FinOps add-on."""

from __future__ import annotations
import base64
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from urllib.parse import quote


DEPLOYMENT_DIR = Path(__file__).resolve().parent.parent


REPO_ROOT = DEPLOYMENT_DIR.parent


INSTALL_DIR = DEPLOYMENT_DIR / "sql" / "install"


LOG_DIR = DEPLOYMENT_DIR / "logs"


OPTIONAL_INSTALLERS = (
    ("oci_tag_values", "02_providers/OCI/01_tags/01_tag_values/01_install_oci_tag_values.sql", ()),
    ("oci_budgets", "02_providers/OCI/03_budgets/03_install_oci_budgets.sql", ()),
    ("oci_cloud_advisor", "02_providers/OCI/04_cloud_advisor/04_install_oci_cloud_advisor.sql", ()),
    ("oci_cost_anomalies", "02_providers/OCI/05_cost_anomalies/05_install_oci_cost_anomalies.sql", ()),
    ("oci_forecast", "02_providers/OCI/06_forecast/06_install_oci_forecast.sql", ()),
)


class DeploymentError(Exception):
    pass


OPTIONAL_MODULE_LABELS = {
    "oci_tag_values": "Historical tag value extraction",
    "oci_budgets": "Budgets",
    "oci_cloud_advisor": "Cloud Advisor",
    "oci_cost_anomalies": "Cost Anomalies",
    "oci_forecast": "Native Forecast",
}


def validate_database_password(password: str, purpose: str = "database") -> str:
    """Preserve the password; Oracle enforces the account's password profile."""
    if not isinstance(password, str) or not password:
        raise DeploymentError(f"The {purpose} password must not be empty.")
    if any(character in password for character in ('"', '\r', '\n')):
        raise DeploymentError(
            f"The {purpose} password contains a double quote or return character, "
            "which Oracle password syntax does not allow."
        )
    return password


def redact_passwords(output: str, passwords: list[str]) -> str:
    """Mask both raw credentials and the escaped literals SQL*Plus may echo."""
    values = {form for password in passwords if password
              for form in (password, password.replace("'", "''"))}
    for value in sorted(values, key=len, reverse=True):
        output = output.replace(value, "[REDACTED]")
    return output


def prompt_value(label: str, default: str | None = None, required: bool = True) -> str:
    suffix = f" [{default}]" if default not in (None, "") else ""
    while True:
        value = input(f"{label}{suffix}: ").strip()
        if value:
            return value
        if default not in (None, ""):
            return default
        if not required:
            return ""
        print("This value is required.")


def prompt_yes_no(label: str, default: bool) -> bool:
    hint = "Y/n" if default else "y/N"
    while True:
        value = input(f"{label} [{hint}]: ").strip().casefold()
        if not value:
            return default
        if value in ("y", "yes"):
            return True
        if value in ("n", "no"):
            return False
        print("Enter y or n.")


def prompt_integer(label: str, default: int, minimum: int, maximum: int | None = None) -> int:
    while True:
        raw_value = prompt_value(label, str(default))
        try:
            value = int(raw_value)
        except ValueError:
            print("Enter a whole number.")
            continue
        if value < minimum or (maximum is not None and value > maximum):
            limit = f" and at most {maximum}" if maximum is not None else ""
            print(f"The value must be at least {minimum}{limit}.")
            continue
        return value


def make_log_path(prefix: str) -> Path:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return LOG_DIR / f"{stamp}-{prefix}.log"


def stream_to_console_and_log(proc: subprocess.Popen, log_path: Path, passwords: list[str] | None = None) -> int:
    with log_path.open("w", encoding="utf-8") as log:
        if proc.stdout is None:
            raise DeploymentError("Could not capture process output.")
        for line in proc.stdout:
            line = redact_passwords(line, passwords or [])
            sys.stdout.write(line)
            sys.stdout.flush()
            log.write(line)
    return proc.wait()


def validate_tag_spec(spec: dict) -> None:
    if not isinstance(spec, dict) or type(spec.get("schema_version")) is not int or spec["schema_version"] != 1:
        raise DeploymentError("Tag specification requires schema_version 1.")
    if set(spec) - {"schema_version", "profile_name", "mode", "namespace", "tags"}:
        raise DeploymentError("Unknown tag specification field.")
    if not isinstance(spec.get("profile_name"), str) or not re.fullmatch(r"[A-Z][A-Z0-9_]{0,127}", spec["profile_name"]):
        raise DeploymentError("profile_name must use 1 to 128 uppercase letters, digits or underscores and start with a letter.")
    def check_name(value):
        if not isinstance(value, str) or not value or len(value) > 100 or any(ord(c) < 32 for c in value):
            raise DeploymentError("Namespace and tag names must be nonempty names of at most 100 characters.")
    if spec.get("mode") == "NAMESPACE":
        if "tags" in spec:
            raise DeploymentError("Use namespace OR tags, never both.")
        check_name(spec.get("namespace"))
    elif spec.get("mode") == "TAG_LIST":
        tags = spec.get("tags")
        if "namespace" in spec or not isinstance(tags, list) or not 1 <= len(tags) <= 9999:
            raise DeploymentError("TAG_LIST requires 1 to 9999 entries and no namespace field.")
        seen = set()
        for item in tags:
            if not isinstance(item, dict) or set(item) != {"namespace", "tag"}:
                raise DeploymentError("Each tag entry requires namespace and tag only.")
            check_name(item["namespace"])
            check_name(item["tag"])
            key = (item["namespace"], item["tag"])
            if key in seen:
                raise DeploymentError("Duplicate tag in the requested list.")
            seen.add(key)
    else:
        raise DeploymentError("Tag mode must be NAMESPACE or TAG_LIST.")


def database_sql_parameters(config: dict) -> dict:
    """Public, non-secret contract shared by direct SQL and Python."""
    d = config["deployment"]
    namespace = d.get("tag_profile_namespace", "tagns-lz-cost-governance")
    profile = d.get("tag_profile") or {
        "schema_version": 1,
        "profile_name": "DEFAULT_COST_GOVERNANCE" if namespace == "tagns-lz-cost-governance" else "CUSTOM_COST_REPORTING",
        "mode": "NAMESPACE", "namespace": namespace,
    }
    validate_tag_spec(profile)
    mode = d.get("installation_mode", "LANDING_ZONE")
    if mode not in ("LANDING_ZONE", "STANDALONE"):
        raise DeploymentError("installation_mode must be LANDING_ZONE or STANDALONE.")
    source = dict(d.get("oci_focus_source", {"mode": "ORACLE_MANAGED"}))
    source["prefix"] = quote(str(source.get("prefix", "")).strip("/"), safe="/-._~")
    return {
        "schema_version": 1, "installation_mode": mode,
        "oci_realm_domain": d.get("oci_realm_domain") or source.get("realm_domain"),
        "notifications_topic_ocid": (d.get("notifications_topic_ocid") or "").strip() or None,
        "scheduler_time_zone": d.get("scheduler_time_zone", "UTC"),
        "first_focus_year": d.get("first_focus_year"), "focus_source": source,
        "tag_profile": profile,
        "candidate_run_id": d.get("candidate_run_id"),
    }


def sql_parameter_commands(config: dict) -> list[str]:
    payload = json.dumps(database_sql_parameters(config), ensure_ascii=True)
    # Bound CLOB built from short literals; no substitution or process arguments.
    chunks = [payload[i:i + 750].replace("'", "''") for i in range(0, len(payload), 750)]
    commands = ["@00_schema/00_set_install_parameters.sql", "BEGIN", ":fp_install_config := TO_CLOB('');"]
    commands.extend(f":fp_install_config := :fp_install_config || TO_CLOB('{chunk}');" for chunk in chunks)
    return commands + ["END;", "/"]


def run_sqlplus(
    config: dict,
    phase: str,
    username: str,
    password: str,
    steps: list[tuple[str, list[str]]],
    tns_admin: Path | None = None,
) -> None:
    settings = config["deployment"]
    sqlplus = shutil.which(settings.get("sqlplus", "sqlplus"))
    if not sqlplus:
        raise DeploymentError("SQL*Plus was not found on PATH.")
    alias = settings.get("connect_alias")
    if alias is None:
        alias_key = "admin_connect_alias" if phase == "admin" else "schema_connect_alias"
        alias = settings[alias_key]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", alias):
        raise DeploymentError(f"SQL*Plus alias '{alias}' contains unsupported characters.")
    validate_database_password(password)
    # Module inputs are binds; leave substitution disabled throughout.
    commands = [
        "SET ECHO OFF",
        "SET VERIFY OFF",
        "SET DEFINE OFF",
        f'CONNECT {username}/"{password}"@{alias}',
    ]
    commands.extend(sql_parameter_commands(config))
    for script, prompts in steps:
        if script == "00_schema/00_create_focusplatform_schema.sql":
            if len(prompts) != 2:
                raise DeploymentError("Schema bootstrap requires two password inputs.")
            for bind, value in zip(("fp_focus_password", "fp_reader_password"), prompts):
                validate_database_password(value, bind)
                literal = value.replace("'", "''")
                commands.extend([f"BEGIN :{bind} := '{literal}'; END;", "/"])
        elif prompts:
            raise DeploymentError("SQL modules no longer accept interactive answer streams.")
        commands.append(f"@{script}")
    commands.append("EXIT SUCCESS")
    log_path = make_log_path(f"database-{phase}")
    child_env = os.environ.copy()
    if tns_admin is not None:
        child_env["TNS_ADMIN"] = str(tns_admin)
    proc = subprocess.Popen(
        [sqlplus, "-s", "/nolog"],
        cwd=INSTALL_DIR,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=child_env,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    assert proc.stdin is not None
    try:
        proc.stdin.write("\n".join(commands) + "\n")
        proc.stdin.flush()
        proc.stdin.close()
    except BrokenPipeError:
        pass
    passwords = [password] + [value for _, prompts in steps for value in prompts]
    result = stream_to_console_and_log(proc, log_path, passwords)
    print(f"Local log: {log_path.relative_to(REPO_ROOT)}")
    if result:
        raise DeploymentError(f"SQL*Plus exited with code {result}; fix the error before continuing.")


def selected_database_scripts(config: dict) -> list[tuple[str, list[str]]]:
    params = database_sql_parameters(config)
    profile = params["tag_profile"]
    if params["installation_mode"] == "LANDING_ZONE" and (
        profile.get("mode") != "NAMESPACE" or profile.get("namespace") != "tagns-lz-cost-governance"
        or profile.get("profile_name") != "DEFAULT_COST_GOVERNANCE"
    ):
        raise DeploymentError("Initial Landing Zone installation requires its governance profile.")
    modules = config["modules"]
    deployment = config["deployment"]
    focus_source = deployment.get("oci_focus_source", {})
    source_mode = str(focus_source.get("mode", "ORACLE_MANAGED")).upper()
    steps = [
        ("01_core/01_install_finops_common_core.sql", []),
        ("02_providers/OCI/00_ingestion/00_install_oci_ingestion.sql", []),
        (
            "02_providers/OCI/01_tags/00_catalog_profile/00_install_oci_tag_catalog_profile.sql",
            [],
        ),
        ("02_providers/OCI/02_account_contracts/02_install_oci_account_contracts.sql", []),
    ]
    for name, installer, _dependencies in OPTIONAL_INSTALLERS:
        if modules.get(name, False):
            steps.append((installer, []))
    if modules.get("oac_cost_detail", False):
        steps.append(("03_visualization/OAC/00_install_oac_oci_focus_cost_detail.sql", []))
    steps.append(("02_providers/OCI/00_ingestion/01_start_oci_focus_pipelines.sql", []))
    return steps


def load_oci_sdk(auth_method: str, profile_name: str, region: str | None = None):
    try:
        import oci
    except ImportError as exc:
        raise DeploymentError("The OCI Python SDK is missing. Install it with: python -m pip install -r deployment/database-installation/python/requirements.txt") from exc
    try:
        method = auth_method.upper()
        if method == "API_KEY":
            sdk_config = oci.config.from_file(profile_name=profile_name)
            if region:
                sdk_config["region"] = region
            oci.config.validate_config(sdk_config)
            signer = None
        elif method == "SECURITY_TOKEN":
            sdk_config = oci.config.from_file(profile_name=profile_name)
            if region:
                sdk_config["region"] = region
            token_path = sdk_config.get("security_token_file")
            key_path = sdk_config.get("key_file")
            if not token_path or not key_path:
                raise DeploymentError(
                    f"OCI profile '{profile_name}' must contain security_token_file and key_file for session-token authentication."
                )
            token = Path(token_path).expanduser().read_text(encoding="utf-8").strip()
            if not token:
                raise DeploymentError("The OCI session token file is empty. Refresh the session with the OCI CLI.")
            private_key = oci.signer.load_private_key_from_file(
                key_path, pass_phrase=sdk_config.get("pass_phrase")
            )
            signer = oci.auth.signers.SecurityTokenSigner(token, private_key)
        elif method == "INSTANCE_PRINCIPAL":
            signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
            sdk_config = {"tenancy": signer.tenancy_id}
            if region:
                sdk_config["region"] = region
        else:
            raise DeploymentError("OCI authentication must be API_KEY, SECURITY_TOKEN, or INSTANCE_PRINCIPAL.")
    except Exception as exc:
        if isinstance(exc, DeploymentError):
            raise
        raise DeploymentError(f"Could not initialize OCI authentication with {auth_method}: {exc}") from exc
    return oci, sdk_config, signer


def read_password_from_vault(secret_id: str, purpose: str, oci_module, sdk_config: dict, signer=None) -> str:
    try:
        if signer is None:
            secret_client = oci_module.secrets.SecretsClient(sdk_config)
        else:
            secret_client = oci_module.secrets.SecretsClient({"region": sdk_config.get("region")}, signer=signer)
        response = secret_client.get_secret_bundle(secret_id=secret_id, stage="CURRENT")
        encoded = response.data.secret_bundle_content.content
        password = base64.b64decode(encoded, validate=True).decode("utf-8")
    except Exception as exc:
        raise DeploymentError(
            f"Could not read the OCI Vault Secret for {purpose}; check the OCID, region, and IAM permissions."
        ) from exc
    return validate_database_password(password, purpose)
