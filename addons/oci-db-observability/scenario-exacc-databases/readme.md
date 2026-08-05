# **[ExaDB-C@C Databases](#)**
## **An OCI Open LZ add-on to help you enable native Observability services on ExaDB-C@C databases**

## OCI Native Services Configuration Prerequisites

This scenario documents the ExaDB-C@C implementation details for the OCI Database Observability add-on. Before continuing, review and finalize the design decisions listed in the general [OCI Database Observability README](../readme.md#3-design-decisions), including the Platform Management Agent and optional Management Gateway connectivity decision.

### Services covered

This add-on prepares the One-OE Landing Zone to enable the following OCI Observability services for ExaDB-C@C databases:

* Database Management
* Ops Insights
* Logging Analytics

&nbsp;

## Implementation

This scenario deploys the required components to enable Database Management, Ops Insights, and Logging Analytics, such as compartments, groups, dedicated Observability Vault resources, policies, and Management Agent prerequisites.
&nbsp;


Follow these steps to extend your One-OE Landing Zone:

**Step 0**. ( prerequisite )

Deploy the One-OE + ExaDB-C@C use case 1 in single stack. You can follow these [steps](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/workload-extensions/exacc/single-stack). To work with multiple stacks, you need to use the orchestrator's outputs and dependencies features within [ORM](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/commons/content/orm_bp.md).



**Step 1**.

Deploy the Observability Landing Zone add-on using Option 1.

| OPTION 1. PLATFORM APPROACH (RECOMMENDED) |
|---|
| * Use this deployment when ExaDB-C@C observability is enabled through Management Agent running on the monitored VM Cluster database hosts, with optional Management Gateway connectivity to OCI service endpoints. <br> * One platform observability team manages Database Management, Ops Insights, Logging Analytics, and shared monitoring resources for all ExaDB-C@C databases. <br> * This add-on does not create VCNs, subnets, NSGs, or a separate monitoring VM for this scenario. <br> * Enabling Database Management or Ops Insights for an ExaDB-C@C database requires a database user and password. These credentials must be stored as secrets in the platform Observability Vault `vlt-lz-shared-mon-security`, created in `cmp-landingzone:cmp-lz-security` by the Platform implementation option. The required policies to access the secret are included in the add-on. |
| **Resources created** |
| **Compartments:** `cmp-lz-monitoring`. |
| **Groups:** `grp-lz-platform-mon-admin`. |
| **Policies:** `pcy-mon-services`, `pcy-platform-mon-admin`, `pcy-mon-dynamic-group`, `pcy-mon-agent-cert-dynamic-group`, `pcy-platform-mon-security-admin`, `pcy-shared-exacc-mon-admin`. |
| **COMMON Identity Domain dynamic groups:** `id_lz_common/dg-lz-mon-dynamic-group`, `id_lz_common/dg-lz-mon-credential-dynamic-group`. |
| **Network resources:** none; ExaDB-C@C observability uses Management Agent connectivity directly to OCI service endpoints or through an OCI Management Gateway. |
| **Vault and key:** `vlt-lz-shared-mon-security`, `key-lz-mon-bkt`. |
| **Monitoring instance:** none; Logging Analytics uses a Management Agent installed on the monitored ExaDB-C@C VM Cluster database hosts. |
| <img src="../images/EXACC_CEN.png" height="250" align="center"> |
| Files loaded:<br>[addon_obs_iam_exacc_platform.json](addon_obs_iam_exacc_platform.json)<br>[addon_obs_security_exacc.json](addon_obs_security_exacc.json) |
| ORM deployment:<br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-exacc-databases/addon_obs_iam_exacc_platform.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-exacc-databases/addon_obs_security_exacc.json"}'><img src="../../../commons/images/DeployToOCI.svg" height="25" align="center"></a> |

Click the Deploy to OCI button and follow step-by-step instructions in [Implementation add-on steps](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/obs/addons/oci-db-observability/scenario-exacc-databases/Implementation_addon_steps.md).


**Step 2**.

Now that we have all required OCI-side resources, we can continue with the remaining manual service-onboarding actions, including Management Gateway or direct OCI service connectivity decisions, Management Agent installation, creating the database monitoring user, storing its password as a secret, enabling DBM/OPSI for the target databases, and completing Logging Analytics onboarding on the ExaDB-C@C VM Cluster database hosts. Follow these [steps to enable Database Management, Ops Insights, and Logging Analytics](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/obs/addons/oci-db-observability/scenario-exacc-databases/steps_to_enable_observability.md).

&nbsp;

# Reference Links

Use these links to review the relevant OCI documentation:

* [Management Gateway](https://docs.oracle.com/en-us/iaas/management-agents/doc/management-gateway.html)
* [Management Agent](https://docs.oracle.com/en-us/iaas/management-agents/doc/you-begin.html)

> [!WARNING]
> This scenario relies on Management Agent connectivity from the ExaDB-C@C VM Cluster database hosts. Verify direct connectivity to OCI service endpoints or connectivity through an OCI Management Gateway before enabling DBM/OPSI and Logging Analytics.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
