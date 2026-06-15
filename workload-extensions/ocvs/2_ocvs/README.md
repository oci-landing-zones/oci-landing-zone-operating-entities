# OCVS Workload Configuration

[ocvs.auto.tfvars.json](./ocvs.auto.tfvars.json) is generated from Jsonnet source under `gen/workload-extensions/ocvs/simple/`.

It emits the orchestrator root variable `ocvs_configuration`, including:

- `default_compartment_id`
- `default_ssh_authorized_keys`
- one SDDC cluster definition
- logical keys for the generated VCN, provisioning subnet, OCVS VLAN route tables, and OCVS VLAN network security groups

Direct deployment requires an orchestrator version that exposes compatible `network_dependency.route_tables` and generic network security group dependency objects to the imported OCVS workload module. Validate the selected orchestrator ref with Terraform before claiming direct OCVS deployment support.

This file does not prove OCI capacity, host shape availability, VMware software availability, quota, or a successful OCVS apply.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
