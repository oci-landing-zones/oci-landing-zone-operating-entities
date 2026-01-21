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

This OKE Landing Zone Extension provides **two deployment approaches**, [single-stack](single-stack/) and  [multi-stack](multi-stack/), to accommodate different use cases and architectural preferences. Both approaches use the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator) for automated dependency resolution with configuration keys.


### **Choosing the Right Approach**

| Consideration | [Single-stack](single-stack/) | [Multi-stack](multi-stack/) |
|---------------|-------------|--------------|
| **Use Case** | PoC, Exploration | Production deployment |
| **Hub Model** |  [Hub E (free)](../../../addons/oci-hub-models/hub_e/) |  [Hub A](../../../addons/oci-hub-models/hub_a/) |
| **Routing Configuration** |  Automatic Hub route updates | Manual Hub route updates |
| **Landing Zone** | Created together  | Already exists |
| **Deployment Steps** | Single deployment operation | Deploy LZ first, then OKE extension |
| **Terraform State** |  Combined (1 state) | Separate (2 states) |
| **Resource Lifecycle** | Coupled | Independent |
| **Complexity** | Self-contained | Requires key coordination across stacks |


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

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
