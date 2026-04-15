# CIS Benchmark Mapping for OCI Operating Entities Landing Zones

## Overview

The CIS Oracle Cloud Infrastructure Benchmark is a community-developed set of secure configuration guidelines for OCI. In the context of this repository, CIS-aligned deployments are exposed as prebuilt JSON configuration sets that combine IAM, governance, networking, security, and observability components for specific landing zone scenarios.

This document provides a simplified view of how CIS-oriented configurations are represented in the Operating Entities Landing Zone repository. It highlights the common baseline shared by both CIS variants and the main additional controls introduced when using CIS v2.

It is intended as a repository-level guide, not as a full recommendation-by-recommendation CIS compliance matrix.

In this repository, `CIS v2` should be read as the `CIS v1` baseline plus additional controls and configuration components required by the `CIS v2` implementation for the same scenario.


## CIS v1 vs CIS v2

| Area | Common Baseline | CIS v1 | CIS v2 |
|---|---|---|---|
| IAM and Governance | Compartments, Groups, Identity Domain, Policies | - | - |
| Network | DRG, VCNs, Route Tables, Security Lists, NSGs, and related network components | - | - |
| Observability | Events, Alarms, VCN flow logs | - | - |
| Observability - Audit Logs | Object Storage bucket plus Service Connector for audit log export and retention | - | Adds KMS-protected bucket encryption using Vault key |
| Security - Security Posture | Cloud Guard and Vulnerability Scanning | - | - |
| Security - Vault | - | - | Vault and Software Key |
| Security - Security Zones | - | Security Zones with Recipe 01 CIS Level 1 | Security Zones with Recipe 02 CIS Level 2 |

### Security Zone Recipes

**Recipe 01 CIS Level 1**

- Object Storage buckets in a security zone cannot be public.
- Databases in a security zone must use private subnets, not public subnets.

**Recipe 02 CIS Level 2**

- Object Storage buckets in a security zone cannot be public.
- Databases in a security zone must use private subnets, not public subnets.
- Block volumes in a security zone must use a customer-managed master encryption key in the Vault service. They cannot use the default encryption key managed by Oracle.
- Boot volumes in a security zone must use a customer-managed master encryption key in the Vault service. They cannot use the default encryption key managed by Oracle.
- Object Storage buckets in a security zone must use a customer-managed master encryption key in the Vault service. They cannot use the default encryption key managed by Oracle.
- File systems in a security zone must use a customer-managed master encryption key in the Vault service. They cannot use the default encryption key managed by Oracle.


## Reference Documents

- CIS Oracle Cloud Infrastructure Benchmark: `https://www.cisecurity.org/benchmark/Oracle_Cloud`
- Core Landing Zone example mapping: `https://github.com/oci-landing-zones/terraform-oci-core-landingzone/blob/main/ARCH-MAPPING-CIS.md`
- One-OE Hub A CIS documentation: `../../blueprints/one-oe/runtime/one-stack/one_oe_hub_a.md`
- General FAQ: `../../faq/faq_general.md`

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
