# ExaDB-D Workload Extension - Multi-Stack Deployment <!-- omit from toc -->

## 1. Summary

| | |
|---|---|
| **Name** | EXACS workload extension for an existing One-OE landing zone |
| **Objective** | Deploy EXACS resources as a separate stack that extends an existing landing zone |
| **Target resources** | EXACS compartments, groups, policies, network, events, alarms, notifications, and flow logs |

&nbsp;

## 2. Architecture Overview

<img src="../content/Multi.png" width="600" align="center">

&nbsp;

## 3. Architecture Components

| JSON configuration | Configuration-defined components |
|---|---|
| [exacs_identity_uc1.json](exacs_identity_uc1.json) | EXACS platform and project database compartments, EXACS groups, and EXACS policies |
| [exacs_network_uc1_a_pre.json](exacs_network_uc1_a_pre.json), [exacs_network_uc1_e_pre.json](exacs_network_uc1_e_pre.json) | Shared EXACS VCN, database subnet, backup subnet, route table, security list, and service gateway before hub DRG routing is ready |
| [oneoe_network_hub_a_post.json](oneoe_network_hub_a_post.json), [oneoe_network_hub_e_post.json](oneoe_network_hub_e_post.json) | Existing One-OE hub network update that attaches the EXACS VCN to the hub DRG |
| [exacs_network_uc1_a.json](exacs_network_uc1_a.json), [exacs_network_uc1_e.json](exacs_network_uc1_e.json) | Shared EXACS VCN network after hub DRG routing is ready |
| [exacs_observability_uc1_pre.json](exacs_observability_uc1_pre.json) | EXACS events, alarms, and notification topics before flow logs |
| [exacs_observability_uc1.json](exacs_observability_uc1.json) | EXACS events, alarms, notification topics, and EXACS VCN flow logs |

The multi-stack EXACS network files are extension-only. The base One-OE stack owns the hub DRG, so the generated `oneoe_network_hub_*_post.json` file updates that stack with the EXACS DRG attachment and hub routes.

Published generated artifacts in this folder currently cover UC1 with one shared EXACS platform VCN, environment EXACS platform compartments, and Autonomous Database Dedicated project DB tiers for `prod` and `preprod`. UC2 and UC3 are retained as design guidance and require config-driven generation before use.

&nbsp;

## 4. Deployment Guidance

For customer deployments, stage these JSON files in a customer-controlled private OCI Object Storage bucket or approved private source repository, then deploy through Terraform CLI or the orchestrator `rms-facade` workflow. Use customer-controlled private sources rather than convenience URL feeds.

Deploy in this order:

1. Deploy the base One-OE landing zone stack.
2. Deploy the EXACS extension stack with `exacs_identity_uc1.json`, `exacs_observability_uc1_pre.json`, and the matching pre network file: `exacs_network_uc1_a_pre.json` for Hub A or `exacs_network_uc1_e_pre.json` for Hub E.
3. Re-apply the base One-OE stack with `oneoe_network_hub_a_post.json` for Hub A or `oneoe_network_hub_e_post.json` for Hub E.
4. Re-apply the EXACS extension stack with the matching final network file and `exacs_observability_uc1.json` after EXACS network resources exist, so DRG routing and VCN flow logs can target the created VCN and subnets.

If using Resource Manager with customer-controlled private sources, configure outputs and dependencies so the EXACS stack can reference resources owned by the existing landing-zone stack.

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
