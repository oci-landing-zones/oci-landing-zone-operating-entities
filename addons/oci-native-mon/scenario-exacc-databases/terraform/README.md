# Terraform automation for Database Management on ExaCC

This Resource Manager-compatible root automates the OCI control-plane portions
of `steps_to_enable_DBM_ExaCC.md`:

- create bounded Management Agent installation keys;
- register external CDB, PDB, and non-CDB resources;
- preserve CDB-before-PDB ordering; and
- enable `DIAGNOSTICS_AND_MANAGEMENT` through existing Management Agents.

Agent software installation, plugin activation, and `C##OCI_MON_USER` database
privileges occur on customer-controlled ExaCC hosts and remain explicit
pre-apply gates. The Terraform provider cannot safely execute those host and
database operations. Populate the ignored template from LZ outputs, validate
offline, and deploy this directory as a dedicated OCI Resource Manager stack.

Offboarding is staged: apply `DISABLE_TARGETS`, verify every PDB and non-CDB is
disabled, then apply `DISABLE_CDB` and verify the CDB. Removing registrations
or destroying the stack is not a substitute for this sequence.
