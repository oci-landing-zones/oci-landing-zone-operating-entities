# ExaDB-D Workload Extension - Single-Stack Deployment  <!-- omit from toc -->


## **1. Summary**

| | |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | Complete Landing Zone with EXACS (Single-Stack)                                    |
| **OBJECTIVE**        | Deploy One-OE Landing Zone (No Network Layer) + WE EXACS  |
| **TARGET RESOURCES** | Complete LZ Foundation, IAM, Security, Observability, Network |



&nbsp;

## **2. Architecture Overview**


<img src="../content/Single.png" width="600" align="center">



## **3. Architecture Components**
| JSON configurations | Configuration-defined components | Resources |
|:-|:-|:-|
| **IAM configuration**</br> [exacs_identity_uc1.json](exacs_identity_uc1.json) | • Landing Zone and Exacs compartments</br> • Landing Zone and Exacs IAM groups and policies | cmp-landingzone, cmp-lz-network, cmp-lz-platform, cmp-lz-preprod, cmp-lz-preprod-exacs, cmp-lz-preprod-exacs-db, cmp-lz-preprod-exacs-infra, cmp-lz-preprod-network, cmp-lz-preprod-platform, cmp-lz-preprod-proj1, cmp-lz-preprod-proj1-db, cmp-lz-preprod-projects, cmp-lz-preprod-security, cmp-lz-prod, cmp-lz-prod-exacs, cmp-lz-prod-exacs-db, cmp-lz-prod-exacs-infra, cmp-lz-prod-network, cmp-lz-prod-platform, cmp-lz-prod-proj1, cmp-lz-prod-proj1-db, cmp-lz-prod-projects, cmp-lz-prod-security, cmp-lz-security, cmp-lz-shared-exacs, cmp-lz-shared-exacs-db, cmp-lz-shared-exacs-infra <br><br> grp-auditors-admin, grp-cost-admin, grp-iam-admin, grp-lz-global-exacs-db-admin, grp-lz-global-exacs-infra-admin, grp-lz-network-admin, grp-lz-preprod-proj1-admin, grp-lz-preprod-proj1-exacs-admin, grp-lz-prod-proj1-admin, grp-lz-prod-proj1-exacs-admin, grp-lz-security-admin, grp-security-admin <br><br> pcy-auditing-admin, pcy-cost-admin, pcy-generic-admin, pcy-iam-admin, pcy-lz-global-exacs-db-admin, pcy-lz-global-exacs-generic, pcy-lz-global-exacs-infra-admin, pcy-lz-network-admin, pcy-lz-preprod-exacs-proj1-admin, pcy-lz-preprod-proj1-admin, pcy-lz-preprod-proj1-admin-net, pcy-lz-preprod-proj1-admin-sec, pcy-lz-prod-exacs-proj1-admin, pcy-lz-prod-proj1-admin, pcy-lz-prod-proj1-admin-net, pcy-lz-prod-proj1-admin-sec, pcy-lz-security-admin, pcy-security-admin, pcy-services-admin |
| **Network configuration**</br> [exacs_network_hub_e.json](exacs_network_hub_e.json) | • Hub and spoke VCNs with private/public subnets</br> • DRG, gateways, route tables, security lists, and NSGs | vcn-fra-lz-hub, vcn-fra-lz-preprod-projects, vcn-fra-lz-prod-projects, vcn-fra-lz-shared-exacs, sn-fra-lz-hub-dns, sn-fra-lz-hub-lb, sn-fra-lz-hub-mgmt, sn-fra-lz-hub-mon, sn-fra-lz-preprod-app, sn-fra-lz-preprod-db, sn-fra-lz-preprod-infra, sn-fra-lz-preprod-web, sn-fra-lz-prod-app, sn-fra-lz-prod-db, sn-fra-lz-prod-infra, sn-fra-lz-prod-web, sn-fra-lz-shared-exacs-bck, sn-fra-lz-shared-exacs-db <br><br> drg-fra-lz-hub, drgatt-fra-lz-hub, drgatt-fra-lz-preprod-proj, drgatt-fra-lz-prod-proj, drgatt-fra-lz-shared-exacs, drgrd-fra-lz-hub, drgrd-fra-lz-spoke, drgrt-fra-lz-hub, drgrt-fra-lz-spokes, igw-fra-lz-hub, ngw-fra-lz-hub, ngw-fra-lz-preprod-proj, ngw-fra-lz-prod-proj, sgw-fra-lz-hub, sgw-fra-lz-preprod-proj, sgw-fra-lz-prod-proj, lb-fra-lz-prod-01 <br><br> rt-fra-lz-hub-lb, rt-fra-lz-hub-mgmt, rt-fra-lz-preprod-proj-generic, rt-fra-lz-prod-proj-generic, rt-fra-lz-shared-exacs-generic, sl-fra-lz-hub-lb, sl-fra-lz-hub-mgmt, sl-fra-lz-preprod-proj-generic, sl-fra-lz-prod-proj-generic, sl-fra-lz-shared-exacs-generic, nsg-fra-lz-hub-lb, nsg-fra-lz-preprod-proj1-app, nsg-fra-lz-preprod-proj1-db, nsg-fra-lz-preprod-proj1-web, nsg-fra-lz-prod-proj1-app, nsg-fra-lz-prod-proj1-db, nsg-fra-lz-prod-proj1-web, nsg-fra-lz-shared-exacs-db |
| **Observability configuration**</br> **CIS v1 Step 1**: [exacs_observability_cis1_uc1_pre.json](exacs_observability_cis1_uc1_pre.json)</br> **CIS v1 Step 2**: [exacs_observability_cis1_uc1.json](exacs_observability_cis1_uc1.json)</br> **CIS v2 Step 1**: [exacs_observability_cis2_uc1_pre.json](exacs_observability_cis2_uc1_pre.json)</br> **CIS v2 Step 2**: [exacs_observability_cis2_uc1.json](exacs_observability_cis2_uc1.json) | • Events</br> • Alarms</br> • Logging and notifications</br> • Service connector components | rul-lz-notify-on-cloudguard-changes, rul-lz-notify-on-exacs-db-events, rul-lz-notify-on-exacs-infra-events, rul-lz-notify-on-exacs-vmc-events, rul-lz-notify-on-iam-changes, rul-lz-notify-on-opctl-events, rul-lz-preprod-notify-on-notifications-projects, rul-lz-prod-notify-on-notifications-projects <br><br> al-lz-db-cpuutil, al-lz-db-storageutil, al-lz-vmc-cpuutil, al-lz-vmc-dgutil, al-lz-vmc-fsutil, al-lz-vmc-memutil, al-lz-vmc-swaputil <br><br> nott-lz-cloudguard, nott-lz-iam, nott-lz-network, nott-lz-preprod-exacs-projects, nott-lz-prod-exacs-projects, nott-lz-security, nott-lz-shared-exacs-db-workloads, nott-lz-shared-exacs-infra-workloads, lgrp-lz-hub-vcn-flow, lgrp-lz-preprod-vcn-flow, lgrp-lz-prod-vcn-flow, lgrp-lz-shared-exacs-vcn-flow <br><br> bkt-lz-service-connector, sch-lz-monitor, service-connector-audit-policy |

&nbsp;


## **5. Deployment Steps**

| USE CASE | 1 | 2 | 3 |
|----------|---|---|---|
| Description | [Shared exacs platform](../exacs_use_cases/readme.md/#21-shared-exadb-d-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments) |  |  |
| Deployment | CIS v1 [<img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_observability_cis1_uc1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_network_hub_e.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_security_cis1_uc1.json"})<br><br> CIS v2 [<img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_observability_cis2_uc1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_network_hub_e.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_security_cis2_uc1.json"}.) <br><br>To read some best practices about how to use ORM go [here](../../../blueprints/one-oe/runtime/one-stack/orm_bp.md). <br> The one-click button includes observability configuration without VCN Flow Logs. Re-run a second apply process including the observability files that enable VCN Flow Logs. |Coming Soon | Coming Soon |





&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
