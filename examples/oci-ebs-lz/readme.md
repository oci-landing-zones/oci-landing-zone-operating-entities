# Open LZ EBS Pattern.

Welcome to the EBS Landing Zone pattern. This pattern presents a design for an OCI landing zone for EBS.

The OCI Open EBS LZ is a secure cloud environment, designed with best practices to simplify the onboarding of EBS workloads and enable the continuous operations of their cloud resources. This reference architecture provides a Terraform-based landing zone configuration that meets the security guidance prescribed in the CIS Oracle Cloud Infrastructure Foundations Benchmark.

Before migrating your on-premises Oracle E-Business Suite (EBS) to Oracle Cloud Infrastructure (OCI) you should deploy our Open EBS LZ Landing Zone. In this solution, you will learn how to deploy a landing zone with a new tenancy which also meets the specific requirements for deploying an EBS workload. 


## **DESIGN DECISIONS**


<table>
  <tbody>
    <tr>
      <th> ID </th>
      <th align="left">DESIGN DECISION	</th>
      <th align="left"> DESCRIPTION </th>
    </tr>
    <tr>
      <td> 0  </td>
      <td align="left">Standard Landing Zone	</td>
      <td align="left">  <ul> <li>  Deploy the OCI CIS Secure Landing Zone as the foundation </p></li> <li> Extend the Landing Zone using the OCI Open LZ EBS extension pattern </li> </ul> 
    <tr>
      <td> 1 </td>
      <td align="left"> Compartments </td>
       <td align="left">  Extend the OCI Secure LZ compartment structure with additional compartments for EBS related resources: <ul> <li> <p> Parent EBS compartment </p></li><li><p>EBS Management compartment for resources such as EBS Cloud Manager </p></li> <li> <p> EBS Non-Production environments compartment </p></li><li> <p> EBS Production environment compartment</p></li>
</ul> 
    <tr>
    <tr>
      <td>2</td>
      <td align="left">Groups & Policies</td>
      <td align="left">Additional groups and associated policies are deployed to manage EBS compartment resources.
</td>
    </tr>
    <tr>
      <td>3</td>
      <td align="left">Network Structure</td>
      <td align="left">Hub and Spoke architecture is used.

</td>
    </tr>
    <tr>
      <td>4</td>
      <td align="left">Network Connectivity</td>
      <td align="left"></td>
    </tr>
   <td>5</td>
      <td align="left"> Automation </td>
      <td align="left"> The Landing Zone will be deployed using the automated OCI Secure Landing Zone deployment for the initial landing zone and extended utilizing the OCI Open Landing Zone modules with the EBS extension pattern <ul>   <li><p> 1. OCI Secure Landing Zone Terraform </p> </li>  <li><p> 2. OCI Open Landing Zone Terraform </p> </li> <li><p> 3. Additional manual configuration tasks are also required to be completed. </p> </li> 
</ul> </td>
    </tr>
  </tbody>
</table>

The following architecture diagrams show a landing zone setup for deploying Oracle E-Business Suite using EBS Cloud Manager.


## **SECURITY VIEW**

&nbsp; 
**EBS LZ pattern includes the following compartments:**
&nbsp; 
> [!NOTE]
> Compartments help you organize and control access to your resources. A compartment is a collection of related resources (such as cloud networks, compute instances, or block volumes) that can be accessed only by those groups that have been given permission by an administrator in your organization.
&nbsp;

![Compartments](diagrams/Compartments.png)

| |  | | | |
|---|---|---|---|---| 
|**ID**   |	**OP**	 |**Level**	 |	**Compartment Name**	 | **Compartment Description** |
|CMP.00   |	OP. ID.01	 |0	 |	( root) Tenancy		 | Holds tenancy global resources	 |
|CMP.01		 | OP. ID.01		 |	1		 |ebslz-security-cmp		 |Support shared central resources associated with security	 |
|CMP.02		 | OP. ID.01	 |1		 |ebslz-network-cmp		 | Support shared central resources associated with network	 |
|CMP.03		 | OP. ID.01 |	1	 |	ebslz-database-cmp		 |Support database workload resources ( can be removed if not needed)	 |
|CMP.04	 |	OP. ID.01|	1	 |	ebslz-appdev-cmp		 |Support appdev workload resources ( can be removed if not needed)	 |
|CMP.05	 |	OP. ID.02	 |	1	 |	ebslz-ebs-cmp		 |Parent EBS compartment 	 |
|CMP.06	 | OP. ID.02	| 2 	 |ebslz-ebs-mgt-cmp		 |EBS Management compartment for resources such as EBS Cloud Manager	 |
|CMP.07	 |	OP. ID.02		 |2		 |ebslz-ebs-nprod-cmp	 |	EBS Non-Production environments compartment	 |
|CMP.08	 |	OP. ID.02		 |2		 |ebslz-ebs-prod-cmp		 |EBS Production environment compartment	 |

&nbsp; 
**EBS LZ pattern includes the following groups:**
&nbsp; 
> [!NOTE]
> In Oracle Identity Cloud Service, groups are the links between user accounts and applications.
&nbsp; 


![Groups](diagrams/Groups.png)

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **Group Name**	| **Group Description** |
|GRP.01|	OP#01|	ebslz-cost-admin-group	|CIS Landing Zone group for Cost management|
|GRP.02|	OP#01|	ebslz-security-admin-group|	CIS Landing Zone group for security services management|
|GRP.03|	OP#01|	ebslz-auditor-group	|CIS Landing Zone group for auditing the tenancy|
|GRP.04|	OP#01|	ebslz-database-admin-group	|CIS Landing Zone group for managing databases|
|GRP.05|	OP#01|	ebslz-appdev-admin-group	|CIS Landing Zone group for managing app development related services|
|GRP.06|	OP#01|	ebslz-storage-admin-group	|CIS Landing Zone group for storage services management|
|GRP.07|	OP#01|	ebslz-cred-admin-group	|CIS Landing Zone group for managing users credentials in the tenancy|
|GRP.08|	OP#01|	ebslz-announcement-reader-group	|CIS Landing Zone group for reading Console announcements|
|GRP.09|	OP#01|	ebslz-iam-admin-group|	CIS Landing Zone group for managing IAM resources in the tenancy|
|GRP.10|	OP#02|	ebslz-ebs-mgt-admin-group	|EBS Management admin group for resources in the EBS Management compartment|
|GRP.11|OP#02|ebslz-ebs-nprod-admin-group	|EBS Non-Production admin group for resources in the EBS Non-Production compartment|
|GRP.12|	OP#02|	ebslz-ebs-prod-admin-group|	EBS Production admin group for resources in the EBS Production compartment|

&nbsp; 
**EBS LZ pattern includes the dynamic groups:**
&nbsp; 
> [!NOTE]
> Dynamic groups allow you to group Oracle Cloud Infrastructure compute instances as "principal" actors (similar to user groups). You can then create policies to permit instances to make API calls against Oracle Cloud Infrastructure services
&nbsp; 

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **Dynamic Group Name**	| **Dynamic Group Description** |
|DG.01|	OP#01|	ebslz-database-kms-dynamic-group	|CIS Landing Zone dynamic group for databases accessing Key Management service (aka Vault service).|
|DG.02|	OP#01|	ebslz-appdev-computeagent-dynamic-group|	CIS Landing Zone dynamic group for Compute Agent plugin execution.|
|DG.03|	OP#01|	ebslz-appdev-fun-dynamic-group	|CIS Landing Zone dynamic group for application functions execution.	|
|DG.04|	OP#01|	ebslz-sec-fun-dynamic-group	|CIS Landing Zone dynamic group for security functions execution.|



&nbsp; 
**EBS LZ pattern includes the following policies:**
&nbsp; 
> [!NOTE]
> A Policy is a document that specifies who can access which Oracle Cloud Infrastructure resources that your company has, and how. A policy simply allows a group to work in certain ways with specific types of resources in a particular compartment
&nbsp; 


| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **Policy Name**	| **Policy Description** |
|POL.01|	OP#01|	ebslz-iam-admin-root-policy	|CIS Landing Zone root compartment policy for ebslz1-iam-admin-group group|
|POL.02	|OP#01	|ebslz-auditor-policy	|CIS Landing Zone root compartment policy for ebslz1-auditor-group group|
|POL.03	|OP#01	|ebslz-cost-admin-root-policy	|CIS Landing Zone root compartment policy for ebslz1-cost-admin-group group|
|POL.04	|OP#01	|ebslz-credential-admin-policy	|CIS Landing Zone root compartment policy for ebslz1-cred-admin-group group|
|POL.05	|OP#01	|ebslz-basic-root-policy	|CIS Landing Zone basic root compartment policy|
|POL.06	|OP#01	|ebslz-announcement-reader-policy	|CIS Landing Zone root compartment policy for ebslz-announcement-reader-group group|
|POL.07	|OP#01	|ebslz-security-admin-root-policy	|CIS Landing Zone root compartment policy for ebslz-security-admin-group group|
|POL.08	|OP#01	|ebslz-services-policy	|CIS Landing Zone policy for OCI services|
|POL.09	|OP#02	|ebslz-ebs-root-admin-policy	|EBS root policies|
|POL.10 |OP#02|ebslz-ebs-security-admin-policy	|EBS security-related policies|
|POL.11	|OP#02|	ebslz-ebs-network-admin-policy|	EBS network-related policies|
|POL.12	|OP#02	|ebslz-ebs-mgt-admin-policy|	EBS policies for EBS Management compartment|
|POL.13	|OP#02	|ebslz-ebs-nprod-admin-policy|	EBS policies for EBS Non-Production compartment|
|POL.14	|OP#02	|ebslz-ebs-prod-admin-policy|	EBS policies for EBS Production compartment|

&nbsp; &nbsp; 
&nbsp; &nbsp; 

## **NETWORK VIEW**

![Network](diagrams/Networkd.png)

&nbsp; 
**EBS LZ pattern includes the following VCNs:**
&nbsp; 
> [!NOTE]
> A VCN is a customizable, software-defined network that you set up in an Oracle Cloud Infrastructure region. Like traditional data center networks, VCNs give you complete control over your network environment. A VCN can have multiple non-overlapping CIDR blocks that you can change after you create the VCN.
&nbsp; 


| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **VCN Name**	| **VCN Description** |
|VCN.01|	OP#01|	dmz-vcn	|CIS Landing Zone Hub VCN|
|VCN.02	|OP#02	|ebs-mgt-vcn	|CIS Landing Zone Spoke VCN. E-Business Suite Management VCN which will contain EBS Cloud Manager|
|VCN.03	|OP#02|	ebs-nprod-vcn	|CIS Landing Zone Spoke VCN. E-Business Suite Non-Production Environments VCN|
|VCN.04	|OP#02|	ebs-prod-vcn	|CIS Landing Zone Spoke VCN. E-Business Suite Production Environment VCN|

&nbsp; 
**EBS LZ pattern includes the following Subnets:**
> [!NOTE]
> You can segment a VCN into subnets, which can be scoped to a region or to an availability domain. Each subnet consists of a contiguous range of addresses that don't overlap with the other subnets in the VCN. You can change the size of a subnet after creation. A subnet can be public or private.
&nbsp; 


| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **Subnet Name**	| **Subnet Description** |
|SN.01|	OP#01|	dmz-outdoor-subnet	|CIS Landing Zone Hub public Subnet|
|SN.02|	OP#01|	dmz-ha-subnet	|CIS Landing Zone Hub private Subnet|
|SN.03	|OP#01	|dmz-mgmt-subnet	|CIS Landing Zone Hub public Subnet|
|SN.04|	OP#01|	dmz-indoor-subnet	|CIS Landing Zone Hub private Subnet|
|SN.05	|OP#02|	ebs-mgt-web-subnet	|CIS Landing Zone EBS Management Load Balancer Subnet|
|SN.06	|OP#02	|ebs-mgt-app-subnet	|CIS Landing Zone EBS Management Application Tier Subnet|
|SN.07|	OP#02	|ebs-mgt-db-subnet	|CIS Landing Zone EBS Management Database Tier Subnet|
|SN.08|	OP#02	|ebs-nprod-web-subnet	|CIS Landing Zone EBS Non-Production Load Balancer Subnet|
|SN.09	|OP#02	|ebs-nprod-app-subnet	|CIS Landing Zone EBS Non-Production Application Tier Subnet|
|SN.10	|OP#02|	ebs-nprod-db-subnet	|CIS Landing Zone EBS Non-Production Database Tier Subnet|
|SN.11	|OP#02|	ebs-prod-web-subnet	|CIS Landing Zone EBS Production Load Balancer Subnet|
|SN.12|	OP#02	|ebs-prod-app-subnet	|CIS Landing Zone EBS Production Application Tier Subnet|
|SN.13|	OP#02	|ebs-prod-db-subnet	|CIS Landing Zone EBS Production Database Tier Subnet|

&nbsp; 
**EBS LZ pattern includes the following Network Security groups:**
&nbsp; 
> [!NOTE]
> A network security group (NSG) provides a virtual firewall for a set of cloud resources that all have the same security posture. For example: a group of compute instances that all perform the same tasks and thus all need to use the same set of ports.
&nbsp; 

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **NSG Name**	| **NSG Description** |
|NSG.01|	OP#01|	ebslz-dmz-vcn-bastion-nsg	|CIS Landing Zone Hub bastion NSG|
|NSG.02	|OP#01|	ebslz-dmz-vcn-services-nsg|	CIS Landing Zone Hub service NSG|

&nbsp; 
**EBS LZ pattern includes the following Route Tables:**
&nbsp; 
> [!NOTE]
> A collection of RouteRule objects, which are used to route packets based on destination IP to a particular network entity.
&nbsp; 
 
| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **TR Name**	| **TR Description** |
|RT.01	|OP#01	|ebslz-dmz-mgmt-subnet-rtable	|CIS Landing Zone Hub Subnet Route Table|
|RT.02	|OP#01	|ebslz-dmz-indoor-subnet-rtable	|CIS Landing Zone Hub Subnet Route Table|
|RT.03	|OP#01	|ebslz-dmz-ha-subnet-rtable	|CIS Landing Zone Hub Subnet Route Table|
|RT.04	|OP#01	|ebslz-dmz-outdoor-subnet-rtable	|CIS Landing Zone Hub Subnet Route Table|
|RT.05	|OP#02	|ebslz-mgt-web-subnet-rtable	|EBS Open LZ Extension EBS Management Load Balancer Subnet Route Table.|
|RT.06	|OP#02	|ebslz-mgt-app-subnet-rtable	|EBS Open LZ Extension EBS Management Application Tier Subnet Route Table.|
|RT.07	|OP#02	|ebslz-mgt-db-subnet-rtable	|EBS Open LZ Extension EBS Management Database Tier Subnet Route Table.|
|RT.08	|OP#02	|ebslz-nprod-web-subnet-rtable	|EBS Open LZ Extension EBS Non-Production Load Balancer Subnet Route Table.|
|RT.09	|OP#02	|ebslz-nprod-app-subnet-rtable	|EBS Open LZ Extension EBS Non-Production Application Tier Subnet Route Table.|
|RT.10	|OP#02	|ebslz-nprod-db-subnet-rtable	|EBS Open LZ Extension EBS Non-Production Database Tier Subnet Route Table.|
|RT.11	|OP#02	|ebslz-prod-web-subnet-rtable	|EBS Open LZ Extension EBS Production Load Balancer Subnet Route Table.|
|RT.12	|OP#02	|ebslz-prod-app-subnet-rtable	|EBS Open LZ Extension EBS Production Application Tier Subnet Route Table|
|RT.13	|OP#02	|ebslz-prod-db-subnet-rtable	|EBS Open LZ Extension EBS Production Database Tier Subnet Route Table|

&nbsp; 
**EBS LZ pattern includes the following Security Lists:**
&nbsp; 
> [!NOTE]
> A security list consists of a set of ingress and egress security rules that apply to all the VNICs in any subnet that the security list is associated with. This means that all the VNICs in a given subnet are subject to the same set of security lists
&nbsp;

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **SL Name**	| **SL Description** |
|SL.01	|OP#01|	ebslz-dmz-vcn-indoor-subnet-security-list	|CIS Landing Zone Hub Subnet Security List	|
|SL.02	|OP#01|	ebslz-dmz-vcn-outdoor-subnet-security-list	|CIS Landing Zone Hub Subnet Security List	|
|SL.03	|OP#01|	ebslz-dmz-vcn-mgmt-subnet-security-list	|CIS Landing Zone Hub Subnet Security List	|
|SL.04	|OP#01|	ebslz-dmz-vcn-ha-subnet-security-list	|CIS Landing Zone Hub Subnet Security List	|
|SL.05	|OP#02|	ebslz-mgt-web-subnet-security-list	|EBS Open LZ Extension EBS Management Load Balancer Subnet Security List	|
|SL.06	|OP#02|	ebslz-mgt-app-subnet-security-list	|EBS Open LZ Extension EBS Management Application Tier Subnet Security List	|
|SL.07	|OP#02|	ebslz-mgt-db-subnet-security-list	|EBS Open LZ Extension EBS Management Database Tier Subnet Security List	|
|SL.08	|OP#02|	ebslz-nprod-web-subnet-security-list	|EBS Open LZ Extension EBS Non-Production Load Balancer Subnet Security List	|
|SL.09	|OP#02|	ebslz-nprod-app-subnet-security-list	|EBS Open LZ Extension EBS Non-Production Application Tier Subnet Security List	|
|SL.10	|OP#02|	ebslz-nprod-db-subnet-security-list	|EBS Open LZ Extension EBS Non-Production Database Tier Subnet Security List	|
|SL.11	|OP#02|	ebslz-prod-web-subnet-security-list	|EBS Open LZ Extension EBS Production Load Balancer Subnet Security List	|
|SL.12	|OP#02|	ebslz-prod-app-subnet-security-list	|EBS Open LZ Extension EBS Production Application Tier Subnet Security List	|
|SL.13	|OP#02|	ebslz-prod-db-subnet-security-list	|EBS Open LZ Extension EBS Production Database Tier Subnet Security List	|

&nbsp; 
**EBS LZ pattern includes the following Gateways:**
&nbsp; 

**Internet Gateway**
&nbsp; 
> [!NOTE]
> Internet Gateway is used to access the internet from a VCN (say, network) in Oracle Cloud Infrastructure. It supports connections initiated from within the VCN (egress) and connections initiated from the internet (ingress)
&nbsp;

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **IG Name**	| **IG Description** |
|IG.01|	OP#01|	ebslz-dmz-vcn-igw | IG in the Hub VCN |


**Nat Gateway**
&nbsp; 
> [!NOTE]
> NAT gateway gives private subnet access to the Internet without assigning the host a public IP address. It only enables outbound connections to the private subnets like performing patches, updates, or just resources that need general internet connectivity outbound.
&nbsp;

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **NG Name**	| **NG Description** |
|NG.01|	OP#01|	ebslz-dmz-vcn-natgw | NG in the Hub VCN |


**Service Gateway**
&nbsp; 
> [!NOTE]
> A service gateway lets your virtual cloud network (VCN) privately access specific Oracle services without exposing the data to the public internet. No internet gateway or NAT gateway is required to reach those specific services. The resources in the VCN can be in a private subnet and use only private IP addresses.
&nbsp;

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **SG Name**	| **SG Description** |
|SG.01|	OP#01|	ebslz-dmz-vcn-sgw | SG in the Hub VCN |
|SG.02|	OP#02|	ebslz-mgt-vcn-sgw | SG in the mgt spoke VCN |
|SG.03|	OP#02|	ebslz-prod-vcn-sgw | SG in the prod spoke VCN |
|SG.04|	OP#02|	ebslz-nprod-vcn-sgw | SG in the nprod spoke VCN |


**DRG**
&nbsp; 
> [!NOTE]
> A DRG acts as a virtual router, providing a path for traffic between your on-premises networks and VCNs, and can also be used to route traffic between VCNs. Using different types of attachments, custom network topologies can be constructed using components in different regions and tenancies.
&nbsp;

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **DRG Name**	| **DRG Description** |
|DRG.01|	OP#01|	ebslz-drg | DRG deployed by CIS LZ |


**DRG Attachments**
&nbsp; 
> [!NOTE]
> A DRG attachment serves as a link between a DRG and a network resource. A DRG can be attached to a VCN, IPSec tunnel, remote peering connection, or virtual circuit. For more information, see Overview of the Networking Service.
&nbsp;

| |  | | | 
|---|---|---|---| 
|**ID**   |	**OP**	 | **DRG Attachment Name**	| **Attachments Description** |
|DRGA.01|	OP#01|	ebslz-dmz-vcn-drg-attachment| DRG Attachment deployed by CIS LZ |
|DRGA.02|	OP#02|	ebslz-mgt-vcn-drg-attachment| DRG Attachment deployed by EBS LZ extension |
|DRGA.03|	OP#02|	ebslz-prod-vcn-drg-attachment| DRG Attachment deployed by EBS LZ extension|
|DRGA.04|	OP#02|	ebslz-nprod-vcn-drg-attachment| DRG Attachment deployed by EBS LZ extension|


## **RUNTIME VIEW**

The Open EBS LZ pattern includes these three operations:

| |  | |
|---|---|---| 
| ID | Description | Time | 
| **[OP. ID.01](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/examples/oci-ebs-lz/op01-deploy-CIS)** | Deploy CIS. Cover Core network resources ( hub VCN), Core IAM resources (compartments, group, policies), and security services | 5' configuration + 10' deployment | 
| **[OP. ID.02](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/examples/oci-ebs-lz/op02-deploy-Open-EBS-pattern)**| Deploy EBS extension. Include EBS network resources (spokes VCNs, Table Routes, Security Lists ), IAM EBS resources ( groups, policies) |  5' configuration + 10' deployment | 
| **[OP. ID.03]([https://github.com/paolajuarezgomez/OpenLZ/tree/master/examples/oci-ebs-lz/op02_deploy_Open_EBS_pattern]([https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/examples/oci-ebs-lz/op03-manual-changes)**| Manual changes |   5'| 
 

&nbsp; 
