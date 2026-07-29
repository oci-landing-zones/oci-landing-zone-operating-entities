# Database Management

## Capability

The add-on provides target-specific Diagnostics and Management automation for
Autonomous Database, Base Database Service, Exadata Database Service (EXACS),
Exadata Cloud@Customer (EXACC), and external databases. Base Database and EXACS
use private endpoints with OCI Vault secret references. ADB uses its dedicated
DBM feature-management API. EXACC and external databases use Management Agents
and customer-created named credentials; plaintext database passwords are never
accepted by these Terraform roots.

## Required inputs

- Autonomous Database identity, DBM private endpoint, service, and Vault secret;
- Base Database or EXACS CDB, PDB, or non-CDB identity, private endpoint,
  connection parameters, and Vault secret;
- EXACC or external database compartment, Management Agent identity, database
  type, and stable parent key for every PDB.

Inputs use Landing Zone dependency keys populated from the producing
composition's outputs. Existing private endpoints, agents, databases,
compartments, and Vault secrets are consumed rather than discovered.

## Target-specific prerequisites

| Target | Terraform automation | Customer-controlled pre-apply gate |
| --- | --- | --- |
| Autonomous database | Enable/disable DBM through the ADB-specific feature API | Unlock `ADBSNMP` and grant the documented database privileges |
| Base Database | Enable/disable CDB, PDB, and non-CDB targets through a private endpoint | Create the monitoring user and Vault secret |
| EXACS | Enable/disable CDB, PDB, and non-CDB targets through a private endpoint | Create the monitoring user and Vault secret |
| EXACC | Create bounded agent install keys, register external database resources, and enable/disable DBM | Install the agent and plug-ins on every required node; create `C##OCI_MON_USER` and its named credential |
| External Databases | Register external database resources and enable/disable DBM | Install the agent and plug-ins; create the monitoring user and named credential |

Database SQL and host installation steps remain explicit gates because the OCI
Terraform provider does not execute within those customer security boundaries.

## Scale and verification

The fleet root supports 1,000 Base Database and EXACS targets per manifest and
at most 200 per wave. Larger estates use multiple manifests aligned to LZ
operating boundaries. A CDB and its PDBs remain in the same wave, manifest, and
OCI Resource Manager stack state. ADB, EXACC, and external target roots are
independent Resource Manager stacks that can be repeated by operating entity,
region, environment, network domain, or maintenance owner.

After apply, verify the managed-database status and current metrics; a
successful Terraform action is not collection proof.

## Offboarding

For Base Database, EXACS, EXACC, and external CDB/PDB families, apply
`DISABLE_TARGETS`, verify every PDB and non-CDB is disabled, then create a new
reviewed plan with `DISABLE_CDB`. For ADB, set
`enable_database_management = false` and verify the feature state. Do not use
`terraform destroy` as a substitute for product disablement.
