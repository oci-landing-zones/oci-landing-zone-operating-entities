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

The extension covers three ExaDB-C@C use cases:

1. **Shared ExaDB-C@C Platform**: Shared infrastructure and shared VMCs/AVMCs across multiple environments.
2. **Hybrid ExaDB-C@C Platform**: Shared infrastructure with dedicated VMCs/AVMCs per environment.
3. **Dedicated ExaDB-C@C Platform**: Fully dedicated infrastructure and VMCs/AVMCs per environment.

Published generated artifacts currently support the shared model. The hybrid and dedicated models are retained as design guidance and require config-driven generation before use.

If you have not reviewed it yet, we recommend checking the [ExaDB-C@C use cases section](../exacc/exacc_use_cases/readme.md) to better understand the available scenarios and identify the one that best fits your needs.

&nbsp;

## **3. Deployment Options**
&nbsp;

| When to use it / Use case  | POC or one-shot reference deployment | Extension of an existing Landing Zone or Modular IaC Model. |
|---|---|---|
| Shared ExaDB-C@C Platform | Use when deploying a new One-OE foundation and the shared ExaDB-C@C platform together in one deployable set. Published UC1 artifacts are available in the [single-stack](./single-stack/readme.md) folder. | Use when extending an existing One-OE landing zone with the shared ExaDB-C@C platform. Published UC1 extension artifacts are available in the [multi-stack](./multi-stack/readme.md) folder. |
| Hybrid ExaDB-C@C Platform | Config-driven generation required | Config-driven generation required |
| Dedicated ExaDB-C@C Platform | Config-driven generation required | Config-driven generation required |

&nbsp;

This Landing Zone Extension provides **two deployment approaches**, single-stack and  multi-stack, to accommodate different use cases and architectural preferences. Both approaches use the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator).

&nbsp;
# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
