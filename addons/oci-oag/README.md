
# **[Oracle Access Governance for OCI](#)**
## **An OCI Open LZ [Addon](#) for Oracle Access Governance (OAG)**

&nbsp; 

### Overview
Welcome to the **Oracle Access Governance (OAG) [Addon](#)**, Oracle Access Governance is a native Identity Governance and Administration (IGA) cloud service that helps meet governance and compliance requirements for digital identities and access rights across applications, infrastructure, and identity platforms. A single instance on Oracle Access Governance can now govern one or more OCI tenancies across regions, on-premises identity applications, and hybrid deployments. With a central deployment of Access Governance, customers can improve their security posture with enterprise-wide capabilities to identify anomalies and help mitigate security threats.

OCI Operating Entities LZ may optionally deploy OCI IAM Groups and Policies for Oracle Access Governance (OAG) as an add-on. During the landing zone deployment, a new group and policies will be created for managing OAG, and an additional policy statement will be added to the Security Administrator policy. This will allow the creation of an Oracle Access Governance (OAG) instance within the security compartment.

&nbsp; 

### IAM Group & Policies

The policies granted to the Access Governance Group which are used for the OAG Instance to query OCI services in the tenancy are read only.  This allows for OAG to review access in the OCI tenancy and align to the CIS OCI Foundations Benchmark.  The policy statements are below:

> [!NOTE]
> Step 1 : The One-OE Landing Zone serves as the foundational setup for all workloads. It covers essential IAM. The OAG add-on will create an additional group "GRP-OE-OAG-ADMINS" and below set of policies . Ensure the below group and polcies to be added to the configuration [oci_open_lz_one-oe_iam.auto.tfvars.json](/blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_iam.auto.tfvars.json).

```
allow group GRP-OE-OAG-ADMINS to inspect all-resources in tenancy
allow group GRP-OE-OAG-ADMINS to read policies in tenancy
allow group GRP-OE-OAG-ADMINS to read domains in tenancy
```

The Security Admin group is granted following additional policies to deploy an Oracle Access Governance instance in the Security compartment: 

```
allow group GRP-OE-SECURITY-ADMINS to manage agcs-instance in compartment cmp-landingzone-p:cmp-lzp-security
```

#### Deploying OAG an instance 
As a user in the GRP-OE-SECURITY-ADMINS follow the steps in [Set Up Service Instance](https://docs.oracle.com/en/cloud/paas/access-governance/cagsi/).

#### Enabling an OAG instance to review OCI IAM access in the tenancy
After the OAG instance is provisioned follow steps from the [Integrate with Oracle Cloud Infrastructure (OCI) Identity and Access Management (IAM) ](https://docs.oracle.com/en/cloud/paas/access-governance/tjrtj/index.html#GUID-29D81CB5-08BB-45CB-8911-416F6FFDB0C9) to configure the OAG Instance to review the OCI IAM policies .  

1. As a user in the GRP-OE-IAM-ADMINS or the Administrator group go to the **Set up Identity Resources Manually** and preform the below steps:
    1. Follow the these steps and the links provided to set up identity resources in your cloud tenancy.
        1. [Create an identity user](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingusers.htm#three), agcs_user, in the Default domain for Oracle Access Governance access.
        1. [Provision the user](https://docs.oracle.com/en-us/iaas/Content/Identity/access/managing-user-credentials.htm) with the following capabilities:
            - API keys: Select the check box for API authentication.
        1. [Assign the identity user](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managinggroups.htm#three) (agcs_user) to the identity group GRP-OE-OAG-ADMINS) 
1. As a user in the GRP-OE-CREDENTIAL-ADMINS or the Administrator group go to the **Generate API Keys and Oracle Cloud Identifier (OCID) to configure your Cloud Environment in the Oracle Access Governance Console** section and complete all steps in this section.

1. As a user in the GRP-OE-SECURITY-ADMINS go to the **Establish Connection by Adding a New Connected System - OCI IAM** and complete all steps in this section.





&nbsp; 



&nbsp; 

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
