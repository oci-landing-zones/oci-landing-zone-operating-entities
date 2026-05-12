# ExaDB-D Workload Extension <!-- omit from toc -->

## Table of Contents <!-- omit from toc -->

- [**1. Summary**](#1-summary)
- [**2. Design Overview**](#2-design-overview)
- [3. Deployment Options](#3-deployment-options)

&nbsp;

## **1. Summary**

Welcome to the ExaDB-C@C Landing Zone Workload Extension (WE).

The ExaDB-C@C Landing Zone Workload Extension is a secure cloud environment, designed with the best practices to simplify the on-boarding of ExaDB-C@C workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone configuration.

&nbsp;

## **2. Design Overview**
This workload extension uses the [One-OE](../../blueprints/one-oe/) Blueprint as the reference Landing Zone and guides the deployment of ExaDB-C@C on top of it. The extension includes a base infrastructure layer that provisions the required OCI resources for deploying ExaDB-C@C.

If you have not reviewed it yet, we recommend checking the [ExaDB-C@C use cases section](../exacc/exacc_use_cases/readme.md) to better understand the available scenarios and identify the one that best fits your needs.

&nbsp;

## 3. Deployment Options

This extension provides two published deployment layouts:

| Consideration | [Single-stack](./single-stack/readme.md) | [Multi-stack](./multi-stack/readme.md) |
|---|---|---|
| Use case | PoC, lab, or one-shot reference deployment | Extension of a existing Landing zone or Modular IaC Model. |
| Landing zone | One-OE plus ExaDB-C@C in one deployable set | Existing One-OE landing zone plus ExaDB-C@C extension files |
| Terraform state | Combined state | Separate landing-zone and EXACS state |
| Lifecycle | Landing zone and EXACS resources move together | EXACS resources can be managed separately |
| Complexity | Lower | Requires coordination with existing landing-zone outputs |

For customer deployments, stage generated JSON files in a customer-controlled private OCI Object Storage bucket or approved private source repository, then deploy through Terraform CLI or the orchestrator `rms-facade` workflow. Use customer-controlled private sources rather than convenience URL feeds.

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
