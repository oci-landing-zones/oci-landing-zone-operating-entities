# FAQ

## General Questions

1. **What is the OCI Open LZ?**
   
      The OCI Operating Entities Landing Zone is a set of blueprints and Infrastructure-as-Code assets designed to simplify the onboarding and management of organizations, business units, and subsidiaries on Oracle Cloud Infrastructure. It provides pre-built, secure, and scalable landing zone architectures that reduce implementation time and costs.

2. **Who should use the OCI Open LZ?**
   
   Everyone deploying on Oracle Cloud Infrastructure can benefit from the OCI Operating Entities LZ, regardless of organization size, industry, or technical expertise. The modular and scalable design makes it suitable for a wide range of use cases, some examples can be:

    * Organizations starting their cloud journey who want to implement best practices from day one
    * Multi-national corporations managing multiple business units, subsidiaries, or brands
    * Service providers managing multiple customer tenancies
    * Software vendors deploying multi-tenant SaaS solutions
    * Agencies requiring strong governance and compliance frameworks
    * Cloud architects looking for OCI best practices and reference architectures.
  
   The beauty of the OCI Open LZ is its flexibility: whether you're deploying a simple single-environment setup or a complex multi-tenancy architecture, the blueprints scale to your needs. Start with what fits your current requirements (Size M, L, or XL) and grow as your organization evolves. The open-source nature means you can customize every aspect to match your specific requirements while still benefiting from community-tested patterns and Oracle best practices.


3. **What is an Operating Entity (OE)?**
   
    An Operating Entity represents a functional division of an organization, such as a business unit, subsidiary, department, or any organizational structure that requires isolated or semi-isolated cloud resources within OCI. Each OE typically has its own environments, platforms, and projects.

## Assets: Blueprints, add-ons and workload extensions.

4. **Which blueprint size should I choose?**

   * Size S-M ( [one-oe](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe) ): Choose this for a single Operating Entity with its environments, platforms, and projects within one OCI tenancy. Ideal for single business units or smaller organizations.
     
   * Size L ([ multi-oe](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/multi-oe) ): Select this when you have multiple Operating Entities sharing common services while maintaining OE-dedicated resources in a single tenancy. Best for organizations with multiple business units requiring some level of isolation.

   * Size XL ([ multi-tenancy](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/multi-tenancy) ): Use this for enterprise-scale deployments spanning multiple OCI tenancies. Suitable for large organizations requiring complete isolation between Operating Entities.

5. **Can I migrate from one blueprint model to another?**
   
    Yes, migration between blueprints is possible. All blueprints are built on the same CIS best practices, share a common structure, and use the same modular building blocks, which facilitates transitions between them.
    However, migration still requires careful planning and execution. Depending on the complexity and the direction of migration (one-oe to multi-oe, one-oe to multi-tenancy, multi-oe to multi-tenancy...), you may need to:

    * Restructure compartment hierarchies
    * Reconfigure network topologies
    * Adjust IAM policies and governance controls
    * Migrate resources between compartments or tenancies

    For these reasons, it's recommended to choose the appropriate model from the start based on your organization's current and projected needs. Consider factors like governance requirements, isolation needs, growth projections, and whether you anticipate adding new Operating Entities in the near future.

6. **What's the difference between blueprints, add-ons, and workload extensions?**

   * **Blueprints**: Core landing zone architectures (one-oe,multi-oe,multi-tenancy) providing the foundational OCI structure.
   * **Add-ons**: Complementary components like network hubs models, subnetting, DNS, TBAC, etc  that enhance the base blueprint.
   * **Workload Extensions**: Specific application workloads (EBS, OCVS, AI services) that can be deployed on top of the landing zone.

## Implementation

7. **What are the prerequisites for deploying OCI Open LZ?**

   * An OCI tenancy with appropriate administrative privileges.
   * Terraform installed (version requirements specified in each blueprint).
   * Basic understanding of OCI services and concepts.
   * Familiarity with Infrastructure-as-Code principles.

8. **Can I customize the blueprints for my specific requirements?**
    Yes! The blueprints are designed to be customizable. You can modify the declarative configuration files to adjust compartment structures, network topologies, security policies, and other elements to match your organization's specific needs.
  
9. **What is the recommended deployment order?**

   * Choose the appropriate blueprint size one-oe,multi-oe or multi-tenancy.
   * Review and include relevant network add-ons (e.g., hub models, DNS, RBAC).
   * Include workload extensions as needed for specific applications.
   * Choose and approach implementation: ORM or Terraform CLI.
   * Customize your json files.
   * Try to avoid a monolotic deployment approch.
   * Deploy your Landing zone.
   * Run CIS benchmarck script to check CIS compliance.


## Technical Questions

10. **What IaC approach does OCI Open LZ use?**
    
    The OCI Open LZ uses a declarative Infrastructure-as-Code approach with Terraform modules. The implementation is distributed across multiple specialized repositories covering IAM, networking, security, observability, and governance.

    The landing zone leverages these module repositories:

      * OCI Landing Zones IAM - Identity and Access Management
      * OCI Landing Zones Network - Network topology and connectivity
      * OCI Landing Zones Security - Security controls and policies
      * OCI Landing Zones Observability - Monitoring and logging
      * OCI Landing Zones Governance - Governance and compliance

11. **Does the landing zone comply with security best practices?**
    
    Yes, the OCI Open LZ is built on the CIS (Center for Internet Security) Oracle Cloud Infrastructure Foundations Benchmark, implementing industry-recognized security best practices. 
    
    The landing zone includes:

    * Proper compartment structure for resource isolation and least-privilege access
    * Network isolation with secure VCN designs and security lists
    * Identity and Access Management (IAM) with groups, policies, and federation support
    * Security zones for policy enforcement
    * Cloud Guard and logging configurations for threat detection
    * Compliance controls aligned with common regulatory frameworks

All blueprints follow the same CIS-based security standards. For detailed information on the security posture, threat model, and vulnerability disclosure process, review the security guide.

12.  **How do I manage state files for Terraform?**
    
  It's strongly recommended to use OCI Object Storage with state file locking for Terraform remote state management, especially in production environments. Each blueprint includes guidance on configuring remote state.

## Support and Contribution

13. **How do I get support?**
  
    For issues, questions, or feature requests, please open an issue in this GitHub repository. You can also refer to Oracle Cloud Infrastructure documentation and community forums.
    
    Please do NOT raise a GitHub Issue to report a security vulnerability. If you believe you have found a security vulnerability, please submit a report to secalert_us@oracle.com preferably with a proof of concept. Please review some additional information on how to report security vulnerabilities to Oracle. We encourage people who contact Oracle Security to use email encryption using our encryption key.
    
    TBD. add channel for partners.
  
14. **Can I contribute to the project?**
    
    Yes! Contributions are welcome. Please review the contribution guide before submitting pull requests. We appreciate bug fixes, documentation improvements, new workload extensions, and feature enhancements.

15. **Is this an official Oracle product?**
    
    The OCI Open LZ is an open-source project provided under the Universal Permissive License (UPL), Version 1.0. While it incorporates Oracle best practices and is maintained with Oracle involvement, it is a community-driven project.
