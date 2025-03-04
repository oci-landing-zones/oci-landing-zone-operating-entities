
# **[OCI Cross Tenancy Remote Peering Connection configuration](#)**
## **An OCI Open LZ [Addon](#) to setup the cross tenancy remote peering conection uisng IaC**

&nbsp; 

&nbsp;

## **Overview**
This configuration enables to establish connectivity between two regions in same tenancy and across multiple tenancies, managed by a central network team. It includes all necessary RPC configurations, such as policy creation, RPC setup, and connection establishment. This approach ensures consistency, simplifies administration, and eliminates the complexity of managing RPC across multiple OCI tenancies.

This document provides configuration views for the following use cases:
- Multi-Tenancy-RPC: Establishes a remote peering connection between the same or different regions across multiple tenancies.
- Single-Tenancy-RPC: Establishes a remote peering connection between two regions within a single tenancy.


&nbsp;

### OCI multi tenancy RPC resources

| Resource | Description |
| - | - |
| [IAM Policies](https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policies.htm) | A set of policies is required to establish connectivity between two tenancies. These policies authorize and admit connectivity from different tenancies, ensuring secure and controlled access to networking resources. |
| [Remote Peering Connection (RPC)](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/drg-rpc-create.htm#drg-rpc-create) | A Remote Peering Connection (RPC) must be created in both tenancies to establish connectivity between them. This involves configuring a dynamic routing gateway (DRG) in each tenancy and setting up the necessary peerings. |


&nbsp;

### OCI X Tenancy RPC Setup
This guide provides step-by-step instructions for setting up a cross-tenancy Remote Peering Connection (RPC) in OCI. By following this guide, organizations can securely establish network connectivity between multiple tenancies, enabling seamless interconnectivity for distributed workloads. 

&nbsp;

## 1. Multi-Tenancy-RPC
&nbsp;
Configuration details:
  - Primary/Shared Hub tenancy conisits of the following resources and components
    - Dynamic Routing Gateway (DRG) and Remote Peering Connection (RPC)
    - IAM policy (Acceptor) statements to accept the remote peering connection from other/spoke tenancy. 
  - Child/Spoke Tenancy conisits of the following resources and components
    - Dynamic Routing Gateway (DRG) and Remote Peering Connection (RPC)
    - IAM policy (Requestor) statements to request the remote peering connection to the Primary/Shared Hub tenancy. 

<img src="images/x-tenancy.png" width="900" height="value">

&nbsp;

#### DNS configuration with On-Premise connectivity:
In addition to the above configuration, the following setup includes forwarding rules for On-Premises DNS zones in both - the Spoke VCNs and the Hub VCN. These rules direct queries to a Network Load Balancer (NLB), which serves as the target for forwarding. The On-Premises DNS servers are configured as backends for the DNS NLB.

<img src="images/x-tenancy.png" width="900" height="value">


&nbsp;

&nbsp;

### 1.1 Single-Region: DNS query animation

These animations illustrate the DNS query and response within Hub & Spoke, and covers the following scenarios:

#### Scenario 1: DNS resolution within the same Spoke VCN
- The **web01-p.ssnpweb.vcnprod.oraclevcn.com** instance in Prod Spoke VCN performs *nslookup* to retrieve an IP address of the **db01-p.ssnpdb.vcnprod.oraclevcn.com** database instance, which is located in the same Spoke VCN but in a different subnet.
- Prod VCN resolver evaluates the query based on the [VCN DNS Resolver processing order](#VCN-DNS-Resolver-processing-order) as follows:<br>
   ⓵ **Associated Private Views** - Since no Private view is associated with the Prod VCN resolver, it proceeds to the next step.<br>
   ⓶ **Default Private View** - The default private view contains a DNS record for the database, so the resolver retrieves the record.
- The Prod VCN resolver returns the DNS response to **web01-p**.

<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/addons/oci-private-dns/withinspoke.gif" width="800" />

&nbsp;

#### Scenario 2: Spoke to Spoke DNS resolution
- The **web01-p.ssnpweb.vcnprod.oraclevcn.com** in prod Spoke VCN performs *nslookup* to retrieve the IP address of **web02-pp.ssnppweb.vcnpreprod.oraclevcn.com**, located in the preprod Spoke VCN.
- Prod VCN resolver evaluates the query based on the [VCN DNS Resolver processing order](#VCN-DNS-Resolver-processing-order) as follows:<br>
   ⓵ **Associated Private Views** - Since no Private view is associated with the Prod VCN resolver, it moves to the next option.<br>
   ⓶ **Default Private View** – This view contains only DNS records specific to the Prod VCN. Since the resolver does not have a record for **web02-pp**, it proceeds to the next step.<br>
   ⓷ **Forwarding Rules** – The resolver identifies a forwarding rule for **oraclevcn.com**, directing the query to the **hub_dns_listener** through the **p_dns_forwarder** in the Prod Spoke VCN.
- The Hub VCN Resolver has all DNS data/records from the **Associated Private views**, processes the query and returns the DNS response to **web01-p** in the Prod Spoke VCN.

<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/addons/oci-private-dns/spoke2spoke.gif" width="800" />

&nbsp;

## 2. Multi-Region: Private DNS configuration view
Configuration details:
  - Each Hub VCN in a given region consists of the following resources and components:
    - Forwarding (**hub_dns_forwarder-1 and 2**) and Listening (**hub_dns_listener-1 and 2**) endpoints.
    - The Hub VCN Resolver is associated with Private views for both - the Hub and Spoke VCNs, allowing it to store and resolve all DNS records across the three VCNs within the Hub and Spoke architecture.
    - Conditional Forwarding Rules in the Hub VCN resolvers ensure that region-specific DNS zones are forwarded to the appropriate region.
  - In each region, Spoke VCN Resolvers include:
    - Forwarding Endpoints: p_dns_forwarder-1 and p_dns_forwarder-2.
    - Conditional forwarding rules that direct queries for **oraclevcn.com**, **oraclecloud.com** and **oci.customer-oci.com** domains to the respective  **hub_dns_listener-1 or 2** for resolution.
  
&nbsp;
<img src="images/multi-region.png" width="900" height="value">

&nbsp;

&nbsp;

### 2.1 Multi-Region: DNS query animation
**Spoke to Spoke DNS Resolution across different regions:**

- The **web01-p.ssnpweb.vcnprodregion1.oraclevcn.com** in Spoke VCN (Region-1) performs *nslookup* to get an IP address of the **web02-p.ssnpweb.vcnprodregion2.oraclevcn.com** located in Region-2 inside Prod VCN.
- Prod VCN resolver evaluates the query based on the [VCN DNS Resolver processing order](#VCN-DNS-Resolver-processing-order) as follows:<br>
    ⓵ **Associated Private Views** - Since no private view is associated with the Prod VCN Resolver, it proceeds to the next step.<br>
    ⓶ **Default Private View** - This view contains only DNS records specific to the local VCN. Since the resolver does not have a record for **web02-p** in Region-2, it moves to the next step.<br>
    ⓷ **Forwarding Rules** – A forwarding rule for **oraclevcn.com** is found, directing the DNS query to **hub_dns_listener-1** through **p_dns_forwarder-1** endpoint, and subsequently to the Hub VCN Resolver in Region-1. 
- A Hub VCN Resolver in Region-1 evaluates the query based on the [VCN DNS Resolver processing order](#VCN-DNS-Resolver-processing-order) as follows:<br>
    ⓵ **Associated Private Views** - These views do not contain records for the **vcnprodregion2.oraclevcn.com** subdomain, so it moves to the next step.<br>
    ⓶ **Default Private View** - This view contains only region-specific VCN records, so it proceeds to the next step.<br>
    ⓷ **Forwarding Rules** - A rule for **vcnprodregion2.oraclevcn.com** is found, forwarding the DNS query to **hub_dns_listener-2** via **hub_dns_forwarder-1**. Which then sends it to the Hub VCN Resolver in Region-2. 
- Hub VCN Resolver in Region-2 has the required DNS records from all the **Associated Private views**, and returns the IP address of **web02-p** as the DNS response.

<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/addons/oci-private-dns/multi-region.gif" width="1000" />

&nbsp;

> [!NOTE]
>OCI services such as Autonomous Databases, Oracle Analytics, Streaming, Object Storage, and others support Private Endpoints. These services have automatically generated DNS records within Oracle-owned public domains, such as:
>- oraclecloud.com
>- oci.customer-oci.com
>
> When a Private Endpoint is created for one of these services, an additional DNS record is automatically added to the Default Private View of the specific VCN where the endpoint's subnet resides. This allows the private IP address of the endpoint to be resolved within the VCN.<br>
> For simplicity, these domains are not explicitly depicted in Forwarding Rules within the animations but are included in the configuration views.
>
> Note that the animations are visual representations designed to simplify the understanding of DNS behavior and do not necessarily reflect the internal implementation of OCI.

&nbsp;

#### Summary
This Private DNS configuration in a Hub and Spoke architecture ensures that all VCN-internal and Internet-specific DNS queries are handled by their respective VCN Resolvers. Meanwhile, Oracle-specific domains, On-Premises zones, and custom-created domains are handled and managed by the Hub VCN Resolver. This approach optimizes DNS management and supports a consistent, scalable architecture across OCI environments, in both single-region and multi-region deployments.



&nbsp; 

#### License
Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
