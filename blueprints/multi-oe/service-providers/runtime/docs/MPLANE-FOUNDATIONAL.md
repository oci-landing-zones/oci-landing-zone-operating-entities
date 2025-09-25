## Management Plane Foundational Stack Deployment

It assembles IAM, governance, security and observability configuration files in a single stack. 

### Overall Deployment Sequence

1. **Mgmt Plane Foundational - IAM, Security, Governance (this stack)**
2. [Mgmt Plane Networking 1st stage - Mgmt Plane VCNs](./MPLANE-NETWORKING.md#stage1)
3. [Mgmt Plane Networking - Firewall](./MPLANE-FIREWALL.md)
4. [Mgmt Plane Networking 2nd stage - Network routing post firewall deployment](./MPLANE-NETWORKING.md#stage2)
5. Either [Pod Model - Customer Onboarding](./POD-CUSTOMER-ONBOARDING.md) or [Multi-Tenant Shared](./MT-SHARED-OKE.md)/[Mgmt Plane Tooling](./MPLANE-TOOLING.md)/[Multi-Tenant Model - Customer Onboarding](./MT-CUSTOMER-ONBOARDING.md).

### Stack Configuration

Input Configuration Files | Input Dependency Files | Generated Output
--------------------------|------------------------|------------------
[iam_config.json](../mgmt-plane/iam/iam_config.json) <br> [budgets_config.json](../mgmt-plane/governance/budgets_config.json) <br> [tags_config.json](../mgmt-plane/governance/tags_config.json) <br> [cloud_guard_config.json](../mgmt-plane/security/cloud_guard_config.json) <br> [security_zones_config.json](../mgmt-plane/security/security_zones_config.json) <br> [scanning_config.json](../mgmt-plane/security/scanning_config.json) <br> [observability_config.json](../mgmt-plane/observability/observability_config.json) | None | mgmt-plane/iam/output/compartments_output.json <br> mgmt-plane/iam/output/tags_output.json

### Stack Creation

**Deploying this stack as-is requires [Deployment Bootstrap](../readme.md#deployment-bootstrap)**.

[![Deploy_To_OCI](../../design/images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/heads/main.zip&zipUrlVariables={"configuration_source":"ocibucket","oci_configuration_bucket":"landing-zone-runtime-bucket","oci_configuration_objects":"mgmt-plane/iam/iam_config.json,mgmt-plane/security/cloud_guard_config.json,mgmt-plane/governance/budgets_config.json,mgmt-plane/governance/tags_config.json,mgmt-plane/observability/observability_config.json,mgmt-plane/security/scanning_config.json,mgmt-plane/security/security_zones_config.json","save_output":true,"oci_object_prefix":"mgmt-plane/iam/output"})

In the Resource Manager Service (RMS) **Create stack - Stack Information** screen that shows up, check the *I have reviewed and accept the Oracle Terms of Use* box, make sure to select *terraform-oci-modules-orchestrator-main/rms-facade* in the **Working directory** drop down, as shown in the image below. 

![Working_directory](../../design/images/orchestrator-working-dir.png)

Give the stack a meaningful name in the *Name* field (*isv-foundational*, for instance), and follow the RMS workflow to complete the stack creation. 

The **Create stack - Configure variables** screen shows the variables pre-filled.

In the final **Create stack - Review** screen, make sure to uncheck the *Run Apply* button, so you have a chance to inspect the Terraform plan output.

![Run_Apply_Disabled](../../design/images/orchestrator-run-apply-disabled.png)

Within the stack, perform a *Plan*, inspect its output, and finally run an *Apply* to actually deploy the resources.


### What Gets Deployed

![isv-pod-architecture-mgmt-plane-foundational](../../design/images/foundational.png)
