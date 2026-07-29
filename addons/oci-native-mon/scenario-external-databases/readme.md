# External Databases

External Database DBM registration uses its dedicated
[Terraform root](./terraform/) for external CDB, PDB, and non-CDB resources
connected through Management Agents. OPSI remains a separate provider/API
contract.

The supported Database Management path registers each external database and
enables the feature through an existing Management Agent. The supported Log
Analytics path is:

1. provision or identify the Management Agent and external database entity;
2. select reviewed Oracle-defined sources in the fleet manifest;
3. render the collection JSON;
4. validate without mutation;
5. run `configure --apply` under change approval; and
6. verify both association state and actual scoped log rows.

This separation prevents an external target from being silently treated as an
OCI Base Database target.
