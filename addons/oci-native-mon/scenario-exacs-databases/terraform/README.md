# Terraform automation for Database Management on ExaDB-D

This Resource Manager-compatible root enables DBM for Exadata Database Service
on Dedicated Infrastructure (the existing LZ `EXACS` naming convention). It
uses LZ database, private-endpoint, and Vault-secret dependency keys and
supports explicit CDB/PDB ordering.

Populate the ignored template from LZ outputs. Use the fleet renderer for
bounded waves and deploy each generated root through a separate OCI Resource
Manager stack/state.
