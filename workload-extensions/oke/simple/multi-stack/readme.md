# OKE Workload Extension - Single-Step Deployment  <!-- omit from toc -->

- [**1. Summary**](#1-summary)
- [**2. Architecture Overview**](#2-architecture-overview)
- [**3. Configuration Files**](#3-configuration-files)
- [**4. Deployment Steps**](#4-deployment-steps)
  - [Option A: Deploy via OCI Resource Manager](#option-a-deploy-via-oci-resource-manager)
  - [Option B: Deploy via Terraform CLI](#option-b-deploy-via-terraform-cli)
- [**5. Post-Deployment Configuration**](#5-post-deployment-configuration)
- [**6. Customization**](#6-customization)
- [**7. Cleanup**](#7-cleanup)
- [**8. Troubleshooting**](#8-troubleshooting)
- [**9. Additional Resources**](#9-additional-resources)



## **1. Summary**

| | |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | OKE Cluster Deployment with Orchestrator                                    |
| **OBJECTIVE**        | Deploy OCI OKE cluster with spoke network infrastructure using the Landing Zone Orchestrator module. |
| **TARGET RESOURCES** | IAM (Compartments, Groups, Policies), Network (VCN, Subnets, NSGs, Gateways), OKE Cluster |
| **DEPLOYMENT**          | [<img src="../../../../commons/images/DeployToOCI.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.8.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/multi-stack/oke_workers.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/multi-stack/oke_network.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/multi-stack/oke_identity.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/multi-stack/oke_clusters.auto.tfvars.json"}) </br> **Note**: To understand how to perform this operation with ORM, follow these [steps](ORM_OKE-LZ-EXT_deployment_steps.md). [Terraform CLI](/commons/content/terraform.md)  can be also used.           |


&nbsp;

## **2. Architecture Overview**

This deployment uses the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator) to provision both the network infrastructure and OKE cluster in a single deployment. The orchestrator automatically resolves dependencies between resources using configuration keys instead of OCIDs.

**Key Features:**
- **Automated Dependency Resolution**: Network resources (VCN, subnets, NSGs) are automatically linked to the OKE cluster using configuration keys using dependency exchange across stacks
- **CIS-Compliant**: Uses the CIS-compliant OKE module from [terraform-oci-modules-workloads](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- **Native Pod Networking**: Configured with VCN-native pod networking for improved security and performance
- **Multi-Step Deployment**: Deploy OKE together in one ORM stack and Landing Zone separately

&nbsp;

## **3. Configuration Files**

The deployment uses four JSON configuration files:

| File | Purpose |
| --- | --- |
| `oke_identity.auto.tfvars.json` | IAM resources: compartments, groups, and policies for OKE |
| `oke_network.auto.tfvars.json` | Network infrastructure: VCN, subnets, NSGs, route tables, service gateway, DRG attachment |
| `oke_clusters.auto.tfvars.json` | OKE cluster configuration: cluster settings, Kubernetes version, CNI type, networking |
| `oke_workers.auto.tfvars.json` | Node pool configuration: worker nodes, shape, size, networking, cloud-init |

&nbsp;

## **4. Deployment Steps** 

### Prerequisites <!-- omit from toc -->

- An existing OCI Landing Zone deployment (ONE-OE or similar)
- Access to OCI Console with appropriate permissions
- DRG (Dynamic Routing Gateway) already created in your Landing Zone

### Option A: Deploy via OCI Resource Manager

1. **Create ORM Stack**
   
   Using one-click deployment. [<img src="../../../../commons/images/DeployToOCI.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.8.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/multi-stack/oke_workers.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/multi-stack/oke_network.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/multi-stack/oke_identity.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/multi-stack/oke_clusters.auto.tfvars.json"}) change working directory to `rms-facade`.

2. **Review Configuration Keys**

   Before deployment, verify these configuration keys match your Landing Zone:

   **In `oke_identity.auto.tfvars.json`:**
   - `CMP-LZP-P-PLATFORM-KEY` - Parent platform compartment
   - Adjust compartment/group/policy names to match your naming convention

   **In `oke_network.auto.tfvars.json`:**
   - `CMP-LZP-P-NETWORK-KEY` - Network compartment
   - `DRG-FRA-LZP-HUB-KEY` - Your DRG key
   - `DRGRT-FRA-LZP-SPOKES-KEY` - Your DRG route table key
   - CIDR blocks (`10.0.80.0/21`) - Adjust if conflicts with existing networks

2. **Run Terraform Plan**
   - Click **Next** to review the configuration
   - Click **Create** to create the stack
   - Click **Plan** to validate the configuration

3. **Apply Configuration**
   - Review the plan output
   - Click **Apply** to provision resources
   - Deployment typically takes 15-20 minutes

### Option B: Deploy via Terraform CLI

1. **Clone Repository**
   ```bash
   git clone https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator.git
   cd terraform-oci-modules-orchestrator
   ```

2. **Copy Configuration Files**
   ```bash
   cp /path/to/oke/*.auto.tfvars.json .
   ```

3. **Initialize and Deploy**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

&nbsp;

## **5. Post-Deployment Configuration**

### Access the Cluster <!-- omit from toc -->
Kubernetes is deployed with control plane using internal IPs. It's required to access the cluster to be on the same / routable network with OKE

1. **Generate kubeconfig**
   ```bash
   oci ce cluster create-kubeconfig \
     --cluster-id <cluster-ocid> \
     --file ~/.kube/config \
     --region <region> \
     --token-version 2.0.0
   ```

2. **Verify Access**
   ```bash
   kubectl get nodes
   kubectl get pods -A
   ```

### Install OKE Add-ons <!-- omit from toc -->

The orchestrator module does not currently support add-on configuration. Install add-ons manually:

**CertManager:**
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

**Metrics Server:**
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

&nbsp;

## **6. Customization**

### Cluster Configuration <!-- omit from toc -->

Edit `oke_clusters.auto.tfvars.json`:

- **Kubernetes Version**: Change `kubernetes_version` to upgrade/downgrade
- **Cluster Type**: Set `is_enhanced: false` for basic clusters
- **Network CIDRs**: Adjust `pods_cidr` and `services_cidr` for your networking requirements
- **Security**: Modify `is_api_endpoint_public` and NSG settings

### Worker Pool Configuration <!-- omit from toc -->

Edit `oke_workers.auto.tfvars.json`:

- **Node Count**: Change `size` to scale worker nodes
- **Instance Shape**: Modify `node_shape`, `ocpus`, `memory` for different compute resources
- **Boot Volume**: Adjust `boot_volume.size` for storage requirements
- **SSH Access**: Update `default_ssh_public_key_path` with your SSH public key path
- **Cloud-init**: Customize `cloud_init` for additional node configuration

### Network Configuration <!-- omit from toc -->

Edit `oke_network.auto.tfvars.json`:

- **CIDR Blocks**: Adjust VCN and subnet CIDR blocks to avoid conflicts
- **NSG Rules**: Add/modify network security group rules for specific security requirements
- **Route Tables**: Update routing for connectivity to on-premises or other VCNs
- **DRG Attachment**: Modify DRG route table keys for inter-VCN routing

&nbsp;

## **7. Cleanup**

To destroy the OKE cluster and network infrastructure:

**Via ORM:**
1. Navigate to your stack in Resource Manager
2. Click **Destroy**
3. Confirm the action

**Via Terraform CLI:**
```bash
terraform destroy
```

> **Warning**: This will delete all resources including the OKE cluster, node pools, VCN, subnets, and compartments. Ensure you have backed up any important data.

&nbsp;

## **8. Troubleshooting**

### Common Issues <!-- omit from toc -->

**Issue**: Configuration key not found errors
- **Solution**: Verify all configuration keys in var-files match your Landing Zone resources
- Check compartment, network, and DRG keys exist in your parent Landing Zone

**Issue**: CIDR block conflicts
- **Solution**: Ensure VCN CIDR (`10.0.80.0/21`) doesn't overlap with existing VCNs
- Adjust subnet CIDRs in `oke_network.auto.tfvars.json`

**Issue**: Cluster creation fails
- **Solution**: Check IAM policies are correctly configured
- Verify VCN-native CNI policy grants required permissions (see `oke_identity.auto.tfvars.json`)

**Issue**: Nodes not joining cluster
- **Solution**: Verify NSG rules allow required traffic
- Check route tables have correct routes to service gateway
- Ensure worker subnet has connectivity to control plane subnet

&nbsp;


&nbsp;

## **9. Additional Resources**

- [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator)
- [CIS OKE Module Documentation](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- [OKE Documentation](https://docs.oracle.com/en-us/iaas/Content/ContEng/home.htm)
- [VCN-Native Pod Networking](https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengpodnetworking_topic-OCI_CNI_plugin.htm)

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
