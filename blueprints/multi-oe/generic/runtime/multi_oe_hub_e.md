# Generic Multi-OE with Hub E

## Overview

[Hub E](/addons/oci-hub-models/hub_e/readme.md) does not include a firewall. Reserve it for PoC, lab, or explicitly non-production deployments where the reduced inspection, simplicity, and cost tradeoff is accepted. The example environment names do not make Hub E suitable for production.

The example uses one integrated state, the shared `10.0.0.0/21` hub, and four repeated environment spokes:

| Scope | VCN CIDR |
|---|---:|
| Alpha production | `10.0.64.0/21` |
| Alpha pre-production | `10.0.128.0/21` |
| Beta production | `10.1.64.0/21` |
| Beta pre-production | `10.1.128.0/21` |

The public load balancer contains example Alpha-production backends. Replace them with real workload endpoints.

![Hub E design](/addons/oci-hub-models/hub_e/images/hub_e_design.png)

## Exact file sets

Hub E uses its final network file from Step 1. Choose one CIS level and keep the five selected files in the same configuration source and state.

| CIS level | Step 1 | Step 2 replacements |
|---|---|---|
| 1 | `multioe_iam.json`<br>`multioe_governance.json`<br>`multioe_network_hub_e.json`<br>`multioe_security_cis1_pre.json`<br>`multioe_observability_cis1_pre.json` | Keep IAM, governance, and network; replace the pre files with `multioe_security_cis1.json` and `multioe_observability_cis1.json` |
| 2 | `multioe_iam.json`<br>`multioe_governance.json`<br>`multioe_network_hub_e.json`<br>`multioe_security_cis2_pre.json`<br>`multioe_observability_cis2_pre.json` | Keep IAM, governance, and network; replace the pre files with `multioe_security_cis2.json` and `multioe_observability_cis2.json` |

## Staged deployment

1. Follow the [secure deployment guidance](readme.md#deployment-model) using Orchestrator `v2.1.3`.
2. Replace or remove every placeholder email address in the selected pre-observability file.
3. Plan and apply the Step 1 set.
4. Replace or remove every placeholder email address in the final observability file.
5. In the same configuration source and state, keep the final network file and replace only the security and observability pre files. Do not load pre and final variants together.
6. Review the new plan before applying Step 2.

The final security file targets Alpha production, Beta production, and the shared-network compartment. The final observability file enables VCN and subnet flow logs; review expected log volume and cost.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
