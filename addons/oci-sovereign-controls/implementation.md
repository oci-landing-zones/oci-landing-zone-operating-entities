# Sovereign Controls Implementation <!-- omit from toc -->

## Table of contents <!-- omit from toc -->
- [Summary](#summary)
- [1. Groups](#1-groups)
- [2. Policies](#2-policies)
- [3. Quota Policies](#3-quota-policies)
- [4. Security Zones](#4-security-zones)

## Summary
This guide covers the implementation of the principles outlined in the [Sovereign Controls add-on](./readme.md) document. As an example, we are going to implement restrictions for a German customer using EU Sovereign Cloud who wants to restrict data to the `eu-frankfurt-2` region. However, configuration files can be modified to specifically fit the sovereign requirements of any customer.

## Requirements
Sovereign add-ons can be configured on top of any [OCI landing zone model](https://blogs.oracle.com/cloud-infrastructure/post/new-standardized-oci-landing-zones-framework). In this example, the Sovereign Landing Zone is built on top of the One-OE Landing Zone.[One-OE](../../blueprints/one-oe/) is a single operating-entity landing zone utilizing Oracle best practices for deployments in commercial regions. The Sovereign Landing Zone takes One-OE a step further and modifies it to meet the requirements of customers for sovereign regulations, either in EU Sovereign Cloud regions or any other OCI deployment models.

## IAM Layer
You can find configuration examples for groups, policies, and quotas in [identity.auto.tfvars.json](./identity.auto.tfvars.json) file.

## 1. Groups
If a certain user group needs to be restricted to provisioning resources in a specific region, it's recommended to create a region-specific group. As IAM groups are global resources, we denote the region specificity using a naming convention, e.g., `grp-${region}-security-admins`. You can see an example configuration in the [identity.auto.tfvars.json](./identity.auto.tfvars.json) file, section `groups_configuration`. These groups can either extend the default groups provided by a landing zone or replace them if only a specific region is required.

> [!WARNING]
> Groups and policies controlling access permissions to IAM need to be always applied in the [Home Region](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingregions.htm#The) otherwise they have no effect.

## 2. Policies
Policies are applied to region-specific groups created in the previous step. All policies in the Sovereign Landing Zone add-on use the same permissions as in [One-OE](../../blueprints/one-oe) LZ, but with the addition of a condition to limit the permission to a specific region e.g.
```
Allow group grp-str-security-admins to manage all-resources in tenancy where request.region = 'str'
```

## 3. Quota Policies
Use Quota Policies in Oracle Cloud Infrastructure to control resource creation based on a region within compartments/tenancy. Quota Policies limit the number of resources that can be created in a Compartment/Tenancy based on the region. In this example, the customer wants to ensure there is no quota available in the regions other than `eu-frankfurt-2` region.
```
zero compute-core quota /*/ in tenancy where request.region != 'eu-frankfurt-2'
zero database quota /*/ in tenancy where request.region != 'eu-frankfurt-2'
zero vcn quota /*/ in tenancy where request.region != 'eu-frankfurt-2'
zero filesystem quota /*/ in tenancy where request.region != 'eu-frankfurt-2'
zero object-storage quota /*/ in tenancy where request.region != 'eu-frankfurt-2'
```

> [!NOTE]
> The provided list of Quota Policies is not exhaustive and includes only the most common services used for storing data. See [Available Quota by Service](https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/resourcequotas_topic-Available_Quotas_by_Service.htm) for a full list.

Additionally for a multi-tenancy set-up [Governance Rules](https://docs.oracle.com/en-us/iaas/Content/General/Concepts/organization_management_overview.htm#governance_rules) in Organizations service can be used to impose restriction on Child Tenancy

## Security Layer

You can find configuration examples for security zones in [security.auto.tfvars.json](./security.auto.tfvars.json) file.

## 4. Security Zones
OCI Sovereign Landing Zone proposes a strong security posture using all OCI capabilities, including Security Zones. Security Zones apply a security strategy to OCI cloud compartments and prevent actions that could undermine customers’ security posture. Security Zones policies can be applied to various types of cloud infrastructure (network, compute, storage, databases, etc.) to ensure the security of cloud resources and prevent security misconfigurations. Users determine which policies are appropriate for their needs by defining custom policy sets for each security zone.

The Sovereign Landing Zone implements the same configuration outlined in the [One-OE blueprint](/blueprints/one-oe/design). It includes five recipes that serve as examples of best practices. Security zones are defined using policy OCIDs, which are tied to specific realms. For sovereign realms, you must use the appropriate OCID, as the generic configuration is not valid. Refer to the provided example for the correct configuration.
```
"SZ-RCP-LZP-03-SHARED-NETWORK-KEY": {
                "name": "sz-rcp-lzp-03-shared-network",
                "description": "Recipe 03 Shared Network",
                "compartment_id": "CMP-LZP-SECURITY-KEY",
                "cis_level": "2",
                "security_policies_ocids": [
                    "ocid1.securityzonessecuritypolicy.oc19..aaaaaaaavolswrbfqy6qn2qe7zek2dumml6pbmyzv47q6jfwdatrywmqumba",
                    "ocid1.securityzonessecuritypolicy.oc19..aaaaaaaayxn5ccbavcx5w35uoozguju5zlovvtbnuvnrduxpdp3vsho33lba",
                    "ocid1.securityzonessecuritypolicy.oc19..aaaaaaaazlzn66zeazf5npw46qah3wlqpfrugv7w4tjbomit2msr43stidga",
                    "ocid1.securityzonessecuritypolicy.oc19..aaaaaaaaw6v2nz4unovq3joqk6pguxpaqriws2vzd7gvpldgai47tl72wseq"

                ]
            },
```
