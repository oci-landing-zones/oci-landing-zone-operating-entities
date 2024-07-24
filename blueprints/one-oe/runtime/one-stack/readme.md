# **OCI Open LZ &ndash; [One-OE Blueprint](#) &ndash; One-Stack Deployment**

**Table of Contents**

[1. Introduction](#1-introduction)</br>
[2. One Stack Resource Manager Deployment](#2-one-stack-resource-manager-deployment)</br>
[3. Extend the configuration with VCN and Subnet Flowlogs](#3-extend-the-configuration-with-vcn-and-subnet-flowlogs)</br>
[4. Extend the configuration with additional Security Zones](#4-extend-the-configuration-with-additiona-security-zones)</br>
[5. Known-issues](#5-known-issues)</br>

&nbsp; 

## 1. Introduction

Here you will find how to deploy this 1 Operating Entities Landing Zone CIS v2 compliant with OCI Resource Manager Service.

This configuration will deploy IAM resources (compartments, groups and policies) for 3 different workload environments (Development, UAT and Production), Network resources in a Hub & Spoke network topology, having each environment its own dedicated VCN shared for applications, Monitoring resources (events, alarms, with object storage bucket for long retention of audit logs and notifications) and, Security Services (Cloud Guard, Security Zones, Vulneability Scanning Service and a Vault), as specified in the design.

You will find that we extend the configuration in further points in this section to include additional, optional elements to extend your security posture with the additional Security Zones, and also to gather VCN and Subnet flow logs, which will incurr in additional cost depending on how much logs are generated in your tenancy due to network traffic.

&nbsp; 

## 2. One Stack Resource Manager Deployment

| |  |
|---|---| 
| **OPERATION** | **OP.00 One-Stack Deployment** | 
| **TARGET RESOURCES**  </br></br><img src="../../../../commons/images/icon_oci.jpg" width="32">| Creates a **One-OE Landing Zone** in **one execution** with the following resources: </br> - One **Landing Zone Environment** (production). </br>- [**Network Hub A**](/addons/oci-hub-models/hub_a/readme.md).</br>- Three **Workload Environments** (prod, uat, dev) and related Spoke Networks.</br>- Setups a **strong security posture** with  Security Zones and Cloud Guard.</br>- Setups **monitoring** with Events, Alarms Logging, and Notifications.</br>- One sample **Project** and a sample **Platform** areas.</br>For more details refer to the high level [documentation](/blueprints/one-oe/design/readme.md) and the [drawio](/blueprints/one-oe/design/OCI_Open_LZ_One-OE-Blueprint.drawio).|
| **INPUT CONFIGURATIONS** </br></br><img src="../../../../commons/images/icon_json.jpg" width="30">|**IAM**: [oci_open_lz_one-oe_iam.auto.tfvars.json](oci_open_lz_one-oe_iam.auto.tfvars.json)</br>**Network**: [oci_open_lz_one-oe_network.auto.tfvars.json](oci_open_lz_one-oe_network.auto.tfvars.json)</br>**Security**: [oci_open_lz_one-oe_security.auto.tfvars.json](oci_open_lz_one-oe_security.auto.tfvars.json)</br>**Observability**: [oci_open_lz_one-oe_observability.auto.tfvars.json](oci_open_lz_one-oe_observability.auto.tfvars.json)</br> |
| **TERRAFORM MODULES** </br></br><img src="../../../../commons/images/icon_terraform.jpg" width="32">| [CIS  Landing Zone IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) </br>[CIS Landing Zone Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking)</br> [CIS Landing Zone  Security](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-security)</br> [CIS  Landing Zone Observability](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-observability)  |OCI_Open_LZ_One-OE-Blueprint.drawio).|
| **DEPLOY  STACK**  </br> </br><img src="../../../../commons/images/icon_orm.jpg" width="40">| </br>[<img src="../../../../commons/images/DeployToOCI.svg"  height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-landing-zones-orchestrator/archive/refs/tags/v2.0.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_iam.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_network.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_observability.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_security.auto.tfvars.json"})  </br> And follow these steps:</br>1. Accept terms,  wait for the configuration to load. </br>2. Set the working directory to “rms-facade”. </br>3. Set the stack name you prefer.</br>4. Set the terraform version to 1.2.x. Click Next. </br>5. Accept the default files. Click Next. Optionally, replace with your json/yaml config files. </br>6. Un-check run apply. Click Create. </br> </br> |
| **UPDATE  STACK**  </br></br><img src="../../../../commons/images/icon_orm.jpg" width="40">| </br> Once the base ORM stack and all landing zone elements are created, you can update the existing stack with new addon capabilities (Security Zones 3, 4, and 5, and Network Flow Logs), using the files below:  </br>**Security**: [oci_open_lz_one-oe_security_addon_sz345.auto.tfvars.json]()</br>**Observability:** [oci_open_lz_one-oe_observability_addon_flowlogs.auto.tfvars.json]() </br></br>Note that this update action is required due to existing limitations with terraform dependency grapth while creating these resources. It will be removed once these limitations are solved.| 

&nbsp; 

## 3. Extend the configuration with VCN and Subnet Flowlogs

By default, the VCN and Subnet flows logs are not deployed. The first 10 gigabytes of log storage are free every month. The configuration creates a log group for the shared network and each shared network environment, where it would create logs for every VCN and subnet within the VCNs. It would depend on how much traffic is generated in your VCNs/Subnets to overpass the free log storage that you get every month.

To replace your configuration with another Monitoring JSON file including the VCN flow logs do the following:

1. **Edit your Stack configuration.** Go to the stack you created previously, click on it and press into the ***Edit*** button and ***Edit stack***, click ***Next*** button at the botton.
2. **Replace your Observability JSON configuration file.** In the ***Input Files*** section, ***Configuration Files***, click in the ***X*** for the observability JSON file.
3. **Add the new Observability JSON configuration file.** Copy the following link "https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_observability_flowlogs.auto.tfvars.json" in the ***Configuration Files*** and click ***Enter***. Click ***Next*** button and in the following screen the ***Save changes***.
4. **Update your configuration.** In your stack click on the ***Plan*** button, review that all the Terraform Plan operation output is ok and then click in the ***Apply*** button to apply the changes to your configuration.
   
&nbsp; 

## 4. Extend the configuration with additional Security Zones

In the initial Security configuration file provided we apply the Security Zone recipe for CIS LZ v2 security controls in the Landing Zone enclosing compartment. However, we're including the Security Zones recipes discussed in the design diagrams.

You can extend the default configuration with these additional Security Zone targets to apply the Security Zone recipes included in the design, where the shared network compartment will get applied its recipe, the production shared network compartments its own recipe and the example project 1 its own recipe. As we got deeper in the compartment hierarchy, the Security Zones gets more restrictive.

Security Zones doesn't not incurr in any additional cost.

To replace your configuration with another Security JSON file including the additional Security Zones do the following:

1. **Edit your Stack configuration.** Go to the stack you created previously, click on it and press into the ***Edit*** button and ***Edit stack***, click ***Next*** button at the botton.
2. **Replace your Security JSON configuration file.** In the ***Input Files*** section, ***Configuration Files***, click in the ***X*** for the security JSON file.
3. **Add the new Security JSON configuration file.** Copy the following link "https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_security_addSZs.auto.tfvars.json" in the ***Configuration Files*** and click ***Enter***. Click ***Next*** button and in the following screen the ***Save changes***.
4. **Update your configuration.** In your stack click on the ***Plan*** button, review that all the Terraform Plan operation output is ok and then click in the ***Apply*** button to apply the changes to your configuration.

&nbsp; 

## 5. Known issues

### 5.1. Can not delete a compartment that it is still associated to a Security Zone.

While destroying your stack you might see the following error:

```
Error: 400-InvalidParameter, Delete compartment is not allowed because compartment is still associated to a Security Zone.

Suggestion: Please update the parameter(s) in the Terraform config as per error message Delete compartment is not allowed because compartment is still associated to a Security Zone.

```

If you see it, you would need to disable Cloud Guard manually from the console:
Main Menu -> Identity and Security -> Cloud Guard -> Configuration -> Disable Cloud Guard

Then, apply remove the conflicting compartment manually and proceed with the Stack destroy operation.




&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
