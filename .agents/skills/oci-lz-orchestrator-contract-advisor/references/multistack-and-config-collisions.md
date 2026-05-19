# Multi-Stack And Config Collision Reference

## Boundary Rule

Split by operation and Terraform state, not by scattering the same root configuration family across multiple files.

Good boundary:

- one operation
- one state file
- one output publication path
- one coherent set of top-level configuration families

## Duplicate Root Keys

Terraform CLI `-var-file` inputs do not deep-merge repeated root variables. Later files override earlier files for the same root variable.

`rms-facade` behavior must be confirmed from `rms-facade/get_configurations.tf`; do not assume repeated top-level keys are merged.

## Advice Pattern

When troubleshooting multi-stack decomposition:

1. Identify the stack boundary and execution mode.
2. List the configuration files for that operation.
3. Check for repeated top-level families.
4. Confirm upstream outputs and downstream dependency inputs.
5. Recommend one complete config set per state boundary.
