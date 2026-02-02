# FAQ - General Questions

## General Questions

### G1. What is the OCI Open LZ?

The OCI Operating Entities Landing Zone is a set of blueprints and Infrastructure-as-Code assets designed to simplify the onboarding and management of organizations, business units, and subsidiaries on Oracle Cloud Infrastructure. It provides pre-built, secure, and scalable landing zone architectures that reduce implementation time and costs.

Check out our video series! Start with the [first episode](https://www.youtube.com/watch?v=4zCGJt1vUog&t=11s), a 13-minute introduction where we explain our approach and core concepts.

---

### G2. Who should use the OCI Open LZ?

Everyone deploying on Oracle Cloud Infrastructure can benefit from the OCI Operating Entities LZ, regardless of organization size, industry, or technical expertise. The modular and scalable design makes it suitable for a wide range of use cases, some examples include:

* Organizations starting their cloud journey who want to implement best practices from day one.
* Multi-national corporations managing multiple business units, subsidiaries, or brands.
* Service providers managing multiple customer tenancies.
* Software vendors deploying multi-tenant SaaS solutions.
* Agencies requiring strong governance and compliance frameworks.
* Cloud architects looking for OCI best practices and reference architectures.

The beauty of the OCI Open LZ is its flexibility: whether you're deploying a simple single-environment setup or a complex Multi-Tenancy architecture, the blueprints scale to your needs. Start with what fits your current requirements and grow as your organization evolves.

---

### G3. What is an Operating Entity (OE)?

An Operating Entity represents a functional division of an organization, such as a business unit, subsidiary, department, or any organizational structure that requires isolated or semi-isolated cloud resources within OCI. Each OE typically has its own environments, platforms, and projects.

---

### G4. What IaC approach does OCI Open LZ use?

The OCI Open LZ uses a declarative Infrastructure-as-Code approach with Terraform modules. The implementation is distributed across multiple specialized repositories covering IAM, networking, security, observability, and governance.

**The landing zone leverages these module repositories:**

* [OCI Landing Zones IAM](https://github.com/oci-landing-zones/terraform-oci-modules-iam) - Identity and Access Management.
* [OCI Landing Zones Network](https://github.com/oci-landing-zones/terraform-oci-modules-networking) - Network topology and connectivity.
* [OCI Landing Zones Security](https://github.com/oci-landing-zones/terraform-oci-modules-security) - Security controls and policies.
* [OCI Landing Zones Observability](https://github.com/oci-landing-zones/terraform-oci-modules-observability) - Monitoring and logging.
* [OCI Landing Zones Governance](https://github.com/oci-landing-zones/terraform-oci-modules-governance) - Governance and compliance.
* [OCI Landing Zones Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator) - Relates several OCI resources into one consolidated operation.


---

### G5. Does the landing zone comply with security best practices?

Yes, the OCI Open LZ is built on the [CIS (Center for Internet Security) Oracle Cloud Infrastructure Foundations Benchmark](https://www.cisecurity.org/benchmark/oracle_cloud), implementing industry-recognized security best practices.

**The landing zone includes:**

* Proper compartment structure for resource isolation and least-privilege access.
* Network isolation with secure VCN designs and security lists.
* Identity and Access Management (IAM) with groups, policies, and federation support.
* Security zones for policy enforcement.
* Cloud Guard and logging configurations for threat detection.
* Compliance controls aligned with common regulatory frameworks.

All blueprints follow the same CIS-based security standards. For detailed information on the security posture, threat model, and vulnerability disclosure process, review the security guide.


---

### G6. What are the infrastructure costs when deploying an OCI Landing Zone?

OCI Landing Zone blueprints cover multiple layers: IAM, Network, Security, and Observability. Most infrastructure services deployed incur minimal or no cost. By default, all included resources use free or low-cost OCI services, but optional add-ons may increase costs.

**Resources that incur additional costs:**
- **Network Firewall** - Included in Hub A and B network models
- **Load Balancers** - Included as examples in hub network models  
- **Vault** - Required for CIS v2 compliance. The option configured in our JSON security file is free, while alternative options may incur additional costs.

Actual costs depend on your configuration, the services you enable, and the workloads you deploy.


---

### G7. What is an OCI Sovereign Landing Zone?

A Sovereign Landing Zone (SLZ) is a specialized cloud environment tailored to meet strict data sovereignty, compliance, and security requirements, often mandated by government regulations or specific organizational policies. While all OCI landing zones are designed with enhanced security features, the Sovereign Landing Zone model is specifically recommended for organizations or government entities handling sensitive or regulated data. This model includes additional Sovereign Controls that ensure data remains within specified geographic or jurisdictional boundaries, reinforcing compliance with local data residency laws and regulations.

To learn more about sovereign principles, check our [dedicated asset](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-sovereign-landing-zone).

Check out our video series! We also cover this interesting topic in [Episode 4](https://www.youtube.com/watch?v=bn9gSIZ8tfU&list=PLPIzp-E1msrYh1wirCM52WO2gJBkwWe0X&index=5&t=3s)
, duration 23':30''.

---

### G8. What are the most common bad practices that you’ve seen?

Based on real-world customer engagements, the following are the most common bad practices observed.

1. Using a couple of generic compartments for all resources (or no Landing Zone).
2. Using the default Administrator (break-glass) group or root credentials for daily operations.
3. Internet breakout from spoke networks.
4. Poor network segmentation and environment isolation for workloads.
5. Internet-wide open network ports (e.g. 22, 3389, or 8080).
6. Using the default and autogenerated Security Lists / NSGs / Firewall rules and Route Tables.
7. Limited or no use of native OCI security services (e.g. Cloud Guard, Security Zones, OSMS, VSS, NFW, WAF, etc.).
8. Creating your own Terraform modules and not using the [OCI Landing Zones](https://github.com/oci-landing-zones) ones.
9. Public exposure of services and data (e.g., public Buckets, Database/OKE/Compute with public endpoints, etc.).
10. Deploying production workloads without logging, monitoring, and notifications.

By using OCI Landing Zones blueprints, these practices are avoided by design. We also recommend periodic [security health checks](https://github.com/oracle-devrel/technology-engineering/blob/main/security/security-design/shared-assets/oci-security-health-check-standard/README.md) to identify any potential misconfigurations.