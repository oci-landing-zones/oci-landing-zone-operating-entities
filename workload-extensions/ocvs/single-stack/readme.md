# OCVS Single-Stack Configuration

The files in this folder are generated snapshots from `gen/workload-extensions/ocvs/single-stack/`.

| File | Purpose |
| --- | --- |
| [identity.auto.tfvars.json](./identity.auto.tfvars.json) | Creates the OCVS platform compartment, admin group, and OCVS administration policies. |
| [network.auto.tfvars.json](./network.auto.tfvars.json) | Creates the OCVS platform VCN, provisioning subnet, route tables, network security groups, service gateway, and DRG attachment reference. |
| [ocvs.auto.tfvars.json](./ocvs.auto.tfvars.json) | Emits the orchestrator root variable `ocvs_configuration` for one SDDC management cluster. |

## OCVS Workload Configuration

`ocvs.auto.tfvars.json` includes:

- `default_compartment_id`
- `default_ssh_authorized_keys`
- one SDDC cluster definition
- logical keys for the generated VCN, provisioning subnet, OCVS VLAN route tables, and OCVS VLAN network security groups

The generated network uses logical keys for resources that the orchestrator can resolve when the compatible network dependency contract is available. Do not hand-edit generated snapshots as source. Change the Jsonnet profile or use the Blueprint Factory config-driven path instead.

For customized deployments, use the [Blueprint Factory](../../../addons/oci-lz-blueprint-factory/README.md) and deploy the generated file set from a customer-controlled private source.

Direct OCVS deployment requires an orchestrator version that exposes compatible `network_dependency.route_tables` and generic network security group dependency objects to the imported OCVS workload module. Validate the selected orchestrator ref with Terraform before claiming direct OCVS deployment support.

These files do not prove OCI capacity, host shape availability, VMware software availability, quota, or a successful OCVS apply.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
