# ExaDB-C@C WE Set-up <!-- omit from toc -->

## **Table of Contents** <!-- omit from toc -->

- [**1. Summary**](#1-summary)
- [**2. Design Overview**](#2-design-overview)
- [**3. Deployment Options**](#3-deployment-options)

&nbsp;

## **1. Summary**

Welcome to the ExaDB-C@C Landing Zone Workload Extension (WE).

The ExaDB-C@C Landing Zone Workload Extension is a secure cloud environment, designed with the best practices to simplify the on-boarding of ExaDB-C@C workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone configuration.

&nbsp;

## **2. Design Overview**
This workload extension uses the [One-OE](../../blueprints/one-oe/) Blueprint as the reference Landing Zone and guides the deployment of ExaDB-C@C on top of it. The extension includes a base infrastructure layer that provisions the required OCI resources for deploying ExaDB-C@C.

If you have not reviewed it yet, we recommend checking the [ExaDB-C@C use cases section](../exacc/exacc_use_cases/readme.md) to better understand the available scenarios and identify the one that best fits your needs.

&nbsp;

## **3. Deployment Options**

This Landing Zone Extension provides **two deployment approaches**, [single-stack](./single-stack/readme.md) and  [multi-stack](./multi-stack/readme.md), to accommodate different use cases and architectural preferences. Both approaches use the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator).


| Consideration | [Single-stack](./single-stack/readme.md) | [Multi-stack](./multi-stack/readme.md) |
|---|---|---|
| Use case | PoC, lab, or one-shot reference deployment | Extension of a existing Landing zone or Modular IaC Model. |
| Landing zone | One-OE plus ExaDB-C@C in one deployable set | Existing One-OE landing zone plus ExaDB-C@C extension files |
| Deployment steps | Single deployment operation | Deploy One-OE first, then ExaDB-C@C extension |
| Terraform state | Combined state | Separate landing-zone and ExaDB-C@C state |
| Components | One-OE foundation plus ExaDB-C@C IAM and observability | ExaDB-C@C IAM and observability only |
| Lifecycle | Landing zone and ExaDB-C@C resources move together | ExaDB-C@C resources can be managed separately |
| Complexity | Lower | Requires coordination with existing landing-zone outputs |

&nbsp;
# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
