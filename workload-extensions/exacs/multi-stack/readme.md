# ExaDB-D Workload Extension - Multi-stack Deployment  <!-- omit from toc -->


## **1. Summary**

<table>
  <tbody>
    <tr>
      <td><strong>NAME</strong></td>
      <td>WE ExaDB-D Deployment to extend an existing One-OE LZ (Multi-Stack)</td>
    </tr>
    <tr>
      <td><strong>OBJECTIVE</strong></td>
      <td>WE ExaDB-D</td>
    </tr>
    <tr>
      <td><strong>TARGET RESOURCES</strong></td>
      <td>compartments, groups, policies, network, events, alarms, notifications and flow logs</td>
    </tr>
  </tbody>
</table>



&nbsp;

## **2. Architecture Overview**

 The main reason for using a multi-stack model in OCI Resource Manager (ORM) is to reuse existing assets as building blocks. Instead of deploying everything as a single monolithic stack, the solution is split into independent layers that can be deployed, reused, and extended in a controlled way. This approach also helps reduce coupling, improve traceability, and simplify dependency management across layers.

In this model, the first operation is to deploy [One-OE](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe/runtime/one-stack), which establishes the foundation landing zone structure. Once this base is in place, the environment can be further extended with a Workload Extension (WE) that adds workload-specific resources and configurations. This makes the overall deployment model more modular, reusable, and easier to manage over time.

In this asset, we assume that One-OE has already been deployed, and we focus on the WE ExaDB-D deployment.
&nbsp;

<img src="../content/Multi.png" width="600" align="center">



## **3. Architecture Components**

| JSON configurations | Configuration-defined components | Resources |
|:-|:-|:-|
| **IAM configuration**</br> [exacs_identity_uc1.json](exacs_identity_uc1.json) | • ExaDB-D compartments</br> • ExaDB-D IAM groups and policies | cmp-lz-shared-exacs, cmp-lz-shared-exacs-db, cmp-lz-shared-exacs-infra, cmp-lz-preprod-exacs, cmp-lz-preprod-exacs-db, cmp-lz-preprod-exacs-infra, cmp-lz-preprod-proj1-exacs-db, cmp-lz-prod-exacs, cmp-lz-prod-exacs-db, cmp-lz-prod-exacs-infra, cmp-lz-prod-proj1-exacs-db <br><br> grp-lz-global-exacs-db-admin, grp-lz-global-exacs-infra-admin, grp-lz-preprod-proj1-exacs-admin, grp-lz-prod-proj1-exacs-admin <br><br> pcy-lz-global-exacs-db-admin, pcy-lz-global-exacs-generic, pcy-lz-global-exacs-infra-admin, pcy-lz-preprod-exacs-proj1-admin, pcy-lz-prod-exacs-proj1-admin |
| **Network pre configuration**</br> [exacs_network_uc1_a_pre.json](exacs_network_uc1_a_pre.json)</br> [exacs_network_uc1_e_pre.json](exacs_network_uc1_e_pre.json) | • ExaDB-D VCN, database subnet, backup subnet, route table, security list and service gateway before hub DRG routing is ready | vcn-fra-lz-shared-exacs <br><br> sn-fra-lz-shared-exacs-db, sn-fra-lz-shared-exacs-backup <br><br> rt-fra-lz-shared-exacs-generic <br><br> sl-fra-lz-shared-exacs-generic <br><br> sgw-fra-lz-shared-exacs |
| **Hub post configuration**</br> [oneoe_network_hub_a_post.json](oneoe_network_hub_a_post.json)</br> [oneoe_network_hub_e_post.json](oneoe_network_hub_e_post.json) | • One-OE hub network update for the ExaDB-D VCN DRG attachment and hub routing | drgatt-fra-lz-shared-exacs <br><br> Hub route-table and DRG route-distribution updates for the shared ExaDB-D platform CIDR |
| **Network final configuration**</br> [exacs_network_uc1_a.json](exacs_network_uc1_a.json)</br> [exacs_network_uc1_e.json](exacs_network_uc1_e.json) | • ExaDB-D VCN network after hub DRG routing is ready | vcn-fra-lz-shared-exacs <br><br> sn-fra-lz-shared-exacs-db, sn-fra-lz-shared-exacs-backup <br><br> rt-fra-lz-shared-exacs-generic <br><br> sl-fra-lz-shared-exacs-generic <br><br> sgw-fra-lz-shared-exacs |
| **Observability pre configuration**</br> [exacs_observability_uc1_pre.json](exacs_observability_uc1_pre.json) | • Events</br> • Alarms</br> • Notifications | rul-lz-notify-on-opctl-events, rul-lz-notify-on-exacs-vmc-events, rul-lz-notify-on-exacs-db-events, rul-lz-notify-on-exacs-infra-events, rul-lz-preprod-notify-on-notifications, rul-lz-prod-notify-on-notifications <br><br> al-lz-db-cpuutil, al-lz-vmc-cpuutil, al-lz-vmc-dgutil, al-lz-vmc-fsutil, al-lz-vmc-memutil, al-lz-vmc-swaputil, al-lz-db-storageutil <br><br> nott-lz-exacs-db-workloads, nott-lz-exacs-infra-workloads, nott-lz-preprod-exacs, nott-lz-prod-exacs |
| **Observability final configuration**</br> [exacs_observability_uc1.json](exacs_observability_uc1.json) | • Events</br> • Alarms</br> • Notifications</br> • VCN and subnet flow logs | rul-lz-notify-on-opctl-events, rul-lz-notify-on-exacs-vmc-events, rul-lz-notify-on-exacs-db-events, rul-lz-notify-on-exacs-infra-events, rul-lz-preprod-notify-on-notifications, rul-lz-prod-notify-on-notifications <br><br> al-lz-db-cpuutil, al-lz-vmc-cpuutil, al-lz-vmc-dgutil, al-lz-vmc-fsutil, al-lz-vmc-memutil, al-lz-vmc-swaputil, al-lz-db-storageutil <br><br> nott-lz-exacs-db-workloads, nott-lz-exacs-infra-workloads, nott-lz-preprod-exacs, nott-lz-prod-exacs <br><br> lgrp-lz-shared-exacs-vcn-flow |

&nbsp;


## **4. Deployment Steps**

| USE CASE | 1 | 2 | 3 |
|----------|---|---|---|
| Description | [shared ExaDB-D platform](../exacs_use_cases/readme.md/#21-shared-exadb-d-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments) | [hybrid ExaDB-D platform](../exacs_use_cases/readme.md/#22-hybrid-exadb-d-platform-shared-infrastructure-with-dedicated-vmcsavmcs-per-environment) | [dedicated ExaDB-D platform](../exacs_use_cases/readme.md/#23-dedicated-exadb-d-platform-fully-dedicated-infrastructure-and-vmcsavmcs-per-environment) |
| Deployment | Use the files listed below with Terraform CLI, or stage them in a private Object Storage bucket or approved private source for OCI Resource Manager. Configure outputs and dependencies because pre-existing resources are used. To learn more about this, go [here](../../../commons/content/orm_bp.md). | Config-driven generation required | Config-driven generation required |
| Files | Deploy the EXACS extension stack with [iam](./exacs_identity_uc1.json), [observability pre](./exacs_observability_uc1_pre.json), and the matching network pre file for the selected hub: [Hub A network pre](./exacs_network_uc1_a_pre.json) or [Hub E network pre](./exacs_network_uc1_e_pre.json). Then re-apply the base One-OE stack with [Hub A post](./oneoe_network_hub_a_post.json) or [Hub E post](./oneoe_network_hub_e_post.json). Finally re-apply the EXACS extension stack keeping [iam](./exacs_identity_uc1.json) and replacing the pre files with [observability](./exacs_observability_uc1.json) plus [Hub A network](./exacs_network_uc1_a.json) or [Hub E network](./exacs_network_uc1_e.json). | Generated from customer config | Generated from customer config |


&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
