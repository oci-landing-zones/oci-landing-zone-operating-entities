# Generic Multi-OE with Hub C

## Overview

[Hub C](/addons/oci-hub-models/hub_c/readme.md) creates trust and untrust Network Load Balancers for a third-party firewall design. These files do not deploy, license, bootstrap, configure, or maintain the firewall appliances.

The example uses one integrated state, the shared `10.0.0.0/21` hub, and four repeated environment spokes:

| Scope | VCN CIDR |
|---|---:|
| Alpha production | `10.0.64.0/21` |
| Alpha pre-production | `10.0.128.0/21` |
| Beta production | `10.1.64.0/21` |
| Beta pre-production | `10.1.128.0/21` |

The public load balancer contains example Alpha-production backends. Replace them with real workload endpoints. Final routing contains placeholder trust and untrust NLB Private IP OCIDs.

![Hub C design](/addons/oci-hub-models/hub_c/images/hub_c_design.png)

## Exact file sets

Choose one CIS level. In Step 2, choose exactly one final network alternative. Never load both final network files.

| CIS level | Step 1 | Step 2 replacements |
|---|---|---|
| 1 | `multioe_iam.json`<br>`multioe_governance.json`<br>`multioe_network_hub_c_pre.json`<br>`multioe_security_cis1_pre.json`<br>`multioe_observability_cis1_pre.json` | Replace the network pre file with exactly one of `multioe_network_hub_c.json` or `multioe_network_hub_c_backends.json`; replace the other pre files with `multioe_security_cis1.json` and `multioe_observability_cis1.json` |
| 2 | `multioe_iam.json`<br>`multioe_governance.json`<br>`multioe_network_hub_c_pre.json`<br>`multioe_security_cis2_pre.json`<br>`multioe_observability_cis2_pre.json` | Replace the network pre file with exactly one of `multioe_network_hub_c.json` or `multioe_network_hub_c_backends.json`; replace the other pre files with `multioe_security_cis2.json` and `multioe_observability_cis2.json` |

Use `multioe_network_hub_c.json` when the landing-zone state only manages routing through the NLBs. Use `multioe_network_hub_c_backends.json` when the same state should also register separately deployed firewall interfaces as NLB backends.

## Staged deployment

1. Follow the [secure deployment guidance](readme.md#deployment-model) using Orchestrator `v2.1.3`.
2. Replace or remove every placeholder email address in the selected pre-observability file.
3. Plan and apply the Step 1 set.
4. Deploy and validate the third-party firewalls through the customer-owned process.
5. Replace every full example `network_entity_id` in the chosen final network file with the correct trust or untrust NLB Private IP OCID.
6. If using the backends variant, replace every example backend `target_id` with the matching firewall-interface Private IP OCID. Do not reuse trust OCIDs for untrust backends or vice versa.
7. Replace or remove every placeholder email address in the final observability file.
8. In the same configuration source and state, replace the three pre files with the chosen network final, security final, and observability final. Load exactly one final network alternative.
9. Review the new plan before applying Step 2.

The final security file targets Alpha production, Beta production, and the shared-network compartment. The final observability file enables VCN and subnet flow logs; review expected log volume and cost.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
