# **[Autonomous Databases ](#)**
## **An OCI Open LZ add-on to help you enable native Observability services on Autonomous Databases**

## OCI Native Services Configuration Prerequisites

This scenario documents the Autonomous Database implementation details for the OCI Database Observability add-on. Before continuing, review and finalize the design decisions listed in the general [OCI Database Observability README](../readme.md#3-design-decisions), including the Centralized vs Project private endpoint decision.

### Services covered

This add-on prepares the One-OE Landing Zone to enable the following OCI Observability services for Autonomous Database:

* Database Management
* Ops Insights
* Logging Analytics


## Implementation

This scenario deploys the required components to enable Database Management, Ops Insights, and Logging Analytics, such as compartments, groups, dedicated Observability Vault resources, policies, NSGs, and monitoring agent VM resources.
&nbsp;


Follow these steps to extend your One-OE Landing Zone:

**Step 0**. ( prerequisite )

Deploy the One-OE Landing Zone. You can follow these [steps](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe/runtime/one-stack). To work with multiple stacks, you need to use the orchestrator's outputs and dependencies features within [ORM](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/commons/content/orm_bp.md).



**Step 1**.

Deploy the Observability Landing Zone add-on. Choose the option that best fits your needs. The recommended option is Option 1.

| OPTION 1. CENTRALIZED APPROACH (RECOMMENDED) | OPTION 2. PROJECT APPROACH |
|---|---|
| * Use this deployment when DBM/OPSI private endpoints are shared centralized endpoints to be created in the hub monitoring subnet. <br> * One centralized observability team manages DBM, OPSI, Logging Analytics, and shared monitoring resources for all Autonomous Databases. <br> * Logging Analytics requires a Management Agent with access to the monitored database endpoint and the required ingestion policies. This add-on provides the IAM and network prerequisites for that flow and creates the monitoring agent VM `vm-fra-lz-shared-mon-agent` in `cmp-lz-monitoring`, attached to the hub monitoring subnet `sn-fra-lz-hub-mon`. <br> * Enabling Database Management or Ops Insights for an Autonomous Database requires a database user and password. These credentials must be stored as secrets in the centralized Observability Vault `vlt-lz-shared-mon-security`, created in `cmp-landingzone:cmp-lz-security` by the CENTRALIZED implementation option. The required policies to access the secret are included in the add-on.| * Use this deployment when DBM/OPSI private endpoints are project-dedicated endpoints to be created in the same database subnet as the Autonomous Database private endpoint. <br> * Project-specific observability teams manage DBM, OPSI, Logging Analytics, and project monitoring resources for their own Autonomous Databases. <br> * Logging Analytics requires a Management Agent with access to the monitored database endpoint and the required ingestion policies. This add-on provides the IAM and network prerequisites for that flow and creates one project monitoring agent VM per environment: `vm-fra-lz-prod-proj1-mon-agent` in `cmp-lz-prod-proj1`, attached to `sn-fra-lz-prod-app`, and `vm-fra-lz-preprod-proj1-mon-agent` in `cmp-lz-preprod-proj1`, attached to `sn-fra-lz-preprod-app`. <br> * Enabling Database Management or Ops Insights for an Autonomous Database requires a database user and password. These credentials must be stored as secrets in the project Observability Vault for the target environment: `vlt-lz-prod-mon-security` in `cmp-lz-prod-security` or `vlt-lz-preprod-mon-security` in `cmp-lz-preprod-security`. The required policies to access the secrets are included in the add-on. |
| **Resources created** | **Resources created** |
| **Compartments:** `cmp-lz-monitoring`. | **Compartments:** none; uses the existing project compartments `cmp-lz-prod-proj1` and `cmp-lz-preprod-proj1` for project-dedicated DBM/OPSI private endpoints and monitoring agent VMs. |
| **Groups:** `grp-lz-centralized-mon-admin`, `grp-lz-centralized-mon-reader`. | **Groups:** none; uses the existing project administration groups `grp-lz-prod-proj1-admin` and `grp-lz-preprod-proj1-admin`. |
| **Policies:** `pcy-mon-services`, `pcy-centralized-mon-admin`, `pcy-centralized-mon-readers`, `pcy-mon-dynamic-group`, `pcy-centralized-mon-security-admin`, `pcy-centralized-mon-security-readers`, `pcy-centralized-mon-network-admin`, `pcy-centralized-mon-network-readers`, `pcy-prod-proj1-mon-admin`, `pcy-prod-proj1-mon-readers`, `pcy-preprod-proj1-mon-admin`, `pcy-preprod-proj1-mon-readers`. | **Policies:** `pcy-mon-services`, `pcy-mon-dynamic-group`, `pcy-prod-proj1-mon-admin`, `pcy-preprod-proj1-mon-admin`. |
| **COMMON Identity Domain dynamic group:** `id_lz_common/dg-lz-mon-dynamic-group`. | **COMMON Identity Domain dynamic group:** `id_lz_common/dg-lz-mon-dynamic-group`. |
| **NSGs:** `nsg-fra-lz-hub-cen-mon-pe`, `nsg-fra-lz-prod-proj1-mon-pe-db1`, `nsg-fra-lz-preprod-proj1-mon-pe-db1`. | **NSGs:** `nsg-fra-lz-prod-proj1-mon-pe-db1`, `nsg-fra-lz-preprod-proj1-mon-pe-db1`. |
| **NSG egress behavior:** egress is intentionally left open to `0.0.0.0/0` for DBM/OPSI and Autonomous Database private endpoint connectivity. The centralized hub PE NSG uses all protocols, and the project DB-side NSGs use TCP. | **NSG egress behavior:** egress is intentionally left open to `0.0.0.0/0` over TCP for project-dedicated DBM/OPSI and Autonomous Database private endpoint connectivity. |
| **Vault and key:** `vlt-lz-shared-mon-security`, `key-lz-mon-bkt`. | **Vaults and keys:** `vlt-lz-prod-mon-security` / `key-lz-prod-mon-bkt` in `cmp-lz-prod-security`, and `vlt-lz-preprod-mon-security` / `key-lz-preprod-mon-bkt` in `cmp-lz-preprod-security`. |
| **Monitoring instance:** `vm-fra-lz-shared-mon-agent`. | **Monitoring instances:** `vm-fra-lz-prod-proj1-mon-agent` in `cmp-lz-prod-proj1`, and `vm-fra-lz-preprod-proj1-mon-agent` in `cmp-lz-preprod-proj1`. |
| <img src="../images/ATP_CEN.png" height="250" align="center"> | <img src="../images/ATP_PROJECT.png" height="250" align="center"> |
| Files loaded:<br>[addon_obs_iam_atp_centralized.json](addon_obs_iam_atp_centralized.json)<br>[addon_obs_network_atp_centralized.json](addon_obs_network_atp_centralized.json)<br>[addon_obs_security_atp_centralized.json](addon_obs_security_atp_centralized.json)<br>[addon_obs_instance_atp_centralized.json](addon_obs_instance_atp_centralized.json) | Files loaded:<br>[addon_obs_iam_atp_project.json](addon_obs_iam_atp_project.json)<br>[addon_obs_network_atp_project.json](addon_obs_network_atp_project.json)<br>[addon_obs_security_atp_project.json](addon_obs_security_atp_project.json)<br>[addon_obs_instance_atp_project.json](addon_obs_instance_atp_project.json) |
| ORM deployment:<br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-autonomous-databases/addon_obs_iam_atp_centralized.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-autonomous-databases/addon_obs_network_atp_centralized.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-autonomous-databases/addon_obs_security_atp_centralized.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-autonomous-databases/addon_obs_instance_atp_centralized.json"}'><img src="../../../commons/images/DeployToOCI.svg" height="25" align="center"></a> | ORM deployment:<br><a href='https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-autonomous-databases/addon_obs_iam_atp_project.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-autonomous-databases/addon_obs_network_atp_project.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-autonomous-databases/addon_obs_security_atp_project.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/obs/addons/oci-db-observability/scenario-autonomous-databases/addon_obs_instance_atp_project.json"}'><img src="../../../commons/images/DeployToOCI.svg" height="25" align="center"></a> |

Click the Deploy to OCI button and follow step-by-step instructions in [Implementation add-on steps](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/obs/addons/oci-db-observability/scenario-autonomous-databases/Implementation_addon_steps.md).


**Step 2**.

Now that we have all required resources, we can continue with the remaining manual service-onboarding actions, including preparing the database monitoring user, storing its password as a secret, creating the service private endpoints, enabling DBM/OPSI for the target databases, and completing Logging Analytics onboarding with the centralized monitoring agent VM or the environment-specific PROJECT VMs. Follow these [steps to enable Database Management, Ops Insights, and Logging Analytics](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/obs/addons/oci-db-observability/scenario-autonomous-databases/steps_to_enable_observability_atp.md).

&nbsp;



# Reference Links

Use these links to review the relevant OCI documentation:

* [DBM Private Endpoint](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/privateaccess.htm#private-endpoints)
* [OPSI Private Endpoint](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/privateaccess.htm#private-endpoints)

> [!WARNING]
> This scenario supports placing the Database Management or Ops Insights Private Endpoint in the same VCN as the Autonomous Database Private Endpoint, or in a different VCN.
>
> Keep the service limit in mind: only one Private Endpoint can be created per VCN.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
