# FAQ - Decisions

## Technical Questions
## **Contents** <!-- omit from toc -->

- [**1. Security**](#1-security)
- [**2. Network**](#2-network)
- [**3. Operations**](#3-operations)

---

## 1. Security

### W1.1. Why do we have a well-defined compartment structure?
Compartments allow for the segregation of resources and access into logical structures, allowning for enforcement of best security best practices.
Compartments play key role in securing OCI tenancies due to their tight integration with OCI IAM, Policy framework and security posture management tools. A well defined compartment structure minimizes the risks of mistakes and misconfigurations.

### W1.2. Why do we separate workloads into Platforms and Projects?
In general applications fit into two categories: Platform and Projects.
Platforms examples are Kubernetes, VMWare and Exadata which are commonly used by many applications and form part of the core of the enterprise setup. Platforms usually have their own operations team and specific networking requirements.
Projects are usually smaller, separated applications or services serving a more specific purpose. Projects are crucial in enabling scaling of organizations and teams.

### W1.3. Why are there both shared and dedicated workload resources?
The majority of customer applications are environment specific based on the application development lifecycle. Separating applications into their shared and environment specific versions helps to clearly set boundaries for operational responsibility and data usage.

### W1.4. Why do Identity Domains and Groups improve tenancy security?
Most security frameworks are structured around the segregation of duties to help prevent accidental misconfiguration and limit the available attack surface. High privileged accounts should be managed separately with their own processes to enable secure and proper use.
The blueprints are aligned with industry security best practices like the CIS Benchmark.

### W1.5. Why do we use Security Zones to limit the risk of misconfiguration?
Security Zones work in alongside IAM by specifying operations that are not allowed even if the IAM permissions are granted. This minimizes risk of misconfiguration and ensures that resources in the Security Zones are protected.

### W1.6. Why do we have Network, Security, and Platform compartments both outside and inside the Environments?
Common compartments host shared services, managed centrally, which will be used across multiple environments and workloads. Examples of these shown below. 
- Network:  Hub VCN, DRG, Firewall, Load Balancers
- Security: Cloud Guard, Vaults & Keys, Security Zones
- Platforms: OKE, OCVS, ExaCS

Environment compartments host resources within the specified environment, enabling clear separation, tight access control, and effective governance.

---

## 2. Network

### W2.1. Why do we recommend the Hub & Spoke architecture model?
The Hub & Spoke network architecture enables centralized network management, enhances security, improves traffic visibility, and provides strong isolation and segmentation. It is also highly scalable, making it well suited for workload expansion without disruption.

### W2.2. Why are the Internet and NAT Gateways in the Hub VCN and not in the Spoke VCNs?
Internet and NAT Gateways are in the Hub VCN in order to centralize internet ingress and egress for all Spoke VCNs. This design enforces consistent security controls, traffic inspection, and logging. It also reduces the attack surface by preventing direct internet access to the Spoke VCNs. Centralizing gateways simplifies operations, governance, and compliance across all workload environments.

### W2.3. Why did we create the network packet flow animations on the Network Hubs?
These provide a step-by-step visualization of how the traffic traverses inside the Hub & Spoke architectures, making them an effective learning tool. They are  explanatory assets which help simplify a complex area. By making these animations publicly available, we have enabled knowledge sharing at scale.

### W2.4. Why do we have a Menu of Network Hub designs?
There is a huge number of potential Network Hub designs but there are also many common elements to the design requirements. 
The Network Hub menu provides standardization of the most common Hub designs. This enables a drastic reduction of effort and time whilst raising quality. Most importantly, the designs work. In addition, the availability of Hubs models enables us to easily tailor the relevant Hub model and address specific customer requirements.

### W2.5. Why are there custom Route Tables and Security Lists?
They provide fine-grained control over traffic routing and network security at the subnet level. This enables precise traffic flows and reduces the risk of inadvertent security exposure.

### W2.6. Why use Network Security Groups over Security Lists?
Network Security Groups provide more granular traffic filtering and control than Security Lists and enable the implementation of micro-segmentation for improved security isolation.

### W2.7. Why do we use a DRG?
The DRG simplifies network architecture by eliminating the need to configure multiple LPGs for VCN interconnection. A single DRG can interconnect hundreds of VCNs (up to 300 VCNs - local and remote). DRG routing policies allow precise control and isolation of traffic between attached networks.

---

## 3. Operations

### W3.1. Why do you provide runnable designs in JSON format?
The simple answer is that they work. They match the design in the draw.io blueprints.
They are the best tool to learn network, security and observability configuration. They are versionable which provides operational security and governance enabling configuration control.

### W3.2. Why are JSON Configurations used instead of Code?
With the experience of working with hundreds of customers across EMEA, we have learned that configuration-driven approaches scale better than custom development.
Most teams can manage JSON files. Far fewer can develop and maintain infrastructure code.
Managing Terraform code directly increases cost and complexity and it is hard to find the technical skills in the market. Our declarative JSON-based model simplifies IaC, reduces the need for specialized expertise, and enables faster deployments. All our asset blueprints, add-ons, and workload extensions use this consistent configuration approach with generic Terrafom modules, accelerating customer onboarding while maintaining control.

### W3.3. Why consider using OCI Landing Zone Terraform Modules?
The OCI Landing Zone Terraform modules are developed supported by the Oracle Product Development teams. They are standardized, aligned with CIS benchmarks, and continuously updated. They are completely generic and configuration driven enabling you to focus on your resources instead of code. By adopting them you can potentially reduce code maintenance, reduce operational risk, and get a supported, enterprise-grade foundation.

### W3.4. Why do we recommend Automation over Manual Console Deployment?
It is possible to implement our Landing Zone designs manually through the OCI Console using our reference blueprints (One-OE, Multi-OE, or Multi-Tenancy). But this does not scale and introduces operational risk.
Terraform automation lets you deploy and manage the resources in a consistent and repeatable manner. This reduces deployment time, operational costs, and manual effort while also drastically reducing the chance of human error.
For automated deployment both OCI Resource Manager (ORM) and Terraform CLI are supported and customers can adopt automation at their own pace. This can be integrated with CI/CD tools like GitHub, GitLab, and Jenkins for full IaC and enterprise-grade pipelines.

### W3.5. Why is OCI Resource Manager (ORM) sometimes preferred over Terraform CLI?
OCI Resource Manager is a managed Terraform service that securely handles state files, execution, and access control within the OCI tenancy. Actions are performed by authenticated OCI users with proper authorization, reducing security and operational risks. Terraform CLI requires external execution platforms, credential handling, and manual state management, making ORM the more secure and governed option for starting with OCI Landing Zones.

### W3.6. Why are Events and Alarms included in the OCI Operating Entities Blueprints?
Production environments require visibility. Without visibility, you can not ensure reliability, security, or operational readiness.
Our blueprints come with pre-configured events and alarms that monitor the critical core components, these can be extend further to cover your own workloads. They enable early detection, faster response times, and lower operational risk.

### W3.7. Why are VCN Flow Logs essential?
Our blueprints enable VCN Flow Logs by default because they are a fundamental security control.
Flow Logs capture traffic metadata that is needed for threat detection, traffic analysis, and to ensure security compliance. Without them, there will be limited visibility of network access which can be critical in the event of a security incident. Without the detailed forensic network evidence it will difficult to identify attackers, assess the breach scope, detect lateral movement and contain threats effectively.

### W3.8. Why do we require a dedicated Bucket for Audit Logs
The default 365 day retention of the OCI Audit Logs meets PCI DSS and ISO 27001 requirements. However, some organizations require stricter regulations like for HIPAA, SOC, FINRA or NIST 800-53.
The blueprints implement a dedicated Object Storage bucket with the appropriate Service Connector for secure, long-term audit log retention. This ensures compliance, supports audit readiness, and preserves forensic data for extended investigations.
