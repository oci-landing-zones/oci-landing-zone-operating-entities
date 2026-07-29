# Terraform automation for Database Management on Autonomous Database

This Resource Manager-compatible root automates the OCI control-plane steps in
`steps_to_enable_DBM_ADB.md`:

- consume the LZ Autonomous Database, private endpoint, and Vault secret keys;
- enable `DIAGNOSTICS_AND_MANAGEMENT`; and
- configure the private-endpoint connection without plaintext credentials.

The database owner must unlock and grant the documented privileges to
`ADBSNMP` before apply. Terraform cannot safely perform that in-database action
through the OCI provider. Populate the ignored tfvars template from LZ outputs,
run offline `fmt/init -backend=false/validate`, and deploy this directory as its
own OCI Resource Manager stack.

To offboard an ADB, set its `enable_database_management` value to `false`,
review the Resource Manager plan, apply it, and verify the DBM feature is
disabled before removing the target from configuration. Do not use
`terraform destroy` as the disable workflow.
