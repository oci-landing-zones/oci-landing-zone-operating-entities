# FAQ - Implementation

## Implementation Questions

### I1. What are the prerequisites for deploying OCI Open LZ?

* An OCI tenancy with appropriate administrative privileges
* Terraform installed (version requirements specified in each blueprint)
* Basic understanding of OCI services and concepts
* Familiarity with Infrastructure-as-Code principles

---

### I2. What is the recommended deployment order?

* Choose the appropriate blueprint size: One-OE, Multi-OE, or Multi-Tenancy
* Review and include relevant network add-ons (e.g., hub models, DNS, TBAC)
* Include workload extensions as needed for specific applications
* Choose an approach for implementation: ORM or Terraform CLI
* Customize your JSON configuration files
* Try to avoid a monolithic deployment approach
* Deploy your Landing Zone
* Run CIS benchmark script to check CIS compliance

---

### I3. How can I modify the JSON file to accommodate my required changes, such as adding a third environment?

The landing zone uses declarative JSON configuration files that define your infrastructure. To add a third environment (e.g., Dev, Test, Prod):

1. **Locate the configuration file**: Find the `*.auto.tfvars.json` file in your blueprint directory
2. **Identify the environments section**: Look for the `environments` or `oe_environments` object
3. **Add your new environment**: Copy an existing environment block and modify it:

```json
"environments": {
  "prod": { ... },
  "preprod": { ... },
  "dev": {
    "name": "Development",
    "compartment_name": "dev",
    "enable_cloud_guard": true,
    ...
  }
}
```

4. **Update related resources**: Ensure network configurations, IAM policies, and other dependent resources reference the new environment
5. **Validate the configuration**: Run `terraform validate` before applying
6. **Apply incrementally**: Consider deploying the new environment separately to minimize risk

Refer to the blueprint-specific documentation for detailed examples and the complete schema reference.

---

### I4. How do I manage state files for Terraform?

It's strongly recommended to use OCI Object Storage with state file locking for Terraform remote state management, especially in production environments. Each blueprint includes guidance on configuring remote state.

**Basic configuration example:**

```hcl
terraform {
  backend "s3" {
    bucket   = "terraform-state-bucket"
    key      = "landing-zone/terraform.tfstate"
    region   = "us-phoenix-1"
    endpoint = "https://namespace.compat.objectstorage.us-phoenix-1.oraclecloud.com"
    shared_credentials_file     = "~/.aws/credentials"
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    force_path_style            = true
  }
}
```

---

### I5. Can I deploy the OCI Landing Zone using any OCI-native managed service?

Yes! All blueprints support deployment via Oracle Resource Manager (ORM), which is OCI's managed Terraform service. ORM provides:

* Built-in state management (no manual backend configuration needed)
* Web-based UI for managing deployments
* Integration with OCI Identity and Access Management
* Job history and drift detection

**To deploy using ORM:**

1. Create a stack in Oracle Resource Manager
2. Upload the blueprint as a .zip file or connect to your Git repository
3. Configure variables through the ORM interface
4. Plan and apply the configuration

---

### I6. What should I do if my deployment fails?

If your deployment fails:

1. **Check error messages**: Review the Terraform error output carefully
2. **Verify prerequisites**: Ensure all requirements (permissions, quotas, etc.) are met
3. **Check state consistency**: Run `terraform refresh` to sync state with actual resources
4. **Review recent changes**: If this worked before, identify what changed
5. **Check OCI service limits**: Verify you haven't exceeded service limits
6. **Consult logs**: Review OCI audit logs and Cloud Guard findings
7. **Seek help**: Open an issue on GitHub with error details (see [Support FAQ](./faq_support.md))

For resource quota issues, you may need to request a service limit increase through the OCI console.
