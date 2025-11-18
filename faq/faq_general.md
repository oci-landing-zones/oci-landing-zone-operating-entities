# FAQ - General Questions

## General Questions

### G1. What is the OCI Open LZ?

The OCI Operating Entities Landing Zone is a set of blueprints and Infrastructure-as-Code assets designed to simplify the onboarding and management of organizations, business units, and subsidiaries on Oracle Cloud Infrastructure. It provides pre-built, secure, and scalable landing zone architectures that reduce implementation time and costs.

Check out our video series!. Start with the [first episode](https://www.youtube.com/watch?v=4zCGJt1vUog&t=11s), a 13-minute where we explain our approach and core concepts.

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

* [OCI Landing Zones IAM](https://github.com/oci-landing-zones/terraform-oci-modules-iam) - Identity and Access Management
* [OCI Landing Zones Network](https://github.com/oci-landing-zones/terraform-oci-modules-networking) - Network topology and connectivity
* [OCI Landing Zones Security](https://github.com/oci-landing-zones/terraform-oci-modules-security) - Security controls and policies
* [OCI Landing Zones Observability](https://github.com/oci-landing-zones/terraform-oci-modules-observability) - Monitoring and logging
* [OCI Landing Zones Governance](https://github.com/oci-landing-zones/terraform-oci-modules-governance) - Governance and compliance
* [OCI Landing Zones Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator) - Relates several OCI resource into one consolidated operation


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

