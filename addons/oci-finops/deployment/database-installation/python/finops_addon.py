#!/usr/bin/env python3
"""Install the FinOps add-on SQL modules in an existing ADB."""

from __future__ import annotations

import argparse
from copy import deepcopy
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from zipfile import ZipFile
from io import BytesIO

from finops_sql import (
    DeploymentError,
    OPTIONAL_INSTALLERS,
    OPTIONAL_MODULE_LABELS,
    load_oci_sdk,
    prompt_integer,
    prompt_value,
    prompt_yes_no,
    read_password_from_vault,
    validate_database_password,
    redact_passwords,
    run_sqlplus,
    selected_database_scripts,
    sql_parameter_commands,
    validate_tag_spec,
)


DEPLOYMENT_DIR = Path(__file__).resolve().parent.parent
SQL_INSTALL_DIR = DEPLOYMENT_DIR / "sql" / "install"
DEFAULT_CONFIG = DEPLOYMENT_DIR / "config" / "database-install.json"
EXAMPLE_CONFIG = DEPLOYMENT_DIR / "config" / "database-install.example.json"
TAG_PROFILE_NAMESPACE = "tagns-lz-cost-governance"
ADB_COMPARTMENT_NAME = "cmp-finops"
ADB_NAME_PREFIX = "adb-"
ADB_NAME_SUFFIX = "-lz-finops"
VAULT_COMPARTMENT_NAME = "cmp-lz-security"
VAULT_NAME = "vlt-lz-finops"
REQUIRED_SECRET_NAMES = {
    "admin_password_secret_id": "sec-lz-finops-adb-admin",
    "focusplatform_password_secret_id": "sec-lz-finops-adb-focus-platform",
    "oac_reader_password_secret_id": "sec-lz-finops-adb-oac-focus-reader",
}
TNS_ALIAS = "FOCUSPLATFORM"
OPTIONAL_MODULE_NAMES = tuple(OPTIONAL_MODULE_LABELS)
OPTIONAL_MODULE_PREFLIGHTS = {
    "oci_budgets": ("budgets_api", "Budgets API"),
    "oci_cloud_advisor": ("cloud_advisor_api", "Cloud Advisor API"),
    "oci_cost_anomalies": ("cost_anomalies_api", "Cost Anomaly API"),
    "oci_forecast": ("forecast_api", "Usage Forecast API"),
}

RESOURCE_PREFLIGHT_SQL = {
    "tag_catalog_api": (
        "02_providers/OCI/01_tags/00_catalog_profile/internal/00_preflight_tag_source.sql",
        "OCI tag source preflight passed",
    ),
    "account_contracts_api": (
        "02_providers/OCI/02_account_contracts/internal/00_preflight_oci_account_source.sql",
        "OCI account source preflight passed",
    ),
    "budgets_api": (
        "02_providers/OCI/03_budgets/internal/00_preflight_oci_budget_source.sql",
        "OCI Budgets source preflight passed",
    ),
    "cloud_advisor_api": (
        "02_providers/OCI/04_cloud_advisor/internal/00_preflight_oci_advisor_source.sql",
        "Cloud Advisor source preflight passed",
    ),
    "cost_anomalies_api": (
        "02_providers/OCI/05_cost_anomalies/internal/00_preflight_oci_anomaly_source.sql",
        "Cost Anomaly source preflight passed",
    ),
    "forecast_api": (
        "02_providers/OCI/06_forecast/internal/00_preflight_oci_forecast_source.sql",
        "OCI forecast source preflight passed",
    ),
}

MANDATORY_MODULES = (
    "foundation",
    "oci_ingestion",
    "oci_tag_catalog_profile",
    "oci_account_contracts",
    "oac_cost_detail",
)

MODULE_DETAILS = {
    "oci_tag_values": "Uses the mandatory tag catalog/profile; starts bounded historical extraction.",
    "oci_budgets": "Uses the tenancy and home region detected inside the ADB; starts a read-only sync.",
    "oci_cloud_advisor": "Uses the detected tenancy and region; starts a read-only sync.",
    "oci_cost_anomalies": "Uses the detected tenancy and region; starts a read-only sync.",
    "oci_forecast": "Uses the detected tenancy and region; starts a read-only sync.",
}


def load_database_config(path: Path) -> dict:
    if not path.is_file():
        raise DeploymentError(f"{path} does not exist. Run the configure command first.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DeploymentError(f"Could not read the database installation configuration: {exc}") from exc


def parse_optional_module_list(value: str) -> list[str]:
    names = [part.strip() for part in value.split(",")]
    valid_names = ", ".join(OPTIONAL_MODULE_NAMES)
    if not names or any(not name for name in names):
        raise ValueError(f"Provide comma-separated module names. Valid names: {valid_names}.")
    if len(set(names)) != len(names):
        raise ValueError("The module list contains duplicate names.")
    invalid = [name for name in names if name not in OPTIONAL_MODULE_NAMES]
    if invalid:
        raise ValueError(f"Unknown module name(s): {', '.join(invalid)}. Valid names: {valid_names}.")
    return names


def prompt_validated_value(label: str, validator, default: str | None = None, required: bool = True) -> str:
    while True:
        value = prompt_value(label, default, required=required)
        if not value and not required:
            return ""
        try:
            return validator(value)
        except (ValueError, DeploymentError) as exc:
            print(f"Invalid value: {exc}")


def require_pattern(value: str, pattern: str, description: str) -> str:
    if not re.fullmatch(pattern, value):
        raise ValueError(description)
    return value


def require_choice(value: str, choices: tuple[str, ...], description: str) -> str:
    normalized = value.upper()
    if normalized not in choices:
        raise ValueError(description)
    return normalized


def validate_time_zone(value: str) -> str:
    if value == "UTC":
        return value
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        raise ValueError("enter UTC or a valid IANA time zone such as Europe/Amsterdam.") from None
    return value


def validate_bucket_prefix(value: str) -> str:
    prefix = value.strip("/")
    if len(quote(prefix, safe="/-._~")) > 200 or any(ord(character) < 32 for character in prefix):
        raise ValueError("the prefix must URL-encode to at most 200 characters and contain no control characters.")
    return prefix


def verify_customer_bucket(oci_module, sdk_config: dict, signer, source: dict) -> None:
    bucket_config = dict(sdk_config)
    bucket_config["region"] = source["region"]
    try:
        client = (
            oci_module.object_storage.ObjectStorageClient(bucket_config, signer=signer)
            if signer
            else oci_module.object_storage.ObjectStorageClient(bucket_config)
        )
        client.get_bucket(namespace_name=source["namespace"], bucket_name=source["bucket"])
    except Exception as exc:
        status = getattr(exc, "status", None)
        if status in (401, 403):
            detail = "the selected OCI identity is not allowed to inspect it; check Object Storage permissions"
        elif status == 404:
            detail = "it was not found or is not visible to the selected OCI identity"
        else:
            detail = "OCI could not verify it; check the region, network connection, and OCI identity"
        raise DeploymentError(
            f"Could not verify customer bucket '{source['bucket']}' in namespace '{source['namespace']}': {detail}."
        ) from exc



def tenancy_identity(sdk_config: dict, signer) -> tuple[str, str]:
    tenancy = sdk_config.get("tenancy") or getattr(signer, "tenancy_id", None)
    match = re.fullmatch(r"ocid1[.]tenancy[.](oc[0-9]+)[.][A-Za-z0-9._-]+", str(tenancy or ""))
    if not match:
        raise DeploymentError("Could not determine the authenticated tenancy OCID.")
    return tenancy, match.group(1)


def resolve_bucket_region(oci_module, region: str, tenancy_realm: str) -> str:
    region = resolve_oci_region(oci_module, region)
    if oci_module.regions.get_realm_from_region(region) != tenancy_realm:
        raise DeploymentError("The bucket region must belong to the authenticated tenancy's realm.")
    return region


def discover_focus_bucket_defaults(oci_module, sdk_config: dict, signer) -> dict:
    tenancy, realm = tenancy_identity(sdk_config, signer)
    try:
        client = (oci_module.identity.IdentityClient(sdk_config, signer=signer)
                  if signer else oci_module.identity.IdentityClient(sdk_config))
        homes = [r.region_name for r in client.list_region_subscriptions(tenancy).data
                 if r.is_home_region]
        if len(homes) != 1:
            raise DeploymentError("Could not determine exactly one tenancy home region.")
        region = resolve_bucket_region(oci_module, homes[0], realm)
        domain = oci_module.regions.REALMS[realm]
    except DeploymentError:
        raise
    except Exception as exc:
        raise DeploymentError("Could not discover the report defaults; check tenancy/region read access.") from exc
    return {"region": region, "namespace": "bling", "bucket": tenancy,
            "prefix": "FOCUS Reports", "realm_domain": domain}


def verify_focus_bucket(oci_module, sdk_config: dict, signer, source: dict) -> None:
    if source["namespace"] != "bling":
        verify_customer_bucket(oci_module, sdk_config, signer, source)
        return
    bucket_config = dict(sdk_config, region=source["region"])
    try:
        client = (oci_module.object_storage.ObjectStorageClient(bucket_config, signer=signer)
                  if signer else oci_module.object_storage.ObjectStorageClient(bucket_config))
        # Oracle reporting access grants object reads, not bucket metadata reads.
        client.list_objects(source["namespace"], source["bucket"],
                            prefix=source["prefix"].strip("/") + "/" if source["prefix"] else "",
                            limit=1)
    except Exception as exc:
        raise DeploymentError("Could not list the report bucket; check its location and operator object-read permission.") from exc


def configure_focus_source(oci_module, sdk_config: dict, signer) -> dict:
    defaults = discover_focus_bucket_defaults(oci_module, sdk_config, signer)
    _, realm = tenancy_identity(sdk_config, signer)
    print("\n3. FOCUS report bucket")
    print("Defaults: Oracle-managed reports. Edit for your own bucket.")
    print("Expected layout: <prefix>/<year>/.../*.csv.gz")
    while True:
        source = {
            "region": prompt_validated_value(
                "Bucket region", lambda v: resolve_bucket_region(oci_module, v, realm), defaults["region"]),
            "namespace": prompt_validated_value(
                "Object Storage namespace", lambda v: require_pattern(
                    v, r"[A-Za-z0-9][A-Za-z0-9.-]{0,254}", "enter a valid namespace."),
                defaults["namespace"]),
            "bucket": prompt_validated_value(
                "Bucket name", lambda v: require_pattern(
                    v, r"[A-Za-z0-9][A-Za-z0-9._-]{0,254}", "enter a valid bucket name."),
                defaults["bucket"]),
            "prefix": prompt_validated_value(
                "Reports prefix (/ for bucket root)", validate_bucket_prefix,
                defaults["prefix"], required=False),
            "realm_domain": defaults["realm_domain"],
        }
        source["mode"] = "ORACLE_MANAGED" if source["namespace"] == "bling" else "CUSTOM_BUCKET"
        try:
            verify_focus_bucket(oci_module, sdk_config, signer, source)
            print("Bucket access verified. ADB access is checked during installation.")
            return source
        except DeploymentError as exc:
            print(exc)
            if not prompt_yes_no("Re-enter bucket settings?", True):
                raise
            defaults.update(source)


def resolved_focus_source(config: dict) -> dict:
    """Resolve legacy defaults and derive the endpoint domain from the OCI SDK."""
    source = dict(config["focus_source"])
    db = config["database"]
    oci_module, sdk_config, signer = load_oci_sdk(
        db["oci_auth_method"], db.get("oci_profile", ""), db["oci_region"])
    _, realm = tenancy_identity(sdk_config, signer)
    if source.get("mode") == "ORACLE_MANAGED" and not all(
            source.get(k) for k in ("region", "namespace", "bucket")):
        defaults = discover_focus_bucket_defaults(oci_module, sdk_config, signer)
        for key, value in defaults.items():
            if not source.get(key):
                source[key] = value
    source["region"] = resolve_bucket_region(oci_module, source["region"], realm)
    source["realm_domain"] = oci_module.regions.REALMS[realm]
    source["mode"] = "ORACLE_MANAGED" if source["namespace"] == "bling" else "CUSTOM_BUCKET"
    source["prefix"] = validate_bucket_prefix(source.get("prefix", ""))
    return source


def verify_notifications_topic(oci_module, sdk_config: dict, signer, topic_id: str) -> str:
    match = re.fullmatch(r"ocid1\.onstopic\.oc1\.([a-z0-9-]+)\.[A-Za-z0-9_-]+", topic_id)
    if not match:
        raise ValueError("enter a valid OCI Notifications topic OCID, or leave blank to disable notifications.")
    topic_region = resolve_oci_region(oci_module, match.group(1))
    topic_config = dict(sdk_config)
    topic_config["region"] = topic_region
    try:
        client = (
            oci_module.ons.NotificationControlPlaneClient(topic_config, signer=signer)
            if signer
            else oci_module.ons.NotificationControlPlaneClient(topic_config)
        )
        topic = client.get_topic(topic_id).data
    except Exception as exc:
        raise DeploymentError(
            "Could not verify this Notifications topic in OCI; check its OCID, region, lifecycle state, "
            "and the selected identity's permissions."
        ) from exc
    if getattr(topic, "lifecycle_state", None) != "ACTIVE":
        raise DeploymentError("The Notifications topic is not ACTIVE; enter an active topic OCID or leave blank.")
    return topic_id


def save_database_config(path: Path, config: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_name(path.name + ".tmp")
    try:
        temporary_path.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        os.replace(temporary_path, path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def configure_interactive(path: Path) -> dict:
    if path.exists():
        raise DeploymentError(f"{path} already exists; it will not be overwritten. Edit it manually or choose another path with --config.")
    try:
        config = deepcopy(json.loads(EXAMPLE_CONFIG.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError) as exc:
        raise DeploymentError(f"Could not load the database configuration template: {exc}") from exc

    db = config["database"]
    settings = config["settings"]
    print("FinOps Platform database installer")
    print("This installer installs the FinOps add-on in an existing ADB supplied by the Landing Zone.")

    print("\n1. OCI identity and Vault access")
    print("  1. API key profile on this host")
    print("  2. Session token profile on this host (short-lived)")
    print("  3. Instance Principal on OCI Compute")
    selection = prompt_value("Select an OCI authentication option", "2")
    methods = {"1": "API_KEY", "2": "SECURITY_TOKEN", "3": "INSTANCE_PRINCIPAL"}
    while selection not in methods:
        print("Choose 1, 2, or 3.")
        selection = prompt_value("Select an OCI authentication option", "2")
    db["oci_auth_method"] = methods[selection]
    if db["oci_auth_method"] == "INSTANCE_PRINCIPAL":
        db["oci_profile"] = ""
        print("Instance Principal uses the OCI Compute identity; no local OCI profile is needed.")
        oci_module, sdk_config, signer = load_oci_sdk(
            db["oci_auth_method"], db.get("oci_profile", "")
        )
    else:
        profile_default = db.get("oci_profile", "DEFAULT")
        while True:
            db["oci_profile"] = prompt_value("Local OCI profile", profile_default)
            try:
                oci_module, sdk_config, signer = load_oci_sdk(
                    db["oci_auth_method"], db.get("oci_profile", "")
                )
                break
            except DeploymentError as exc:
                print(f"Could not use that OCI profile: {exc}")
    while True:
        entered_region = prompt_value(
            "OCI region used for Vault and ADB lookup (for example, eu-frankfurt-1)",
            db.get("oci_region") or sdk_config.get("region", ""),
        )
        try:
            db["oci_region"] = resolve_oci_region(oci_module, entered_region)
            sdk_config["region"] = db["oci_region"]
            break
        except DeploymentError as exc:
            print(f"Invalid OCI region: {exc}")

    print(
        f"Checking required Vault '{VAULT_NAME}' in '{VAULT_COMPARTMENT_NAME}' and its password Secrets."
    )
    discovered_secrets = find_required_password_secrets(oci_module, sdk_config, signer)
    for config_key, secret_name in REQUIRED_SECRET_NAMES.items():
        db[config_key] = discovered_secrets[config_key]
        print(f"  Found active Secret: {secret_name}")

    print("\n2. Connection to the existing ADB")
    expected_adb_name = target_adb_name(oci_module, sdk_config.get("region", db["oci_region"]))
    print(
        f"Discovering the ADB named '{expected_adb_name}' in compartment "
        f"'{ADB_COMPARTMENT_NAME}' and downloading its wallet."
    )
    print("The wallet's HIGH descriptor will be copied unchanged to one new FOCUSPLATFORM TNS alias.")
    sqlplus_path = shutil.which("sqlplus")
    if not sqlplus_path:
        raise DeploymentError("SQL*Plus was not found on PATH. Install it before configuring the database installer.")
    db["sqlplus"] = sqlplus_path
    adb_id = find_target_adb_id(oci_module, sdk_config, signer, expected_adb_name)
    db["adb_id"] = adb_id
    db["tns_admin"] = str(
        download_wallet_and_add_alias(oci_module, sdk_config, signer, adb_id, expected_adb_name)
    )
    db["connect_alias"] = TNS_ALIAS
    print(f"Wallet is ready at {db['tns_admin']}; alias {TNS_ALIAS} was added without changing the HIGH descriptor.")
    tnsnames_path = Path(db["tns_admin"]) / "tnsnames.ora"
    print(f"TNS descriptor file: {tnsnames_path}")
    print(
        f"If Bastion or VPN is required, edit the {TNS_ALIAS} descriptor in that file before running install. "
        "The installer does not change the descriptor or test database connectivity."
    )

    config["focus_source"] = configure_focus_source(oci_module, sdk_config, signer)
    settings["first_focus_year"] = prompt_integer(
        "First FOCUS year to load", settings["first_focus_year"], 2024, datetime.now(timezone.utc).year
    )

    print("\n4. Mandatory database foundation settings")
    print("The foundation, ingestion, tag catalog/profile, account context, and OAC cost-detail modules are always installed.")
    settings["notifications_topic_ocid"] = prompt_validated_value(
        "Existing Notifications topic OCID (leave blank to disable email)",
        lambda value: verify_notifications_topic(oci_module, sdk_config, signer, value),
        settings.get("notifications_topic_ocid", ""),
        required=False,
    )
    settings["scheduler_time_zone"] = prompt_validated_value(
        "Time zone for scheduler jobs",
        validate_time_zone,
        settings.get("scheduler_time_zone", "UTC"),
    )
    settings["installation_mode"] = "LANDING_ZONE"
    settings["tag_profile_namespace"] = TAG_PROFILE_NAMESPACE
    settings.pop("tag_profile", None)
    print("Landing Zone installation uses Tags LZ Cost Governance. Later profile changes use the shared SQL profile operations.")

    print("\n5. Optional modules")
    print("These modules need no extra module-specific values in this installer; each uses the tenancy/region detected in the ADB and its documented defaults.")
    print("They do require the ADB Resource Principal to have the corresponding OCI API permissions. Their initial sync/backfill runs in the background.")
    for module, label in OPTIONAL_MODULE_LABELS.items():
        print(f"  {label}: {MODULE_DETAILS[module]}")
        config["modules"][module] = prompt_yes_no(f"Install {label}?", bool(config["modules"].get(module, False)))

    errors = validate_database_config(config)
    if errors:
        raise DeploymentError("The collected database configuration did not pass validation:\n" + "\n".join(errors))
    print("\nOptional module summary:")
    for module, label in OPTIONAL_MODULE_LABELS.items():
        print(f"  {'Install' if config['modules'][module] else 'Skip'}: {label}")
    if not prompt_yes_no("Save this database-only configuration locally?", True):
        raise DeploymentError("Configuration cancelled; no file was saved.")
    save_database_config(path, config)
    print(f"Database installation configuration saved locally: {path}")
    return config


def find_active_compartment_id(oci_module, sdk_config: dict, signer, compartment_name: str) -> str:
    tenancy_id = sdk_config.get("tenancy") or getattr(signer, "tenancy_id", None)
    if not tenancy_id:
        raise DeploymentError("The selected OCI identity did not provide a tenancy OCID for resource discovery.")
    try:
        identity = oci_module.identity.IdentityClient(sdk_config, signer=signer) if signer else oci_module.identity.IdentityClient(sdk_config)
        compartments = oci_module.pagination.list_call_get_all_results(
            identity.list_compartments,
            tenancy_id,
            compartment_id_in_subtree=True,
            access_level="ACCESSIBLE",
            lifecycle_state="ACTIVE",
        ).data
        matches = [item for item in compartments if item.name == compartment_name]
        if len(matches) != 1:
            raise DeploymentError(
                f"Required prerequisite compartment '{compartment_name}' must exist and be accessible exactly once; "
                f"found {len(matches)}. Create or resolve that compartment before running configure."
            )
        return matches[0].id
    except DeploymentError:
        raise
    except Exception as exc:
        raise DeploymentError(
            f"Could not discover compartment '{compartment_name}'; check the selected OCI identity and its permissions."
        ) from exc


def find_required_password_secrets(oci_module, sdk_config: dict, signer=None) -> dict[str, str]:
    compartment_id = find_active_compartment_id(
        oci_module, sdk_config, signer, VAULT_COMPARTMENT_NAME
    )
    try:
        kms_vault_client = (
            oci_module.key_management.KmsVaultClient(sdk_config, signer=signer)
            if signer
            else oci_module.key_management.KmsVaultClient(sdk_config)
        )
        secrets_management_client = (
            oci_module.vault.VaultsClient(sdk_config, signer=signer)
            if signer
            else oci_module.vault.VaultsClient(sdk_config)
        )
        vaults = oci_module.pagination.list_call_get_all_results(
            kms_vault_client.list_vaults,
            compartment_id,
        ).data
        matching_vaults = [
            vault for vault in vaults
            if vault.display_name == VAULT_NAME
            and vault.lifecycle_state == "ACTIVE"
        ]
        if len(matching_vaults) != 1:
            raise DeploymentError(
                f"Required prerequisite Vault '{VAULT_NAME}' must be ACTIVE exactly once in "
                f"'{VAULT_COMPARTMENT_NAME}'; found {len(matching_vaults)}. Create or resolve it before running configure."
            )

        listed_secrets = oci_module.pagination.list_call_get_all_results(
            secrets_management_client.list_secrets,
            compartment_id,
            vault_id=matching_vaults[0].id,
            lifecycle_state="ACTIVE",
        ).data
        found: dict[str, str] = {}
        for config_key, secret_name in REQUIRED_SECRET_NAMES.items():
            matches = [
                item for item in listed_secrets
                if item.secret_name == secret_name
                and item.lifecycle_state == "ACTIVE"
            ]
            if len(matches) != 1:
                raise DeploymentError(
                    f"Required prerequisite Secret '{secret_name}' must be ACTIVE exactly once in Vault "
                    f"'{VAULT_NAME}' ({VAULT_COMPARTMENT_NAME}); found {len(matches)}. "
                    "Create or resolve this Secret before running configure. Secret contents were not read."
                )
            found[config_key] = matches[0].id
        return found
    except DeploymentError:
        raise
    except Exception as exc:
        raise DeploymentError(
            f"Could not discover Vault '{VAULT_NAME}' and its required Secrets in '{VAULT_COMPARTMENT_NAME}'; "
            "check the selected OCI identity and permissions to inspect Vault and Secret metadata."
        ) from exc


def find_active_tag_namespaces(oci_module, sdk_config: dict, signer=None) -> list[str]:
    tenancy_id = sdk_config.get("tenancy") or getattr(signer, "tenancy_id", None)
    if not tenancy_id:
        raise DeploymentError("The selected OCI identity did not provide a tenancy OCID for Tag Namespace discovery.")
    try:
        identity = (
            oci_module.identity.IdentityClient(sdk_config, signer=signer)
            if signer
            else oci_module.identity.IdentityClient(sdk_config)
        )
        namespaces = oci_module.pagination.list_call_get_all_results(
            identity.list_tag_namespaces,
            tenancy_id,
            include_subcompartments=True,
            lifecycle_state="ACTIVE",
        ).data
        other_namespaces: list[str] = []
        for namespace in namespaces:
            if namespace.lifecycle_state != "ACTIVE" or namespace.name == TAG_PROFILE_NAMESPACE:
                continue
            active_tags = oci_module.pagination.list_call_get_all_results(
                identity.list_tags,
                namespace.id,
                lifecycle_state="ACTIVE",
            ).data
            if active_tags:
                other_namespaces.append(namespace.name)
        return sorted(set(other_namespaces), key=str.casefold)
    except Exception as exc:
        raise DeploymentError(
            "Could not list active Tag Namespaces in the tenancy; check OCI identity permissions to inspect "
            "Tag Namespaces and tag definitions."
        ) from exc


def resolve_oci_region(oci_module, region: str) -> str:
    region_value = region.strip().lower()
    if not region_value:
        raise DeploymentError("Enter a supported OCI region identifier or short region key.")
    try:
        region_api = oci_module.regions
        if region_api.is_region_short_name(region_value):
            canonical_region = region_api.get_region_from_short_name(region_value)
        elif region_api.is_region(region_value):
            canonical_region = region_value
        else:
            raise DeploymentError(
                f"'{region}' is not recognized by the OCI SDK. Enter a valid region such as eu-frankfurt-1."
            )
        if not region_api.is_region(canonical_region):
            raise DeploymentError(
                f"'{region}' could not be resolved to a supported OCI region. Check the identifier and try again."
            )
        return canonical_region
    except DeploymentError:
        raise
    except Exception as exc:
        raise DeploymentError(
            f"'{region}' could not be validated against the OCI region catalog. Check it and try again."
        ) from exc


def choose_tag_namespace(available_namespaces: list[str]) -> str:
    if not available_namespaces:
        raise DeploymentError(
            "No other ACTIVE Tag Namespace with active tag definitions was found in the tenancy. "
            "Use DEFAULT Tags LZ Cost Governance or create the required namespace and tags before configuring."
        )
    print("Other active Tag Namespaces with active tag definitions:")
    for name in available_namespaces:
        print(f"  {name}")
    while True:
        selection = prompt_value("Enter the exact name of the Tag Namespace to use", "")
        if selection in available_namespaces:
            return selection
        print("Enter one of the exact Tag Namespace names listed above.")


def target_adb_name(oci_module, region: str) -> str:
    regions = getattr(oci_module, "regions", None)
    short_names = getattr(regions, "REGIONS_SHORT_NAMES", {})
    if not regions or not isinstance(short_names, dict):
        raise DeploymentError("The installed OCI SDK does not expose its region short-name map.")

    try:
        region_id = regions.get_region_from_short_name(region.strip().lower())
    except Exception as exc:
        raise DeploymentError(
            f"Could not resolve OCI region '{region}' to its short region code using the OCI SDK."
        ) from exc

    short_codes = sorted(
        str(short_code).lower()
        for short_code, identifier in short_names.items()
        if str(identifier).casefold() == str(region_id).casefold()
    )
    if len(short_codes) != 1:
        raise DeploymentError(
            f"OCI region '{region}' does not have exactly one short region code in the installed OCI SDK; "
            "cannot derive the expected ADB name safely."
        )
    return f"{ADB_NAME_PREFIX}{short_codes[0]}{ADB_NAME_SUFFIX}"


def find_target_adb_id(oci_module, sdk_config: dict, signer=None, expected_name: str | None = None) -> str:
    compartment_id = find_active_compartment_id(
        oci_module, sdk_config, signer, ADB_COMPARTMENT_NAME
    )
    try:
        expected_name = expected_name or target_adb_name(
            oci_module, sdk_config.get("region", "")
        )
        database = oci_module.database.DatabaseClient(sdk_config, signer=signer) if signer else oci_module.database.DatabaseClient(sdk_config)
        databases = oci_module.pagination.list_call_get_all_results(
            database.list_autonomous_databases,
            compartment_id,
        ).data
        available = [
            item for item in databases
            if item.lifecycle_state == "AVAILABLE"
            and (
                expected_name.casefold() in {
                    str(name).casefold()
                    for name in (
                        getattr(item, "display_name", None),
                        getattr(item, "db_name", None),
                    )
                    if name
                }
            )
        ]
        if len(available) != 1:
            found_names = sorted(
                {
                    name
                    for item in available
                    for name in (
                        getattr(item, "display_name", None),
                        getattr(item, "db_name", None),
                    )
                    if name
                }
            )
            found_detail = f" Matching names: {', '.join(found_names)}." if found_names else ""
            raise DeploymentError(
                f"Required prerequisite ADB '{expected_name}' must be AVAILABLE exactly once in "
                f"'{ADB_COMPARTMENT_NAME}' for OCI region '{sdk_config.get('region', 'unknown')}'; "
                f"found {len(available)}.{found_detail} Create or resolve it before running configure."
            )
        return available[0].id
    except DeploymentError:
        raise
    except Exception as exc:
        raise DeploymentError(
            f"Could not discover the ADB in {ADB_COMPARTMENT_NAME}; check OCI identity and read permissions."
        ) from exc


def _descriptor_for_alias(tns_text: str, alias_name: str) -> str | None:
    entry_pattern = re.compile(r"(?im)^\s*([^\s=()]+)\s*=\s*")
    for match in entry_pattern.finditer(tns_text):
        if match.group(1).casefold() != alias_name.casefold():
            continue
        start = match.end()
        while start < len(tns_text) and tns_text[start].isspace():
            start += 1
        if start >= len(tns_text) or tns_text[start] != "(":
            return None
        depth = 0
        for index in range(start, len(tns_text)):
            if tns_text[index] == "(":
                depth += 1
            elif tns_text[index] == ")":
                depth -= 1
                if depth == 0:
                    return tns_text[start : index + 1]
        return None
    return None


def configure_wallet_sqlnet(wallet_dir: Path) -> None:
    sqlnet_path = wallet_dir / "sqlnet.ora"
    if not sqlnet_path.is_file():
        raise DeploymentError("The ADB wallet does not contain sqlnet.ora.")

    sqlnet_text = sqlnet_path.read_text(encoding="utf-8")
    wallet_directory = wallet_dir.resolve().as_posix()
    wallet_placeholder = re.compile(r'(?i)(\bDIRECTORY\s*=\s*)"?\?/network/admin"?')
    updated_sqlnet, replacements = wallet_placeholder.subn(
        lambda match: f'{match.group(1)}"{wallet_directory}"',
        sqlnet_text,
    )
    if replacements:
        backup_path = sqlnet_path.with_name("sqlnet.ora.bak")
        if not backup_path.exists():
            shutil.copy2(sqlnet_path, backup_path)
        sqlnet_path.write_text(updated_sqlnet, encoding="utf-8")


def download_wallet_and_add_alias(oci_module, sdk_config: dict, signer, adb_id: str, adb_name: str) -> Path:
    try:
        if not re.fullmatch(r"adb-[a-z0-9]+-lz-finops", adb_name, re.IGNORECASE):
            raise DeploymentError("The discovered ADB name cannot be used as a local wallet directory name.")
        wallet_dir = Path.home() / ".finops-platform" / "wallets" / adb_name.lower()
        wallet_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(wallet_dir.parent.parent, 0o700)
        os.chmod(wallet_dir.parent, 0o700)
        os.chmod(wallet_dir, 0o700)
        tns_path = wallet_dir / "tnsnames.ora"
        if tns_path.exists():
            tns_text = tns_path.read_text(encoding="utf-8")
        else:
            client = oci_module.database.DatabaseClient(sdk_config, signer=signer) if signer else oci_module.database.DatabaseClient(sdk_config)
            alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"
            password_chars = [secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), secrets.choice("23456789"), secrets.choice("!@#$%")]
            password_chars.extend(secrets.choice(alphabet) for _ in range(17))
            secrets.SystemRandom().shuffle(password_chars)
            wallet_password = "".join(password_chars)
            response = client.generate_autonomous_database_wallet(
                autonomous_database_id=adb_id,
                generate_autonomous_database_wallet_details=oci_module.database.models.GenerateAutonomousDatabaseWalletDetails(
                    password=wallet_password,
                    generate_type="SINGLE",
                ),
            )
            wallet_data = response.data
            # OCI's SDK returns streaming operations as a Response object whose
            # body is exposed through ``content``. Keep support for byte bodies
            # and file-like streams as well, so this works across SDK versions.
            if isinstance(wallet_data, (bytes, bytearray)):
                pass
            elif isinstance(getattr(wallet_data, "content", None), (bytes, bytearray)):
                wallet_data = wallet_data.content
            elif hasattr(wallet_data, "read"):
                wallet_data = wallet_data.read()
            if not isinstance(wallet_data, (bytes, bytearray)):
                raise DeploymentError("OCI returned the wallet in an unsupported response format.")
            with ZipFile(BytesIO(wallet_data)) as archive:
                members = archive.infolist()
                for member in members:
                    target = (wallet_dir / member.filename).resolve()
                    if wallet_dir.resolve() not in target.parents and target != wallet_dir.resolve():
                        raise DeploymentError("The wallet archive contains an unsafe file path.")
                archive.extractall(wallet_dir)
            tns_path = wallet_dir / "tnsnames.ora"
            if not tns_path.is_file():
                raise DeploymentError("The downloaded wallet does not contain tnsnames.ora.")
            tns_text = tns_path.read_text(encoding="utf-8")
        configure_wallet_sqlnet(wallet_dir)
        high_aliases = [
            match.group(1)
            for match in re.finditer(r"(?im)^\s*([^\s=()]+_high)\s*=", tns_text)
            if _descriptor_for_alias(tns_text, match.group(1))
        ]
        if len(high_aliases) != 1:
            raise DeploymentError(f"Expected exactly one HIGH entry in the wallet; found {len(high_aliases)}.")
        high_descriptor = _descriptor_for_alias(tns_text, high_aliases[0])
        existing = _descriptor_for_alias(tns_text, TNS_ALIAS)
        if existing and existing != high_descriptor:
            raise DeploymentError(
                f"The wallet already contains a different {TNS_ALIAS} entry; it was left unchanged."
            )
        if not existing:
            tns_path.write_text(tns_text.rstrip() + f"\n\n{TNS_ALIAS} = {high_descriptor}\n", encoding="utf-8")
        for file_path in wallet_dir.iterdir():
            if file_path.is_file():
                os.chmod(file_path, 0o600)
        return wallet_dir
    except DeploymentError:
        raise
    except Exception as exc:
        raise DeploymentError("Could not download or prepare the ADB wallet and HIGH TNS alias.") from exc


def validate_database_config(config: dict) -> list[str]:
    errors: list[str] = []
    db = config.get("database", {})
    source = config.get("focus_source", {})
    settings = config.get("settings", {})
    modules = config.get("modules", {})
    for module in MANDATORY_MODULES:
        if modules.get(module) is not True:
            errors.append(f"Mandatory module '{module}' must be enabled.")
    method = str(db.get("oci_auth_method", "")).upper()
    if method not in ("API_KEY", "SECURITY_TOKEN", "INSTANCE_PRINCIPAL"):
        errors.append("database.oci_auth_method must be API_KEY, SECURITY_TOKEN, or INSTANCE_PRINCIPAL.")
    if method != "INSTANCE_PRINCIPAL" and not str(db.get("oci_profile", "")).strip():
        errors.append("database.oci_profile is required for local OCI authentication.")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)+", str(db.get("oci_region", "")), re.IGNORECASE):
        errors.append("database.oci_region must be an OCI region name.")
    for key in ("admin_password_secret_id", "focusplatform_password_secret_id", "oac_reader_password_secret_id"):
        if not re.fullmatch(r"ocid1\.vaultsecret\.[A-Za-z0-9_.-]+", str(db.get(key, "")).strip()):
            errors.append(f"database.{key} must be an OCI Vault Secret OCID.")
    if db.get("connect_alias") != "FOCUSPLATFORM":
        errors.append("database.connect_alias must be FOCUSPLATFORM.")
    tns_admin = Path(str(db.get("tns_admin", "")).strip()).expanduser()
    tns_file = tns_admin / "tnsnames.ora"
    if not str(db.get("tns_admin", "")).strip() or not tns_file.is_file():
        errors.append("database.tns_admin must point to a wallet directory containing tnsnames.ora.")
    else:
        try:
            if not _descriptor_for_alias(tns_file.read_text(encoding="utf-8"), TNS_ALIAS):
                errors.append("The wallet tnsnames.ora does not contain the FOCUSPLATFORM alias.")
        except OSError:
            errors.append("The wallet tnsnames.ora could not be read.")
    if not str(db.get("sqlplus", "")).strip():
        errors.append("database.sqlplus is required.")
    source_mode = str(source.get("mode", "")).upper()
    if source_mode not in ("ORACLE_MANAGED", "CUSTOM_BUCKET"):
        errors.append("focus_source.mode must be ORACLE_MANAGED or CUSTOM_BUCKET.")
    elif source_mode == "CUSTOM_BUCKET" or any(source.get(k) for k in ("region", "namespace", "bucket")):
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)+", str(source.get("region", "")), re.IGNORECASE):
            errors.append("focus_source.region must be an OCI region name.")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]{0,254}", str(source.get("namespace", ""))):
            errors.append("focus_source.namespace is required and contains unsupported characters.")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,254}", str(source.get("bucket", ""))):
            errors.append("focus_source.bucket is required and contains unsupported characters.")
        prefix = str(source.get("prefix", "")).strip("/")
        if len(quote(prefix, safe="/-._~")) > 200 or any(ord(character) < 32 for character in prefix):
            errors.append("focus_source.prefix must URL-encode to at most 200 characters and contain no control characters.")
    year = settings.get("first_focus_year")
    if not isinstance(year, int) or year < 2024 or year > datetime.now(timezone.utc).year:
        errors.append("settings.first_focus_year must be a year between 2024 and the current UTC year.")
    zone = str(settings.get("scheduler_time_zone", "")).strip()
    if not re.fullmatch(r"UTC|[A-Za-z0-9_+-]+(?:/[A-Za-z0-9_+-]+)+", zone):
        errors.append("settings.scheduler_time_zone must be UTC or a regional time zone such as Europe/Amsterdam.")
    topic = str(settings.get("notifications_topic_ocid", "")).strip()
    if topic and not re.fullmatch(r"ocid1\.onstopic\.[A-Za-z0-9_.-]+", topic):
        errors.append("settings.notifications_topic_ocid does not look like a Notifications topic OCID.")
    tag_namespace = str(settings.get("tag_profile_namespace", "")).strip()
    if not settings.get("tag_profile") and not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", tag_namespace):
        errors.append("settings.tag_profile_namespace must be a valid Tag Namespace name, including the default namespace.")
    if settings.get("tag_profile"):
        try:
            validate_tag_spec(settings["tag_profile"])
        except DeploymentError as exc:
            errors.append(str(exc))
    return errors


def validate_admin_database_access(config: dict) -> None:
    db = config["database"]
    oci_module, sdk_config, signer = load_oci_sdk(
        db["oci_auth_method"], db.get("oci_profile", ""), db["oci_region"]
    )
    print("Checking access to the ADMIN password Secret in OCI Vault...")
    admin_password = read_password_from_vault(
        db["admin_password_secret_id"], "ADMIN", oci_module, sdk_config, signer
    )

    sqlplus = shutil.which(db["sqlplus"])
    if not sqlplus:
        raise DeploymentError("SQL*Plus was not found on PATH.")
    alias = db["connect_alias"]
    validate_database_password(admin_password, "ADMIN")

    success_marker = "FINOPS_ADB_VALIDATE_OK"
    commands = [
        "WHENEVER OSERROR EXIT FAILURE",
        "WHENEVER SQLERROR EXIT SQL.SQLCODE",
        "SET ECHO OFF",
        "SET VERIFY OFF",
        "SET HEADING OFF",
        "SET FEEDBACK OFF",
        "SET PAGESIZE 0",
        "SET DEFINE OFF",
        f'CONNECT ADMIN/"{admin_password}"@{alias}',
        f"SELECT '{success_marker}' FROM DUAL;",
        "EXIT SUCCESS",
    ]
    child_env = os.environ.copy()
    child_env["TNS_ADMIN"] = str(Path(db["tns_admin"]).expanduser())
    print("Testing a read-only SQL*Plus connection to the ADB as ADMIN...")
    try:
        result = subprocess.run(
            [sqlplus, "-L", "-s", "/nolog"],
            input="\n".join(commands) + "\n",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=child_env,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise DeploymentError(
            "The read-only ADMIN connection check timed out. Confirm that the Bastion/VPN route is active "
            "and the FOCUSPLATFORM TNS alias points to the reachable ADB endpoint."
        ) from exc
    except OSError as exc:
        raise DeploymentError("Could not start SQL*Plus for the read-only ADMIN connection check.") from exc

    safe_output = redact_passwords(result.stdout or "", [admin_password])
    if result.returncode != 0 or success_marker not in safe_output:
        oracle_errors = [
            line.strip()
            for line in safe_output.splitlines()
            if re.search(r"\b(?:ORA|TNS|SP2)-\d{5}\b", line, re.IGNORECASE)
        ]
        detail = f" Oracle reported: {'; '.join(oracle_errors)}" if oracle_errors else ""
        raise DeploymentError(
            "Could not verify SQL*Plus access to the ADB as ADMIN. Check the ADMIN Secret, wallet/TNS settings, "
            f"and active private route.{detail}"
        )
    print("ADMIN Secret access and read-only ADB connection verified. No database changes were made.")


def build_runtime_config(config: dict) -> dict:
    db = config["database"]
    settings = config["settings"]
    return {
        "deployment": {
            "region": db["oci_region"],
            "oci_auth_method": db["oci_auth_method"],
            "oci_profile": db.get("oci_profile", ""),
            "sqlplus": db["sqlplus"],
            "connect_alias": db["connect_alias"],
            "tns_admin": db["tns_admin"],
            "focusplatform_secret_id": db["focusplatform_password_secret_id"],
            "oac_reader_secret_id": db["oac_reader_password_secret_id"],
            "oci_focus_source": resolved_focus_source(config),
            "first_focus_year": settings["first_focus_year"],
            "notifications_topic_ocid": settings.get("notifications_topic_ocid", ""),
            "scheduler_time_zone": settings["scheduler_time_zone"],
            "tag_profile_namespace": settings.get("tag_profile_namespace", "tagns-lz-cost-governance"),
            "installation_mode": settings.get("installation_mode", "LANDING_ZONE"),
            "tag_profile": settings.get("tag_profile"),
        },
        "modules": config["modules"],
    }


def build_resource_preflight_plan(
    runtime: dict, requested_modules: list[str] | None = None
) -> list[dict]:
    modules = runtime["modules"]
    source = runtime["deployment"]["oci_focus_source"]
    if requested_modules is not None:
        plan = [{
            "key": "resource_principal_grant",
            "label": "FOCUSPLATFORM Resource Principal grant",
            "kind": "grant",
            "enabled": True,
        }]
        for module in requested_modules:
            if module not in OPTIONAL_MODULE_NAMES:
                raise DeploymentError(f"Unsupported optional module: {module}")
            plan.append({
                "key": f"{module}_database_state",
                "label": f"{OPTIONAL_MODULE_LABELS[module]} database prerequisites",
                "kind": "module_state",
                "enabled": True,
                "module": module,
            })
            api_preflight = OPTIONAL_MODULE_PREFLIGHTS.get(module)
            if api_preflight:
                api_key, api_label = api_preflight
                plan.append({
                    "key": api_key,
                    "label": api_label,
                    "kind": "sql_file",
                    "enabled": True,
                })
            else:
                plan.append({
                    "key": "tag_values_api",
                    "label": "Historical tag-value OCI API access",
                    "kind": "not_required",
                    "enabled": True,
                })
        return plan

    plan = [
        {
            "key": "resource_principal_grant",
            "label": "FOCUSPLATFORM Resource Principal grant",
            "kind": "grant",
            "enabled": True,
        },
        {
            "key": "focus_object_storage",
            "label": "FOCUS Object Storage listing",
            "kind": "object_storage",
            "enabled": True,
            "source": source,
        },
        {
            "key": "tag_catalog_api",
            "label": "Defined-tag catalog API",
            "kind": "sql_file",
            "enabled": True,
        },
        {
            "key": "account_contracts_api",
            "label": "Account and subscription APIs",
            "kind": "sql_file",
            "enabled": True,
        },
    ]
    optional_api_checks = (
        ("budgets_api", "oci_budgets", "Budgets API"),
        ("cloud_advisor_api", "oci_cloud_advisor", "Cloud Advisor API"),
        ("cost_anomalies_api", "oci_cost_anomalies", "Cost Anomaly API"),
        ("forecast_api", "oci_forecast", "Usage Forecast API"),
    )
    for key, module, label in optional_api_checks:
        plan.append({
            "key": key,
            "label": label,
            "kind": "sql_file",
            "enabled": bool(modules.get(module, False)),
        })
    plan.append({
        "key": "tag_values_api",
        "label": "Historical tag value extraction",
        "kind": "not_required",
        "enabled": bool(modules.get("oci_tag_values", False)),
    })
    return plan


def render_resource_preflight_summary(results: list[dict]) -> str:
    label_width = max((len(result["label"]) for result in results), default=7)
    status_width = max((len(result["status"]) for result in results), default=6)
    lines = ["", "OCI Resource Principal preflight summary", "-" * (label_width + status_width + 28)]
    lines.append(f"{'Check':<{label_width}}  {'Status':<{status_width}}  Details")
    for result in results:
        lines.append(
            f"{result['label']:<{label_width}}  {result['status']:<{status_width}}  "
            f"{result.get('detail', '')}"
        )
    passed = sum(result["status"] == "OK" for result in results)
    failed = sum(result["status"] == "ERROR" for result in results)
    skipped = sum(result["status"] in ("NOT SELECTED", "NOT REQUIRED") for result in results)
    limited = sum(result["status"] == "LIMITED" for result in results)
    lines.append(f"Result: {passed} passed, {failed} failed, {limited} limited/unverified, {skipped} skipped/not required")
    return "\n".join(lines)


def build_focus_object_storage_probe_sql(source: dict) -> str:
    def sql_literal(value: str) -> str:
        return "'" + str(value).replace("'", "''") + "'"

    for key in ("region", "namespace", "bucket", "realm_domain"):
        if not source.get(key):
            raise DeploymentError(f"Missing resolved FOCUS bucket field: {key}.")
    if not re.fullmatch(r"[a-z0-9]+(?:[.-][a-z0-9]+)*", source["realm_domain"]):
        raise DeploymentError("Invalid Object Storage realm domain.")
    return f"""SET ECHO OFF VERIFY OFF DEFINE OFF FEEDBACK ON SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE
  L_REGION VARCHAR2(64) := {sql_literal(source["region"])};
  L_NAMESPACE VARCHAR2(255) := {sql_literal(source["namespace"])};
  L_BUCKET VARCHAR2(256) := {sql_literal(source["bucket"])};
  L_DOMAIN VARCHAR2(255) := {sql_literal(source["realm_domain"])};
  L_PREFIX VARCHAR2(1000) := {sql_literal(source.get("prefix", "").strip("/"))};
  L_URI VARCHAR2(4000);
  L_RESPONSE DBMS_CLOUD_TYPES.RESP;
BEGIN
  L_URI := 'https://objectstorage.' || L_REGION || '.' || L_DOMAIN ||
    '/n/' || L_NAMESPACE || '/b/' || L_BUCKET || '/o?';
  IF L_PREFIX IS NOT NULL THEN
    L_URI := L_URI || 'prefix=' ||
      UTL_URL.ESCAPE(L_PREFIX || '/', TRUE, 'AL32UTF8') || CHR(38);
  END IF;
  L_URI := L_URI || 'delimiter=%2F' || CHR(38) || 'limit=1';
  L_RESPONSE := DBMS_CLOUD.SEND_REQUEST(
    CREDENTIAL_NAME=>'OCI$RESOURCE_PRINCIPAL', URI=>L_URI,
    METHOD=>DBMS_CLOUD.METHOD_GET, TIMEOUT=>120);
  IF DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE)<>200 THEN
    RAISE_APPLICATION_ERROR(-20884, 'FOCUS Object Storage ListObjects HTTP ' ||
      DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE));
  END IF;
  DBMS_OUTPUT.PUT_LINE('FOCUS Object Storage preflight passed (HTTP 200)');
END;
/
EXIT SUCCESS
"""


def extract_preflight_error(output: str, password: str) -> str:
    safe_output = redact_passwords(output or "", [password])
    lines = safe_output.splitlines()
    for index, line in enumerate(lines):
        if re.search(r"\b(?:ORA|TNS|SP2)-\d{5}\b|HTTP \d{3}|preflight failed", line, re.I):
            detail = line.strip()
            if index + 1 < len(lines) and lines[index + 1].strip():
                detail += " " + lines[index + 1].strip()
            return detail[:240]
    return "SQL*Plus returned no success marker."


def run_resource_preflight_probe(
    runtime: dict,
    password: str,
    sql_text: str,
    success_marker: str,
    label: str,
) -> dict:
    validate_database_password(password, "FOCUSPLATFORM")
    settings = runtime["deployment"]
    sqlplus = shutil.which(settings.get("sqlplus", "sqlplus"))
    if not sqlplus:
        return {"label": label, "status": "ERROR", "detail": "SQL*Plus was not found on PATH"}
    alias = settings["connect_alias"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", alias):
        return {"label": label, "status": "ERROR", "detail": "Invalid TNS alias"}
    commands = [
        "SET ECHO OFF VERIFY OFF DEFINE OFF",
        f'CONNECT FOCUSPLATFORM/"{password}"@{alias}',
    ]
    commands.extend(sql_parameter_commands(runtime))
    commands.append(sql_text)
    env = os.environ.copy()
    env["TNS_ADMIN"] = str(Path(settings["tns_admin"]).expanduser())
    try:
        result = subprocess.run(
            [sqlplus, "-L", "-s", "/nolog"],
            cwd=SQL_INSTALL_DIR,
            input="\n".join(commands) + "\n",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=360,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"label": label, "status": "ERROR", "detail": "Timed out after 360 seconds"}
    except OSError:
        return {"label": label, "status": "ERROR", "detail": "Could not start SQL*Plus"}
    output = redact_passwords(result.stdout or "", [password])
    if result.returncode == 0 and success_marker in output:
        detail = next(
            (line.strip() for line in output.splitlines() if success_marker in line),
            "Read-only API check passed",
        )
        return {"label": label, "status": "OK", "detail": detail[:180]}
    detail = extract_preflight_error(output, password)
    role = re.search(r"Account Identity checks passed; organization role=(PARENT|CHILD|UNKNOWN)\b", output)
    if role:
        detail = f"role={role.group(1)}; {detail}"
    return {
        "label": label,
        "status": (
            "LIMITED" if label == "Account and subscription APIs"
            and "ORA-20713: CHILD_COMMERCIAL_UNVERIFIED:" in output
            else "ERROR"
        ),
        "detail": detail,
    }


def build_module_state_probe_sql(module: str) -> str:
    core_module_patterns = {
        "oci_budgets": ("OCI_BUDGET_%", "OCI_SYNC_BUDGETS"),
        "oci_cloud_advisor": ("OCI_ADVISOR_%", "OCI_SYNC_ADVISOR"),
        "oci_cost_anomalies": ("OCI_ANOMALY_%", "OCI_SYNC_ANOMALIES"),
        "oci_forecast": ("OCI_FORECAST_%", "OCI_SYNC_FORECAST"),
    }
    if module == "oci_tag_values":
        return """SET SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE L_CATALOG NUMBER; L_LANDING NUMBER; L_EXISTING NUMBER;
BEGIN
  SELECT COUNT(*) INTO L_CATALOG FROM USER_OBJECTS
   WHERE (OBJECT_NAME='OCI_TAG_SYNC_CATALOG' AND OBJECT_TYPE='PROCEDURE'
       OR OBJECT_NAME='OCI_TAG_PROFILE_API'
          AND OBJECT_TYPE IN ('PACKAGE','PACKAGE BODY')) AND STATUS='VALID';
  SELECT COUNT(*) INTO L_LANDING FROM USER_TABLES WHERE TABLE_NAME='OCI_FOCUS_REPORTS';
  SELECT COUNT(*) INTO L_EXISTING FROM USER_OBJECTS WHERE OBJECT_NAME LIKE 'OCI_TAG_VALUE%';
  IF L_CATALOG<>3 OR L_LANDING<>1 OR L_EXISTING<>0 THEN
    RAISE_APPLICATION_ERROR(-20966,
      'Verify OCI ingestion/catalog and a clean tag-value module first');
  END IF;
  DBMS_OUTPUT.PUT_LINE('Optional module database preflight passed');
END;
/
EXIT SUCCESS
"""
    if module not in core_module_patterns:
        raise DeploymentError(f"Unsupported optional module: {module}")
    object_pattern, sync_object = core_module_patterns[module]
    return f"""SET SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE L_CORE NUMBER; L_EXISTING NUMBER;
BEGIN
  SELECT COUNT(*) INTO L_CORE FROM USER_OBJECTS
   WHERE OBJECT_NAME='FINOPS_CORE_RUN_DAILY' AND STATUS='VALID';
  SELECT COUNT(*) INTO L_EXISTING FROM USER_OBJECTS
   WHERE OBJECT_NAME LIKE '{object_pattern}' OR OBJECT_NAME='{sync_object}';
  IF L_CORE<>1 OR L_EXISTING<>0 THEN
    RAISE_APPLICATION_ERROR(-20760,
      'Install common core first; optional module must be clean');
  END IF;
  DBMS_OUTPUT.PUT_LINE('Optional module database preflight passed');
END;
/
EXIT SUCCESS
"""


def execute_resource_preflight(
    runtime: dict, focus_password: str, requested_modules: list[str] | None = None
) -> list[dict]:
    plan = build_resource_preflight_plan(runtime, requested_modules)
    results = []
    grant_sql = """SET SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE
  L_GRANTS NUMBER;
BEGIN
  SELECT COUNT(*) INTO L_GRANTS FROM ALL_TAB_PRIVS
   WHERE GRANTEE=USER AND TABLE_SCHEMA='ADMIN'
     AND TABLE_NAME='OCI$RESOURCE_PRINCIPAL';
  IF L_GRANTS=0 THEN
    RAISE_APPLICATION_ERROR(-20879,'Resource Principal credential is not granted to FOCUSPLATFORM');
  END IF;
  DBMS_OUTPUT.PUT_LINE('RESOURCE_PRINCIPAL_GRANT_OK');
END;
/
EXIT SUCCESS
"""
    for item in plan:
        label = item["label"]
        if not item["enabled"]:
            results.append({"label": label, "status": "NOT SELECTED", "detail": ""})
            continue
        if item["kind"] == "not_required":
            results.append({
                "label": label,
                "status": "NOT REQUIRED",
                "detail": "Reads FOCUS rows already in the database; no OCI API call",
            })
            continue
        if item["kind"] == "grant":
            print(f"Checking {label}...")
            results.append(run_resource_preflight_probe(
                runtime, focus_password, grant_sql, "RESOURCE_PRINCIPAL_GRANT_OK", label
            ))
            continue
        if item["kind"] == "module_state":
            print(f"Checking {label}...")
            results.append(run_resource_preflight_probe(
                runtime,
                focus_password,
                build_module_state_probe_sql(item["module"]),
                "Optional module database preflight passed",
                label,
            ))
            continue
        if item["kind"] == "object_storage":
            sql_text = build_focus_object_storage_probe_sql(item["source"])
            marker = "FOCUS Object Storage preflight passed"
        elif item["kind"] == "sql_file":
            relative_path, marker = RESOURCE_PREFLIGHT_SQL[item["key"]]
            sql_text = "@" + relative_path + "\nEXIT SUCCESS"
        else:
            results.append({"label": label, "status": "ERROR", "detail": "Unknown preflight type"})
            continue
        print(f"Checking {label} through the FOCUSPLATFORM Resource Principal...")
        results.append(run_resource_preflight_probe(runtime, focus_password, sql_text, marker, label))
    print(render_resource_preflight_summary(results))
    return results


def resource_preflight_passed(results: list[dict]) -> bool:
    # A known child test context does not prove commercial access in a parent.
    # Unknown and LIMITED statuses must block the full installation as well.
    return all(result["status"] in ("OK", "NOT SELECTED", "NOT REQUIRED") for result in results)


def preflight_database(config: dict, requested_modules: list[str] | None = None) -> None:
    errors = validate_database_config(config)
    if errors:
        raise DeploymentError("\n".join(errors))
    db = config["database"]
    if not shutil.which(db["sqlplus"]):
        raise DeploymentError("SQL*Plus was not found on PATH.")
    oci_module, sdk_config, signer = load_oci_sdk(
        db["oci_auth_method"], db.get("oci_profile", ""), db["oci_region"]
    )
    focus_password = read_password_from_vault(
        db["focusplatform_password_secret_id"],
        "FOCUSPLATFORM",
        oci_module,
        sdk_config,
        signer,
    )
    print(
        "Running read-only Resource Principal checks against the existing FOCUSPLATFORM schema. "
        "No database objects or OCI resources will be changed."
    )
    results = execute_resource_preflight(
        build_runtime_config(config), focus_password, requested_modules
    )
    if not resource_preflight_passed(results):
        raise DeploymentError(
            "Resource Principal preflight is incomplete (ERROR or LIMITED). "
            "LIMITED does not prove the cause of a commercial API error; "
            "validate full commercial access in the target parent tenancy. No changes were made."
        )


def install_optional_modules(config: dict, requested_modules: list[str]) -> None:
    errors = validate_database_config(config)
    if errors:
        raise DeploymentError("\n".join(errors))
    db = config["database"]
    if not shutil.which(db["sqlplus"]):
        raise DeploymentError("SQL*Plus was not found on PATH.")
    labels = [OPTIONAL_MODULE_LABELS[name] for name in requested_modules]
    if not prompt_yes_no(
        f"Install only these optional modules: {', '.join(labels)}? This will execute DDL.",
        False,
    ):
        raise DeploymentError("Optional module installation cancelled; no SQL was run.")
    oci_module, sdk_config, signer = load_oci_sdk(
        db["oci_auth_method"], db.get("oci_profile", ""), db["oci_region"]
    )
    focus_password = read_password_from_vault(
        db["focusplatform_password_secret_id"],
        "FOCUSPLATFORM",
        oci_module,
        sdk_config,
        signer,
    )
    runtime = build_runtime_config(config)
    results = execute_resource_preflight(runtime, focus_password, requested_modules)
    if not resource_preflight_passed(results):
        raise DeploymentError(
            "Optional module preflight failed. None of the requested module SQL was run."
        )
    installers = {name: path for name, path, _dependencies in OPTIONAL_INSTALLERS}
    steps = [(installers[name], []) for name in requested_modules]
    print("Installing the preflighted optional modules as FOCUSPLATFORM.")
    run_sqlplus(
        runtime,
        "focusplatform",
        "FOCUSPLATFORM",
        focus_password,
        steps,
        tns_admin=Path(db["tns_admin"]),
    )
    print(f"Optional modules installed: {', '.join(labels)}")


def classify_admin_bootstrap_state(
    user_count: int,
    open_user_count: int,
    focus_object_count: int,
    admin_principal_count: int,
    focus_principal_grant_count: int,
) -> str:
    if user_count == 0 and focus_object_count == 0:
        return "fresh"
    if (
        user_count == 2
        and open_user_count == 2
        and focus_object_count == 0
        and admin_principal_count == 1
        and focus_principal_grant_count > 0
    ):
        return "resume_candidate"
    return "unsafe_existing_state"


def inspect_admin_bootstrap_state(runtime: dict, admin_password: str, tns_admin: Path) -> str:
    validate_database_password(admin_password, "ADMIN")
    settings = runtime["deployment"]
    sqlplus = shutil.which(settings.get("sqlplus", "sqlplus"))
    if not sqlplus:
        raise DeploymentError("SQL*Plus was not found on PATH.")
    alias = settings["connect_alias"]
    query = """SET ECHO OFF VERIFY OFF DEFINE OFF FEEDBACK OFF HEADING OFF PAGESIZE 0
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SELECT 'BOOTSTRAP_USERS='||COUNT(*) FROM DBA_USERS
 WHERE USERNAME IN ('FOCUSPLATFORM','OAC_FOCUS_READER');
SELECT 'BOOTSTRAP_OPEN_USERS='||COUNT(*) FROM DBA_USERS
 WHERE USERNAME IN ('FOCUSPLATFORM','OAC_FOCUS_READER') AND ACCOUNT_STATUS='OPEN';
SELECT 'BOOTSTRAP_FOCUS_OBJECTS='||COUNT(*) FROM DBA_OBJECTS
 WHERE OWNER='FOCUSPLATFORM';
SELECT 'BOOTSTRAP_ADMIN_PRINCIPAL='||COUNT(*) FROM DBA_CREDENTIALS
 WHERE OWNER='ADMIN' AND CREDENTIAL_NAME='OCI$RESOURCE_PRINCIPAL';
SELECT 'BOOTSTRAP_FOCUS_PRINCIPAL_GRANT='||COUNT(*) FROM DBA_TAB_PRIVS
 WHERE GRANTEE='FOCUSPLATFORM' AND OWNER='ADMIN'
   AND TABLE_NAME='OCI$RESOURCE_PRINCIPAL';
EXIT SUCCESS
"""
    commands = [
        "SET ECHO OFF VERIFY OFF DEFINE OFF",
        f'CONNECT ADMIN/"{admin_password}"@{alias}',
        query,
    ]
    env = os.environ.copy()
    env["TNS_ADMIN"] = str(tns_admin.expanduser())
    try:
        result = subprocess.run(
            [sqlplus, "-L", "-s", "/nolog"],
            cwd=SQL_INSTALL_DIR,
            input="\n".join(commands) + "\n",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=90,
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        raise DeploymentError("Could not inspect the existing ADMIN schema bootstrap state.") from exc
    output = redact_passwords(result.stdout or "", [admin_password])
    if result.returncode != 0:
        raise DeploymentError("Could not safely inspect the existing schema; no installation SQL was run.")
    values = {}
    for line in output.splitlines():
        match = re.fullmatch(r"BOOTSTRAP_([A-Z_]+)=(\d+)", line.strip())
        if match:
            values[match.group(1)] = int(match.group(2))
    expected = {
        "USERS", "OPEN_USERS", "FOCUS_OBJECTS", "ADMIN_PRINCIPAL", "FOCUS_PRINCIPAL_GRANT"
    }
    if not expected.issubset(values):
        raise DeploymentError("Could not classify the existing schema safely; no installation SQL was run.")
    state = classify_admin_bootstrap_state(
        values["USERS"], values["OPEN_USERS"], values["FOCUS_OBJECTS"],
        values["ADMIN_PRINCIPAL"], values["FOCUS_PRINCIPAL_GRANT"],
    )
    if state != "resume_candidate":
        return state

    verify_sql = "@00_schema/verify/00_verify_focusplatform_schema.sql\nEXIT SUCCESS"
    verify_commands = [
        "SET ECHO OFF VERIFY OFF DEFINE OFF",
        f'CONNECT ADMIN/"{admin_password}"@{alias}',
        verify_sql,
    ]
    try:
        verification = subprocess.run(
            [sqlplus, "-L", "-s", "/nolog"],
            cwd=SQL_INSTALL_DIR,
            input="\n".join(verify_commands) + "\n",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=180,
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        raise DeploymentError("Could not verify the existing empty schema for a safe retry.") from exc
    verify_output = redact_passwords(verification.stdout or "", [admin_password])
    if verification.returncode != 0 or "FOCUSPLATFORM SCHEMA VERIFICATION PASS" not in verify_output:
        raise DeploymentError(
            "Existing database users do not pass the schema verifier; inspect them before retrying."
        )
    return "resume_ready"


def run_admin_schema_bootstrap(
    runtime: dict,
    admin_password: str,
    focus_password: str,
    reader_password: str,
    tns_admin: Path,
) -> None:
    settings = runtime["deployment"]
    sqlplus = shutil.which(settings.get("sqlplus", "sqlplus"))
    if not sqlplus:
        raise DeploymentError("SQL*Plus was not found on PATH.")
    alias = settings["connect_alias"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", alias):
        raise DeploymentError("The configured SQL*Plus alias contains unsupported characters.")
    for purpose, password in (
        ("ADMIN", admin_password),
        ("FOCUSPLATFORM", focus_password),
        ("OAC_FOCUS_READER", reader_password),
    ):
        validate_database_password(password, purpose)

    def bind_sqlplus_value(name: str, value: str) -> str:
        escaped_value = value.replace("'", "''")
        return f"BEGIN :{name} := '{escaped_value}'; END;\n/"

    commands = [
        "SET ECHO OFF",
        "SET VERIFY OFF",
        "SET DEFINE OFF",
        f'CONNECT ADMIN/"{admin_password}"@{alias}',
        "@00_schema/00_set_install_parameters.sql",
        bind_sqlplus_value("fp_focus_password", focus_password),
        bind_sqlplus_value("fp_reader_password", reader_password),
        "@00_schema/internal/00_create_focusplatform_schema_core.sql",
        "EXIT SUCCESS",
    ]
    child_env = os.environ.copy()
    child_env["TNS_ADMIN"] = str(tns_admin.expanduser())
    print("Creating FOCUSPLATFORM and OAC_FOCUS_READER as ADMIN...")
    try:
        result = subprocess.run(
            [sqlplus, "-L", "-s", "/nolog"],
            cwd=SQL_INSTALL_DIR,
            input="\n".join(commands) + "\n",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=child_env,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=1800,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise DeploymentError("The ADMIN schema bootstrap timed out; inspect the database before retrying.") from exc
    except OSError as exc:
        raise DeploymentError("Could not start SQL*Plus for the ADMIN schema bootstrap.") from exc

    output = result.stdout or ""
    output = redact_passwords(output, [admin_password, focus_password, reader_password])
    log_dir = DEPLOYMENT_DIR / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}-database-admin.log"
    log_path.write_text(output, encoding="utf-8")
    if output:
        sys.stdout.write(output)
        sys.stdout.flush()
    print(f"Local log: {log_path.relative_to(DEPLOYMENT_DIR.parent)}")
    if result.returncode:
        raise DeploymentError(f"SQL*Plus exited with code {result.returncode}; inspect the log before retrying.")


STATUS_MODULES = {
    'core': ('CORE','OCI00','OCI01A','OCI02'),
    'ingestion': ('OCI00',), 'tags': ('OCI01A',), 'accounts': ('OCI02',),
    'tag-values': ('OCI01B',), 'budgets': ('OCI03',), 'advisor': ('OCI04',),
    'anomalies': ('OCI05',), 'forecast': ('OCI06',),
    'oac-cost': ('OAC_COST',),
}
STATUS_ALIASES = {
    'oci_ingestion':'ingestion', 'oci_tag_catalog_profile':'tags', 'oci_account_contracts':'accounts',
    'oci_tag_values':'tag-values', 'oci_budgets':'budgets', 'oci_cloud_advisor':'advisor',
    'oci_cost_anomalies':'anomalies', 'oci_forecast':'forecast',
    'oac_cost_detail':'oac-cost',
}

STATUS_LABELS = {
    'CORE':'Shared Core', 'OCI00':'OCI: FOCUS Ingestion', 'OCI01A':'OCI: FinOps Tag Catalog and Profile',
    'OCI02':'OCI: Account Context and Contracts', 'OCI01B':'OCI: Defined-Tag Value Extraction',
    'OCI03':'OCI: Budgets', 'OCI04':'OCI: Cloud Advisor', 'OCI05':'OCI: Cost Anomalies',
    'OCI06':'OCI: Native Forecast',
    'OAC_COST':'OCI: OAC Cost-detail Interface',
    'ALL':'All modules',
}


def parse_status_modules(value: str) -> list[str]:
    names = [part.strip().lower() for part in value.split(',')]
    if not names or any(not name for name in names):
        raise argparse.ArgumentTypeError('Pass module names separated by commas; empty entries are not allowed.')
    names = [STATUS_ALIASES.get(name, name) for name in names]
    if 'all' in names:
        if len(names) != 1:
            raise argparse.ArgumentTypeError('Use all by itself, or a comma-separated module list.')
        return ['ALL']
    invalid = [name for name in names if name not in STATUS_MODULES]
    if invalid:
        raise argparse.ArgumentTypeError('Unknown status module: '+', '.join(invalid)+'. Valid: all, '+', '.join(STATUS_MODULES))
    ids = list(STATUS_MODULES['core'])
    for name in names:
        for module in STATUS_MODULES[name]:
            if module not in ids:
                ids.append(module)
    return ids


def status_database(config: dict, module_ids: list[str], detail: str = 'LONG') -> None:
    """Read-only diagnostic: never dispatch installation or preflight API probes."""
    db = config['database']
    if detail not in ('SHORT','LONG'):
        raise DeploymentError('Status detail must be SHORT or LONG.')
    sqlplus = shutil.which(db['sqlplus'])
    if not sqlplus:
        raise DeploymentError('SQL*Plus was not found on PATH.')
    oci, sdk_config, signer = load_oci_sdk(db['oci_auth_method'],db.get('oci_profile',''),db['oci_region'])
    password = read_password_from_vault(db['focusplatform_password_secret_id'],'FOCUSPLATFORM',oci,sdk_config,signer)
    validate_database_password(password, "FOCUSPLATFORM")
    if not re.fullmatch(r'[A-Za-z0-9_.-]+',db['connect_alias']):
        raise DeploymentError('Unsupported TNS alias.')
    payload = json.dumps(module_ids)
    commands = ['WHENEVER SQLERROR EXIT SQL.SQLCODE','WHENEVER OSERROR EXIT FAILURE',
        'SET ECHO OFF VERIFY OFF DEFINE OFF',f'CONNECT FOCUSPLATFORM/"{password}"@{db["connect_alias"]}',
        'SET SERVEROUTPUT ON SIZE UNLIMITED','VARIABLE fp_status_module_ids CLOB',
        'VARIABLE fp_status_detail VARCHAR2(5)',f"BEGIN :fp_status_detail := '{detail}'; END;",'/',
        f"BEGIN :fp_status_module_ids := '{payload}'; END;",'/',
        '@../monitoring/internal/module_status_report.sql',
        "SET HEADING OFF FEEDBACK OFF", "SELECT 'FINOPS_STATUS_REPORT_COMPLETE' FROM DUAL;",'EXIT SUCCESS']
    env = os.environ.copy(); env['TNS_ADMIN'] = str(Path(db['tns_admin']).expanduser())
    print('Read-only module status. Core includes shared core, FOCUS ingestion, tag catalog/profile, and account context/contracts.')
    print('Scope: '+', '.join(STATUS_LABELS[module] for module in module_ids)+'. No objects, data, jobs or OCI resources will be changed.')
    try:
        result = subprocess.run([sqlplus,'-L','-s','/nolog'],input='\n'.join(commands)+'\n',
            stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',
            env=env,cwd=SQL_INSTALL_DIR,timeout=180,check=False)
    except (OSError,subprocess.TimeoutExpired) as exc:
        raise DeploymentError('Could not complete the read-only status report; check SQL*Plus and the Bastion connection.') from exc
    output = redact_passwords(result.stdout or '', [password])
    visible_output = '\n'.join(line for line in output.splitlines() if line.strip() not in ('FINOPS_STATUS_REPORT_COMPLETE','PL/SQL procedure successfully completed.'))
    print(visible_output)
    # Oracle errors inside stored job/source history are findings, not failures
    # of this read-only command. WHENEVER SQLERROR handles current SQL failures.
    if result.returncode or 'FINOPS_STATUS_REPORT_COMPLETE' not in output or re.search(r'(?m)^\s*SP2-\d+',output) or 'CHECK_ERROR' in output:
        raise DeploymentError('Status report could not check every selected item; inspect the diagnostic above. No changes were made.')
    print('Status snapshot complete. Installed/enabled does not prove source coverage; inspect latest source runs and file counts.')


def apply_child_demo_exception(results: list[dict], enabled: bool) -> tuple[list[dict], bool]:
    """Only a positively identified child commercial limitation can be omitted."""
    if not enabled:
        return results, False
    commercial = [r for r in results if r['label'] == 'Account and subscription APIs']
    if len(commercial) != 1 or commercial[0]['status'] != 'LIMITED' or not commercial[0].get('detail', '').startswith('role=CHILD;'):
        raise DeploymentError('Child demo exception requires a verified CHILD commercial limitation; it cannot bypass parent, unknown-role, or other API failures.')
    adjusted = [dict(r) for r in results]
    for result in adjusted:
        if result['label'] == 'Account and subscription APIs':
            result['status'] = 'NOT SELECTED'
            result['detail'] = 'CHILD DEMO ONLY: commercial module omitted, not verified; parent installation remains mandatory.'
    return adjusted, True


def install_database(config: dict, child_demo_skip_commercial: bool = False) -> None:
    errors = validate_database_config(config)
    if errors:
        raise DeploymentError("\n".join(errors))
    runtime = build_runtime_config(config)
    db = config["database"]
    sqlplus = shutil.which(db["sqlplus"])
    if not sqlplus:
        raise DeploymentError("SQL*Plus was not found on PATH. Configure wallet, TNS_ADMIN, and private connectivity before installing.")
    if not prompt_yes_no("Install the database schema and selected SQL modules now? This will execute DDL.", False):
        raise DeploymentError("Database installation cancelled; no SQL was run.")

    oci_module, sdk_config, signer = load_oci_sdk(
        db["oci_auth_method"], db.get("oci_profile", ""), db["oci_region"]
    )
    admin_password = read_password_from_vault(db["admin_password_secret_id"], "ADMIN", oci_module, sdk_config, signer)
    focus_password = read_password_from_vault(
        db["focusplatform_password_secret_id"], "FOCUSPLATFORM", oci_module, sdk_config, signer
    )
    reader_password = read_password_from_vault(
        db["oac_reader_password_secret_id"], "OAC_FOCUS_READER", oci_module, sdk_config, signer
    )
    print("Vault credentials retrieved. Passwords will be sent to SQL*Plus through stdin and will not be displayed or stored in the config.")

    bootstrap_state = inspect_admin_bootstrap_state(
        runtime, admin_password, Path(db["tns_admin"])
    )
    if bootstrap_state == "fresh":
        run_admin_schema_bootstrap(
            runtime,
            admin_password,
            focus_password,
            reader_password,
            Path(db["tns_admin"]),
        )
    elif bootstrap_state == "resume_ready":
        print(
            "Found the verified, empty FOCUSPLATFORM schema from a previous preflight stop; "
            "reusing the ADMIN bootstrap and retrying the checks."
        )
    else:
        raise DeploymentError(
            "The target database contains an incomplete or non-empty FOCUSPLATFORM schema. "
            "The installer stopped without running module SQL; inspect or clean that schema before retrying."
        )

    preflight_results = execute_resource_preflight(runtime, focus_password)
    effective_results, omit_commercial = apply_child_demo_exception(preflight_results, child_demo_skip_commercial)
    if not resource_preflight_passed(effective_results):
        raise DeploymentError(
            "Resource Principal preflight is incomplete (ERROR or LIMITED). No FOCUSPLATFORM module SQL was run. "
            "LIMITED commercial checks require validation in the target parent tenancy. "
            "Correct the listed API access issue, wait for OCI policy changes to propagate if needed, "
            "then run install again; the verified empty schema will be reused."
        )
    steps = selected_database_scripts(runtime)
    if omit_commercial:
        steps = [(script, inputs) for script, inputs in steps if script != '02_providers/OCI/02_account_contracts/02_install_oci_account_contracts.sql']
        print('CHILD DEMO ONLY: skipping account/contracts module. Commercial API access is NOT verified. This is not a complete parent production installation.')
        print(render_resource_preflight_summary(effective_results))
        audit_dir = DEPLOYMENT_DIR / 'logs'
        audit_dir.mkdir(parents=True, exist_ok=True)
        audit_path = audit_dir / f"{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}-child-demo-exception.json"
        audit_path.write_text(json.dumps({'scope': 'CHILD_DEMO_ONLY', 'omitted_module': 'oci_account_contracts', 'original_preflight': preflight_results, 'effective_preflight': effective_results}, indent=2), encoding='utf-8')
        print(f'Child demo exception audit: {audit_path.relative_to(DEPLOYMENT_DIR.parent)}')
    print("Installing mandatory database modules and the optional modules selected in the wizard.")
    run_sqlplus(runtime, "focusplatform", "FOCUSPLATFORM", focus_password, steps, tns_admin=Path(db["tns_admin"]))
    print('Child demo installation finished WITHOUT the commercial module; parent validation is still required.' if omit_commercial else 'Database installation finished. OAC workbook import and connection setup remain a separate operator step.')


def run_tag_operation(config: dict, command: str, spec_path: Path | None = None, run_id: int | None = None) -> None:
    """Use exactly the same SQL operation entry points as direct SQL clients."""
    runtime = build_runtime_config(config)
    if command == "apply-tag-profile":
        try:
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise DeploymentError("Could not read the tag specification JSON file.") from exc
        if not isinstance(spec, dict):
            raise DeploymentError("Tag specification must be a JSON object.")
        runtime["deployment"]["tag_profile"] = spec
        script = "02_providers/OCI/01_tags/00_catalog_profile/01_apply_oci_tag_profile.sql"
    elif command == "refresh-tag-profile":
        script = "02_providers/OCI/01_tags/00_catalog_profile/02_refresh_oci_tag_profile.sql"
    elif command == "build-tag-mv":
        script = "03_visualization/OAC/01_build_oac_oci_focus_cost_detail_from_active_profile.sql"
    else:
        if run_id is None or run_id < 1:
            raise DeploymentError("Publish requires a positive candidate run ID.")
        runtime["deployment"]["candidate_run_id"] = run_id
        script = "03_visualization/OAC/02_publish_oac_oci_focus_cost_detail_candidate.sql"
    db = config["database"]
    oci_module, sdk_config, signer = load_oci_sdk(db["oci_auth_method"], db.get("oci_profile", ""), db["oci_region"])
    password = read_password_from_vault(db["focusplatform_password_secret_id"], "FOCUSPLATFORM", oci_module, sdk_config, signer)
    run_sqlplus(runtime, "tag-operation", "FOCUSPLATFORM", password, [(script, [])], tns_admin=Path(db["tns_admin"]))


def main() -> int:
    valid_module_names = ", ".join(OPTIONAL_MODULE_NAMES)
    module_argument_help = (
        "Comma-separated optional module names. Valid names: "
        f"{valid_module_names}."
    )
    parser = argparse.ArgumentParser(
        description="Install the FinOps add-on SQL modules in an existing ADB",
        epilog=(
            "Examples:\n"
            "  finops_addon.py preflight --module oci_budgets,oci_forecast\n"
            "  finops_addon.py install-module --module oci_budgets,oci_forecast"
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="Local FinOps add-on configuration (existing database-install.json path retained)")
    commands = parser.add_subparsers(dest="command", required=True)
    status_command = commands.add_parser('status', help='Read-only installation and operating-state report; all modules by default',
        description='Report installed/missing/partial/invalid modules, job enablement, latest source runs/errors, pipelines and MV state. Defaults to all modules. A selected list always includes shared core, FOCUS ingestion, tag catalog/profile, and account context/contracts. No installs, repairs, refreshes or API probes are run.',
        epilog='Examples: status | status --module core | status --module advisor,forecast | status --module all')
    status_command.add_argument('--module',type=parse_status_modules,default=['ALL'],metavar='NAME[,NAME...]',
        help='Comma-separated names (no spaces, or quote the list). Valid: all, '+', '.join(STATUS_MODULES)+'. Existing oci_* installer names are also accepted. Default: all.')
    status_detail = status_command.add_mutually_exclusive_group()
    status_detail.add_argument('--short',dest='detail',action='store_const',const='SHORT',help='Installation state, object-type Found/Missing/Invalid counts and essential pipeline summary; no object list or job detail.')
    status_detail.add_argument('--long',dest='detail',action='store_const',const='LONG',help='Full object list, jobs, schedules, pipelines and source/MV diagnostics (default).')
    status_command.set_defaults(detail='LONG')
    commands.add_parser(
        "configure",
        help="Discover prerequisites and save the database installer configuration",
        description=(
            "Interactively discovers the configured ADB, Vault Secrets, and FOCUS source, prepares the local wallet/TNS alias, "
            "and saves the database-only configuration. It does not create database objects or OCI infrastructure."
        ),
    )
    commands.add_parser(
        "validate",
        help="Validate configuration, ADMIN Secret access, and database connectivity",
        description=(
            "Checks the saved configuration, reads the ADMIN Secret from Vault, and tests a read-only SQL*Plus connection "
            "as ADMIN. It does not execute DDL or check Resource Principal access to the FOCUS bucket."
        ),
    )
    preflight_command = commands.add_parser(
        "preflight",
        help="Run read-only Resource Principal checks against an existing FOCUSPLATFORM schema",
        description=(
            "Run read-only Resource Principal checks against an existing FOCUSPLATFORM schema.\n"
            "This command does not execute DDL or change OCI resources. Without --module, it checks "
            "the full-install prerequisites and selected optional modules. With --module, it checks "
            "the shared prerequisites and only the named optional modules."
        ),
    )
    preflight_command.add_argument(
        "--module", type=parse_optional_module_list, metavar="NAME[,NAME...]",
        help=module_argument_help + " Omit it to check the full-install prerequisites.",
    )
    module_command = commands.add_parser(
        "install-module",
        help="Preflight and install selected optional modules only",
        description=(
            "Preflights all requested optional modules before executing any of their SQL. Requires the mandatory database "
            "baseline to be installed. It installs only the requested modules as FOCUSPLATFORM; it does not rerun the "
            "ADMIN bootstrap or the mandatory modules. Module installers may enable scheduler jobs and start initial syncs."
        ),
    )
    module_command.add_argument(
        "--module", required=True, type=parse_optional_module_list, metavar="NAME[,NAME...]",
        help=module_argument_help,
    )
    install_command = commands.add_parser(
        "install",
        help="Install the schema, mandatory baseline, and selected optional modules",
        description=(
            "Reads the configured Vault Secrets, creates the schema and OAC reader as ADMIN, then runs the Resource Principal "
            "preflight gate before installing the mandatory baseline and selected optional modules as FOCUSPLATFORM. "
            "This command executes DDL and may enable scheduler jobs and initial background syncs."
        ),
    )
    install_command.add_argument('--child-demo-skip-commercial', action='store_true', help='Demo only: omit account/contracts SQL only when the preflight explicitly identifies a CHILD commercial limitation. Parent/unknown roles and all other failed checks remain blocked.')
    apply_profile = commands.add_parser("apply-tag-profile", help="Apply a JSON tag profile without building or publishing an MV",
        description="Validate and apply an existing namespace or explicit tag list; preserves slots and leaves the published MV unchanged.")
    apply_profile.add_argument("--spec", type=Path, required=True, help="JSON file containing schema_version, profile_name, mode, and namespace or tags")
    commands.add_parser("refresh-tag-profile", help="Refresh the active stored tag specification without publishing an MV",
        description="Refresh catalog and apply the stored specification. Explicit lists never expand automatically.")
    commands.add_parser("build-tag-mv", help="Build and validate a candidate MV without changing the published synonym",
        description="Request the existing asynchronous candidate builder with auto-publication disabled. Inspect its run audit before publishing.")
    publish_profile = commands.add_parser("publish-tag-mv", help="Explicitly publish one READY candidate by run ID",
        description="Change the stable synonym only for the explicitly identified valid READY candidate matching the active profile.")
    publish_profile.add_argument("--run-id", type=int, required=True, help="Positive run ID of the validated READY candidate to publish")
    args = parser.parse_args()
    try:
        if args.command == "configure":
            configure_interactive(args.config)
        else:
            config = load_database_config(args.config)
            errors = validate_database_config(config)
            if errors:
                raise DeploymentError("\n".join(errors))
            if args.command == "validate":
                validate_admin_database_access(config)
            elif args.command == 'status':
                status_database(config,args.module,args.detail)
            elif args.command == "preflight":
                preflight_database(config, args.module)
            elif args.command == "install-module":
                install_optional_modules(config, args.module)
            elif args.command in ("apply-tag-profile", "refresh-tag-profile", "build-tag-mv", "publish-tag-mv"):
                run_tag_operation(config, args.command, getattr(args, "spec", None), getattr(args, "run_id", None))
            else:
                install_database(config, args.child_demo_skip_commercial)
        return 0
    except DeploymentError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        if args.command == "install":
            print(
                "\nInstallation interrupted by Ctrl+C. If SQL*Plus had already started, some SQL may have committed; "
                "review the local SQL log and database verifiers before retrying.",
                file=sys.stderr,
            )
        elif args.command == "configure":
            print(
                "\nConfiguration cancelled by Ctrl+C. No incomplete configuration was saved; "
                "a wallet downloaded earlier in the wizard may remain on disk.",
                file=sys.stderr,
            )
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
