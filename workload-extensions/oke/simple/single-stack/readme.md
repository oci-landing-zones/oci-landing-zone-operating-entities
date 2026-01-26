# OKE Workload Extension - Single-Stack Deployment <!-- omit from toc -->

- [**1. Summary**](#1-summary)
- [**2. Architecture Overview**](#2-architecture-overview)
- [**3. Architecture Components**](#3-architecture-components)
- [**4. Configuration Files**](#4-configuration-files)
- [**5. Deployment Steps**](#5-deployment-steps)
  - [Option A: Deploy via OCI Resource Manager (ORM)](#option-a-deploy-via-oci-resource-manager-orm)
  - [Option B: Deploy via Terraform CLI](#option-b-deploy-via-terraform-cli)
- [**6. Post-Deployment Configuration**](#6-post-deployment-configuration)
  - [6.1 Access the OKE Cluster](#61-access-the-oke-cluster)
  - [6.2 Install Kubernetes Add-ons](#62-install-kubernetes-add-ons)
- [**7. Customization Guide**](#7-customization-guide)
  - [7.1 Modify Network CIDRs](#71-modify-network-cidrs)
  - [7.2 Scale Worker Nodes](#72-scale-worker-nodes)
  - [7.3 Change Instance Shape](#73-change-instance-shape)
  - [7.4 Upgrade Kubernetes Version](#74-upgrade-kubernetes-version)
  - [7.5 Add Custom NSG Rules](#75-add-custom-nsg-rules)
- [**8. Network Routing Details**](#8-network-routing-details)
- [**9. Troubleshooting**](#9-troubleshooting)
- [**10. Cleanup / Destroy**](#10-cleanup--destroy)
- [**12. Additional Resources**](#12-additional-resources)
- [**13. Next Steps**](#13-next-steps)


## **1. Summary**

| | |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | Complete Landing Zone with OKE (Single-Stack)                                    |
| **OBJECTIVE**        | Deploy OneOE Landing Zone + Hub Model E + OKE cluster in a single unified Terraform deployment. |
| **TARGET RESOURCES** | Complete LZ Foundation, IAM, Hub Network, DRG, OKE VCN, OKE Cluster with all components integrated |
| **DEPLOYMENT**          | [<img src="../../../../commons/images/DeployToOCI.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.10.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_workers.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_network.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_identity.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_clusters.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_governance.auto.tfvars.json"}) </br> **Note**: To understand how to perform this operation with ORM, follow these [steps](ORM_OKE-LZ-EXT_deployment_steps.md). [Terraform CLI](/commons/content/terraform.md)  can be also used.           |


&nbsp;

## **2. Architecture Overview**

This deployment combines **OneOE Blueprint**, **Hub Model E networking**, and **OKE cluster** into a **single comprehensive Terraform deployment**. Unlike the multi-stack approach where OKE is added to an existing Landing Zone, this single-stack deployment creates everything together from scratch.

<img src="../single-stack/content/oke_oneclick.png" width="800">

**What Makes This Different:**
- **All-in-One**: OneOE + Hub E + OKE deployed in a single `terraform apply`
- **Automatic Integration**: Hub routes, DRG distributions, and network connectivity configured automatically
- **No External Dependencies**: Doesn't require a pre-existing Landing Zone
- **Single Terraform State**: All resources managed together

**Key Features:**
- **Complete Landing Zone Foundation**: OneOE compartment structure, IAM groups, policies
- **Hub-and-Spoke Networking**: Hub VCN (Model E) with firewall capabilities + OKE Spoke VCN
- **Automated Routing**: Hub route tables pre-configured  with OKE CIDR (10.0.80.0/21)
- **DRG Integration**: Dynamic Routing Gateway with route distributions configured for Hub-Spoke communication
- **CIS-Compliant OKE**: Uses the CIS-compliant OKE module from [terraform-oci-modules-workloads](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- **Native Pod Networking**: Configured with VCN-native pod networking for improved security and performance

&nbsp;

## **3. Architecture Components**

### **3.1 Landing Zone Foundation (OneOE)** <!-- omit from toc -->

The deployment includes the complete OneOE blueprint with:
- Tenancy-level compartment structure
- IAM groups and policies for Landing Zone administration
- Core security configuration
- Tagging framework

### **3.2 Hub Network (Model E)** <!-- omit from toc -->

**Hub VCN (`10.0.0.0/21`)** with centralized internet gateway architecture:
- Load Balancer subnet with Internet Gateway (for inbound public traffic)
- Management subnet with NAT Gateway (for Hub management)
- DRG for inter-VCN routing
- **Routing **: Routes to OKE CIDR (`10.0.80.0/21 → DRG`) added to both Hub subnets and DRG throguh route distribution
- **Hub Model E Characteristic**: Internet Gateway resides in Hub; spoke VCNs use their own NAT Gateways for outbound internet

### **3.3 OKE Spoke Network** <!-- omit from toc -->

**OKE VCN (`10.0.80.0/21`)** with four dedicated subnets:

| Subnet | CIDR | Purpose | Size |
|--------|------|---------|------|
| Control Plane | 10.0.80.128/25 | Kubernetes control plane | /25 (126 IPs) |
| Internal LB | 10.0.80.0/25 | Internal load balancers | /25 (126 IPs) |
| Worker Nodes | 10.0.82.0/23 | OKE worker instances | /23 (510 IPs) |
| Pods | 10.0.84.0/23 | VCN-native pod networking | /23 (510 IPs) |

**Network Security Groups (NSGs):**
- NSG for Control Plane (API server access, health checks)
- NSG for Worker Nodes (full egress, selective ingress)
- NSG for Pods (pod-to-pod, pod-to-services)
- NSG for Internal Load Balancers (NodePort range)

**Gateways:**
- NAT Gateway for outbound internet access (all subnets)
- Service Gateway for OCI services connectivity
- DRG Attachment for inter-spoke and on-premises connectivity

### **3.4 DRG Routing** <!-- omit from toc -->

**Automatic DRG Configuration:**
- **DRG Attachment**: OKE VCN attached to DRG with spoke route table (`DRGRT-FRA-LZP-SPOKES-KEY`)
- **Route Distributions**:
  - Hub route distribution updated to accept routes from OKE VCN
  - Spoke route distribution updated to advertise OKE VCN routes
- **Priority Management**: OKE routes configured with appropriate priorities

### **3.5 OKE Cluster** <!-- omit from toc -->

- **Kubernetes Version**: 1.31.1
- **Cluster Type**: Enhanced cluster with native pod networking
- **Control Plane**: Private endpoint in dedicated subnet
- **Worker Pool**: 1x VM.Standard.E4.Flex (1 OCPU, 8GB RAM) - easily scalable
- **CNI**: VCN-native pod networking (OCI VCN-Native Pod Networking CNI)

&nbsp;

## **4. Configuration Files**

The deployment uses four JSON configuration files:

| File | Purpose  | 
| --- | --- |
| `oke_identity.auto.tfvars.json` | OneOE IAM + OKE-specific groups/policies |
| `oke_network.auto.tfvars.json` | OneOE + Hub E + OKE network |
| `oke_clusters.auto.tfvars.json` | OKE cluster configuration |
| `oke_workers.auto.tfvars.json` | OKE Node pool configuration | 

&nbsp;

## **5. Deployment Steps**

### Prerequisites <!-- omit from toc -->

**Required:**
- OCI tenancy with administrative access
- OCI CLI configured (for Terraform CLI deployment) or access to OCI Console (for ORM deployment)
- Terraform 1.0+ installed (for CLI deployment)

**Not Required:**
- No existing Landing Zone needed
- No pre-configured DRG or compartments
- Everything is created from scratch

### Option A: Deploy via OCI Resource Manager (ORM) 

1. **Create ORM Stack**
   
   Using one-click deployment. [<img src="../../../../commons/images/DeployToOCI.svg" height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.10.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_workers.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_network.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_identity.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_clusters.auto.tfvars.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/master/workload-extensions/oke/simple/single-stack/oke_governance.auto.tfvars.json"}) change working directory to `rms-facade`.

2. **Review Configuration** (Optional Customization)

   Before deployment, you may want to review the JSON configuration files and customize them as needed:

   **Key Configuration Values:**
   - **Regions**: Default region code is `FRA` (Frankfurt) - update all keys and display names if deploying to a different region
   - **CIDR Blocks**:
     - Hub VCN: `10.0.0.0/21`
     - OKE VCN: `10.0.80.0/21`
     - Adjust these in the JSON files if they conflict with existing networks
   - **Configuration Keys**: Ensure keys like `DRG-FRA-LZP-HUB-KEY` match your naming convention

3. **Run Terraform Plan**
   - Click **Next** → **Create**
   - Click **Plan** to preview resources


4. **Apply Configuration**
   - Click **Apply**
   - Deployment takes approximately **20-30 minutes**
   - Monitor progress in the logs

#### Step 3: Verify Deployment <!-- omit from toc -->

After successful apply:

1. **Check Compartments**
   - Navigate to **Identity → Compartments**
   - Verify OneOE structure + OKE compartment created

2. **Check Networks**
   - Navigate to **Networking → Virtual Cloud Networks**
   - Verify Hub VCN and OKE VCN exist

3. **Check DRG**
   - Navigate to **Networking → Dynamic Routing Gateways**
   - Verify DRG with two VCN attachments (Hub + OKE)

4. **Check OKE Cluster**
   - Navigate to **Developer Services → Kubernetes Clusters (OKE)**
   - Verify cluster is Active
   - Verify node pool has running nodes

### Option B: Deploy via Terraform CLI

#### Step 1: Clone Orchestrator Module <!-- omit from toc -->

```bash
git clone https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator.git
cd terraform-oci-modules-orchestrator
```

#### Step 2: Copy Configuration Files <!-- omit from toc -->

```bash
# Copy configuration files to orchestrator directory
cp /path/to/workload-extensions/oke/simple/single-stack/*.auto.tfvars.json \
   /path/to/terraform-oci-modules-orchestrator/
```

#### Step 3: Configure Provider <!-- omit from toc -->

Create `terraform.tfvars`:

```hcl
tenancy_ocid = "ocid1.tenancy.oc1..aaaa..."
region       = "eu-frankfurt-1"
```

#### Step 4: Initialize and Deploy <!-- omit from toc -->

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

&nbsp;

## **6. Post-Deployment Configuration**

### 6.1 Access the OKE Cluster 
OKE Cluster is deploying with private IP for the control plane, for accessing control plane you need to be on the same / routable network as OKE.

#### Generate kubeconfig <!-- omit from toc -->

```bash
# Get cluster OCID from Terraform outputs or OCI Console
CLUSTER_OCID="ocid1.cluster.oc1.eu-frankfurt-1.aaaa..."

# Generate kubeconfig
oci ce cluster create-kubeconfig \
  --cluster-id $CLUSTER_OCID \
  --file ~/.kube/config \
  --region eu-frankfurt-1 \
  --token-version 2.0.0 \
  --kube-endpoint PRIVATE_ENDPOINT
```

**Note**: Since the control plane is private, you must access it from:
- A bastion host in the Hub VCN
- A VPN/FastConnect connection to your Hub VCN
- OCI Cloud Shell (if configured with VCN access)

#### Verify Cluster Access <!-- omit from toc -->

```bash
kubectl get nodes
kubectl get pods -A
kubectl cluster-info
```

### 6.2 Install Kubernetes Add-ons

The orchestrator module doesn't deploy add-ons automatically. Install required add-ons:

#### CertManager (for TLS certificate management) <!-- omit from toc -->

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

#### Metrics Server (for resource monitoring) <!-- omit from toc -->

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

&nbsp;

## **7. Customization Guide**

### 7.1 Modify Network CIDRs

**File**: `workload-extensions/oke/simple/single-stack/oke_network.auto.tfvars.json`

Edit the JSON file to modify CIDR blocks:

```json
{
  "network_configuration": {
    "network_configuration_categories": {
      "hub": {
        "vcns": {
          "VCN-FRA-LZP-HUB-KEY": {
            "cidr_blocks": ["10.1.0.0/21"]
          }
        }
      },
      "prod": {
        "vcns": {
          "VCN-FRA-LZP-P-PLATFORM-OKE-KEY": {
            "cidr_blocks": ["10.1.80.0/21"]
          }
        }
      }
    }
  }
}
```

**Note**: Carefully locate and modify only the specific CIDR blocks you need to change as it's easy to make mistakes

### 7.2 Scale Worker Nodes

**File**: `workload-extensions/oke/simple/single-stack/oke_workers.auto.tfvars.json`

```json
{
  "node_pools_configuration": {
    "node_pools": {
      "NP-FRA-P-PLATFORM-OKE-01-KEY": {
        "size": 3,  // Changed from 1 to 3 nodes
        ...
      }
    }
  }
}
```

### 7.3 Change Instance Shape

**File**: `workload-extensions/oke/simple/single-stack/oke_workers.auto.tfvars.json`

```json
{
  "node_pools_configuration": {
    "node_pools": {
      "NP-FRA-P-PLATFORM-OKE-01-KEY": {
        "node_shape": "VM.Standard.E4.Flex",
        "node_shape_config": {
          "ocpus": 2,        // Changed from 1 to 2
          "memory": 16       // Changed from 8 to 16 GB
        },
        ...
      }
    }
  }
}
```

### 7.4 Upgrade Kubernetes Version

**File**: `workload-extensions/oke/simple/single-stack/oke_clusters.auto.tfvars.json`

```json
{
  "clusters_configuration": {
    "clusters": {
      "OKE-FRA-P-PLATFORM-KEY": {
        "kubernetes_version": "v1.32.1",  // Updated version
        ...
      }
    }
  }
}
```

**Important**: Check [OKE supported versions](https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengaboutk8sversions.htm) before upgrading.

### 7.5 Add Custom NSG Rules

**File**: `workload-extensions/oke/simple/single-stack/oke_network.auto.tfvars.json`

To add custom NSG rules, locate the NSG configuration in the JSON file and add new rules. Example for allowing SSH to workers:

```json
{
  "network_configuration": {
    "network_configuration_categories": {
      "prod": {
        "network_security_groups": {
          "NSG-PROD-WORKERS": {
            "ingress_rules": {
              "ssh_from_bastion": {
                "description": "Allow SSH from bastion",
                "protocol": "6",
                "src": "10.0.0.0/25",
                "src_type": "CIDR_BLOCK",
                "dst_port_min": 22,
                "dst_port_max": 22
              }
            }
          }
        }
      }
    }
  }
}
```

&nbsp;

## **8. Network Routing Details**

Understanding the routing is critical for troubleshooting connectivity. This deployment follows **Hub Model E** architecture where spokes have their own NAT Gateways for outbound internet access.

### 8.1 OKE Subnet Route Tables <!-- omit from toc -->

All four OKE subnets (Control Plane, Internal LB, Workers, Pods) use the same routing pattern:

```
Default Route:
  Destination: 0.0.0.0/0
  Target: NAT Gateway (NGW-PROD-OKE-KEY)
  Purpose: Outbound internet access from spoke

Hub and Other Networks Route:
  Destination: 10.0.0.0/16
  Target: DRG (DRG-FRA-LZP-HUB-KEY)
  Purpose: Access to Hub VCN and other attached networks

Service Gateway Route:
  Destination: all-services
  Target: Service Gateway (SGW-PROD-OKE-KEY)
  Purpose: Direct access to OCI services (bypasses NAT)
```

**Traffic Flow** (Longest Prefix Match):
1. **OCI Services** (`all-services`): Direct via Service Gateway - highest priority
2. **Hub & Connected Networks** (`10.0.0.0/16`): Via DRG - more specific than default
3. **Internet/External** (`0.0.0.0/0`): Via NAT Gateway - least specific, catches everything else

**Route Priority Example:**
- Traffic to `10.0.0.5` (Hub VCN): Matches `10.0.0.0/16` → Routes via DRG
- Traffic to `8.8.8.8` (Internet): Only matches `0.0.0.0/0` → Routes via NAT Gateway
- Traffic to Oracle Object Storage: Matches `all-services` → Routes via Service Gateway

**Note**: This follows **Hub Model E** architecture where spokes have their own NAT Gateways for internet access. The `10.0.0.0/16` route ensures that traffic destined for the Hub VCN or other connected networks takes the DRG path instead of going through NAT.

### 8.2 Hub Subnet Route Tables <!-- omit from toc -->

The Hub subnets are provisioned with OKE routes:

**Hub Load Balancer Subnet:**
```
Default Route:
  Destination: 0.0.0.0/0
  Target: Internet Gateway

OKE VCN Route:
  Destination: 10.0.80.0/21
  Target: DRG
  Purpose: Return traffic to OKE VCN
```

**Hub Management Subnet:**
```
Default Route:
  Destination: 0.0.0.0/0
  Target: NAT Gateway

OKE VCN Route:
  Destination: 10.0.80.0/21
  Target: DRG
  Purpose: Management access to OKE VCN
```

### 8.3 DRG Route Tables <!-- omit from toc -->

**Spoke Route Table** (for OKE VCN attachment):
- Inherits routes from route distributions
- Receives routes to Hub VCN

**Hub Route Table** (for Hub VCN attachment):
- Configured via route distributions
- Receives routes to OKE VCN (10.0.80.0/21)

### 8.4 DRG Route Distributions <!-- omit from toc -->

**Hub Route Distribution** (`IRTD-FRA-LZP-HUB-KEY`):
- Priority 30: Accept routes from OKE VCN attachment
- Imports OKE VCN routes to Hub route table

**Spoke Route Distribution** (`IRTD-FRA-LZP-SPOKE-KEY`):
- Priority 40: Accept routes from OKE VCN attachment
- Advertises OKE routes to other spokes (if any)

&nbsp;

## **9. Troubleshooting**

### Issue: Terraform Plan Shows Hundreds of Changes <!-- omit from toc -->

**Cause**: Configuration keys may have changed or been regenerated.

**Solution**:
- If this is a fresh deployment, this is expected (~200+ resources)
- If this is an update, review the plan carefully before applying
- Use `terraform plan -out=tfplan` and review the file

### Issue: OKE Cluster Creation Fails <!-- omit from toc -->

**Cause**: IAM policies may not be sufficient or VCN configuration incorrect.

**Solution**:
1. Verify IAM policies in `oke_identity.auto.tfvars.json`
2. Check that VCN-native CNI policy exists:
   ```
   PCY-P-PLATFORM-OKE-VCN-CNI
   ```
3. Verify subnet CIDRs don't overlap
4. Check NSG rules allow required traffic

### Issue: Worker Nodes Not Joining Cluster <!-- omit from toc -->

**Cause**: Network connectivity issues between workers and control plane.

**Solution**:
1. Verify NSG rules:
   - Control plane NSG allows traffic from worker subnet
   - Worker NSG allows egress to control plane
2. Check route tables have service gateway route
3. Verify worker subnet has Internet access via DRG→Hub→NAT/IGW

### Issue: Cannot Access Cluster with kubectl <!-- omit from toc -->

**Cause**: Control plane is private and not accessible from your location.

**Solution**:
1. Use a bastion host in Hub VCN
2. Configure VPN/FastConnect to Hub VCN
3. Use OCI Cloud Shell with VCN access configured
4. Or change cluster to public endpoint (not recommended for production):
   ```json
   "is_api_endpoint_public": true
   ```

### Issue: Pods Cannot Pull Images <!-- omit from toc -->

**Cause**: Pods don't have internet connectivity.

**Solution**:
1. Verify service gateway route exists in pod subnet route table
2. Check NSG rules allow egress from pods:
   ```
   Protocol: TCP
   Destination: 0.0.0.0/0
   Ports: 443
   ```
3. For non-OCI registries, verify Hub NAT Gateway is working

### Issue: Configuration Key Not Found <!-- omit from toc -->

**Cause**: Typo in configuration key or resource not created yet.

**Solution**:
1. Verify configuration keys match exactly (case-sensitive)
2. Check for typos: `DRG-FRA-LZP-HUB-KEY` vs `DRG-FRA-LZP-HUB`
3. In single-stack, all resources are created together, so this shouldn't happen unless there's a typo

### Issue: CIDR Block Conflicts <!-- omit from toc -->

**Cause**: Default CIDRs overlap with existing networks in tenancy.

**Solution**:
1. Edit the CIDR blocks in the JSON configuration files
2. Redeploy with new configuration using `terraform apply`

&nbsp;

## **10. Cleanup / Destroy**

To destroy all resources:

### Via ORM: <!-- omit from toc -->

1. Navigate to your stack in **Resource Manager**
2. Click **Terraform Actions** → **Destroy**
3. Confirm the action
4. Wait for completion (~15-20 minutes)

### Via Terraform CLI: <!-- omit from toc -->

```bash
cd /path/to/terraform-oci-modules-orchestrator
terraform destroy
```

> **⚠️ WARNING**: This will destroy **EVERYTHING**:
> - Complete OneOE Landing Zone
> - Hub VCN and all networking
> - DRG and all attachments
> - OKE cluster, node pools, and VCN
> - All compartments and IAM resources
>
> This is an irreversible operation. Ensure you have backups of any critical data.

**Cannot Selectively Delete**: Unlike multi-stack where you can destroy just the OKE resources, single-stack is all-or-nothing.

&nbsp;

## **12. Additional Resources**

- [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator)
- [CIS OKE Module Documentation](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- [OneOE Blueprint](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/one-oe)
- [OKE Documentation](https://docs.oracle.com/en-us/iaas/Content/ContEng/home.htm)
- [VCN-Native Pod Networking](https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengpodnetworking_topic-OCI_CNI_plugin.htm)
- [Hub-and-Spoke Network Topology](https://docs.oracle.com/en/solutions/hub-spoke-network/index.html)

&nbsp;

## **13. Next Steps**

After successful deployment:

1. **Configure kubectl Access** - Set up kubeconfig to access your cluster
2. **Install Add-ons** - Deploy CertManager, Metrics Server, etc.
3. **Deploy Applications** - Start deploying your workloads
4. **Configure Monitoring** - Set up OCI Monitoring and Logging for OKE
5. **Implement GitOps** - Consider ArgoCD or Flux for continuous deployment
6. **Security Hardening** - Review and tighten NSG rules based on actual traffic patterns
7. **Backup Strategy** - Configure backup policies for persistent volumes
8. **Scaling Strategy** - Configure cluster autoscaler for dynamic scaling

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
