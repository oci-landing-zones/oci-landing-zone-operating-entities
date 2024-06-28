# **OCI Open LZ &ndash; [One-OE Blueprint](#) &ndash; One-Off Deployment**



&nbsp; 



| |  |
|---|---| 
| **OP. ID** | OP.00 One-Off Deployment | 
| **OBJECTIVE** | Creates a´ **One-OE Landing Zone** in **one execution** with the following resources: </br> - One **Landing Zone Environment** (production). </br>- One **Network Hub** Model A.</br>- Three **Workload Environments** (prod, uat, dev) and related Spoke Networks.</br>- Setups a **strong security posture** with several Security Zones and Cloud Guard.</br>- Setups **monitoring** with Events, Alarms Logging, and Notifications.</br>- One sample **Project** and a sample **Platform** areas.</br>For more details refer to the high level [documentation](/one-oe/design/readme.md) and the [drawio](/one-oe/design/OCI_Open_LZ_One-OE-Blueprint.drawio).|
| **OCI RESOURCES** | **IAM**: Compartments, Groups, Policies</br>**Network**: VCN, Subnets, SL, RT, DRG Attachments, Service/Internet Gateways.</br>**Security**: Cloud Guard, Security Zones</br>**Observability**: Events, Alarms, Logging, Notifications |
| **INPUT CONFIG** |**IAM**: [oci_open_lz_one-oe_iam.auto.tfvars.json](oci_open_lz_one-oe_iam.auto.tfvars.json)</br>**Network**: [oci_open_lz_one-oe_network.auto.tfvars.json](oci_open_lz_one-oe_network.auto.tfvars.json)</br>**Security**: [oci_open_lz_one-oe_security.auto.tfvars.json](oci_open_lz_one-oe_security.auto.tfvars.json)</br>**Obervability**: [oci_open_lz_one-oe_observability.auto.tfvars.json](oci_open_lz_one-oe_observability.auto.tfvars.json)</br> |
| **TERRAFORM MODULES**| [CIS IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam), [CIS Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking), [CIS Security](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-security), [CIS Observability](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-observability)  |OCI_Open_LZ_One-OE-Blueprint.drawio).|
| **DEPLOY WITH ORM** | 1. [![Deploy_To_OCI](/images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-landing-zones-orchestrator/archive/refs/tags/v2.0.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/test-oneoe/one-oe/runtime/one-off/oci_open_lz_one-oe_iam.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/test-oneoe/one-oe/runtime/one-off/oci_open_lz_one-oe_network.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/test-oneoe/one-oe/runtime/one-off/oci_open_lz_one-oe_observability.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/test-oneoe/one-oe/runtime/one-off/oci_open_lz_one-oe_security.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “rms-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.2.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|


&nbsp; 

&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
