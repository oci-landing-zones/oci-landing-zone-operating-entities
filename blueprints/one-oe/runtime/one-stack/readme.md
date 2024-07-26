# **OCI Open LZ &ndash; [One-OE Blueprint](#) &ndash; One-Stack Deployment**


&nbsp; 


| |  |
|---|---| 
| **OPERATION** | **OP.00 One-Stack Deployment** | 
| **TARGET RESOURCES**  </br></br><img src="../../../../commons/images/icon_oci.jpg" width="32">| </br>This operation creates a **One-OE Landing Zone** in **one execution** with the following resources: </br> - One **Landing Zone Environment** (production). </br>- [**Network Hub A**](/addons/oci-hub-models/hub_a/readme.md).</br>- Three **Workload Environments** (prod, uat, dev) and related Spoke Networks.</br>- Setups a **strong security posture** with  Security Zones and Cloud Guard.</br>- Setups **monitoring** with Events, Alarms Logging, and Notifications.</br>- One sample **Project** and a sample **Platform** areas.</br>For more details on the resources being created refer to the [documentation](/blueprints/one-oe/design/readme.md) and the [drawio](/blueprints/one-oe/design/OCI_Open_LZ_One-OE-Blueprint.drawio). </br></br> |
| **INPUT CONFIGURATIONS** </br></br><img src="../../../../commons/images/icon_json.jpg" width="30" align="center">&nbsp; +&nbsp; <img src="../../../../commons/images/icon_terraform.jpg" width="32" align="center">|</br>**IAM**: [oci_open_lz_one-oe_iam.auto.tfvars.json](oci_open_lz_one-oe_iam.auto.tfvars.json) as input to the [CIS  Landing Zone IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) module. </br>**Network**: [oci_open_lz_one-oe_network.auto.tfvars.json](oci_open_lz_one-oe_network.auto.tfvars.json) as input to the [CIS Landing Zone Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) module.</br>**Security**: [oci_open_lz_one-oe_security.auto.tfvars.json](oci_open_lz_one-oe_security.auto.tfvars.json) as input to the [CIS Landing Zone  Security](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-security) module.</br>**Observability**: [oci_open_lz_one-oe_observability.auto.tfvars.json](oci_open_lz_one-oe_observability.auto.tfvars.json) as input to the [CIS  Landing Zone Observability](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-observability) module.</br></br> |
| **DEPLOY WITH ORM** </br>*- STEP #1* </br></br><img src="../../../../commons/images/icon_orm.jpg" width="40">| </br>[<img src="/commons/images/DeployToOCI.svg"  height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-landing-zones-orchestrator/archive/refs/tags/v2.0.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_iam.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_network.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_observability.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_security.auto.tfvars.json"})  </br></br> And follow these steps:</br>1. Accept terms,  wait for the configuration to load. </br>2. Set the working directory to “rms-facade”. </br>3. Set the stack name you prefer.</br>4. Set the terraform version to 1.2.x. Click Next. </br>5. Accept the default files. Click Next. Optionally, replace with your json/yaml config files. </br>6. Un-check run apply. Click Create. </br> </br> |
| **POST DEPLOYMENT** </br>*- STEP #2*  </br> </br></br><img src="../../../../commons/images/icon_orm.jpg" width="40">| </br> This is an **optional** step to be executed once Step 1 Stack and all landing zone elements are created. This step requires the **update the previous ORM stack json configuration files** in order to add extra Security Zones Recipes (3, 4, and 5) and Network Flow Logs. This update can be executed in one step by replacing both files as described below.</br></br>**Security Zones**:</br>- Use the configuration [oci_open_lz_one-oe_security_addon_sz345.auto.tfvars.json](oci_open_lz_one-oe_security_addon_sz345.auto.tfvars.json) to extend the base configuration with additional Security Zone targets to apply Recipes in the shared network compartment, the production shared network compartment, and project 1 example. As the compartment hierarchy goes deeper the Security Zones are more restrictive. </br>- Note that this update action is not in the base stack red due to limitations with terraform dependency grapth while creating these resources. These will be merged once these limitations are solved.</br></br>**Observability - Flow Logs:**</br>- Use the configuration [oci_open_lz_one-oe_observability_addon_flowlogs.auto.tfvars.json](oci_open_lz_one-oe_observability_addon_flowlogs.auto.tfvars.json) to create the VCN and Subnets flow logs. </br>- Note that by default, the VCN and Subnet flows logs are not deployed. The first 10 gigabytes of log storage are free every month. The configuration creates a log group for the shared network and each shared network environment, where it would create logs for every VCN and subnet within the VCNs. It would depend on how much traffic is generated in your VCNs/Subnets to overpass the free log storage that you get every month.</br></br>| 

&nbsp; 

Review the [known issues](known_issues.md) for any difficulties and feel free to contact us.


&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE) for more details.


&nbsp; 
