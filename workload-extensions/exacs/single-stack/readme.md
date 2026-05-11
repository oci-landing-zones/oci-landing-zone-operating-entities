# ExaDB-D Workload Extension - Single-Stack Deployment <!-- omit from toc -->

## 1. Summary

| | |
|---|---|
| **Name** | Complete landing zone with EXACS |
| **Objective** | Deploy One-OE Hub E plus the EXACS workload extension in one stack |
| **Target resources** | Landing-zone foundation, IAM, governance, security, observability, and network |

&nbsp;

## 2. Architecture Overview

<img src="../content/Single.png" width="600" align="center">

&nbsp;

## 3. Architecture Components

| JSON configuration | Configuration-defined components |
|---|---|
| [exacs_identity_uc1.json](exacs_identity_uc1.json) | Landing-zone and EXACS compartments, EXACS groups, and EXACS policies |
| [exacs_governance_uc1.json](exacs_governance_uc1.json) | Landing-zone tag namespaces and tag definitions |
| [exacs_network_hub_e.json](exacs_network_hub_e.json) | Hub E, spoke, and shared EXACS VCN resources |
| [exacs_security_cis1_uc1.json](exacs_security_cis1_uc1.json) | CIS level 1 security configuration |
| [exacs_security_cis2_uc1.json](exacs_security_cis2_uc1.json) | CIS level 2 security configuration |
| [exacs_observability_cis1_uc1_pre.json](exacs_observability_cis1_uc1_pre.json) | CIS level 1 observability before flow logs |
| [exacs_observability_cis1_uc1.json](exacs_observability_cis1_uc1.json) | CIS level 1 observability with flow logs |
| [exacs_observability_cis2_uc1_pre.json](exacs_observability_cis2_uc1_pre.json) | CIS level 2 observability before flow logs |
| [exacs_observability_cis2_uc1.json](exacs_observability_cis2_uc1.json) | CIS level 2 observability with flow logs |

The published single-stack UC1 example uses one shared EXACS platform VCN with database and backup subnets. It also creates environment EXACS platform compartments and project-level EXACS database compartments for `prod` and `preprod` so the published artifacts continue to cover multiple ExaDB-D placement use cases.

Published generated artifacts in this folder currently cover UC1. UC2 and UC3 are retained as design guidance and require config-driven generation before use.

&nbsp;

## 4. Deployment Guidance

For customer deployments, stage these JSON files in a customer-controlled private OCI Object Storage bucket or approved private source repository, then deploy through Terraform CLI or the orchestrator `rms-facade` workflow. Use customer-controlled private sources rather than convenience URL feeds.

Use the `*_pre.json` observability file for the first apply when flow-log target resources do not yet exist. Re-run with the non-`pre` observability file after the network resources exist to enable VCN flow logs.

For CIS level 1, use:

- `exacs_governance_uc1.json`
- `exacs_identity_uc1.json`
- `exacs_network_hub_e.json`
- `exacs_security_cis1_uc1.json`
- `exacs_observability_cis1_uc1_pre.json`, then `exacs_observability_cis1_uc1.json`

For CIS level 2, use:

- `exacs_governance_uc1.json`
- `exacs_identity_uc1.json`
- `exacs_network_hub_e.json`
- `exacs_security_cis2_uc1.json`
- `exacs_observability_cis2_uc1_pre.json`, then `exacs_observability_cis2_uc1.json`

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
