# **[OCI Landing Zone Subnetting Guide](#)**
## **An OCI Open LZ Addon to Tailor and Optimize Your Network Subnetting**


### Overview
Welcome to the **OCI Landing Zone Subnetting Guide**, it provides an example of subnetting for our primary Landing Zone models: ONE-OE, Multi-OE, and Multi-Tenancy. It was developed to ensure network consistency across all our assets, enabling the deployment of any of our Landing Zone models, including potential landing zone extension plug-ins. To facilitate sharing with customers and partners, the example is provided in an Excel file, accessible **here**.
&nbsp; 

### Subnetting Process
Each customer has unique requirements, so the first step is always to review their landing zone design and agree on the appropriate subnetting approach. This blueprint can be used as a proof of concept (POC) for small to medium-sized customers or as a template to guide the creation of a customized subnetting design.

Subnetting is a crucial aspect of networking in cloud environments. It involves dividing a larger address space into smaller, manageable subnetworks.

In our OCI Landing Zone models, network isolation is achieved in between environments and entities. A landing zone provides a structured, secure framework for deploying and managing cloud resources, and it typically includes network segmentation, access controls, and policies that help enforce isolation and security.

In a typical landing zone, environments like development, testing, staging, and production each have their own Virtual Cloud Networks (VCNs). Within each VCN, subnets are created to organize and allocate addresses to individual resources (such as virtual machines, databases, or other services). Subnets serve as a core mechanism within VCNs to control network traffic through Security Lists (SLs), Network Security Groups (NSGs), or Zero-Trust Packet Routing (ZPR).
When designing cloud subnets, carefully consider the specific purpose each subnet should serve. Well-planned subnets support efficient resource management, security, and operational clarity across your cloud architecture.

### Benefits of this asset

- Reduces time for Proof of Concepts (POCs).
- Provides a complete subnetting example that can be used as guidance for customers and partners.


### Examples

Example Diagram of ONE-OE Deployment with EBS and OCVS Extensions
<p align="center" width="100%">
    <img src="./content/example1.jpg">
</p>

Example Diagram of ONE-OE deployment with DR , EXACS and OKE  extension
<p align="center" width="100%">
    <img src="./content/example2.jpg">
</p>

&nbsp; 
> [!NOTE]
>It is crucial to avoid overlapping IP address ranges with on-premises or multicloud environments. Overlapping IPs can lead to several issues, such as routing conflicts, connectivity problems, network security risks, and increased management complexity. To prevent these challenges, it is essential to plan IP address spaces carefully in advance and ensure that each cloud provider's address ranges are distinct.
