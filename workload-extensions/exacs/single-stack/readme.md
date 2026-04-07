# ExaDB-D Workload Extension - Single-Stack Deployment  <!-- omit from toc -->


## **1. Summary**

| | |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | Complete Landing Zone with EXACS (Single-Stack)                                    |
| **OBJECTIVE**        | Deploy OneOE Landing Zone (No Network Layer) + WE EXACS  |
| **TARGET RESOURCES** | Complete LZ Foundation, IAM, Security, Observability, Network |



&nbsp;

## **2. Architecture Overview**


<img src="../content/Single.png" width="600" align="center">



## **3. Architecture Components**
&nbsp;

<table border="1">
  <thead>
    <tr>
      <th>USE CASE</th>
      <th>1</th>
      <th>2</th>
      <th>3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colspan="4"><strong>IAM</strong></td>
    </tr>
    <tr>
      <td><strong>WE compartments</strong></td>
      <td>
        cmp-lz-platform &gt; cmp-lz-shared-exacs &gt; cmp-lz-shared-exacs-db<br>
        cmp-lz-platform &gt; cmp-lz-shared-exacs &gt; cmp-lz-shared-exacs-infra<br>
        cmp-lz-platform &gt; cmp-lz-prod-projects &gt; cmp-lz-prod-proj1 &gt; cmp-lz-prod-proj1-db<br>
        cmp-lz-platform &gt; cmp-lz-preprod-projects &gt; cmp-lz-preprod-proj1 &gt; cmp-lz-preprod-proj1-db
      </td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td><strong>WE groups</strong></td>
      <td>
        grp-lz-global-exacs-db-admin,<br>
        grp-lz-global-exacs-infra-admin,<br>
        grp-lz-preprod-proj1-exacs-admin,<br>
        grp-lz-preprod-proj1-exacs-admin
      </td>
      <td>-</td>
      <td>-</td>
    </tr>
    <tr>
      <td><strong>WE policies</strong></td>
      <td>
        pcy-lz-global-exacs-db-admin,<br>
        pcy-lz-global-exacs-generic,<br>
        pcy-lz-global-exacs-infra-admin,<br>
        pcy-lz-global-exacs-vmc-admin,<br>
        pcy-lz-preprod-exacs-proj1-admin,<br>
        pcy-lz-prod-exacs-proj1-admin
      </td>
      <td>-</td>
      <td>-</td>
    </tr>
    <tr>
      <td colspan="4"><strong>OBSERVABILITY</strong></td>
    </tr>
    <tr>
      <td><strong>WE Alarms</strong></td>
      <td>
        al-lz-db-cpuutil,<br>
        al-lz-vmc-cpuutil,<br>
        al-lz-vmc-dgutil,<br>
        al-lz-vmc-fsutil,<br>
        al-lz-vmc-memutil,<br>
        al-lz-vmc-swaputil,<br>
        al-lz-db-storageutil
      </td>
      <td>-</td>
      <td>-</td>
    </tr>
    <tr>
      <td><strong>WE Events</strong></td>
      <td>
        rul-lz-notify-on-opctl-events,<br>
        rul-lz-notify-on-exacs-vmc-events,<br>
        rul-lz-notify-on-exacs-db-events,<br>
        rul-lz-notify-on-exacs-infra-events
      </td>
      <td>-</td>
      <td>-</td>
    </tr>
  </tbody>
</table>


## **5. Deployment Steps**

| USE CASE | 1 | 2 | 3 |
|----------|---|---|---|
| Description | [Shared exacs platform](../exacs_use_cases/readme.md/#21-shared-exadb-cc-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments) |  |  |
| Deployment | CIS v1 [<img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacs_update/workload-extensions/exacs/single-stack/exacs_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacs_update/workload-extensions/exacs/single-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacs_update/workload-extensions/exacs/single-stack/exacs_observability_cis1_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_network_hub_e.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacs_update/workload-extensions/exacs/single-stack/exacs_security_cis1_uc1.json"})<br><br> CIS v2 [<img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacs_update/workload-extensions/exacs/single-stack/exacs_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacs_update/workload-extensions/exacs/single-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacs_update/workload-extensions/exacs/single-stack/exacs_observability_cis2_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacc_update/workload-extensions/exacs/single-stack/exacs_network_hub_e.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/we_exacs_update/workload-extensions/exacs/single-stack/exacs_security_cis2_uc1.json"}.) <br><br>To read some best practices about how to use ORM go [here](../../../blueprints/one-oe/runtime/one-stack/orm_bp.md).| Coming Soon | Coming Soon |
|Files|CIS v1: [governance](./exacs_governance_uc1.json), [iam](./exacs_identity_uc1.json), [observability CIS v1](./exacs_observability_cis1_uc1.json), [security CIS v1](./exacs_security_cis1_uc1.json), [network hub e + projects + shared exacs](./exacs_network_hub_e.json) <br> CIS v2:  [governance](./exacs_governance_uc1.json), [iam](./exacs_identity_uc1.json), [observability CIS v2](./exacs_observability_cis2_uc1.json), [security CIS v2](./exacs_security_cis2_uc1.json) , [network hub e + projects + shared exacs](./exacs_network_hub_e.json)|


&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
