# **[ExaDB-D Databases](#)**
## **An OCI Open LZ add-on to help you enable native Observability services on ExaDB-D databases**

## OCI Native Services Configuration Prerequisites

This scenario documents the ExaDB-D implementation details for the OCI Database Observability add-on. Before continuing, review and finalize the design decisions listed in the general [OCI Database Observability README](../readme.md#3-design-decisions), including the Platform private endpoint placement decision.

### Services covered

This add-on prepares the One-OE Landing Zone to enable the following OCI Observability services for ExaDB-D databases:

* Database Management
* Ops Insights
* Logging Analytics


&nbsp;

## Implementation

This scenario deploys the required components to enable Database Management, Ops Insights, and Logging Analytics, such as compartments, groups, dedicated Observability Vault resources, policies, and NSGs.
&nbsp;


Follow these steps to extend your One-OE Landing Zone:

**Step 0**. ( prerequisite )

Deploy the One-OE + ExaDB-D use case 1 in single stack. You can follow these [steps](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/workload-extensions/exacs/single-stack). To work with multiple stacks, you need to use the orchestrator's outputs and dependencies features within [ORM](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/commons/content/orm_bp.md).



**Step 1**.

Deploy the Observability Landing Zone add-on using Option 1.

| OPTION 1. PLATFORM APPROACH (RECOMMENDED) |
|---|
| * Use this deployment when DBM/OPSI private endpoints are shared platform endpoints to be created in the hub monitoring subnet. <br> * One platform observability team manages DBM, OPSI, Logging Analytics, and shared monitoring resources for all ExaDB-D databases. <br> * Logging Analytics requires a Management Agent on each monitored ExaDB-D VM Cluster database host and the required ingestion policies. This add-on provides the IAM and network prerequisites for that flow, but it does not deploy a separate VM. <br> * Enabling Database Management or Ops Insights for an ExaDB-D database requires a database user and password. These credentials must be stored as secrets in the platform Observability Vault `vlt-lz-shared-mon-security`, created in `cmp-landingzone:cmp-lz-security` by the Platform implementation option. The required policies to access the secret are included in the add-on. |
| **Resources created** |
| **Compartments:** `cmp-lz-monitoring`. |
| **Groups:** `grp-lz-platform-mon-admin`. |
| **Policies:** `pcy-mon-services`, `pcy-platform-mon-admin`, `pcy-mon-dynamic-group`, `pcy-platform-mon-security-admin`, `pcy-platform-mon-network-admin`, `pcy-shared-exacs-mon-admin`. |
| **COMMON Identity Domain dynamic group:** `id_lz_common/dg-lz-mon-dynamic-group`. |
| **NSGs:** `nsg-fra-lz-hub-cen-mon-pe`, `nsg-fra-lz-shared-exacs-mon-pe` in `vcn-fra-lz-shared-exacs` for `sn-fra-lz-shared-exacs-db`. |
| **NSG egress behavior:** egress is intentionally left open to `0.0.0.0/0` for DBM/OPSI private endpoint connectivity. The platform hub PE NSG uses all protocols, and the shared ExaDB-D DB-side NSG uses TCP. |
| **Vault and key:** `vlt-lz-shared-mon-security`, `key-lz-mon-bkt`. |
| **Monitoring instance:** none; Logging Analytics uses a Management Agent installed on the monitored ExaDB-D VM Cluster database hosts. |
| <img src="../images/EXADB_D_CEN.png" height="250" align="center"> |
| Files loaded:<br>[addon_obs_iam_exacs_platform.json](addon_obs_iam_exacs_platform.json)<br>[addon_obs_network_exacs_platform.json](addon_obs_network_exacs_platform.json)<br>[addon_obs_security_exacs.json](addon_obs_security_exacs.json) |
| ORM deployment:<br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-exacs-databases/addon_obs_iam_exacs_platform.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-exacs-databases/addon_obs_network_exacs_platform.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-exacs-databases/addon_obs_security_exacs.json"}'><img src="../../../commons/images/DeployToOCI.svg" height="25" align="center"></a> |

Click the Deploy to OCI button and follow step-by-step instructions in [Implementation add-on steps](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/obs/addons/oci-db-observability/scenario-exacs-databases/Implementation_addon_steps.md).


**Step 2**.

Now that we have all required resources, we can continue with the remaining manual service-onboarding actions, including creating the database monitoring user, storing its password as a secret, creating the service private endpoints, enabling DBM/OPSI for the target databases, and completing Logging Analytics onboarding on the ExaDB-D VM Cluster database hosts. Follow these [steps to enable Database Management, Ops Insights, and Logging Analytics](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/obs/addons/oci-db-observability/scenario-exacs-databases/steps_to_enable_observability_exacs.md).

&nbsp;

# Reference Links

Use these links to review the relevant OCI documentation:

* [DBM Private Endpoint](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/privateaccess.htm#private-endpoints)
* [OPSI Private Endpoint](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/privateaccess.htm#private-endpoints)

> [!WARNING]
> This scenario uses shared platform Database Management and Ops Insights Private Endpoints deployed in the hub monitoring subnet. Make sure this subnet can reach the ExaDB-D client subnet and SCAN listener.
>
> Keep the service limit in mind: only one Private Endpoint can be created per VCN.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
