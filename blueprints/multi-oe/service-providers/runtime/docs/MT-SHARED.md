## Multi-Tenant Model Shared Stack Deployment

A stack that deploys the shared infrastructure in the Multi-Tenant model. It contains IAM, budget, network configuration, Kubernetes cluster configuration and Database configuration to support all customers.

The sample VCNs are pre-configured with the following CIDR ranges: 

- **oke-dev-vcn**: 10.0.128.0/17
- **exacs-shared-vcn**: 172.16.0.0/24

The *oke-dev-vcn* can be changed in configuration files [network_oke_npn_config.json](../mt/shared/network_oke_npn_config.json) or [network_oke_flannel_config.json](../mt/shared/network_oke_flannel_config.json), while *exacs-vcn* can be changed in [network_exacs_config.json](../mt/shared/network_exacs_config.json).

### Overall Deployment Sequence

1. [Mgmt Plane Foundational - IAM, Logging, Governance](./MPLANE-FOUNDATIONAL.md)
2. [Mgmt Plane Networking 1st stage - Mgmt Plane VCNs](./MPLANE-NETWORKING.md#stage1)
3. [Mgmt Plane Networking - Firewall](./MPLANE-FIREWALL.md)
4. [Mgmt Plane Networking 2nd stage - Network routing post firewall deployment](./MPLANE-NETWORKING.md#stage2)
5. **Multi-Tenant Shared (this stack)**
6. [Multi-Tenant Model - Customer Onboarding](./MT-CUSTOMER-ONBOARDING.md)

### Stack Configuration

Input Configuration Files | Input Dependency Files | Generated Output
--------------------------|------------------------|------------------
[iam_config.json](../mt/shared/iam_config.json) <br> [budgets_config.json](../mt/shared/budgets_config.json) <br> [network_oke_npn_config.json](../mt/shared/network_oke_npn_config.json) <br> [oke_npn_cluster_config.json](../mt/shared/oke_npn_cluster_config.json) <br> [network_oke_flannel_config.json](../mt/shared/network_oke_flannel_config.json)* <br> [oke_flannel_cluster_config.json](../mt/shared/oke_flannel_cluster_config.json)* <br> [network_exacs_config.json](../mt/shared/network_exacs_config.json) | iam/output/compartments_output.json, network/output/network_output.json | mt-shared/output/compartments_output.json, mt-shared/output/network_output.json

* *network_oke_flannel_config.json* and *oke_flannel_cluster_config* contain the declarations for the deployment of an OKE flannel cluster. They are not included automatically in the stack creation below, that favors native pod networking. If the application requires flannel networking, replace *network_oke_npn_config.json* and *oke_npn_cluster_config* by *network_oke_flannel_config.json* and *oke_flannel_cluster_config*, respectively.

### Stack Creation

[![Deploy_To_OCI](../../design/images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/heads/main.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/blueprints/multi-oe/service-providers/runtime/mt/shared/iam_config.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/blueprints/multi-oe/service-providers/runtime/mt/shared/budgets_config.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/blueprints/multi-oe/service-providers/runtime/mt/shared/network_oke_npn_config.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/blueprints/multi-oe/service-providers/runtime/mt/shared/oke_npn_cluster_config.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/blueprints/multi-oe/service-providers/runtime/mt/shared/network_exacs_config.json","url_dependency_source_oci_bucket":"isv-terraform-runtime-bucket","url_dependency_source":"ocibucket","url_dependency_source_oci_objects":"iam/output/compartments_output.json,network/output/network_output.json","save_output":true,"oci_object_prefix":"mt-shared/output"})

In the Resource Manager Service (RMS) **Create stack - Stack Information** screen that shows up, check the *I have reviewed and accept the Oracle Terms of Use* box, make sure to select *terraform-oci-modules-orchestrator-main/rms-facade* in the **Working directory** drop down, as shown in the image below. 

![Working_directory](../../design/images/orchestrator-working-dir.png)

Give the stack a meaningful name in the *Name* field (*isv-saas-customer1*, for instance), and follow the RMS workflow to complete the stack creation. 

The **Create stack - Configure variables** screen shows the variables pre-filled.

In the final **Create stack - Review** screen, make sure to uncheck the *Run Apply* button, so you have a chance to inspect the Terraform plan output.

![Run_Apply_Disabled](../../design/images/orchestrator-run-apply-disabled.png)

Within the stack, perform a *Plan*, inspect its output, and finally run an *Apply* to actually deploy the resources.

### What Gets Deployed

The resources in red color are added.

![shared-mt](../../design/images/shared-mt.png)
