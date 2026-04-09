# EXACC Workload Extension - Single-Stack Deployment  <!-- omit from toc -->


## **1. Summary**

| | |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | Complete Landing Zone with EXACC (Single-Stack)                                    |
| **OBJECTIVE**        | Deploy One-oe Landing Zone (No Network Layer) + WE EXACC  |
| **TARGET RESOURCES** | Complete LZ Foundation, IAM, Security, Observability |



&nbsp;

## **2. Architecture Overview**


<img src="../content/Single.png" width="600" align="center">



## **3. Architecture Components**
| JSON configurations | Configuration-defined components | Resources |
|:-|:-|:-|
| **IAM configuration**</br> [exacc_identity_uc1.json](exacc_identity_uc1.json) | • Landing Zone and Exacc compartments</br> • Landing Zone and Exacc IAM groups and policies | cmp-landingzone, cmp-lz-network, cmp-lz-platform, cmp-lz-preprod, cmp-lz-preprod-exacc, cmp-lz-preprod-exacc-db, cmp-lz-preprod-exacc-infra, cmp-lz-preprod-network, cmp-lz-preprod-platform, cmp-lz-preprod-proj1, cmp-lz-preprod-proj1-db, cmp-lz-preprod-projects, cmp-lz-preprod-security, cmp-lz-prod, cmp-lz-prod-exacc, cmp-lz-prod-exacc-db, cmp-lz-prod-exacc-infra, cmp-lz-prod-network, cmp-lz-prod-platform, cmp-lz-prod-proj1, cmp-lz-prod-proj1-db, cmp-lz-prod-projects, cmp-lz-prod-security, cmp-lz-security, cmp-lz-shared-exacc, cmp-lz-shared-exacc-db, cmp-lz-shared-exacc-infra <br><br> grp-auditors-admin, grp-cost-admin, grp-iam-admin, grp-lz-global-exacc-db-admin, grp-lz-global-exacc-infra-admin, grp-lz-network-admin, grp-lz-preprod-proj1-admin, grp-lz-preprod-proj1-exacc-admin, grp-lz-prod-proj1-admin, grp-lz-prod-proj1-exacc-admin, grp-lz-security-admin, grp-security-admin <br><br> pcy-auditing-admin, pcy-cost-admin, pcy-generic-admin, pcy-iam-admin, pcy-lz-global-exacc-db-admin, pcy-lz-global-exacc-generic, pcy-lz-global-exacc-infra-admin, pcy-lz-network-admin, pcy-lz-preprod-exacc-proj1-admin, pcy-lz-preprod-proj1-admin, pcy-lz-preprod-proj1-admin-net, pcy-lz-preprod-proj1-admin-sec, pcy-lz-prod-exacc-proj1-admin, pcy-lz-prod-proj1-admin, pcy-lz-prod-proj1-admin-net, pcy-lz-prod-proj1-admin-sec, pcy-lz-security-admin, pcy-security-admin, pcy-services-admin |
| **Governance configuration**</br> [exacc_governance_uc1.json](exacc_governance_uc1.json) | • Tag namespace and tag definitions | tagns-lz-role, tag-lz-role |
| **Security configuration**</br> **CIS v1**: [exacc_security_cis1_uc1.json](exacc_security_cis1_uc1.json)</br> **CIS v2**: [exacc_security_cis2_uc1.json](exacc_security_cis2_uc1.json) | • Cloud Guard target</br> • Security Zone recipes and targets</br> • Vulnerability scanning resources | cg-tgt-root, key-lz-shared-oss-audit-bkt, sz-rcp-lz-01-cis-l1, sz-rcp-lz-02-cis-l2, sz-rcp-lz-03-shared-network, sz-rcp-lz-04-environment-network, sz-rcp-lz-05-workload, sz-tgt-lz-cis-l1, sz-tgt-lz-cis-l2, vlt-lz-shared-security, vss-rcph-lz, vss-tgth-lz |
| **Observability configuration**</br> **CIS v1**: [exacc_observability_cis1_uc1.json](exacc_observability_cis1_uc1.json)</br> **CIS v2**: [exacc_observability_cis2_uc1.json](exacc_observability_cis2_uc1.json) | • Events</br> • Alarms</br> • Notifications</br> • Service connector components | rul-lz-notify-network, rul-lz-notify-on-cloudguard-changes, rul-lz-notify-on-exacc-db-events, rul-lz-notify-on-exacc-infra-events, rul-lz-notify-on-exacc-vmc-events, rul-lz-notify-on-iam-changes, rul-lz-notify-on-opctl-events, rul-lz-notify-security, rul-lz-preprod-notify-network, rul-lz-preprod-notify-on-notifications-projects, rul-lz-preprod-notify-security, rul-lz-prod-notify-network, rul-lz-prod-notify-on-notifications-projects, rul-lz-prod-notify-security <br><br> al-lz-db-cpuutil, al-lz-db-storageutil, al-lz-network-lb, al-lz-vmc-cpuutil, al-lz-vmc-dgutil, al-lz-vmc-fsutil, al-lz-vmc-memutil, al-lz-vmc-swaputil <br><br> nott-lz-cloudguard, nott-lz-exacc-db-workloads, nott-lz-exacc-infra-workloads, nott-lz-iam, nott-lz-network, nott-lz-preprod-exacc-projects, nott-lz-prod-exacc-projects, nott-lz-security <br><br> bkt-lz-service-connector, sch-lz-monitor, service-connector-audit-policy |

&nbsp;


## **5. Deployment Steps**

| USE CASE | 1 | 2 | 3 |
|----------|---|---|---|
| Description | [Shared exacc platform](../exacc_use_cases/readme.md/#21-shared-exadb-cc-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments) |  |  |
| Deployment | CIS v1 [<img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/single-stack/exacc_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/single-stack/exacc_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/single-stack/exacc_observability_cis1_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/single-stack/exacc_security_cis1_uc1.json"})<br><br> CIS v2 [<img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/single-stack/exacc_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/single-stack/exacc_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/single-stack/exacc_observability_cis2_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/single-stack/exacc_security_cis2_uc1.json"}.) <br><br>To read some best practices about how to use ORM go [here](../../../blueprints/one-oe/runtime/one-stack/orm_bp.md).| Coming Soon | Coming Soon |
|Files|CIS v1: [governance](./exacc_governance_uc1.json), [iam](./exacc_identity_uc1.json), [observability CIS v1](./exacc_observability_cis1_uc1.json), [security CIS v1](./exacc_security_cis1_uc1.json) <br> CIS v2:  [governance](./exacc_governance_uc1.json), [iam](./exacc_identity_uc1.json), [observability CIS v2](./exacc_observability_cis2_uc1.json), [security CIS v2](./exacc_security_cis2_uc1.json) |


&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
