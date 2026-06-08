# ExaDB-D Workload Extension - Single-Stack Deployment <!-- omit from toc -->

## **1. Summary**

<table>
  <tbody>
    <tr>
      <td><strong>NAME</strong></td>
      <td>Complete Landing Zone with ExaDB-D (Single-Stack)</td>
    </tr>
    <tr>
      <td><strong>OBJECTIVE</strong></td>
      <td>Deploy One-OE Hub E Landing Zone + WE ExaDB-D</td>
    </tr>
    <tr>
      <td><strong>TARGET RESOURCES</strong></td>
      <td>Complete LZ Foundation, Network, IAM, Governance, Security, Observability</td>
    </tr>
  </tbody>
</table>

&nbsp;

## **2. Architecture Overview**

In a single-stack model in OCI Resource Manager (ORM), the deployment is managed as a single operation that combines the required landing zone components into one stack. This approach is useful when you want a simpler execution model, with a single lifecycle for planning, applying, and managing the environment.

In this model, the Landing Zone Foundations, the One-OE foundation, and the required Workload Extension (WE) are deployed together as part of the same stack. While this model offers less modularity than a multi-stack approach, it can reduce operational overhead for simpler scenarios and provide a more straightforward deployment flow. It still benefits from ORM capabilities such as managed state, centralized job visibility, and controlled execution, but without the need to manage cross-stack dependencies between layers.

&nbsp;

<img src="../content/Single.png" width="600" align="center">

&nbsp;

## **3. Deployment Steps**

<table>
  <thead>
    <tr>
      <th>Deployment Step</th>
      <th>Use Case 1 (UC1)</th>
      <th>Use Case 2 (UC2)</th>
      <th>Use Case 3 (UC3)</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Description</td>
      <td><a href="../exacs_use_cases/readme.md/#21-shared-exadb-d-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments">shared ExaDB-D platform</a></td>
      <td><a href="../exacs_use_cases/readme.md/#22-hybrid-exadb-d-platform-shared-infrastructure-with-dedicated-vmcsavmcs-per-environment">hybrid ExaDB-D platform</a></td>
      <td><a href="../exacs_use_cases/readme.md/#23-dedicated-exadb-d-platform-fully-dedicated-infrastructure-and-vmcsavmcs-per-environment">dedicated ExaDB-D platform</a></td>
      <td></td>
    </tr>
    <tr>
      <td>ORM</td>
      <td><strong>CIS v1</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_network_hub_e.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_observability_cis1_uc1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_security_cis1_uc1.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacs_governance_uc1.json"><code>exacs_governance_uc1.json</code></a>, <a href="./exacs_identity_uc1.json"><code>exacs_identity_uc1.json</code></a>, <a href="./exacs_network_hub_e.json"><code>exacs_network_hub_e.json</code></a>, <a href="./exacs_observability_cis1_uc1_pre.json"><code>exacs_observability_cis1_uc1_pre.json</code></a>, <a href="./exacs_security_cis1_uc1.json"><code>exacs_security_cis1_uc1.json</code></a><br>Final re-apply: replace <a href="./exacs_observability_cis1_uc1_pre.json"><code>exacs_observability_cis1_uc1_pre.json</code></a> with <a href="./exacs_observability_cis1_uc1.json"><code>exacs_observability_cis1_uc1.json</code></a> after network resources exist.<br><br><strong>CIS v2</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_network_hub_e.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_observability_cis2_uc1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_security_cis2_uc1.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacs_governance_uc1.json"><code>exacs_governance_uc1.json</code></a>, <a href="./exacs_identity_uc1.json"><code>exacs_identity_uc1.json</code></a>, <a href="./exacs_network_hub_e.json"><code>exacs_network_hub_e.json</code></a>, <a href="./exacs_observability_cis2_uc1_pre.json"><code>exacs_observability_cis2_uc1_pre.json</code></a>, <a href="./exacs_security_cis2_uc1.json"><code>exacs_security_cis2_uc1.json</code></a><br>Final re-apply: replace <a href="./exacs_observability_cis2_uc1_pre.json"><code>exacs_observability_cis2_uc1_pre.json</code></a> with <a href="./exacs_observability_cis2_uc1.json"><code>exacs_observability_cis2_uc1.json</code></a> after network resources exist.</td>
      <td><strong>CIS v1</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_governance_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_identity_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_network_hub_e_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_observability_cis1_uc2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_security_cis1_uc2.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacs_governance_uc2.json"><code>exacs_governance_uc2.json</code></a>, <a href="./exacs_identity_uc2.json"><code>exacs_identity_uc2.json</code></a>, <a href="./exacs_network_hub_e_uc2.json"><code>exacs_network_hub_e_uc2.json</code></a>, <a href="./exacs_observability_cis1_uc2_pre.json"><code>exacs_observability_cis1_uc2_pre.json</code></a>, <a href="./exacs_security_cis1_uc2.json"><code>exacs_security_cis1_uc2.json</code></a><br>Final re-apply: replace <a href="./exacs_observability_cis1_uc2_pre.json"><code>exacs_observability_cis1_uc2_pre.json</code></a> with <a href="./exacs_observability_cis1_uc2.json"><code>exacs_observability_cis1_uc2.json</code></a> after network resources exist.<br><br><strong>CIS v2</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_governance_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_identity_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_network_hub_e_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_observability_cis2_uc2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_security_cis2_uc2.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacs_governance_uc2.json"><code>exacs_governance_uc2.json</code></a>, <a href="./exacs_identity_uc2.json"><code>exacs_identity_uc2.json</code></a>, <a href="./exacs_network_hub_e_uc2.json"><code>exacs_network_hub_e_uc2.json</code></a>, <a href="./exacs_observability_cis2_uc2_pre.json"><code>exacs_observability_cis2_uc2_pre.json</code></a>, <a href="./exacs_security_cis2_uc2.json"><code>exacs_security_cis2_uc2.json</code></a><br>Final re-apply: replace <a href="./exacs_observability_cis2_uc2_pre.json"><code>exacs_observability_cis2_uc2_pre.json</code></a> with <a href="./exacs_observability_cis2_uc2.json"><code>exacs_observability_cis2_uc2.json</code></a> after network resources exist.</td>
      <td><strong>CIS v1</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_governance_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_identity_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_network_hub_e_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_observability_cis1_uc3_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_security_cis1_uc3.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacs_governance_uc3.json"><code>exacs_governance_uc3.json</code></a>, <a href="./exacs_identity_uc3.json"><code>exacs_identity_uc3.json</code></a>, <a href="./exacs_network_hub_e_uc3.json"><code>exacs_network_hub_e_uc3.json</code></a>, <a href="./exacs_observability_cis1_uc3_pre.json"><code>exacs_observability_cis1_uc3_pre.json</code></a>, <a href="./exacs_security_cis1_uc3.json"><code>exacs_security_cis1_uc3.json</code></a><br>Final re-apply: replace <a href="./exacs_observability_cis1_uc3_pre.json"><code>exacs_observability_cis1_uc3_pre.json</code></a> with <a href="./exacs_observability_cis1_uc3.json"><code>exacs_observability_cis1_uc3.json</code></a> after network resources exist.<br><br><strong>CIS v2</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_governance_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_identity_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_network_hub_e_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_observability_cis2_uc3_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacs/single-stack/exacs_security_cis2_uc3.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacs_governance_uc3.json"><code>exacs_governance_uc3.json</code></a>, <a href="./exacs_identity_uc3.json"><code>exacs_identity_uc3.json</code></a>, <a href="./exacs_network_hub_e_uc3.json"><code>exacs_network_hub_e_uc3.json</code></a>, <a href="./exacs_observability_cis2_uc3_pre.json"><code>exacs_observability_cis2_uc3_pre.json</code></a>, <a href="./exacs_security_cis2_uc3.json"><code>exacs_security_cis2_uc3.json</code></a><br>Final re-apply: replace <a href="./exacs_observability_cis2_uc3_pre.json"><code>exacs_observability_cis2_uc3_pre.json</code></a> with <a href="./exacs_observability_cis2_uc3.json"><code>exacs_observability_cis2_uc3.json</code></a> after network resources exist.</td>
      <td>These ORM buttons are convenience links. For production or customer-controlled deployments, stage the configuration files in a private Object Storage bucket or approved private source. For ORM best practices, see <a href="../../../commons/content/orm_bp.md">ORM Best Practices</a>.</td>
    </tr>
    <tr>
      <td>Terraform CLI</td>
      <td></td>
      <td></td>
      <td></td>
      <td>Use the same configuration files listed in the ORM row with Terraform CLI. Apply the `*_pre.json` observability file first, then re-apply with the final observability file to enable VCN flow logs after the network resources exist. For command examples and prerequisites, see <a href="../../../commons/content/terraform.md">Run with Terraform CLI</a>.</td>
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
      <td rowspan="5"><strong>Use Case 1 (UC1)</strong></td>
      <td><strong>IAM configuration</strong><br><a href="exacs_identity_uc1.json">exacs_identity_uc1.json</a></td>
      <td>• Landing Zone and ExaDB-D compartments<br>• Landing Zone and ExaDB-D IAM groups and policies</td>
      <td>Landing Zone, network, platform, security, shared ExaDB-D, environment, project, and project database compartments.<br><br>ExaDB-D database, infrastructure, project, network, and security admin groups and policies.</td>
    </tr>
    <tr>
      <td><strong>Governance configuration</strong><br><a href="exacs_governance_uc1.json">exacs_governance_uc1.json</a></td>
      <td>• Tag namespace and tag definitions</td>
      <td>tagns-lz-role, tag-lz-role</td>
    </tr>
    <tr>
      <td><strong>Network configuration</strong><br><a href="exacs_network_hub_e.json">exacs_network_hub_e.json</a></td>
      <td>• Hub E network foundation<br>• Prod and preprod project networks<br>• Shared ExaDB-D platform network<br>• DRG, route tables, gateways, security lists, NSGs, and load balancer components</td>
      <td>Hub, prod projects, preprod projects, and shared ExaDB-D platform VCNs; database and backup subnets; workload subnets; route tables; security lists; NSGs; DRG route tables and attachments; NAT, service, and internet gateways; public load balancer components.</td>
    </tr>
    <tr>
      <td><strong>Security configuration</strong><br><strong>CIS v1</strong>: <a href="exacs_security_cis1_uc1.json">exacs_security_cis1_uc1.json</a><br><strong>CIS v2</strong>: <a href="exacs_security_cis2_uc1.json">exacs_security_cis2_uc1.json</a></td>
      <td>• Cloud Guard target<br>• Security Zone recipes and targets<br>• Vulnerability scanning resources<br>• CIS v2 Vault and key resources</td>
      <td><strong>Common</strong>: cg-tgt-root, sz-rcp-lz-01-cis-l1, sz-rcp-lz-02-cis-l2, sz-rcp-lz-03-shared-network, sz-rcp-lz-04-environment-network, sz-rcp-lz-05-workload, sz-tgt-lz-prod-environment-network, sz-tgt-lz-prod-proj1, sz-tgt-lz-shared-network, vss-rcph-lz, vss-tgth-lz<br><br><strong>CIS v1 only</strong>: sz-tgt-lz-cis-l1<br><br><strong>CIS v2 only</strong>: key-lz-shared-oss-audit-bkt, sz-tgt-lz-cis-l2, vlt-lz-shared-security</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>CIS v1 pre</strong>: <a href="exacs_observability_cis1_uc1_pre.json">exacs_observability_cis1_uc1_pre.json</a><br><strong>CIS v1 final</strong>: <a href="exacs_observability_cis1_uc1.json">exacs_observability_cis1_uc1.json</a><br><strong>CIS v2 pre</strong>: <a href="exacs_observability_cis2_uc1_pre.json">exacs_observability_cis2_uc1_pre.json</a><br><strong>CIS v2 final</strong>: <a href="exacs_observability_cis2_uc1.json">exacs_observability_cis2_uc1.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Logging and VCN flow logs<br>• Service connector components</td>
      <td>Cloud Guard, IAM, network, security, ExaDB-D infrastructure, and project notification rules; load balancer alarms; notification topics; VCN flow log groups; service connector audit bucket and service connector policy.<br><br>The pre files support the initial apply before network-dependent flow logs exist; the final files enable the full observability configuration after network resources exist.</td>
    </tr>
    <tr>
      <td rowspan="5"><strong>Use Case 2 (UC2)</strong></td>
      <td><strong>IAM configuration</strong><br><a href="exacs_identity_uc2.json">exacs_identity_uc2.json</a></td>
      <td>• Landing Zone and ExaDB-D compartments<br>• Landing Zone and ExaDB-D IAM groups and policies</td>
      <td>Landing Zone, network, platform, security, shared ExaDB-D infrastructure, environment ExaDB-D, project, and project database compartments.<br><br>ExaDB-D database, infrastructure, project, network, and security admin groups and policies.</td>
    </tr>
    <tr>
      <td><strong>Governance configuration</strong><br><a href="exacs_governance_uc2.json">exacs_governance_uc2.json</a></td>
      <td>• Tag namespace and tag definitions</td>
      <td>tagns-lz-role, tag-lz-role</td>
    </tr>
    <tr>
      <td><strong>Network configuration</strong><br><a href="exacs_network_hub_e_uc2.json">exacs_network_hub_e_uc2.json</a></td>
      <td>• Hub E network foundation<br>• Prod and preprod project networks<br>• Environment-specific ExaDB-D platform networks<br>• DRG, route tables, gateways, security lists, NSGs, and load balancer components</td>
      <td>Hub, prod projects, preprod projects, prod ExaDB-D platform, and preprod ExaDB-D platform VCNs; database and backup subnets; workload subnets; route tables; security lists; NSGs; DRG route tables and attachments; NAT, service, and internet gateways; public load balancer components.</td>
    </tr>
    <tr>
      <td><strong>Security configuration</strong><br><strong>CIS v1</strong>: <a href="exacs_security_cis1_uc2.json">exacs_security_cis1_uc2.json</a><br><strong>CIS v2</strong>: <a href="exacs_security_cis2_uc2.json">exacs_security_cis2_uc2.json</a></td>
      <td>• Cloud Guard target<br>• Security Zone recipes and targets<br>• Vulnerability scanning resources<br>• CIS v2 Vault and key resources</td>
      <td><strong>Common</strong>: cg-tgt-root, sz-rcp-lz-01-cis-l1, sz-rcp-lz-02-cis-l2, sz-rcp-lz-03-shared-network, sz-rcp-lz-04-environment-network, sz-rcp-lz-05-workload, sz-tgt-lz-prod-environment-network, sz-tgt-lz-prod-proj1, sz-tgt-lz-shared-network, vss-rcph-lz, vss-tgth-lz<br><br><strong>CIS v1 only</strong>: sz-tgt-lz-cis-l1<br><br><strong>CIS v2 only</strong>: key-lz-shared-oss-audit-bkt, sz-tgt-lz-cis-l2, vlt-lz-shared-security</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>CIS v1 pre</strong>: <a href="exacs_observability_cis1_uc2_pre.json">exacs_observability_cis1_uc2_pre.json</a><br><strong>CIS v1 final</strong>: <a href="exacs_observability_cis1_uc2.json">exacs_observability_cis1_uc2.json</a><br><strong>CIS v2 pre</strong>: <a href="exacs_observability_cis2_uc2_pre.json">exacs_observability_cis2_uc2_pre.json</a><br><strong>CIS v2 final</strong>: <a href="exacs_observability_cis2_uc2.json">exacs_observability_cis2_uc2.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Logging and VCN flow logs<br>• Service connector components</td>
      <td>Cloud Guard, IAM, network, security, shared ExaDB-D infrastructure, environment ExaDB-D platform, and project notification rules; load balancer alarms; notification topics; VCN flow log groups; service connector audit bucket and service connector policy.<br><br>The pre files support the initial apply before network-dependent flow logs exist; the final files enable the full observability configuration after network resources exist.</td>
    </tr>
    <tr>
      <td rowspan="5"><strong>Use Case 3 (UC3)</strong></td>
      <td><strong>IAM configuration</strong><br><a href="exacs_identity_uc3.json">exacs_identity_uc3.json</a></td>
      <td>• Landing Zone and ExaDB-D compartments<br>• Landing Zone and ExaDB-D IAM groups and policies</td>
      <td>Landing Zone, network, platform, security, environment ExaDB-D, project, and project database compartments.<br><br>ExaDB-D database, infrastructure, project, network, and security admin groups and policies.</td>
    </tr>
    <tr>
      <td><strong>Governance configuration</strong><br><a href="exacs_governance_uc3.json">exacs_governance_uc3.json</a></td>
      <td>• Tag namespace and tag definitions</td>
      <td>tagns-lz-role, tag-lz-role</td>
    </tr>
    <tr>
      <td><strong>Network configuration</strong><br><a href="exacs_network_hub_e_uc3.json">exacs_network_hub_e_uc3.json</a></td>
      <td>• Hub E network foundation<br>• Prod and preprod project networks<br>• Environment-specific ExaDB-D platform networks<br>• DRG, route tables, gateways, security lists, NSGs, and load balancer components</td>
      <td>Hub, prod projects, preprod projects, prod ExaDB-D platform, and preprod ExaDB-D platform VCNs; database and backup subnets; workload subnets; route tables; security lists; NSGs; DRG route tables and attachments; NAT, service, and internet gateways; public load balancer components.</td>
    </tr>
    <tr>
      <td><strong>Security configuration</strong><br><strong>CIS v1</strong>: <a href="exacs_security_cis1_uc3.json">exacs_security_cis1_uc3.json</a><br><strong>CIS v2</strong>: <a href="exacs_security_cis2_uc3.json">exacs_security_cis2_uc3.json</a></td>
      <td>• Cloud Guard target<br>• Security Zone recipes and targets<br>• Vulnerability scanning resources<br>• CIS v2 Vault and key resources</td>
      <td><strong>Common</strong>: cg-tgt-root, sz-rcp-lz-01-cis-l1, sz-rcp-lz-02-cis-l2, sz-rcp-lz-03-shared-network, sz-rcp-lz-04-environment-network, sz-rcp-lz-05-workload, sz-tgt-lz-prod-environment-network, sz-tgt-lz-prod-proj1, sz-tgt-lz-shared-network, vss-rcph-lz, vss-tgth-lz<br><br><strong>CIS v1 only</strong>: sz-tgt-lz-cis-l1<br><br><strong>CIS v2 only</strong>: key-lz-shared-oss-audit-bkt, sz-tgt-lz-cis-l2, vlt-lz-shared-security</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>CIS v1 pre</strong>: <a href="exacs_observability_cis1_uc3_pre.json">exacs_observability_cis1_uc3_pre.json</a><br><strong>CIS v1 final</strong>: <a href="exacs_observability_cis1_uc3.json">exacs_observability_cis1_uc3.json</a><br><strong>CIS v2 pre</strong>: <a href="exacs_observability_cis2_uc3_pre.json">exacs_observability_cis2_uc3_pre.json</a><br><strong>CIS v2 final</strong>: <a href="exacs_observability_cis2_uc3.json">exacs_observability_cis2_uc3.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Logging and VCN flow logs<br>• Service connector components</td>
      <td>Cloud Guard, IAM, network, security, environment ExaDB-D platform, and project notification rules; load balancer alarms; notification topics; VCN flow log groups; service connector audit bucket and service connector policy.<br><br>The pre files support the initial apply before network-dependent flow logs exist; the final files enable the full observability configuration after network resources exist.</td>
    </tr>
  </tbody>
</table>

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
