# Database Management Add-ons for OCI Landing Zone

This catalog mirrors the target naming used by the Database Management Add-ons
page and provides the direct links intended for its Terraform-script column.
Each linked directory is an OCI Resource Manager working root with
`schema.yaml`, a provider lock, a JSON input template, Terraform, outputs, and
target-specific prerequisites.

| Name | Step-by-step guide | Terraform automation | Automated OCI scope |
| --- | --- | --- | --- |
| Autonomous database | [`steps_to_enable_DBM_ADB.md`](https://github.com/oracle-devrel/technology-engineering/blob/main/oci-and-db/foundation/observability-and-management/database-management/LZ-addons/files/steps_to_enable_DBM_ADB.md) | [`scenario-autonomous-databases/terraform`](./scenario-autonomous-databases/terraform/) | ADB DBM feature enablement, private endpoint connection, Vault secret reference |
| Base Database | To be added to the guide catalog | [`scenario-base-databases/terraform`](./scenario-base-databases/terraform/) | Base DB CDB/PDB/non-CDB enablement, private endpoints, Vault secret references, fleet waves |
| EXACS | Guide is currently marked “On process” | [`scenario-exacs-databases/terraform`](./scenario-exacs-databases/terraform/) | ExaDB-D CDB/PDB enablement, private endpoints, Vault secret references, fleet waves |
| EXACC | [`steps_to_enable_DBM_ExaCC.md`](https://github.com/oracle-devrel/technology-engineering/blob/main/oci-and-db/foundation/observability-and-management/database-management/LZ-addons/files/steps_to_enable_DBM_ExaCC.md) | [`scenario-exacc-databases/terraform`](./scenario-exacc-databases/terraform/) | Management Agent install keys, external CDB/PDB/non-CDB registration, DBM feature enablement |
| External Databases | Guide is currently marked “On process” | [`scenario-external-databases/terraform`](./scenario-external-databases/terraform/) | External CDB/PDB/non-CDB registration and DBM feature enablement through Management Agents |

Use the same target labels and capitalization when adding the Terraform column
to the source page. After this branch is merged, the external links can follow
this stable pattern:

```text
https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/OBS_addon/addons/oci-native-mon/scenario-<target>-databases/terraform
```

Terraform automates OCI control-plane actions. Database SQL grants, ExaCC or
external-host agent installation, and plugin activation remain customer-host
preconditions because the OCI Terraform provider does not execute inside those
security boundaries.
