# ExaDB-D Workload Extension - Multi-stack Deployment  <!-- omit from toc -->


## **1. Summary**

| | |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | WE ExaDB-D deployment to extend an existing One-OE LZ (Multi-Stack)                                    |
| **OBJECTIVE**        |  WE ExaDB-D   |
| **TARGET RESOURCES** | compartments, groups, policies, network, events, alarms and notifications |



&nbsp;

## **2. Architecture Overview**


<img src="../content/Multi.png" width="600" align="center">



## **3. Architecture Components**


| JSON configurations | Configuration-defined components | Resources |
|:-|:-|:-|
| **IAM configuration**</br> [exacs_identity.json](exacs_identity_uc1.json) | • Exacs compartments</br> • Exacs IAM groups and policies | cmp-lz-platform > cmp-lz-shared-exacs > cmp-lz-shared-exacs-db, cmp-lz-platform > cmp-lz-shared-exacs > cmp-lz-shared-exacs-infra, cmp-lz-prod-platform > cmp-lz-prod-exacs > cmp-lz-prod-exacs-db, cmp-lz-prod-platform > cmp-lz-prod-exacs > cmp-lz-prod-exacs-infra, cmp-lz-prod-projects > cmp-lz-prod-proj1 > cmp-lz-prod-proj1-db, cmp-lz-preprod-platform > cmp-lz-preprod-exacs > cmp-lz-preprod-exacs-db, cmp-lz-preprod-platform > cmp-lz-preprod-exacs > cmp-lz-preprod-exacs-infra, cmp-lz-preprod-projects > cmp-lz-preprod-proj1 > cmp-lz-preprod-proj1-db <br><br> grp-lz-global-exacs-db-admin, grp-lz-global-exacs-infra-admin, grp-lz-preprod-proj1-exacs-admin, grp-lz-prod-proj1-exacs-admin <br><br> pcy-lz-global-exacs-db-admin, pcy-lz-global-exacs-generic, pcy-lz-global-exacs-infra-admin, pcy-lz-preprod-exacs-proj1-admin, pcy-lz-prod-exacs-proj1-admin |
| **Network configuration** for </br> **Step 1**: [exacs_network_uc1_a_pre.json](exacs_network_uc1_a_pre.json) </br> and</br> **Step 2**: [exacs_network_uc1_a.json](exacs_network_uc1_a.json) or [exacs_network_uc1_a_pre.json](exacs_network_uc1_e_pre.json) </br> and</br> **Step 2**: [exacs_network_uc1_a.json](exacs_network_uc1_e.json) | exacs vcns spoke with two subnets, generic RT and generic SL | vcn-fra-lz-shared-exacs, sn-fra-lz-shared-exacs-db, sn-fra-lz-shared-exacs-bck, nsg-fra-lz-shared-exacs-db, rt-fra-lz-shared-exacs-generic, sl-fra-lz-shared-exacs-generic |
| **Observability configuration** for</br> **Step 1**: [exacs_observability_uc1_pre.json](exacs_observability_uc1_pre.json)</br> and</br> **Step 2**: [exacs_observability_uc1.json](exacs_observability_uc1.json) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | • Events</br> • Alarms</br> • Logging</br> • Notifications | rul-lz-notify-on-opctl-events, rul-lz-notify-on-exacs-vmc-events, rul-lz-notify-on-exacs-db-events, rul-lz-notify-on-exacs-infra-events, rul-lz-preprod-notify-on-notifications-projects, rul-lz-prod-notify-on-notifications-projects <br><br> al-lz-db-cpuutil, al-lz-vmc-cpuutil, al-lz-vmc-dgutil, al-lz-vmc-fsutil, al-lz-vmc-memutil, al-lz-vmc-swaputil, al-lz-db-storageutil <br><br> nott-lz-shared-exacs-db-workloads, nott-lz-shared-exacs-infra-workloads, nott-lz-preprod-exacs-projects, nott-lz-prod-exacs-projects, lgrp-lz-shared-exacs-vcn-flow |

&nbsp;



&nbsp;

## **5. Deployment Steps**


| USE CASE | 1 | 2 | 3 |
|----------|---|---|---|
| Description | [Shared Exacs platform](../exacs_use_cases/readme.md/#21-shared-exadb-d-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments) |  |  |
| Deployment | EXACS WE for HUB E<br> [<img src="../../../commons/images/DeployToOCI.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_observability_uc1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_network_uc1_e_pre.json"})<br><br> EXACS WE for HUB A<br> [<img src="../../../commons/images/DeployToOCI.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_observability_uc1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_network_uc1_a_pre.json"})<br><br>   Previous stack uses "pre" observability and network files  (exacs_network_uc1_a_pre.json and exacs_observability_uc1_pre.json). After deploying the second stack (WE), re-run the One-OE deployment (the first stack) to add the network attachment (oneoe_network_hub_a_post.json). Then re-run the second stack with the final files (exacs_network_uc1_a.json and exacs_observability_uc1.json) to include the VCN flow logs and DRG routing in the spoke.<br><br> To deploy with ORM, you'll need to configure outputs and dependencies, since pre-existing resources will be used. To learn more about this, go [here](../../../commons/content/orm_bp.md). <br><br> In addition to ORM, the Terraform CLI can also be integrated with third-party pipelines. To learn more about this, go here. | Soon | Soon |




&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
