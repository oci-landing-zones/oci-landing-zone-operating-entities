# ExaDB-C@C Workload Extension - Multi-stack Deployment  <!-- omit from toc -->


## **1. Summary**

<table>
  <tbody>
    <tr>
      <td><strong>NAME</strong></td>
      <td>WE ExaDB-C@C Deployment to extend an existing One-OE LZ (Multi-Stack)</td>
    </tr>
    <tr>
      <td><strong>OBJECTIVE</strong></td>
      <td>WE ExaDB-C@C</td>
    </tr>
    <tr>
      <td><strong>TARGET RESOURCES</strong></td>
      <td>compartments, groups, policies, events, alarms and notifications</td>
    </tr>
  </tbody>
</table>



&nbsp;

## **2. Architecture Overview**

 The main reason for using a multi-stack model in OCI Resource Manager (ORM) is to reuse existing assets as building blocks. Instead of deploying everything as a single monolithic stack, the solution is split into independent layers that can be deployed, reused, and extended in a controlled way. This approach also helps reduce coupling, improve traceability, and simplify dependency management across layers. 
  
In this model, the first operation is to deploy [One-OE](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe/runtime/one-stack), which establishes the foundation landing zone structure. Once this base is in place, the environment can be further extended with a Workload Extension (WE) that adds workload-specific resources and configurations. This makes the overall deployment model more modular, reusable, and easier to manage over time.

In this asset, we assume that One-OE has already been deployed, and we focus on the WE ExaDB-C@C deployment.
&nbsp;

<img src="../content/Multi.png" width="600" align="center">



## **3. Architecture Components**

| JSON configurations | Configuration-defined components | Resources |
|:-|:-|:-|
| **IAM configuration**</br> [exacc_identity_uc1.json](exacc_identity_uc1.json) | • ExaDB-C@C compartments</br> • ExaDB-C@C IAM groups and policies | cmp-lz-preprod-exacc, cmp-lz-preprod-exacc-db, cmp-lz-preprod-exacc-infra, cmp-lz-preprod-proj1-db, cmp-lz-prod-exacc, cmp-lz-prod-exacc-db, cmp-lz-prod-exacc-infra, cmp-lz-prod-proj1-db, cmp-lz-shared-exacc, cmp-lz-shared-exacc-db, cmp-lz-shared-exacc-infra <br><br> grp-lz-global-exacc-db-admin, grp-lz-global-exacc-infra-admin, grp-lz-preprod-proj1-exacc-admin, grp-lz-prod-proj1-exacc-admin <br><br> pcy-lz-global-exacc-db-admin, pcy-lz-global-exacc-generic, pcy-lz-global-exacc-infra-admin, pcy-lz-preprod-exacc-proj1-admin, pcy-lz-prod-exacc-proj1-admin |
| **Observability configuration**</br> [exacc_observability_uc1.json](exacc_observability_uc1.json) | • Events</br> • Alarms</br> • Notifications | rul-lz-notify-on-opctl-events, rul-lz-notify-on-exacc-vmc-events, rul-lz-notify-on-exacc-db-events, rul-lz-notify-on-exacc-infra-events, rul-lz-preprod-notify-on-notifications-projects, rul-lz-prod-notify-on-notifications-projects <br><br> al-lz-db-cpuutil, al-lz-vmc-cpuutil, al-lz-vmc-dgutil, al-lz-vmc-fsutil, al-lz-vmc-memutil, al-lz-vmc-swaputil, al-lz-db-storageutil <br><br> nott-lz-exacc-db-workloads, nott-lz-exacc-infra-workloads, nott-lz-preprod-exacc-projects, nott-lz-prod-exacc-projects |

&nbsp;


## **5. Deployment Steps**

| USE CASE | 1 | 2 | 3 |
|----------|---|---|---|
| Description | [shared ExaDB-C@C platform](../exacc_use_cases/readme.md/#21-shared-exadb-cc-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments) |  |  |
| Deployment | [<img src="../../../commons/images/DeployToOCI.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/multi-stack/exacc_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacc/multi-stack/exacc_observability_uc1.json"}). To deploy with ORM, you’ll need to configure outputs and dependencies, since pre-existing resources will be used. To learn more about this, go [here](../../../commons/content/orm_bp.md).| coming soon | coming soon |
| Files | [iam](./exacc_identity_uc1.json), [observability](./exacc_observability_uc1.json) |  |  |


&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
