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
| **Network configuration** for </br> **Step 1**: [exacs_network_uc1_pre.json](exacs_network_uc1_pre.json) </br> and</br> **Step 2**: [exacs_network_uc1.json](exacs_network_uc1.json) | • [Hub E](/addons/oci-hub-models/hub_e/readme.md) VCN with associated subnets, Internet, NAT and Service Gateways</br> • Dynamic Routing Gateway (DRG)</br> • Route Tables with corresponding route rules</br> • Three spoke VCNs (Prod, Preprod, and Shared Exacs) with private-only subnets </br> • Service Gateways and NAT Gateways in the spoke VCNs</br> • Security Lists (SLs) and Network Security Groups (NSGs) </br> • Public Load Balancer ([free tier LBaaS](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm#loadbalancing)) with two example backend IP addresses from the production web tier: 10.0.64.10 and 10.0.64.20. The LBaaS and backend configurations are provided solely for example purposes and should be updated to reference actual workload instances | vcn-fra-lz-shared-exacs, sn-fra-lz-shared-exacs-db, sn-fra-lz-shared-exacs-bck, nsg-fra-lz-shared-exacs-db, rt-fra-lz-shared-exacs-generic, sl-fra-lz-shared-exacs-generic |
| **Observability configuration** for</br> **Step 1**: [exacs_observability_uc1_pre.json](exacs_observability_uc1_pre.json)</br> and</br> **Step 2**: [exacs_observability_uc1.json](exacs_observability_uc1.json) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | • Events</br> • Alarms</br> • Logging</br> • Notifications | rul-lz-notify-on-opctl-events, rul-lz-notify-on-exacs-vmc-events, rul-lz-notify-on-exacs-db-events, rul-lz-notify-on-exacs-infra-events, rul-lz-preprod-notify-on-notifications-projects, rul-lz-prod-notify-on-notifications-projects <br><br> al-lz-db-cpuutil, al-lz-vmc-cpuutil, al-lz-vmc-dgutil, al-lz-vmc-fsutil, al-lz-vmc-memutil, al-lz-vmc-swaputil, al-lz-db-storageutil <br><br> nott-lz-shared-exacs-db-workloads, nott-lz-shared-exacs-infra-workloads, nott-lz-preprod-exacs-projects, nott-lz-prod-exacs-projects, lgrp-lz-shared-exacs-vcn-flow |

&nbsp;



&nbsp;

## **5. Deployment Steps**


| USE CASE | 1 | 2 | 3 |
|----------|---|---|---|
| Description | [Shared Exacs platform](../exacs_use_cases/readme.md/#21-shared-exadb-d-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments) |  |  |
| Deployment | <br> [<img src="../../../commons/images/DeployToOCI.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_observability_uc1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/multi-stack/exacs_network_uc1_pre.json"}). <br><br> To deploy with ORM, you'll need to configure outputs and dependencies, since pre-existing resources will be used. To learn more about this, go here. <br><br> In addition to ORM, the Terraform CLI can also be integrated with third-party pipelines. To learn more about this, go here. | Soon | Soon |




&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
