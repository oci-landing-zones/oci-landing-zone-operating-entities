# **[PCI DSS Guidance for the OCI Operating Entities Landing Zone](#)**

### Overview

Oracle Cloud Infrastructure provides third-party compliance attestations for applicable cloud services, including **PCI DSS Attestation of Compliance**, as published through [Oracle Cloud Compliance](https://www.oracle.com/corporate/cloud-compliance/#attestations). These attestations can support customer compliance and reporting activities, subject to the applicable service, region, and attestation scope.

**OCI Operating Entities Landing Zone** helps customers build a security-oriented, repeatable OCI baseline for environments that may support PCI DSS workloads. It provides landing zone blueprints and infrastructure-as-code patterns for identity, networking, security services, logging, monitoring, and governance.

This guidance explains how the Operating Entities Landing Zone can support PCI DSS environment design. It is based on **PCI DSS v4.0.1** and is intended as architectural guidance only.

It is not a formal PCI DSS control matrix, Report on Compliance, Attestation of Compliance, assessment opinion, or replacement for customer scope definition, workload security, or validation with a Qualified Security Assessor, acquirer, or applicable payment brand.

Future PCI DSS releases may introduce updated requirements, testing procedures, or terminology, so customers should confirm the applicable PCI DSS version for their assessment.

&nbsp;

### What the Operating Entities Landing Zone provides

| Area | Operating Entities Landing Zone capability | Relevance to PCI DSS |
| --- | --- | --- |
| **Operating model** | [Blueprints](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints) for One-OE, Multi-OE, and Multi-Tenancy models. | Supports consistent deployment patterns across business units, subsidiaries, partners, or tenants. |
| **Resource organization** | Compartment hierarchy, ownership boundaries, naming standards, tagging, quotas, and budgets. | Helps separate PCI-scoped resources, assign ownership, and support asset and governance evidence. |
| **Identity and access** | IAM groups, policies, identity domains, dynamic groups, and separation-of-duties patterns. | Supports least privilege, role separation, and controlled access to PCI-scoped components. |
| **Network architecture** | Hub & Spoke networking, private spoke subnets, DRG, gateways, route tables, NSGs, Security Lists, and Network Firewall options. | Supports segmentation, controlled traffic flows, and isolation between PCI and non-PCI environments. |
| **Security services** | OCI Cloud Guard, Security Zones, Vulnerability Scanning, Vault, and related security controls, depending on the selected blueprint and configuration. | Provides preventive and detective controls that can support PCI DSS security objectives. |
| **Logging and monitoring** | OCI Audit, Logging, Monitoring, Events, Alarms, Notifications, and VCN Flow Logs. | Supports audit trails, monitoring, alerting, and evidence collection. |
| **Automation** | Declarative infrastructure-as-code that can be reviewed, version-controlled, approved, and repeatedly deployed. | Supports secure repeatability, change control, peer review, and configuration evidence. |


&nbsp;

### PCI DSS requirement alignment with OCI Operating Entities Landing Zone capabilities

PCI DSS v4.0.1 consists of the [12 principal security requirements and corresponding testing procedures](https://www.pcisecuritystandards.org/document_library/?category=pcidss).

The table below maps each requirement, where applicable, to the relevant OCI Operating Entities Landing Zone capabilities that can support PCI DSS implementation, especially in areas such as logical separation, network segmentation, secure configuration, access control, logging, monitoring, vulnerability management, governance, and automation.

Landing Zone capabilities must be configured, operated, and validated in the context of the customer's PCI scope, cardholder data flows, and assessment process.


| PCI DSS requirement | Relevant OCI Operating Entities Landing Zone capabilities |
| --- | --- |
| **1. Install and maintain network security controls** | Provides segmented network patterns using Hub & Spoke design, private spoke subnets, route tables, NSGs, security lists, gateways, DRG, and Network Firewall options. |
| **2. Apply secure configurations to all system components** | Provides standardized OCI baseline patterns, CIS-oriented controls, Security Zones, IAM policies, quotas, and governance guardrails. |
| **3. Protect stored account data** | Supports compartment separation, IAM controls, OCI Vault, customer-managed keys, and encryption-oriented architecture. Cardholder data storage, tokenization, masking or truncation, key rotation, and data-retention decisions remain customer responsibilities. |
| **4. Protect cardholder data with strong cryptography during transmission over open, public networks** | Supports private networking, controlled routing, service gateways, and firewall-based traffic control. TLS configuration, certificate lifecycle management, and application or workload encryption remain customer responsibilities. |
| **5. Protect all systems and networks from malicious software** | Provides indirect support through OCI Vulnerability Scanning, Cloud Guard, and security monitoring patterns that can help identify vulnerable or risky resources. |
| **6. Develop and maintain secure systems and software** | Enables reviewable, repeatable, and version-controlled infrastructure deployment through IaC, supporting controlled changes to the OCI baseline. |
| **7. Restrict access to system components and cardholder data by business need to know** | Uses compartments, IAM groups, policies, dynamic groups, and identity domains to support least privilege and separation of duties. |
| **8. Identify users and authenticate access to system components** | Provides the OCI IAM and identity-domain foundation for authentication, federation, and policy-based access. |
| **9. Restrict physical access to cardholder data** | No direct Landing Zone configuration capability. Physical security for Oracle-managed cloud facilities is addressed through Oracle compliance attestations and reports for applicable cloud services. |
| **10. Log and monitor all access to system components and cardholder data** | Provides OCI Audit, Logging, Monitoring, Events, Alarms, Notifications, and VCN Flow Logs as a logging and monitoring foundation. |
| **11. Test security of systems and networks regularly** | Supports security testing activities through vulnerability scanning, logging, monitoring, alarms, and observability patterns. |
| **12. Support information security with organizational policies and programs** | Provides governance structures such as tagging, ownership boundaries, quotas, naming standards, compartment organization, and IaC-based configuration evidence. |


&nbsp;

### Customer responsibilities

The Operating Entities Landing Zone provides a security-oriented OCI foundation, but customers remain responsible for defining, securing, operating, and validating their complete PCI DSS environment.

Customer and workload responsibilities include:

- Defining the cardholder data environment, PCI DSS scope, connected-to systems, and cardholder data flows.
- Deciding where cardholder data is stored, processed, or transmitted, including tokenization, masking, truncation, and data-retention requirements.
- Configuring and operating workload-level encryption, TLS settings, certificate lifecycle management, key rotation, and application security controls.
- Maintaining secure operating procedures, vulnerability remediation, change control, incident response, user access reviews, and evidence collection.
- Validating the environment with the appropriate assessor, acquirer, payment brand, or internal compliance process.


&nbsp;

### Compliance boundary

The OCI Operating Entities Landing Zone is a **PCI DSS-enabling architecture baseline**. It helps customers deploy OCI environments with security, segmentation, monitoring, and governance controls that can support PCI DSS objectives.

It does **not** make a customer environment PCI DSS compliant by itself. Compliance depends on the customer's complete cardholder data environment, the OCI services used, workload configuration, data flows, operating procedures, testing results, evidence, and formal validation process.

Cloud compliance follows a shared responsibility model. Oracle states that cloud security, privacy, and compliance responsibilities are shared between Oracle and the customer depending on the cloud service model, and recommends that customers formally determine whether the applicable Oracle cloud services are suitable for their own legal and regulatory compliance obligations. That determination remains the customer's responsibility.


&nbsp;

### References

- [Oracle Cloud Compliance Attestations](https://www.oracle.com/corporate/cloud-compliance/#attestations)
- [Oracle Cloud Compliance Shared Management Model](https://www.oracle.com/corporate/cloud-compliance/)
- [PCI Security Standards Council: PCI DSS](https://www.pcisecuritystandards.org/standards/pci-dss/)
- [PCI Security Standards Council: Document Library](https://www.pcisecuritystandards.org/document_library/)
- [OCI Operating Entities Landing Zone](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities)
- [OCI Operating Entities Landing Zone FAQ](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/faq)

&nbsp;

## License
Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
