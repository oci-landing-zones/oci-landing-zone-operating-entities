# OCVS Landing Zone Extension

The OCVS extension artifacts in this directory are generated from Jsonnet source under `gen/workload-extensions/ocvs/simple/`.

Use the config-driven path for customized OCVS deployments. The config extension type is `ocvs_simple`; see [config-driven.md](./config-driven.md). Published snapshots in this directory are reference artifacts. Customer deployments should use generated outputs staged in a customer-controlled private source.

Direct OCVS deployment requires an orchestrator version whose `ocvs_configuration` and network dependency contract has been validated with the generated OCVS files. This repository does not claim that validation level unless the release notes or test evidence for the selected orchestrator ref say so.

## Published Artifacts

1. [Foundations](./1_foundations/README.md): generated IAM and network prerequisites for the OCVS platform.
2. [OCVS workload](./2_ocvs/README.md): generated `ocvs_configuration` payload for the orchestrator OCVS workload module.
3. [Optional load balancer subnet](./3_lb_optional/README.md): manual optional post-deployment guidance retained from the existing extension.

## Validation Boundary

The generated files validate Jsonnet structure, generator contracts, and Terraform input shape when tested against a compatible orchestrator. They do not prove OCI service capacity, host shape availability, VMware software availability, quota, or a successful OCVS apply.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
