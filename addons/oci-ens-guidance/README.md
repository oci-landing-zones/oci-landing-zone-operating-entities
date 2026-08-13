# **[ENS High Guidance for the OCI Operating Entities Landing Zone](#)**

## 1. Overview

Oracle Cloud Infrastructure provides security, governance, identity, network, logging, monitoring, and cryptographic services that can support customers designing systems subject to Spain’s [Esquema Nacional de Seguridad (ENS)](https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191).

The ENS, regulated by [Royal Decree 311/2022](https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191), defines three security categories: Basic, Medium, and High. Under applicable law and a contractual relationship, the ENS also applies to private entities that provide services or solutions to public-sector entities in the exercise of their powers and responsibilities.

**OCI Operating Entities Landing Zone**, using the One-OE blueprint, helps customers establish a repeatable, security-oriented OCI foundation for one operating entity, its environments, platforms, and projects within a single tenancy. It provides blueprints and infrastructure-as-code patterns for compartment organisation, IAM, network segmentation, security services, logging, monitoring, governance, and selected optional controls.

This guidance explains how the One-OE landing zone can support the design of systems categorised as ENS High. It is architectural guidance for defining, deploying, verifying, and operating a customer-specific security baseline. The suitability of OCI services, regions, contractual commitments, and compliance documentation must be assessed by each customer for its system and target ENS category.

This guidance is architectural only and does not itself establish ENS conformity or certification.


## 2. Compliance boundary

The OCI Operating Entities Landing Zone is an **ENS-enabling architecture baseline**. It can help customers establish repeatable OCI foundations for compartment organisation, identity and access control, network segmentation, security monitoring, logging, governance, and selected optional security services.

This guide does **not** claim ENS conformity or certification for OCI, Oracle, a tenancy, a workload, or the One-OE blueprint. The landing zone does not make an OCI tenancy, workload, or information system ENS compliant or certified by itself.

ENS conformity depends on the complete system scope, categorisation, risk analysis, applicable measures and reinforcements, OCI services and regions used, workload configuration, data flows, operational procedures, evidence, audit results, and the applicable conformity-assessment or certification process.

ENS category is determined by the impact of a security incident on the information and services provided by the system. A system is categorised as **High** when at least one security dimension reaches the High level. The applicable Annex II measures and reinforcements must be selected according to the system assets, category, and risk-management decisions. Systems categorised as Medium or High require a certification audit to determine ENS conformity.

A control marked **IaC** in this document means that the design can be declared and deployed through a reviewed One-OE configuration. It does **not** mean that the control is enabled in every default configuration or that its deployed implementation is effective. A proposed ENS relationship is a design hypothesis for validation, not a CCN-approved control matrix.

Cloud security and compliance follow a shared-responsibility model. OCI provides cloud-service capabilities and related documentation within the applicable service scope; customers remain responsible for assessing their suitability, configuring and operating their environment and workloads, and demonstrating the effectiveness of the required controls, including HA/DR arrangements.

## 3. Customer responsibilities

The One-OE Landing Zone provides a security-oriented OCI foundation. The customer remains responsible for defining, securing, operating, and demonstrating the effectiveness of the complete information system within ENS scope.

Customer and workload responsibilities include:

- Defining the information-system boundary, assets, services, interfaces, ENS category, and applicable Annex II measures and reinforcements based on the system assets, category, and risk-management decisions.
- Designating the information, service, security, and system responsibilities; establishing the required separation of duties; and approving the security policy, governance model, roles, and procedures.
- Performing, approving, and maintaining the required risk analysis, including the formal acceptance of residual risk where required.
- Maintaining security documentation, including the Statement of Applicability, and reviewing the system categorisation at least annually and whenever significant changes affect the system or its risk profile.
- Selecting, version-controlling, deploying, and verifying the applicable One-OE options and workload-specific controls, including optional security components.
- Implementing and operating workload-level access control, authentication, privileged access, encryption, certificate and key lifecycle, secure development, patching, vulnerability remediation, and data protection, as required by the risk analysis and applicable requirements.
- Ensuring that personnel and external parties involved in the system are appropriately qualified, informed of their security duties, and trained to follow the approved security procedures.
- Defining and operating logging coverage, retention, integrity, alert handling, access reviews, incident response, exception management, and evidence collection.
- Establishing, testing, and evidencing backups, recovery, continuity, and failover arrangements in line with the system risk analysis and service requirements.
- Managing security requirements for suppliers, subcontractors, and outsourced services, including designated security contacts, contractual obligations, and supply-chain controls where applicable.
- Preparing and retaining the required evidence, undergoing regular security audits, obtaining ENS conformity certification through an audit for systems categorised as Medium or High, and meeting applicable publication requirements for ENS declarations or certifications.




## 4. What the Operating Entities Landing Zone provides

The following table distinguishes the One-OE foundation capabilities, optional LZ add-ons, and optional OCI configuration.

| [One-OE foundation capabilities](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe) | Optional LZ add-ons | Optional OCI configuration |
| --- | --- | --- |
| • Tenancy and compartment structure.<br>• IAM groups, dynamic groups, policies, and segregation of administrative roles.<br>• VCN topology, routing, security lists/NSGs, private connectivity, and optional hub-and-spoke controls.<br>• Cloud Guard targets and detector/responder recipes, including responder automation.<br>• Security Zones for preventive guardrails in designated compartments.<br>• Logging, Audit integration, flow logs, Connector Hub, events, notifications, and monitoring integration.<br>• Vault and customer-managed-key design and adoption by in-scope services.<br>• Vulnerability Scanning Service (VSS), including targets and scan recipes.<br>• Support for firewall, SIEM, and connectivity extensions.<br>• Resource tagging, inventory support, and budgets. | • [DNS controls](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-private-dns).<br>• Bastion.<br>• [Tag-Based Access Control (TBAC)](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-tbac) for scalable, role-based IAM policies assigned through OCI tags.<br>• Multi-AD/region resilience.<br>• [OCI Network Firewall or a third-party firewall hub models](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models). | • WAF, DDoS protection, and other workload-edge services.<br>• Central log export to a customer SIEM. |

> [!NOTE]
> The listed capabilities are not necessarily enabled by default; they must be selected, configured, deployed, and verified where applicable. The landing zone does not cover all ENS requirements. This includes system categorisation, risk analysis and residual-risk acceptance, organisational governance and training, workload and application security, data lifecycle and continuity arrangements, operational incident management, and conformity evidence, audit, or certification decisions. See [Customer responsibilities](#customer-responsibilities) for the activities that remain the customer's responsibility.


### 4.1 ENS High control-design matrix

The ENS measure IDs below are taken from Annex II of Royal Decree 311/2022. They show areas that the design can support; applicability, required reinforcements, and sufficiency must be determined by the system risk analysis and validated with CCN. For an ENS High system, op.pl.1 + R2 requires a formal risk analysis. The OCI One-OE landing zone provides technical safeguards that can support this analysis, but it does not replace the customer’s responsibility to perform, approve, and maintain it, as well as extensive security-architecture reinforcements for `op.pl.2`, and stronger requirements for access, logging, monitoring, cryptography, communications, continuity, and service protection. [ENS Annex II measure table](https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191)

Annex II contains 73 measures. The One-OE/IaC baseline can directly establish the technical foundation for <img src="./images/green.png" alt="Fully covered" width="16" height="16"> 5 measures, partially support <img src="./images/orange.png" alt="Partially covered" width="16" height="16"> 27 measures, and does not complete the remaining <img src="./images/red.png" alt="Not covered by the landing-zone baseline" width="16" height="16"> 41 measures.

**Coverage legend:** <img src="./images/green.png" alt="Fully covered" width="16" height="16"> Fully covered &nbsp;&nbsp; <img src="./images/orange.png" alt="Partially covered" width="16" height="16"> Partially covered &nbsp;&nbsp; <img src="./images/red.png" alt="Not covered by the landing-zone baseline" width="16" height="16"> Not covered by the landing-zone baseline

> [!NOTE]
> For every measure marked **Partially supported**, review the **Manual customer responsibility and limitation** column to identify the activities that the customer must complete.

| ENS measure | One-OE coverage | One-OE foundation | One-OE Add-ons | Manual customer responsibility and limitation |
|---|---|---|---|---|
| `op.pl.2` Security architecture | <img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | Parent/child compartments; segregated admin groups; VCN topology; shared security services.<br><br>Declares the tenancy foundation, network boundaries, and separation of administration duties. | — | Produce the system architecture, interfaces, asset model, threat model, and formally approve the architecture. |
| `op.acc.1`–`op.acc.4` Access control | <img src="./images/green.png" alt="Fully covered" width="16" height="16">`op.acc.3`<br><img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | IAM groups, dynamic groups, policies, compartments, federation option.<br><br>Implements RBAC and compartment-scoped policy structure. | — | Define joiner/mover/leaver processes, recertify access, configure identity-provider/MFA requirements, and review policies for each workload. |
| `op.acc.5`–`op.acc.6` Authentication | <img src="./images/red.png" alt="Not covered by the landing-zone baseline" width="16" height="16"> | Identity-domain/federation integration where selected.<br><br>Provides IAM integration points and policies. | — | Select and enforce the ENS-appropriate authentication mechanisms, MFA, lifecycle, external-user assurance, and privileged access process. |
| `op.exp.1` Asset inventory | <img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | Compartments, tags, resource search/inventory support.<br><br>Establishes managed structure and, where configured, tag namespaces/keys. | — | Define the authoritative CMDB/asset process; ensure coverage of workload, SaaS, endpoints, and non-OCI assets; reconcile regularly. |
| `op.exp.2`–`op.exp.5` Secure configuration and change management | <img src="./images/green.png" alt="Fully covered" width="16" height="16"> `op.exp.2`<br><img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | Version-control configuration (GitHub), Resource Manager/Terraform plan and apply.<br><br>Makes desired configuration reproducible and reviewable. | — | Establish approvals, change windows, break-glass procedure, drift review, release management, and security-baseline review. |
| `op.exp.7`, `op.mon.1`–`op.mon.3` Incident management, intrusion detection, monitoring, and vigilance | <img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | Cloud Guard targets, detector recipes, responder recipes, events, notifications.<br><br>Configures compartment scope and selected detection/response integrations. Cloud Guard targets define the monitored compartment scope and associated detector/responder recipes. | — | Tune recipes, set owners and severity handling, triage findings, investigate, preserve evidence, exercise response, and document reporting/escalation. Automatic responders require risk review before activation. |
| `op.exp.8`–`op.exp.9` Activity and incident logging | <img src="./images/green.png" alt="Fully covered" width="16" height="16"> `op.exp.8`<br><img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | Audit, service logs, VCN flow logs, Logging, Connector Hub, SIEM export.<br><br>Enables/configures selected log sources, routes, and notifications. | — | Define log source coverage, retention, integrity, time synchronisation, access restrictions, monitoring use cases, review cadence, and incident-case records. |
| `op.exp.10`, `mp.si.2` Cryptographic-key and media protection | <img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | Vault and customer-managed-key option.<br><br>Creates vault/key resources and supports their use by selected services. | — | Select approved cryptography, configure each workload/service to use the required keys, control key lifecycle and recovery, and retain cryptographic evidence. A vault alone does not encrypt every workload automatically. |
| `mp.com.1`–`mp.com.4`, `op.ext.4` Network perimeter, confidentiality/integrity, segmentation, and interconnection | <img src="./images/green.png" alt="Fully covered" width="16" height="16"> `mp.com.1`, `mp.com.4`<br><img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | VCNs, subnets, route tables, NSGs/security lists, gateways, hub-and-spoke, firewall option, private connectivity.<br><br>Declares network segmentation and controlled routing. | — | Approve flows and interconnections, configure application TLS/mTLS where required, validate exposure, manage certificates, and test segmentation. |
| `op.exp.4`, `op.exp.6` Security maintenance and malicious-code protection | <img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | VSS host/image target options; Cloud Guard.<br><br>Configures selected scan targets and visibility. OCI VSS routinely checks supported hosts and container images for vulnerabilities. | — | Patch/remediate, maintain exceptions, cover unsupported assets, establish malware protection for endpoints/workloads, and verify remediation. |
| `op.nub.1`, `op.ext.1`–`op.ext.3` Cloud services, agreements, daily management, and supply chain | <img src="./images/red.png" alt="Not covered by the landing-zone baseline" width="16" height="16"> | Version-pinned IaC sources and deployment pipeline design.<br><br>Provides a controlled technical baseline and source traceability. | — | Assess service suitability, contracts/SLA, suppliers, support process, regional/data-residency requirements, SBOM/dependency controls, and daily operations. |
| `op.cont.1`–`op.cont.4`, `mp.info.6` Continuity, alternative means, tests, and backups | <img src="./images/red.png" alt="Not covered by the landing-zone baseline" width="16" height="16"> | Optional multi-AD/region patterns; workload modules may provide service-specific options.<br><br>Provides a foundation on which resilient workloads can be built. | — | Define RTO/RPO, implement workload backups/replication/failover, ensure capacity in recovery location, conduct periodic tests, and retain evidence. OCI does not automatically deploy, replicate, or fail over customer workloads. |
| `mp.s.2`–`mp.s.4` Web-service and DDoS protection | <img src="./images/orange.png" alt="Partially covered" width="16" height="16"> | OCI default Layer 3/4 volumetric DDoS protection, Optional WAF, firewall, and edge-service extensions.<br><br>Provides optional architecture integration points. | — | Select, configure, operate, and test workload web protections, DDoS strategy, certificates, and application controls. |
| `org.*`, `mp.per.*`, `mp.if.*`, `mp.eq.*`, `mp.sw.*`, `mp.info.*` | <img src="./images/red.png" alt="Not covered by the landing-zone baseline" width="16" height="16"> | N/A.<br><br>No landing-zone implementation claim. | — | Implement governance, policies, procedures, personnel controls, physical controls, secure development, data handling, e-signature/time-stamping where applicable, and workload protections. |

#### 4.1.1 Why Cloud Guard is important, but not sufficient

Cloud Guard is a central baseline service because it can monitor compartment targets using configuration and activity detectors and can attach responder recipes. Oracle documents that targets set the monitored scope and detector recipes determine the monitoring rules; responder recipes may take corrective action automatically or with administrator intervention. [About OCI targets](https://docs.oracle.com/en-us/iaas/cloud-guard/using/targets-about.htm) · [About detector recipes](https://docs.oracle.com/en-us/iaas/Content/cloud-guard/using/detect-recipes-about.htm)

For ENS High, deployers must still define and evidence:

- the target-compartment hierarchy and exclusions;
- enabled detector rules, severity, and justified suppressions;
- responder actions, approval gates, rollback and exception handling;
- alert routing, on-call ownership, triage SLA, and incident procedures;
- periodic review of coverage and effectiveness.

Cloud Guard findings are evidence inputs, not proof of ENS conformity.

#### 4.1.2 Security Zones

Security Zones are a recommended optional preventive guardrail for compartments requiring strict resource-creation constraints. Oracle states that operations in a Security Zone are validated against its recipe and that invalid operations are denied; this includes examples such as public accessibility and customer-managed-key requirements.

Before enabling a Security Zone, the customer must define the in-scope compartment boundary, evaluate existing-resource violations, approve exception handling, and test workload compatibility. It complements, but cannot replace, application, data, operational, and governance controls.


____



## 5. Purpose

This document defines the ENS High design elements that an OCI One-OE landing zone can establish, configure, or support through Infrastructure as Code (IaC).

The document has four goals:

1. State which controls are implemented or configurable in landing-zone IaC.
2. Identify the customer’s manual and operational responsibilities from IaC.
3. Identify workload, organisational, and service-contract controls that a landing zone cannot satisfy.
4. Provide a traceable, proposed mapping to ENS measures and OCI One-OE landing-zone design elements.

OCI Operating Entities Landing Zone (OCI Open LZ) is the appropriate technical baseline: it provides One-OE, Multi-OE, and Multi-Tenancy blueprints. Oracle describes the One-OE blueprint as the option for onboarding one operating entity, its environments, platforms, and projects into one tenancy. [OCI Operating Entities Landing Zone repository](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities)





## 6. Architecture principles for ENS High

1. **Treat the landing zone as a common security foundation, not the system boundary.** Each in-scope workload must extend the baseline according to its data, interfaces, threat model, and availability requirement.
2. **Use least privilege and separation of duties.** Place network, security, IAM, and workload administration in separate roles/compartments and use narrowly scoped policies.
3. **Prefer prevention and detection together.** Security Zones can deny non-compliant resource operations; Cloud Guard detects configuration and activity concerns. Neither replaces review and response.
4. **Keep configuration reviewable.** Configuration inputs, plans, approvals, applies, and post-deployment verification are evidence. Changes must follow a controlled change process.
5. **Design logging as an evidence pipeline.** Capture the defined logs, protect access, set retention/export requirements, integrate alerts, and test retrieval. Logging enabled without review, retention, or response is insufficient.
6. **Make every exception explicit.** Security-Zone exemptions, broad IAM policies, public endpoints, disabled detector rules, or unencrypted exceptions require documented approval, owner, expiry, and compensating controls.
7. **Validate in OCI after deployment.** IaC state is evidence of intent. OCI configuration, Cloud Guard status, logs, and access tests are evidence of effectiveness.

## 7. Deployment and verification workflow

1. **Establish scope.** Record the tenancy, region(s), parent compartment, workload boundary, owners, ENS dimensions, and target category.
2. **Create the risk and architecture baseline.** Perform the formal ENS High risk analysis and identify which Annex II measures and reinforcements apply.
3. **Select One-OE options.** Document the exact repository commit/tag, Terraform/Resource Manager version, input files, optional modules, and any deviations.
4. **Review before apply.** Review Terraform plan and policy/network/security changes under the change-management process. Do not use a successful plan as evidence of effectiveness.
5. **Apply and capture evidence.** Store approved inputs, plan/apply outputs, resource inventory, and outputs in the approved evidence location.
6. **Verify in OCI.** Verify effective IAM policies, Cloud Guard targets/recipes, Security Zones, logs, flow logs, key configuration, scan targets, routes/NSGs, notifications, and SIEM connectivity as selected.
7. **Run security acceptance tests.** Test denied actions, least-privilege access, public exposure, log generation/retrieval, alert routing, responder approval/rollback, and segmentation.
8. **Operate and reassess.** Review drift, security findings, access, logging, vulnerabilities, exceptions, and changes periodically. Reassess when the system, risk profile, or ENS requirements change.

## 8. Conclusion

The OCI One-OE Landing Zone provides a configurable Infrastructure as Code foundation for an ENS High environment. It can establish core tenancy capabilities such as compartmentalisation, identity and access controls, network segmentation, logging, security monitoring, and selected optional security services.

The landing zone is the starting point, not the complete ENS implementation. Its configuration must be adapted to the scope, risk profile, and technical requirements of each customer environment and workload. Controls that require organisational processes, daily operation, application security, data protection, continuity, or user management remain the customer’s responsibility.

This document provides a practical design reference for relating OCI One-OE landing-zone elements to ENS measures. Its purpose is to help teams identify what can be established through IaC, what requires configuration or operational ownership, and where additional workload-specific controls are needed.

## 9. References

1. [Royal Decree 311/2022 — Esquema Nacional de Seguridad (consolidated text)](https://www.boe.es/buscar/act.php?id=BOE-A-2022-7191)
2. [OCI Landing Zones overview](https://docs.oracle.com/en-us/iaas/Content/cloud-adoption-framework/oci-landing-zones-overview.htm)
3. [OCI Operating Entities Landing Zone repository](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities)
4. [OCI shared responsibility model for resiliency](https://docs.oracle.com/en-us/iaas/Content/cloud-adoption-framework/oci-shared-responsibility.htm)
5. [OCI Cloud Guard targets](https://docs.oracle.com/en-us/iaas/Content/cloud-guard/using/targets-about.htm)
6. [OCI Cloud Guard detector recipes](https://docs.oracle.com/en-us/iaas/Content/cloud-guard/using/detect-recipes-about.htm)
7. [OCI Vulnerability Scanning overview](https://docs.oracle.com/en-us/iaas/Content/scanning/using/overview.htm)
