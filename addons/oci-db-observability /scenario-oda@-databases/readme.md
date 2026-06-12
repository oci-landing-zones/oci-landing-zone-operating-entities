# **[ODA@ Databases](#)**
## **An OCI Open LZ add-on to help you enable native Observability services on ODA@ databases**

## OCI Native Services Configuration Prerequisites

This scenario documents the ODA@ implementation details for the OCI Database Observability add-on. Before continuing, review the design decisions listed in the general [OCI Database Observability README](../readme.md#3-design-decisions). This ODA@ scenario covers the Global Approach for DBM/OPSI private endpoints.

### Services covered

This add-on prepares the Landing Zone to enable:

* Database Management
* Ops Insights
* Logging Analytics

### Private endpoint connectivity

Database Management and Ops Insights require service Private Endpoints with network access to the ODA@ client subnet and SCAN listener. The add-on includes the Network Security Groups (NSGs) required to allow that connectivity.

Use these links to review the relevant OCI documentation:

* [DBM Private Endpoint](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/privateaccess.htm#private-endpoints)
* [OPSI Private Endpoint](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/privateaccess.htm#private-endpoints)

> [!WARNING]
> This scenario uses shared global Database Management and Ops Insights Private Endpoints deployed in the hub monitoring subnet. Make sure this subnet can reach the ODA@ client subnet and SCAN listener.
>
> Keep the service limit in mind: only one Private Endpoint can be created per VCN.

### Credentials and Vault

Enabling Database Management or Ops Insights for an ODA@ database requires a database user and password. These credentials must be stored as secrets in the dedicated Observability Vault provisioned by the Global implementation. The required policies to access the secret are included in the add-on.

### Management Agent for Logging Analytics

Logging Analytics requires a Management Agent on the monitored ODA@ database hosts and the required ingestion policies. This add-on provides the IAM and network prerequisites for that flow, but it does not deploy a separate VM.

&nbsp;

## Implementation

This scenario deploys the required components to enable Database Management, Ops Insights, and Logging Analytics, such as compartments, groups, a dedicated monitoring Vault, policies, and NSGs.
&nbsp;


Follow these steps to extend your One-OE Landing Zone:

**Step 0**. ( prerequisite )

Deploy the ODA@ Landing zone. TBC


**Step 1**.

Deploy the Observability Landing zone add-on. TBC


**Step 2**.

Follow the remaining service-specific [steps to enable Database Management, Ops Insights, and Logging Analytics](steps_to_enable_observability.md).

The resources created in Step 1 are listed in the table above. Step 2 covers only the remaining manual service-onboarding actions, including creating the database monitoring user, storing its password as a secret, creating the service private endpoints, enabling DBM/OPSI for the target databases, and completing Logging Analytics onboarding on the ODA@ database hosts.

&nbsp;

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
