# Terraform automation for Database Management on External Databases

This Resource Manager-compatible root registers external CDB, PDB, and non-CDB
targets and enables `DIAGNOSTICS_AND_MANAGEMENT` through Management Agents.
It keeps CDB/PDB families explicit and disables broad automatic PDB enablement.

The Management Agent, database monitoring user, and named credential must be
prepared in the customer-controlled host/database boundary before apply.
Populate the ignored template from LZ outputs and deploy this directory through
a dedicated OCI Resource Manager stack.

Offboarding uses `DISABLE_TARGETS` first, followed by `DISABLE_CDB` only after
PDB and non-CDB disablement has been verified. Do not destroy registrations
until OCI Database Management reports the feature disabled.
