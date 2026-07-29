# Autonomous Database

This scenario provides Landing Zone foundation assets and a target-specific
[Terraform root](./terraform/) for private connectivity, Vault-backed
credentials, and Autonomous Database DBM feature enablement.

Autonomous Database uses its dedicated OCI provider resource and must not use
the Base/ExaCS target contract. The database owner must first prepare the
`ADBSNMP` account and grants described in `steps_to_enable_DBM_ADB.md`.

Log Analytics is foundation-only in this scenario. No Autonomous-specific
source/entity collection contract is emitted. Prove a separately reviewed
ingestion method before calling the target supported; do not assume host-file
paths exist for Autonomous Database.

The legacy implementation and console-enablement documents are retained for
historical context only. They are not the supported automated execution path.
