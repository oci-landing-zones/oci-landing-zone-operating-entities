# Terraform automation for Database Management on Base Database Service

This Resource Manager-compatible root enables DBM for Base Database Service
CDB, PDB, and non-CDB targets through LZ dependency keys, private endpoints,
and Vault secret references. It is the direct Terraform asset for the future
“Base Database” row in the Database Management Add-ons table.

Populate the ignored template from the database, network, and security
composition outputs. For fleets, use the root add-on's manifest renderer to
produce bounded CDB/PDB-safe waves before creating one Resource Manager stack
per wave.
