# ExaDB-D Workload Extension <!-- omit from toc -->

- [1. Summary](#1-summary)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Deployment Options](#3-deployment-options)
- [4. Database Workload Deployment](#4-database-workload-deployment)
- [5. Additional Resources](#5-additional-resources)

## 1. Summary

The ExaDB-D workload extension prepares the OCI landing-zone resources for Exadata Database Service on Dedicated Infrastructure. It uses the [One-OE blueprint](/blueprints/one-oe/readme.md) as its foundation.

Published foundation and regular database workload artifacts cover UC1–UC3 in both deployment modes. The foundation owns compartments, IAM, governance where applicable, networking, security where applicable, and observability. The optional regular workload adds infrastructure, VMCs, DB Homes, CDBs, and PDBs.

## 2. Architecture Overview

| Use case | Infrastructure placement | Database platform placement |
| --- | --- | --- |
| UC1 — Shared | One shared infrastructure | Shared VMCs/AVMCs |
| UC2 — Hybrid | One shared infrastructure | Dedicated VMCs/AVMCs per environment |
| UC3 — Dedicated | Dedicated infrastructure per environment | Dedicated VMCs/AVMCs per environment |

The foundations prepare the selected compartments, administration roles, platform VCNs, database and backup subnets, routing, and observability. Infrastructure-only scopes have no VCN. See the [use-case diagrams](exacs_use_cases/readme.md) for the placement details.

The regular database workload supports Cloud VM Clusters. Autonomous VM Clusters, Autonomous Container Databases, and Autonomous Database Dedicated lifecycle are outside that generated workload contract. **Manual post-deployment configuration required** for those resources; the workload owner manages lifecycle, drift, and compliance.

## 3. Deployment Options

| Path | Foundation | State and lifecycle | Guide |
| --- | --- | --- | --- |
| Published single-stack | One-OE Hub E and ExaDB-D prerequisites created together | One combined foundation state; matching regular workload can be included | [Single-stack](single-stack/readme.md) |
| Published multi-stack | ExaDB-D prerequisites added to an existing One-OE Hub A or Hub E | Separate foundation/extension states; regular workload adds three ordered states | [Multi-stack](multi-stack/readme.md) |
| Blueprint Factory | Generated for the reviewed placement, topology, and address plan | Generated package and its deployment contract | [Configuration reference](/addons/oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md) |

Hub E has no firewall and is reserved for PoC, lab, or explicitly non-production designs that accept that tradeoff. Production requires a firewall-based hub; Hub A is the published multi-stack option. Use Blueprint Factory for a customized firewalled single-stack foundation or other supported design changes.

OCI Resource Manager (ORM) with configuration files in a customer-controlled private OCI Object Storage bucket is the recommended delivery path. Use pinned OCI Landing Zone Orchestrator source with working directory `rms-facade`. Terraform CLI, customer-controlled CI/CD, and an approved private Git source are supported alternatives.

## 4. Database Workload Deployment

For the published UC1–UC3 single-stack workload, complete the matching foundation first, then add the reviewed workload file to that existing stack/state while retaining all foundation inputs. The unmodified foundation quickstart remains foundation-only because the workload needs tenancy-specific secret and SSH-key substitutions.

The multi-stack workload starts after the matching foundation, hub post-update, and final re-applies. It uses three ordered operations with separate states and output prefixes. Follow the [database-workload guide](database-workload/readme.md) for the selected UC files, substitutions, validated Orchestrator pin, and dependency boundaries.

## 5. Additional Resources

- [ExaDB-D use cases](exacs_use_cases/readme.md)
- [Single-stack foundation](single-stack/readme.md)
- [Multi-stack foundation](multi-stack/readme.md)
- [Regular database workload](database-workload/readme.md)
- [Blueprint Factory](/addons/oci-lz-blueprint-factory/README.md)

## License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
