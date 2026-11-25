# One-OE contribution traceability

This document provides traceability for the One-OE contributions described in the [main ENS High guidance](../README.md).

For the One-OE design and runtime documentation, see the [One-OE blueprint directory](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe).

The following [table](#detailed-technical-control-design-matrix) lists the measures to which One-OE contributes, the blueprint's technical contribution, and the customer evidence required to complete the trace. Measures to which One-OE does not contribute are grouped [below](#measures-to-which-one-oe-does-not-contribute). The table identifies technical contributions only; it does not demonstrate implementation, effectiveness, ENS compliance, or certification.


## Detailed technical control design matrix

### Contribution scope

These labels describe only the One-OE blueprint:

- **Contributes:** The blueprint provides a technical capability supporting an identifiable part of the ENS measure. Customer governance, configuration, operational controls, or additional services may still be required to complete the measure.
- **Does not contribute:** The blueprint does not provide a direct technical control for the ENS measure. General IaC provenance, network integration points, and OCI platform capabilities outside One-OE do not count as a blueprint contribution. The measure must be addressed through customer processes and/or services and configuration outside the blueprint.

| ENS measure | One-OE coverage | One-OE foundation | One-OE add-ons | Optional OCI configuration | Manual customer responsibility and limitation |
|---|---|---|---|---|---|
| `op.pl.2` Security architecture | Contributes | Parent/child compartments, segregated administrative groups, VCN topology, and shared network and security elements. See the [One-OE design overview](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/blueprints/one-oe/design/readme.md). | [Network Hub Models](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models), where selected. | — | Produce, protect, and approve the system architecture, interfaces, asset model, threat model, and lines of defence. |
| `op.acc.1` Identification | Contributes | Identity Domain, IAM groups, and policies support OCI identity and access boundaries. | — | Identity federation, where selected. | Manage distinct identities by role, the joiner/mover/leaver lifecycle, account disablement and retention, and authorised-user lists. |
| `op.acc.2` Access requirements | Contributes | IAM groups, policies, and compartments support explicit, least-privilege access boundaries. | [TBAC](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-tbac) for scalable tag-based project access policies. | — | Assign and document resource owners; define and enforce individual operation privileges; protect workload operating systems and configuration artefacts; review workload policies. |
| `op.acc.3` Segregation of functions and tasks | Contributes | Dedicated IAM administrative groups and compartment-scoped policies establish role and access boundaries. | — | — | Enforce two-person control for critical tasks; prevent development/operations, authorisation/control, configuration/maintenance, and audit/other role combinations; review group membership and policies. |
| `op.acc.4` Access-rights management process | Contributes | IAM groups, policies, and compartments support explicit authorisation, least privilege, and need-to-know boundaries. | [TBAC](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-tbac) for scalable tag-based project access policies. | Bastion for controlled administrative remote access, where selected. | Assign and document resource owners; define, approve, change, revoke, and periodically recertify access; establish an explicitly authorised remote-access policy. |
| `op.acc.5` Authentication (external users) | Contributes | Identity Domain provides an OCI authentication foundation that can support external identities; external-user onboarding and required factors are not configured by One-OE. | — | Identity federation and MFA, where selected. | Verify and register external users before issuing credentials; configure and enforce ENS-appropriate authentication, credential custody, rotation and revocation, rate limits, access logging, and external-user assurance. |
| `op.acc.6` Authentication (organisation users) | Contributes | Identity Domain structure and IAM policies support organisational identities and administrative access boundaries. | — | Identity federation, MFA, and Bastion for controlled administrative access, where selected. | Enforce ENS-appropriate authentication, credential lifecycle, rate limits, and access logging; authorise, encrypt, time-limit, and audit remote access; apply reauthentication and idle-credential suspension where required. |
| `op.exp.1` Asset inventory | Contributes | Compartments, tags, and OCI resource inventory support. | — | — | Maintain an authoritative inventory of each asset, its nature, and owner; include workload, SaaS, endpoint, and non-OCI assets; reconcile it regularly; apply criticality, continuous discovery, and software-component inventory where required. |
| `op.exp.2` Secure configuration | Contributes | IAM policies, network security rules, and Security Zones implement selected least-privilege and preventive OCI settings; IaC makes these configurations reproducible. | — | — | Approve and maintain secure baselines: remove default credentials, disable unnecessary functions, and securely configure workload VMs, including accounts, patching, and malware protection. |
| `op.exp.3` Security-configuration management | Contributes | IAM policies restrict changes to OCI controls; Security Zones deny selected noncompliant operations, and Cloud Guard detects selected configuration risks. | — | — | Maintain authorised baselines, minimum functionality, and least privilege; restrict edits; verify unauthorised changes; retain authorised-service lists and configuration backups. |
| `op.exp.4` Security maintenance | Contributes | VSS host scanning and Cloud Guard findings. | — | — | Monitor manufacturer advisories; prioritise and apply patches; authorise maintenance; test in pre-production and prepare reversal. |
| `op.exp.7`, `op.mon.3` Incident management and vigilance | Contributes | Cloud Guard findings, Events, and Notifications support security-event detection and collection. | [Database Observability](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-db-observability), for database workloads. | — | Define the incident process, on-call triage, evidence, reporting, event correlation, and response testing; verify detector coverage and effectiveness. |
| `op.mon.2` Security metrics | Contributes | Cloud Guard findings and the load-balancer Monitoring alarm provide limited security and operational telemetry; One-OE does not define ENS-wide metrics. | — | Customer-defined security and incident metrics, where configured outside One-OE. | Collect and review data on the implementation of applicable security measures, incident-management effectiveness, and security-management efficiency; define the metrics, thresholds, ownership, and reporting process. |
| `op.exp.8` Activity logging | Contributes | Audit-log export to Object Storage through Service Connector Hub; VCN/subnet flow logs when enabled in the optional step; Events and Notifications. | [Database Observability](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-db-observability), for database workloads. | Central log export to a customer SIEM. | Define log-source coverage and required audit-event fields, retention, integrity, time synchronisation, authorised access, recovery tests, centralised review, and correlation/response use cases. |
| `op.exp.10`, `mp.si.2` Cryptographic-key protection and cryptography | Contributes | CIS Level 2 deploys a Vault and software key for the audit-log bucket; it does not configure workload cryptography. | — | Service-specific customer-managed-key adoption and lifecycle configuration. | Use CCN-approved cryptography; encrypt relevant data, removable media, and backups; manage key lifecycle, isolation, recovery, and cryptographic evidence. |
| `mp.com.1`, `mp.com.4`, `op.ext.4` Network perimeter, segmentation, and interconnection | Contributes | VCNs, subnets, route tables, NSGs/security lists, gateways, and controlled routing. | [Network Hub Models](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models), [Private DNS](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-private-dns), and [X-RPC](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-x-rpc), where applicable. | Service-specific private connectivity, where selected. | Authorise and document flows/interconnections, interfaces, and security/data requirements; test perimeter rules and segmentation. |
| `mp.eq.4` Other network-connected devices | Contributes | VCN segmentation and security rules can restrict traffic to OCI-connected resources; One-OE does not configure or erase the connected devices themselves. | — | — | Inventory, securely configure, and manage connected devices; control their connection/disconnection, verify security configuration, and ensure information erasure. |

## Contribution summary

| Contribution | ENS measures in the source matrix | Traceable One-OE contribution | Customer evidence to complete the trace |
|---|---|---|---|
| Contributes (4) | `op.acc.3`, `op.exp.2`, `mp.com.1`, `mp.com.4` | Segregated administrative IAM groups and compartment-scoped policies; selected IAM, network security, and Security Zone settings; VCN perimeter and segmentation controls. | Effective OCI policies and network configuration, approved IaC inputs and plan/apply records, post-deployment verification, access and segmentation tests. |
| Contributes (1) | `op.pl.2` | Compartments, IAM, VCN topology, and shared network and security elements support the system architecture. | Approved architecture, threat model, lines of defence, interfaces, and asset model. |
| Contributes (5) | `op.acc.1`, `op.acc.2`, `op.acc.4`–`op.acc.6` | Identity Domain, IAM groups, policies, and compartments support OCI identity and access boundaries; external-user authentication still needs configuration. | Identity proofing, distinct identities by role, joiner/mover/leaver processes, account disablement and retention, authorised-user lists, access approvals and recertification, MFA, authentication and remote-access records, and privileged-access procedures. |
| Contributes (6) | `op.exp.1`, `op.exp.3`, `op.exp.4`, `op.exp.7`, `op.exp.8`, `op.exp.10` | Resource inventory support, IAM and Security Zone configuration controls, VSS host scanning, Cloud Guard, audit-log export, optional Flow Logs, Notifications, and the CIS Level 2 Vault/key. | CMDB reconciliation, secure-configuration and exception records, vulnerability remediation, incident process, log coverage/retention/integrity/review, and key-lifecycle evidence. |
| Contributes (3) | `op.ext.4`, `op.mon.2`, `op.mon.3` | VCN routing and network rules support controlled interconnections; Cloud Guard findings, Events, Notifications, and limited telemetry support metrics and vigilance. | Approved interfaces and network rules, security metrics, detector coverage, on-call triage, event correlation, and periodic reviews. |
| Contributes (2) | `mp.eq.4`, `mp.si.2` | VCN rules restrict traffic to OCI-connected resources; the CIS Level 2 Vault and key support encryption of the audit-log bucket. | Device inventory and configuration, secure erasure, approved cryptography, key management, and validation of the bucket's encryption configuration. |

The six contribution rows classify 21 distinct measures as Contributes (4 + 1 + 5 + 6 + 3 + 2 = 21). One-OE does not contribute directly to the remaining 52 measures, which must be addressed through organisational, physical, supplier, endpoint, application, or workload controls.

## Measures to which One-OE does not contribute

The following groups complete the 73-measure matrix. One-OE does not contribute directly to these 52 measures; the customer must address them through the stated control domain and retain the applicable evidence.

| Control domain | ENS measures | Customer responsibility and evidence |
|---|---|---|
| Risk and planning | `op.pl.1`, `op.pl.3`–`op.pl.5` | Formal risk analysis, acquisition and capacity planning, component assurance, approvals, and reviews. |
| Change management | `op.exp.5` | Approved change requests, security impact assessments, pre-production tests, implementation records, and rollback plans. |
| Incident records | `op.exp.9` | Incident register classified by type, reports, actions, preserved evidence, chain of custody where required, and lessons learned. |
| Intrusion detection | `op.mon.1` | IDS/IPS deployment, detector scope and rules, alert handling, response procedures, and test evidence. Optional OCI Network Firewall models require customer-defined and verified IDS/IPS rules; Cloud Guard findings alone do not establish IDS/IPS coverage. |
| Agreements and supply chain | `op.ext.1`–`op.ext.3` | Contracts/SLA, supplier risk and continuity, support processes, and operational records. |
| Cloud services | `op.nub.1` | Provider and service assurance, certification, data jurisdiction, cryptography, testing, and configuration evidence against applicable CCN guidance. |
| Continuity | `op.cont.1`–`op.cont.4` | BIA, RTO/RPO, continuity and recovery plans, recovery capacity, periodic tests, and corrective actions. |
| Governance | `org.1`–`org.4` | Security policy, regulations, procedures, authorisation process, ownership, and approvals. |
| Physical security | `mp.if.1`–`mp.if.7` | Provider assurance evidence and physical controls under the customer's management, where applicable. |
| Personnel | `mp.per.1`–`mp.per.4` | Job-role definition, obligations, awareness, training, and evidence of completion. |
| Endpoint and malware protection | `op.exp.6`, `mp.eq.1`–`mp.eq.3` | Endpoint controls plus antimalware/EDR configuration, operation, and evidence. |
| Confidentiality, integrity, and authenticity of communications | `mp.com.2`, `mp.com.3` | Encrypted channels, approved algorithms and certificates, peer authentication, and verification. |
| Media handling | `mp.si.1`, `mp.si.3`–`mp.si.5` | Media marking, custody, transport, destruction, and related evidence. |
| Secure software | `mp.sw.1`, `mp.sw.2` | Secure-development controls, acceptance criteria, and production-readiness evidence. |
| Information handling and backups | `mp.info.1`–`mp.info.6` | Personal-data handling, information classification, e-signatures, time-stamps, document cleaning, backups, and restore evidence. |
| Web services and denial-of-service protection | `mp.s.2`, `mp.s.4` | Application-layer security, web testing, DoS/DDoS prevention and response, and provider coordination. |
| Email and browsing | `mp.s.1`, `mp.s.3` | Email and web-browsing protections, endpoint controls, awareness, filtering/monitoring where applicable, and evidence. |

These groups total 52 measures (4 + 1 + 1 + 1 + 3 + 1 + 4 + 4 + 7 + 4 + 4 + 2 + 4 + 2 + 6 + 2 + 2). Together with the 21 measures to which One-OE contributes above, they account for all 73 ENS Annex II measures in the source matrix.

## Audit record required for each measure

[CCN-STIC 808](https://www.ccn-cert.cni.es/es/series-ccn-stic/800-guia-esquema-nacional-de-seguridad/518-ccn-stic-808-verificacion-del-cumplimiento-de-las-medidas-en-el-ens/file?format=html) requires the system-specific assessment to distinguish applicability from audit status and implementation. For every measure in this matrix, maintain an audit record that includes:

- whether it applies, or a justification for its exclusion in the Statement of Applicability;
- whether it was audited, its implementation status/grade, and the applicable ENS reinforcements;
- any compensatory measure or complementary surveillance measure, its justification, owner, and temporary/permanent status; and
- references to approved evidence, including configuration, operational records, tests, supplier evidence, and formal approvals.

The evidence examples in this document are a starting point for audit preparation. They do not replace the measure-specific checks or the auditor's professional assessment in CCN-STIC 808.

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.
