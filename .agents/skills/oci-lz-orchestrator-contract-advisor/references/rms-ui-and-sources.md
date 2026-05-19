# RMS UI And Source Selection

## Core Distinction

Do not conflate landing-zone `object_storage_configuration` with Resource Manager source fields. The former creates OCI buckets as infrastructure; the latter tells `rms-facade` where to read configuration or dependency files.

## Source Modes

- `configuration_source = "ocibucket"` uses `oci_configuration_bucket`, `oci_configuration_objects`, and optionally `oci_dependency_objects`.
- `configuration_source = "github"` uses GitHub repository/branch/file inputs and optionally GitHub dependency files.
- `configuration_source = "url"` uses `input_config_files_urls`; `url_dependency_source` matters only for this mode.

For customer deployments, prefer customer-controlled private Object Storage or approved private GitHub sources. Public raw URLs are useful for examples and inspection, not as the secure default.

## Output Persistence

`save_output` writes outputs through the configured dependency/source family. Use the active `schema.yml`, `variables.tf`, and `outputs.tf` to verify exact field behavior and prefix settings.
