# OCVS Foundations

The files in this folder are generated snapshots from `gen/workload-extensions/ocvs/simple/`.

| File | Purpose |
| --- | --- |
| [identity.auto.tfvars.json](./identity.auto.tfvars.json) | Creates the OCVS platform compartment, admin group, and OCVS administration policies. |
| [network.auto.tfvars.json](./network.auto.tfvars.json) | Creates the OCVS platform VCN, provisioning subnet, route tables, network security groups, service gateway, and DRG attachment reference. |

The generated network uses logical keys for resources that the orchestrator can resolve when the compatible network dependency contract is available. Do not hand-edit generated snapshots as source. Change the Jsonnet profile or use config mode instead.

For customized deployments, use `bash gen/generate.sh --config <config_file> <output_dir>` and deploy the generated file set from a customer-controlled private source.

Direct OCVS deployment remains gated on validation against the selected orchestrator ref. OCVS apply is not proven by these generated files.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
