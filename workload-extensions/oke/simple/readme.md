# **[OKE Landing Zone Extension](#)**   <!-- omit from toc -->
## **An OCI Open LZ [Workload Extensions](#) to Reduce Your Time-to-Production** <!-- omit from toc -->

 <img src="../../../commons/images/icon_oke.jpg" height="100">
&nbsp; 

## **1. Introduction**
Welcome to the **OKE Landing Zone Extension**.

The OKE Landing Zone Extension is a secure cloud environment, designed with the best practices to simplify the on-boarding of OKE workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone configuration.
&nbsp;

## **2. Design Overview**
This workload extension uses the [One-OE](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/one-oe) Blueprint as the reference Landing Zone and guides the deployment of OKE on top of it. Extension consists of base infrastructure layer provisioning required OCI resources for deployment of OKE and OKE deployment itself.
&nbsp;

## **3. Deployment Options**

This OKE Landing Zone Extension provides **two deployment approaches** to accommodate different use cases and architectural preferences. Both approaches use the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator) for automated dependency resolution with configuration keys.

### **Multi-Stack Deployment** ([multi-stack/](multi-stack/))

**Best for:** Adding OKE to an existing Landing Zone (OneOE, CIS LZ, etc.)

The OKE extension is deployed as a **separate Terraform stack** that integrates with your existing Landing Zone infrastructure using dependency injection through the orchestrator module. Configuration keys are exchanged between stacks to establish connectivity and dependencies.

**Architecture:**
- **Stack 1**: Existing Landing Zone (OneOE, CIS, etc.) with compartments, networking, and DRG
- **Stack 2**: OKE Extension (this deployment) attaches to existing resources

**Key Features:**
- Deploys only OKE resources (compartment, VCN, OKE cluster)
- Attaches to existing DRG and uses existing Hub infrastructure
- Separate Terraform state for clean resource boundaries
- References existing resources by configuration keys (e.g., `DRG-FRA-LZP-HUB-KEY`)

**Prerequisites:**
1. An existing OCI Landing Zone deployment with:
   - Compartment structure
   - DRG with route tables configured
   - Hub VCN with firewall/egress capabilities

**Supported Landing Zones:**
- [One-OE](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/one-oe) 
- [Multi-OE](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/multi-oe/generic_v1/runtime)

📖 **[See Multi-Stack Deployment Guide →](multi-stack/readme.md)**

---

### **Single-Stack Deployment** ([single-stack/](single-stack/))

**Best for:** Complete greenfield deployment from scratch with a *Single Click*

The OKE extension is combined with **OneOE + Hub Model E + OKE** in a **single Terraform deployment**. All resources (Landing Zone, Hub, and OKE) are provisioned together in one operation.

**Key Features:**
- All-in-one deployment: Landing Zone, Hub networking, and OKE
- Single Terraform state for all resources
- Hub and DRG routing is pre-configured out of the box
- No manual configuration for dependency exchange needed
- Complete Hub-and-Spoke topology in one deployment

**Prerequisites:**
1. OCI tenancy with appropriate permissions

**What's Included:**
- Complete OneOE Landing Zone foundation
- Hub VCN with Model E (no NGFW firewall) architecture
- DRG with route tables and distributions
- OKE VCN with all networking components
- OKE cluster with worker pools
- All IAM resources (compartments, groups, policies)

📖 **[See Single-Stack Deployment Guide →](single-stack/readme.md)**

---

### **Choosing the Right Approach**

| Consideration | Multi-Stack | Single-Stack |
|---------------|-------------|--------------|
| **Use Case** | Add OKE to existing LZ | New deployment from scratch |
| **Landing Zone** | Already exists | Created together |
| **Deployment Steps** | Deploy LZ first, then OKE extension | Single deployment operation |
| **Terraform State** | Separate (2 states) | Combined (1 state) |
| **Resource Lifecycle** | Independent | Coupled |
| **Flexibility** | Can destroy OKE separately | Must destroy everything together |
| **Complexity** | Requires key coordination | Self-contained |
| **Hub Configuration** | Manual Hub route updates | Automatic Hub route updates |

### Common Features (Both Approaches)

Both deployment options provide:
- **Automated Dependency Resolution**: Configuration keys instead of manual OCID lookups
- **CIS-Compliant OKE**: Using [CIS OKE module](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- **VCN-Native Pod Networking**: Improved performance and security
- **Comprehensive NSG Configuration**: Control plane, workers, pods, and load balancer isolation
- **Hub-and-Spoke Topology**: OKE VCN as spoke connected to Hub via DRG
- **Service Gateway**: Direct connectivity to OCI services

### Deployment Components

Both approaches deploy these resources:
- **IAM Configuration**: Compartments, groups, and policies for OKE
- **Network Infrastructure**: VCN, subnets, NSGs, route tables, service gateway, and DRG attachment
- **OKE Cluster**: Kubernetes cluster with native pod networking (v1.31.1)
- **Worker Nodes**: Compute instances for running workloads (VM.Standard.E4.Flex)

&nbsp;

## License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
