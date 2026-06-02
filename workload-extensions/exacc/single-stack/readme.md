# ExaDB-C@C Workload Extension - Single-Stack Deployment  <!-- omit from toc -->


## **1. Summary**

<table>
  <tbody>
    <tr>
      <td><strong>NAME</strong></td>
      <td>Complete Landing Zone with ExaDB-C@C (Single-Stack)</td>
    </tr>
    <tr>
      <td><strong>OBJECTIVE</strong></td>
      <td>Deploy One-OE Landing Zone (No VCN/network resources) + WE ExaDB-C@C</td>
    </tr>
    <tr>
      <td><strong>TARGET RESOURCES</strong></td>
      <td>Complete LZ Foundation, IAM, Security, Observability</td>
    </tr>
  </tbody>
</table>



&nbsp;

## **2. Architecture Overview**

 In a single-stack model in OCI Resource Manager (ORM), the deployment is managed as a single operation that combines the required landing zone components into one stack. This approach is useful when you want a simpler execution model, with a single lifecycle for planning, applying, and managing the environment.

 In this model, the Landing Zone Foundations, the One-OE foundation, and the required Workload Extension (WE) are deployed together as part of the same stack. While this model offers less modularity than a multi-stack approach, it can reduce operational overhead for simpler scenarios and provide a more straightforward deployment flow. It still benefits from ORM capabilities such as managed state, centralized job visibility, and controlled execution, but without the need to manage cross-stack dependencies between layers.
&nbsp;

<img src="../content/Single.png" width="600" align="center">



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
      <td><a href="../exacc_use_cases/readme.md/#21-shared-exadb-cc-platform-shared-infrastructure-and-shared-vmcsavmcs-across-multiple-environments">shared ExaDB-C@C platform</a></td>
      <td><a href="../exacc_use_cases/readme.md/#22-hybrid-exadb-cc-platform-shared-infrastructure-with-dedicated-vmcsavmcs-per-environment">hybrid ExaDB-C@C platform</a></td>
      <td><a href="../exacc_use_cases/readme.md/#23-dedicated-exadb-cc-platform-fully-dedicated-infrastructure-and-vmcsavmcs-per-environment">dedicated ExaDB-C@C platform</a></td>
      <td></td>
    </tr>
    <tr>
      <td>ORM</td>
      <td><strong>CIS v1</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_observability_cis1_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_security_cis1_uc1.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacc_governance_uc1.json">governance</a>, <a href="./exacc_identity_uc1.json">iam</a>, <a href="./exacc_observability_cis1_uc1.json">observability CIS v1</a>, <a href="./exacc_security_cis1_uc1.json">security CIS v1</a><br><br><strong>CIS v2</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_governance_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_identity_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_observability_cis2_uc1.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_security_cis2_uc1.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacc_governance_uc1.json">governance</a>, <a href="./exacc_identity_uc1.json">iam</a>, <a href="./exacc_observability_cis2_uc1.json">observability CIS v2</a>, <a href="./exacc_security_cis2_uc1.json">security CIS v2</a>.</td>
      <td><strong>CIS v1</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_governance_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_identity_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_observability_cis1_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_security_cis1_uc2.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacc_governance_uc2.json">governance</a>, <a href="./exacc_identity_uc2.json">iam</a>, <a href="./exacc_observability_cis1_uc2.json">observability CIS v1</a>, <a href="./exacc_security_cis1_uc2.json">security CIS v1</a><br><br><strong>CIS v2</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_governance_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_identity_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_observability_cis2_uc2.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_security_cis2_uc2.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacc_governance_uc2.json">governance</a>, <a href="./exacc_identity_uc2.json">iam</a>, <a href="./exacc_observability_cis2_uc2.json">observability CIS v2</a>, <a href="./exacc_security_cis2_uc2.json">security CIS v2</a>.</td>
      <td><strong>CIS v1</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_governance_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_identity_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_observability_cis1_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_security_cis1_uc3.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacc_governance_uc3.json">governance</a>, <a href="./exacc_identity_uc3.json">iam</a>, <a href="./exacc_observability_cis1_uc3.json">observability CIS v1</a>, <a href="./exacc_security_cis1_uc3.json">security CIS v1</a><br><br><strong>CIS v2</strong><br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&amp;zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_governance_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_identity_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_observability_cis2_uc3.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/exacc/single-stack/exacc_security_cis2_uc3.json"}'><img src="../../../commons/images/DeployToOCI_onestack.svg" height="30" align="center"></a><br>Files: <a href="./exacc_governance_uc3.json">governance</a>, <a href="./exacc_identity_uc3.json">iam</a>, <a href="./exacc_observability_cis2_uc3.json">observability CIS v2</a>, <a href="./exacc_security_cis2_uc3.json">security CIS v2</a>.</td>
      <td>These ORM buttons are convenience links. For production or customer-controlled deployments, stage the configuration files in a private Object Storage bucket or approved private source. For ORM best practices, see <a href="../../../commons/content/orm_bp.md">ORM Best Practices</a>.</td>
    </tr>
    <tr>
      <td>Terraform CLI</td>
      <td></td>
      <td></td>
      <td></td>
      <td>Use the same configuration files listed in the ORM row with Terraform CLI. For command examples and prerequisites, see <a href="../../../commons/content/terraform.md">Run with Terraform CLI</a>.</td>
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
      <td><strong>IAM configuration</strong><br><a href="exacc_identity_uc1.json">exacc_identity_uc1.json</a></td>
      <td>• Landing Zone and ExaDB-C@C compartments<br>• Landing Zone and ExaDB-C@C IAM groups and policies</td>
      <td>cmp-landingzone, cmp-lz-network, cmp-lz-platform, cmp-lz-shared-exacc, cmp-lz-shared-exacc-db, cmp-lz-shared-exacc-infra, cmp-lz-preprod, cmp-lz-preprod-network, cmp-lz-preprod-platform, cmp-lz-preprod-exacc, cmp-lz-preprod-exacc-db, cmp-lz-preprod-exacc-infra, cmp-lz-preprod-projects, cmp-lz-preprod-proj1, cmp-lz-preprod-proj1-exacc-db, cmp-lz-preprod-security, cmp-lz-prod, cmp-lz-prod-network, cmp-lz-prod-platform, cmp-lz-prod-exacc, cmp-lz-prod-exacc-db, cmp-lz-prod-exacc-infra, cmp-lz-prod-projects, cmp-lz-prod-proj1, cmp-lz-prod-proj1-exacc-db, cmp-lz-prod-security, cmp-lz-security <br><br> grp-auditors-admin, grp-cost-admin, grp-iam-admin, grp-lz-global-exacc-db-admin, grp-lz-global-exacc-infra-admin, grp-lz-network-admin, grp-lz-preprod-proj1-exacc-admin, grp-lz-preprod-proj1-admin, grp-lz-prod-proj1-exacc-admin, grp-lz-prod-proj1-admin, grp-lz-security-admin, grp-security-admin <br><br> pcy-auditing-admin, pcy-cost-admin, pcy-generic-admin, pcy-iam-admin, pcy-lz-global-exacc-db-admin, pcy-lz-global-exacc-generic, pcy-lz-global-exacc-infra-admin, pcy-lz-network-admin, pcy-lz-preprod-exacc-proj1-admin, pcy-lz-preprod-proj1-admin, pcy-lz-preprod-proj1-admin-net, pcy-lz-preprod-proj1-admin-sec, pcy-lz-prod-exacc-proj1-admin, pcy-lz-prod-proj1-admin, pcy-lz-prod-proj1-admin-net, pcy-lz-prod-proj1-admin-sec, pcy-lz-security-admin, pcy-security-admin, pcy-services-admin</td>
    </tr>
    <tr>
      <td><strong>Governance configuration</strong><br><a href="exacc_governance_uc1.json">exacc_governance_uc1.json</a></td>
      <td>• Tag namespace and tag definitions</td>
      <td>tagns-lz-role, tag-lz-role</td>
    </tr>
    <tr>
      <td><strong>Security configuration</strong><br><strong>CIS v1</strong>: <a href="exacc_security_cis1_uc1.json">exacc_security_cis1_uc1.json</a><br><strong>CIS v2</strong>: <a href="exacc_security_cis2_uc1.json">exacc_security_cis2_uc1.json</a></td>
      <td>• Cloud Guard target<br>• Security Zone recipes and targets<br>• Vulnerability scanning resources<br>• CIS v2 Vault and key resources</td>
      <td><strong>Common</strong>: cg-tgt-root, sz-rcp-lz-01-cis-l1, sz-rcp-lz-02-cis-l2, sz-rcp-lz-03-shared-network, sz-rcp-lz-04-environment-network, sz-rcp-lz-05-workload, vss-rcph-lz, vss-tgth-lz <br><br> <strong>CIS v1 only</strong>: sz-tgt-lz-cis-l1 <br><br> <strong>CIS v2 only</strong>: key-lz-shared-oss-audit-bkt, sz-tgt-lz-cis-l2, vlt-lz-shared-security</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>CIS v1</strong>: <a href="exacc_observability_cis1_uc1.json">exacc_observability_cis1_uc1.json</a><br><strong>CIS v2</strong>: <a href="exacc_observability_cis2_uc1.json">exacc_observability_cis2_uc1.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Service connector components</td>
      <td>rul-lz-cloudguard, rul-lz-iam, rul-lz-notification-operator-access-control, rul-lz-notification-platform-exacc-db, rul-lz-notification-platform-exacc-infra, rul-lz-notification-platform-exacc-vmc, rul-lz-notify-security, rul-lz-preprod-notification-projects, rul-lz-preprod-notify-security, rul-lz-prod-notification-projects, rul-lz-prod-notify-security <br><br> al-lz-cpuutil, al-lz-db-cluster-cpuutil, al-lz-db-cluster-diskutil, al-lz-db-cluster-fsutil, al-lz-db-cluster-memutil, al-lz-db-cluster-swaputil, al-lz-storageutil <br><br> nott-lz-cloudguard, nott-lz-exacc-db-workloads, nott-lz-exacc-infra-workloads, nott-lz-iam, nott-lz-preprod-exacc, nott-lz-prod-exacc, nott-lz-security <br><br> bkt-lz-service-connector, sch-lz-monitor, service-connector-audit-policy <br><br> <strong>CIS-specific configuration</strong>: CIS v1 sets <code>cis_level: 1</code> on <code>bkt-lz-service-connector</code>; CIS v2 sets <code>cis_level: 2</code> and adds <code>kms_key_id: KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY</code> to the same bucket.</td>
    </tr>
    <tr>
      <td rowspan="4"><strong>Use Case 2 (UC2)</strong></td>
      <td><strong>IAM configuration</strong><br><a href="exacc_identity_uc2.json">exacc_identity_uc2.json</a></td>
      <td>• Landing Zone and ExaDB-C@C compartments<br>• Landing Zone and ExaDB-C@C IAM groups and policies</td>
      <td>cmp-landingzone, cmp-lz-network, cmp-lz-platform, cmp-lz-shared-exacc, cmp-lz-shared-exacc-infra, cmp-lz-preprod, cmp-lz-preprod-network, cmp-lz-preprod-platform, cmp-lz-preprod-exacc, cmp-lz-preprod-exacc-db, cmp-lz-preprod-projects, cmp-lz-preprod-proj1, cmp-lz-preprod-proj1-exacc-db, cmp-lz-preprod-security, cmp-lz-prod, cmp-lz-prod-network, cmp-lz-prod-platform, cmp-lz-prod-exacc, cmp-lz-prod-exacc-db, cmp-lz-prod-projects, cmp-lz-prod-proj1, cmp-lz-prod-proj1-exacc-db, cmp-lz-prod-security, cmp-lz-security <br><br> grp-auditors-admin, grp-cost-admin, grp-iam-admin, grp-lz-global-exacc-db-admin, grp-lz-global-exacc-infra-admin, grp-lz-network-admin, grp-lz-preprod-proj1-exacc-admin, grp-lz-preprod-proj1-admin, grp-lz-prod-proj1-exacc-admin, grp-lz-prod-proj1-admin, grp-lz-security-admin, grp-security-admin <br><br> pcy-auditing-admin, pcy-cost-admin, pcy-generic-admin, pcy-iam-admin, pcy-lz-global-exacc-db-admin, pcy-lz-global-exacc-generic, pcy-lz-global-exacc-infra-admin, pcy-lz-network-admin, pcy-lz-preprod-exacc-proj1-admin, pcy-lz-preprod-proj1-admin, pcy-lz-preprod-proj1-admin-net, pcy-lz-preprod-proj1-admin-sec, pcy-lz-prod-exacc-proj1-admin, pcy-lz-prod-proj1-admin, pcy-lz-prod-proj1-admin-net, pcy-lz-prod-proj1-admin-sec, pcy-lz-security-admin, pcy-security-admin, pcy-services-admin</td>
    </tr>
    <tr>
      <td><strong>Governance configuration</strong><br><a href="exacc_governance_uc2.json">exacc_governance_uc2.json</a></td>
      <td>• Tag namespace and tag definitions</td>
      <td>tagns-lz-role, tag-lz-role</td>
    </tr>
    <tr>
      <td><strong>Security configuration</strong><br><strong>CIS v1</strong>: <a href="exacc_security_cis1_uc2.json">exacc_security_cis1_uc2.json</a><br><strong>CIS v2</strong>: <a href="exacc_security_cis2_uc2.json">exacc_security_cis2_uc2.json</a></td>
      <td>• Cloud Guard target<br>• Security Zone recipes and targets<br>• Vulnerability scanning resources<br>• CIS v2 Vault and key resources</td>
      <td><strong>Common</strong>: cg-tgt-root, sz-rcp-lz-01-cis-l1, sz-rcp-lz-02-cis-l2, sz-rcp-lz-03-shared-network, sz-rcp-lz-04-environment-network, sz-rcp-lz-05-workload, vss-rcph-lz, vss-tgth-lz <br><br> <strong>CIS v1 only</strong>: sz-tgt-lz-cis-l1 <br><br> <strong>CIS v2 only</strong>: key-lz-shared-oss-audit-bkt, sz-tgt-lz-cis-l2, vlt-lz-shared-security</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>CIS v1</strong>: <a href="exacc_observability_cis1_uc2.json">exacc_observability_cis1_uc2.json</a><br><strong>CIS v2</strong>: <a href="exacc_observability_cis2_uc2.json">exacc_observability_cis2_uc2.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Service connector components</td>
      <td>rul-lz-cloudguard, rul-lz-iam, rul-lz-notification-operator-access-control, rul-lz-notification-platform-exacc-infra, rul-lz-notify-security, rul-lz-preprod-notification-platform-exacc-db, rul-lz-preprod-notification-platform-exacc-vmc, rul-lz-preprod-notification-projects, rul-lz-preprod-notify-security, rul-lz-prod-notification-platform-exacc-db, rul-lz-prod-notification-platform-exacc-vmc, rul-lz-prod-notification-projects, rul-lz-prod-notify-security <br><br> al-lz-preprod-cpuutil, al-lz-preprod-db-cluster-cpuutil, al-lz-preprod-db-cluster-diskutil, al-lz-preprod-db-cluster-fsutil, al-lz-preprod-db-cluster-memutil, al-lz-preprod-db-cluster-swaputil, al-lz-preprod-storageutil, al-lz-prod-cpuutil, al-lz-prod-db-cluster-cpuutil, al-lz-prod-db-cluster-diskutil, al-lz-prod-db-cluster-fsutil, al-lz-prod-db-cluster-memutil, al-lz-prod-db-cluster-swaputil, al-lz-prod-storageutil <br><br> nott-lz-cloudguard, nott-lz-exacc-infra-workloads, nott-lz-iam, nott-lz-preprod-exacc, nott-lz-prod-exacc, nott-lz-security <br><br> bkt-lz-service-connector, sch-lz-monitor, service-connector-audit-policy <br><br> <strong>CIS-specific configuration</strong>: CIS v1 sets <code>cis_level: 1</code> on <code>bkt-lz-service-connector</code>; CIS v2 sets <code>cis_level: 2</code> and adds <code>kms_key_id: KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY</code> to the same bucket.</td>
    </tr>
    <tr>
      <td rowspan="4"><strong>Use Case 3 (UC3)</strong></td>
      <td><strong>IAM configuration</strong><br><a href="exacc_identity_uc3.json">exacc_identity_uc3.json</a></td>
      <td>• Landing Zone and ExaDB-C@C compartments<br>• Landing Zone and ExaDB-C@C IAM groups and policies</td>
      <td>cmp-landingzone, cmp-lz-network, cmp-lz-platform, cmp-lz-preprod, cmp-lz-preprod-network, cmp-lz-preprod-platform, cmp-lz-preprod-exacc, cmp-lz-preprod-exacc-db, cmp-lz-preprod-exacc-infra, cmp-lz-preprod-projects, cmp-lz-preprod-proj1, cmp-lz-preprod-proj1-exacc-db, cmp-lz-preprod-security, cmp-lz-prod, cmp-lz-prod-network, cmp-lz-prod-platform, cmp-lz-prod-exacc, cmp-lz-prod-exacc-db, cmp-lz-prod-exacc-infra, cmp-lz-prod-projects, cmp-lz-prod-proj1, cmp-lz-prod-proj1-exacc-db, cmp-lz-prod-security, cmp-lz-security <br><br> grp-auditors-admin, grp-cost-admin, grp-iam-admin, grp-lz-global-exacc-db-admin, grp-lz-global-exacc-infra-admin, grp-lz-network-admin, grp-lz-preprod-proj1-exacc-admin, grp-lz-preprod-proj1-admin, grp-lz-prod-proj1-exacc-admin, grp-lz-prod-proj1-admin, grp-lz-security-admin, grp-security-admin <br><br> pcy-auditing-admin, pcy-cost-admin, pcy-generic-admin, pcy-iam-admin, pcy-lz-global-exacc-db-admin, pcy-lz-global-exacc-generic, pcy-lz-global-exacc-infra-admin, pcy-lz-network-admin, pcy-lz-preprod-exacc-proj1-admin, pcy-lz-preprod-proj1-admin, pcy-lz-preprod-proj1-admin-net, pcy-lz-preprod-proj1-admin-sec, pcy-lz-prod-exacc-proj1-admin, pcy-lz-prod-proj1-admin, pcy-lz-prod-proj1-admin-net, pcy-lz-prod-proj1-admin-sec, pcy-lz-security-admin, pcy-security-admin, pcy-services-admin</td>
    </tr>
    <tr>
      <td><strong>Governance configuration</strong><br><a href="exacc_governance_uc3.json">exacc_governance_uc3.json</a></td>
      <td>• Tag namespace and tag definitions</td>
      <td>tagns-lz-role, tag-lz-role</td>
    </tr>
    <tr>
      <td><strong>Security configuration</strong><br><strong>CIS v1</strong>: <a href="exacc_security_cis1_uc3.json">exacc_security_cis1_uc3.json</a><br><strong>CIS v2</strong>: <a href="exacc_security_cis2_uc3.json">exacc_security_cis2_uc3.json</a></td>
      <td>• Cloud Guard target<br>• Security Zone recipes and targets<br>• Vulnerability scanning resources<br>• CIS v2 Vault and key resources</td>
      <td><strong>Common</strong>: cg-tgt-root, sz-rcp-lz-01-cis-l1, sz-rcp-lz-02-cis-l2, sz-rcp-lz-03-shared-network, sz-rcp-lz-04-environment-network, sz-rcp-lz-05-workload, vss-rcph-lz, vss-tgth-lz <br><br> <strong>CIS v1 only</strong>: sz-tgt-lz-cis-l1 <br><br> <strong>CIS v2 only</strong>: key-lz-shared-oss-audit-bkt, sz-tgt-lz-cis-l2, vlt-lz-shared-security</td>
    </tr>
    <tr>
      <td><strong>Observability configuration</strong><br><strong>CIS v1</strong>: <a href="exacc_observability_cis1_uc3.json">exacc_observability_cis1_uc3.json</a><br><strong>CIS v2</strong>: <a href="exacc_observability_cis2_uc3.json">exacc_observability_cis2_uc3.json</a></td>
      <td>• Events<br>• Alarms<br>• Notifications<br>• Service connector components</td>
      <td>rul-lz-cloudguard, rul-lz-iam, rul-lz-notify-security, rul-lz-preprod-notification-platform-exacc-db, rul-lz-preprod-notification-platform-exacc-infra, rul-lz-preprod-notification-platform-exacc-vmc, rul-lz-preprod-notification-projects, rul-lz-preprod-notify-security, rul-lz-prod-notification-platform-exacc-db, rul-lz-prod-notification-platform-exacc-infra, rul-lz-prod-notification-platform-exacc-vmc, rul-lz-prod-notification-projects, rul-lz-prod-notify-security <br><br> al-lz-preprod-cpuutil, al-lz-preprod-db-cluster-cpuutil, al-lz-preprod-db-cluster-diskutil, al-lz-preprod-db-cluster-fsutil, al-lz-preprod-db-cluster-memutil, al-lz-preprod-db-cluster-swaputil, al-lz-preprod-storageutil, al-lz-prod-cpuutil, al-lz-prod-db-cluster-cpuutil, al-lz-prod-db-cluster-diskutil, al-lz-prod-db-cluster-fsutil, al-lz-prod-db-cluster-memutil, al-lz-prod-db-cluster-swaputil, al-lz-prod-storageutil <br><br> nott-lz-cloudguard, nott-lz-iam, nott-lz-preprod-exacc, nott-lz-prod-exacc, nott-lz-security <br><br> bkt-lz-service-connector, sch-lz-monitor, service-connector-audit-policy <br><br> <strong>CIS-specific configuration</strong>: CIS v1 sets <code>cis_level: 1</code> on <code>bkt-lz-service-connector</code>; CIS v2 sets <code>cis_level: 2</code> and adds <code>kms_key_id: KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY</code> to the same bucket.</td>
    </tr>
  </tbody>
</table>

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
