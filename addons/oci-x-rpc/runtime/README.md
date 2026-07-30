# OCI Remote Peering Connection Runtime Files

## DRG Routing Reference

The diagram shows a sample cross-tenancy design with Tenancy 1 using Hub A and Tenancy 2 using Hub E.

<img src="../images/drg-routing.png" width="100%">

> [!NOTE]
> The diagram is a routing reference. Tenancy 1 and Tenancy 2 may use different supported One-OE hub models, including firewalls on both sides, only one side, or another reviewed combination.

## Tested Reference Samples

These files are the tested working reference for the Tenancy 1 acceptor and Tenancy 2 requester design:

- `tenancy1_iam.json`
- `tenancy1_network.json`
- `tenancy1_governance.json`
- `tenancy2_iam.json`
- `tenancy2_network.json`
- `tenancy2_governance.json`

This add-on runtime keeps only RPC-specific Tenancy 1 and Tenancy 2 configuration files. It does not include full One-OE configs; these files are working reference sample configs to establish cross-tenancy RPC.

Governance remains part of the normal One-OE deployment. The governance reference files are retained for comparison and are not generated as RPC-only fragments.

## Blueprint Factory Fragments

These compact files are generated from complete One-OE profiles and projected to the RPC-only network and IAM delta:

- `same_tenancy_acceptor_network.json`
- `same_tenancy_requester_network.json`
- `cross_tenancy_acceptor_iam.json`
- `cross_tenancy_acceptor_network.json`
- `cross_tenancy_requester_iam.json`
- `cross_tenancy_requester_network.json`

Use `bash gen/generate.sh --config <config_file> <output_directory>` to generate complete customer-specific One-OE outputs. Do not deploy a compact fragment as a replacement for the complete One-OE file set; merge or orchestrate it according to the target deployment workflow.

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
