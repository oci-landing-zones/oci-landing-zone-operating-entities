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



## **3. Deployment Steps**

<table>
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
      <td>Description</td>
      <td><a href="../exacs_use_cases/readme.md/#21-shared-exadb-d-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments">shared ExaDB-D platform</a></td>
      <td><a href="../exacs_use_cases/readme.md/#22-hybrid-exadb-d-platform-shared-infrastructure-with-dedicated-vmcsavmcs-per-environment">hybrid ExaDB-D platform</a></td>
      <td><a href="../exacs_use_cases/readme.md/#23-dedicated-exadb-d-platform-fully-dedicated-infrastructure-and-vmcsavmcs-per-environment">dedicated ExaDB-D platform</a></td>
    </tr>
    <tr>
      <td>Files</td>
      <td>Deploy the EXACS extension stack with IAM <a href="./exacs_identity_uc1.json">exacs_identity_uc1.json</a>, observability pre <a href="./exacs_observability_uc1_pre.json">exacs_observability_uc1_pre.json</a>, and the selected hub network pre file: <a href="./exacs_network_uc1_a_pre.json">exacs_network_uc1_a_pre.json</a> or <a href="./exacs_network_uc1_e_pre.json">exacs_network_uc1_e_pre.json</a>. Then re-apply the base One-OE stack with <a href="./oneoe_network_hub_a_post.json">oneoe_network_hub_a_post.json</a> or <a href="./oneoe_network_hub_e_post.json">oneoe_network_hub_e_post.json</a>. Finally re-apply the EXACS extension stack with observability final <a href="./exacs_observability_uc1.json">exacs_observability_uc1.json</a> and the selected hub network final file: <a href="./exacs_network_uc1_a.json">exacs_network_uc1_a.json</a> or <a href="./exacs_network_uc1_e.json">exacs_network_uc1_e.json</a>.</td>
      <td>Deploy the EXACS extension stack with IAM <a href="./exacs_identity_uc2.json">exacs_identity_uc2.json</a>, observability pre <a href="./exacs_observability_uc2_pre.json">exacs_observability_uc2_pre.json</a>, and the selected hub network pre file: <a href="./exacs_network_uc2_a_pre.json">exacs_network_uc2_a_pre.json</a> or <a href="./exacs_network_uc2_e_pre.json">exacs_network_uc2_e_pre.json</a>. Then re-apply the base One-OE stack with <a href="./oneoe_network_hub_a_uc2_post.json">oneoe_network_hub_a_uc2_post.json</a> or <a href="./oneoe_network_hub_e_uc2_post.json">oneoe_network_hub_e_uc2_post.json</a>. Finally re-apply the EXACS extension stack with observability final <a href="./exacs_observability_uc2.json">exacs_observability_uc2.json</a> and the selected hub network final file: <a href="./exacs_network_uc2_a.json">exacs_network_uc2_a.json</a> or <a href="./exacs_network_uc2_e.json">exacs_network_uc2_e.json</a>.</td>
      <td>Deploy the EXACS extension stack with IAM <a href="./exacs_identity_uc3.json">exacs_identity_uc3.json</a>, observability pre <a href="./exacs_observability_uc3_pre.json">exacs_observability_uc3_pre.json</a>, and the selected hub network pre file: <a href="./exacs_network_uc3_a_pre.json">exacs_network_uc3_a_pre.json</a> or <a href="./exacs_network_uc3_e_pre.json">exacs_network_uc3_e_pre.json</a>. Then re-apply the base One-OE stack with <a href="./oneoe_network_hub_a_uc3_post.json">oneoe_network_hub_a_uc3_post.json</a> or <a href="./oneoe_network_hub_e_uc3_post.json">oneoe_network_hub_e_uc3_post.json</a>. Finally re-apply the EXACS extension stack with observability final <a href="./exacs_observability_uc3.json">exacs_observability_uc3.json</a> and the selected hub network final file: <a href="./exacs_network_uc3_a.json">exacs_network_uc3_a.json</a> or <a href="./exacs_network_uc3_e.json">exacs_network_uc3_e.json</a>.</td>
    </tr>
    <tr>
      <td>Deployment</td>
      <td colspan="3">Use the files listed above with Terraform CLI, or stage them in a private Object Storage bucket or approved private source for OCI Resource Manager. Configure outputs and dependencies because pre-existing resources are used. To learn more about this, go <a href="../../../commons/content/orm_bp.md">here</a>.</td>
    </tr>
  </tbody>
</table>

&nbsp;

## **4. Architecture Components**

<table>
  <thead>
    <tr>
      <th>Use Case</th>
      <th>JSON configurations</th>
      <th>Configuration-defined components</th>
      <th>Resources</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="4"><strong>Use Case 1 (UC1)</strong></td>
      <td><strong>IAM configuration</strong><br><a href="exacs_identity_uc1.json">exacs_identity_uc1.json</a></td>
      <td>• ExaDB-D compartments<br>• ExaDB-D IAM groups and policies</td>
      <td>Shared ExaDB-D platform compartments and project database compartments.<br><br>ExaDB-D database, infrastructure, and project admin groups and policies.</td>
    </tr>
    <tr>
      <td><strong>Network configuration</strong><br><strong>Hub A pre</strong>: <a href="exacs_network_uc1_a_pre.json">exacs_network_uc1_a_pre.json</a><br><strong>Hub A final</strong>: <a href="exacs_network_uc1_a.json">exacs_network_uc1_a.json</a><br><strong>Hub E pre</strong>: <a href="exacs_network_uc1_e_pre.json">exacs_network_uc1_e_pre.json</a><br><strong>Hub E final</strong>: <a href="exacs_network_uc1_e.json">exacs_network_uc1_e.json</a></td>
      <td>• Shared ExaDB-D platform network<br>• Database and backup subnets<br>• Route tables, gateways, and security lists</td>
      <td>Shared ExaDB-D platform VCN, database subnet, backup subnet, route table, security list, NAT gateway, and service gateway.</td>
    </tr>
    <tr>
      <td><strong>Hub post configuration</strong><br><strong>Hub A</strong>: <a href="oneoe_network_hub_a_post.json">oneoe_network_hub_a_post.json</a><br><strong>Hub E</strong>: <a href="oneoe_network_hub_e_post.json">oneoe_network_hub_e_post.json</a></td>
      <td>• Existing One-OE hub and spoke route updates<br>• DRG attachments and route distribution updates</td>
      <td>Hub and spoke routes required to connect the existing One-OE network to the shared ExaDB-D platform network.</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>Pre</strong>: <a href="exacs_observability_uc1_pre.json">exacs_observability_uc1_pre.json</a><br><strong>Final</strong>: <a href="exacs_observability_uc1.json">exacs_observability_uc1.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Logging and VCN flow logs</td>
      <td>ExaDB-D infrastructure and project notification rules; load balancer alarms where applicable; notification topics; VCN flow log groups.<br><br>The pre file supports the initial apply before network-dependent flow logs exist; the final file enables the full observability configuration after network resources exist.</td>
    </tr>
    <tr>
      <td rowspan="4"><strong>Use Case 2 (UC2)</strong></td>
      <td><strong>IAM configuration</strong><br><a href="exacs_identity_uc2.json">exacs_identity_uc2.json</a></td>
      <td>• ExaDB-D compartments<br>• ExaDB-D IAM groups and policies</td>
      <td>Shared ExaDB-D infrastructure compartments, environment ExaDB-D platform compartments, and project database compartments.<br><br>ExaDB-D database, infrastructure, and project admin groups and policies.</td>
    </tr>
    <tr>
      <td><strong>Network configuration</strong><br><strong>Hub A pre</strong>: <a href="exacs_network_uc2_a_pre.json">exacs_network_uc2_a_pre.json</a><br><strong>Hub A final</strong>: <a href="exacs_network_uc2_a.json">exacs_network_uc2_a.json</a><br><strong>Hub E pre</strong>: <a href="exacs_network_uc2_e_pre.json">exacs_network_uc2_e_pre.json</a><br><strong>Hub E final</strong>: <a href="exacs_network_uc2_e.json">exacs_network_uc2_e.json</a></td>
      <td>• Environment-specific ExaDB-D platform networks<br>• Database and backup subnets<br>• Route tables, gateways, and security lists</td>
      <td>Prod and preprod ExaDB-D platform VCNs, database subnets, backup subnets, route tables, security lists, NAT gateways, and service gateways.</td>
    </tr>
    <tr>
      <td><strong>Hub post configuration</strong><br><strong>Hub A</strong>: <a href="oneoe_network_hub_a_uc2_post.json">oneoe_network_hub_a_uc2_post.json</a><br><strong>Hub E</strong>: <a href="oneoe_network_hub_e_uc2_post.json">oneoe_network_hub_e_uc2_post.json</a></td>
      <td>• Existing One-OE hub and spoke route updates<br>• DRG attachments and route distribution updates</td>
      <td>Hub and spoke routes required to connect the existing One-OE network to the prod and preprod ExaDB-D platform networks.</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>Pre</strong>: <a href="exacs_observability_uc2_pre.json">exacs_observability_uc2_pre.json</a><br><strong>Final</strong>: <a href="exacs_observability_uc2.json">exacs_observability_uc2.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Logging and VCN flow logs</td>
      <td>Shared ExaDB-D infrastructure, environment ExaDB-D platform, and project notification rules; load balancer alarms where applicable; notification topics; VCN flow log groups.<br><br>The pre file supports the initial apply before network-dependent flow logs exist; the final file enables the full observability configuration after network resources exist.</td>
    </tr>
    <tr>
      <td rowspan="4"><strong>Use Case 3 (UC3)</strong></td>
      <td><strong>IAM configuration</strong><br><a href="exacs_identity_uc3.json">exacs_identity_uc3.json</a></td>
      <td>• ExaDB-D compartments<br>• ExaDB-D IAM groups and policies</td>
      <td>Environment ExaDB-D platform compartments and project database compartments.<br><br>ExaDB-D database, infrastructure, and project admin groups and policies.</td>
    </tr>
    <tr>
      <td><strong>Network configuration</strong><br><strong>Hub A pre</strong>: <a href="exacs_network_uc3_a_pre.json">exacs_network_uc3_a_pre.json</a><br><strong>Hub A final</strong>: <a href="exacs_network_uc3_a.json">exacs_network_uc3_a.json</a><br><strong>Hub E pre</strong>: <a href="exacs_network_uc3_e_pre.json">exacs_network_uc3_e_pre.json</a><br><strong>Hub E final</strong>: <a href="exacs_network_uc3_e.json">exacs_network_uc3_e.json</a></td>
      <td>• Environment-specific ExaDB-D platform networks<br>• Database and backup subnets<br>• Route tables, gateways, and security lists</td>
      <td>Prod and preprod ExaDB-D platform VCNs, database subnets, backup subnets, route tables, security lists, NAT gateways, and service gateways.</td>
    </tr>
    <tr>
      <td><strong>Hub post configuration</strong><br><strong>Hub A</strong>: <a href="oneoe_network_hub_a_uc3_post.json">oneoe_network_hub_a_uc3_post.json</a><br><strong>Hub E</strong>: <a href="oneoe_network_hub_e_uc3_post.json">oneoe_network_hub_e_uc3_post.json</a></td>
      <td>• Existing One-OE hub and spoke route updates<br>• DRG attachments and route distribution updates</td>
      <td>Hub and spoke routes required to connect the existing One-OE network to the prod and preprod ExaDB-D platform networks.</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>Pre</strong>: <a href="exacs_observability_uc3_pre.json">exacs_observability_uc3_pre.json</a><br><strong>Final</strong>: <a href="exacs_observability_uc3.json">exacs_observability_uc3.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Logging and VCN flow logs</td>
      <td>Environment ExaDB-D platform and project notification rules; load balancer alarms where applicable; notification topics; VCN flow log groups.<br><br>The pre file supports the initial apply before network-dependent flow logs exist; the final file enables the full observability configuration after network resources exist.</td>
    </tr>
  </tbody>
</table>

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
