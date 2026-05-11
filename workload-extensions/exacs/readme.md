# ExaDB-D Workload Extension <!-- omit from toc -->

## Table of Contents <!-- omit from toc -->

- [1. Summary](#1-summary)
- [2. Design Overview](#2-design-overview)
- [3. Deployment Options](#3-deployment-options)

&nbsp;

## 1. Summary

The ExaDB-D Landing Zone Workload Extension is a reference configuration for onboarding Exadata Database Service on Dedicated Infrastructure workloads into an OCI landing zone. It adds the EXACS network, IAM, and observability resources needed to operate ExaDB-D database platforms.

The generated UC1 examples model a One-OE landing zone with `prod` and `preprod` environments, one shared EXACS platform VCN, environment EXACS platform compartments, and project-level EXACS database compartments for Autonomous Database Dedicated. The published examples intentionally include both shared and environment platform scopes to cover multiple ExaDB-D placement use cases.

Published generated artifacts currently cover UC1. UC2 and UC3 are retained as design guidance and require config-driven generation before use.

&nbsp;

## 2. Design Overview

This workload extension uses the One-OE blueprint as the reference landing zone and layers ExaDB-D resources on top of it. The extension includes:

- EXACS platform compartments for database and infrastructure administration.
- EXACS IAM groups and policies for global DBA, global infrastructure, and project DBA teams.
- EXACS platform VCNs with database and backup subnets where AVMCs or VMCs are placed.
- EXACS event rules, alarms, notification topics, and flow-log support in published outputs.

In config-driven generation, Exadata infrastructure placement and AVMC/VMC placement are separate decisions. Infrastructure-only EXACS scopes omit the platform network and do not receive AVMC/VMC permissions. AVMC/VMC scopes require a platform network. Autonomous Database Dedicated project tiers are represented with `project_db_compartments`. A separate project/spoke network is only required when project resources, such as application VMs, need network connectivity to those databases.

See the [ExaDB-D use cases](./exacs_use_cases/readme.md) for the design scenarios behind the published example.

&nbsp;

## 3. Deployment Options

This extension provides two published deployment layouts:

| Consideration | [Single-stack](./single-stack/readme.md) | [Multi-stack](./multi-stack/readme.md) |
|---|---|---|
| Use case | PoC, lab, or one-shot reference deployment | Production-style extension of an existing landing zone |
| Landing zone | One-OE Hub E plus EXACS in one deployable set | Existing One-OE landing zone plus EXACS extension files |
| Terraform state | Combined state | Separate landing-zone and EXACS state |
| Lifecycle | Landing zone and EXACS resources move together | EXACS resources can be managed separately |
| Complexity | Lower | Requires coordination with existing landing-zone outputs |

For customer deployments, stage generated JSON files in a customer-controlled private OCI Object Storage bucket or approved private source repository, then deploy through Terraform CLI or the orchestrator `rms-facade` workflow. Use customer-controlled private sources rather than convenience URL feeds.

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
