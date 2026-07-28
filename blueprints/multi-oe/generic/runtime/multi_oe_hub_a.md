# Generic Multi-OE with Hub A

## Overview

[Hub A](/addons/oci-hub-models/hub_a/readme.md) routes traffic through separate DMZ and internal OCI Network Firewalls. It is a production-capable option and incurs charges for two firewall instances.

The example uses one integrated state, the shared `10.0.0.0/21` hub, and four repeated environment spokes:

| Scope | VCN CIDR |
|---|---:|
| Alpha production | `10.0.64.0/21` |
| Alpha pre-production | `10.0.128.0/21` |
| Beta production | `10.1.64.0/21` |
| Beta pre-production | `10.1.128.0/21` |

The public load balancer contains example Alpha-production backends. Replace them with real workload endpoints. Final routing also contains placeholder firewall Private IP OCIDs.

![Hub A design](/addons/oci-hub-models/hub_a/images/hub_a_design.png)

## Exact file sets

Choose one CIS level. Keep the five selected files in the same configuration source and state.

| CIS level | Step 1 | Step 2 replacements |
|---|---|---|
| 1 | `multioe_iam.json`<br>`multioe_governance.json`<br>`multioe_network_hub_a_pre.json`<br>`multioe_security_cis1_pre.json`<br>`multioe_observability_cis1_pre.json` | Replace network, security, and observability pre files with `multioe_network_hub_a.json`, `multioe_security_cis1.json`, and `multioe_observability_cis1.json` |
| 2 | `multioe_iam.json`<br>`multioe_governance.json`<br>`multioe_network_hub_a_pre.json`<br>`multioe_security_cis2_pre.json`<br>`multioe_observability_cis2_pre.json` | Replace network, security, and observability pre files with `multioe_network_hub_a.json`, `multioe_security_cis2.json`, and `multioe_observability_cis2.json` |

## Staged deployment

1. Follow the [secure deployment guidance](readme.md#deployment-model) using Orchestrator `v2.1.3`.
2. Replace or remove every placeholder email address in the selected pre-observability file.
3. Plan and apply the Step 1 set.
4. Obtain both deployed firewall Private IP OCIDs.
5. Replace every full example `network_entity_id` value in `multioe_network_hub_a.json` with the correct DMZ or internal firewall Private IP OCID.
6. Replace or remove every placeholder email address in the final observability file.
7. In the same configuration source and state, replace the three pre files with the three final files. Do not load pre and final variants together.
8. Review the new plan before applying Step 2.

The final security file targets Alpha production, Beta production, and the shared-network compartment. The final observability file enables VCN and subnet flow logs; review expected log volume and cost.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
