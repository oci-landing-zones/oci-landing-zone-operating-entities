# One-OE Observability Runtime

This inventory summarizes the observability resources deployed by the published One-OE blueprint. Use it as a concise operational reference for deployed Events, alarms, Notifications and VCN Flow Logs.

## Runtime inventory

The tables reflect both `oneoe_observability_cis1.json` and `oneoe_observability_cis2.json`. Network and security event rules are also emitted for each configured environment; the standard blueprint includes `prod` and `preprod`. The standard blueprint has 52 alarms: 38 are enabled and 14 are disabled. CIS2 additionally encrypts the Audit Service Connector bucket with a KMS key.

### Events

| Rule key | Scope | Event coverage | Destination topic |
|---|---|---|---|
| `RUL-LZ-NOTIFY-NETWORK-KEY` | Shared network | 43 VCN, routing, security list, NSG, DRG, gateway, public IP, and DHCP option lifecycle events | `NOTT-LZ-NETWORK-KEY` |
| `RUL-LZ-NOTIFY-SECURITY-KEY` | Shared security | 6 Notifications subscription lifecycle events | `NOTT-LZ-SECURITY-KEY` |
| `RUL-LZ-PROD-NOTIFY-NETWORK-KEY` | Prod dedicated | 43 network lifecycle events | `NOTT-LZ-NETWORK-KEY` |
| `RUL-LZ-PROD-NOTIFY-SECURITY-KEY` | Prod dedicated | 6 Notifications subscription lifecycle events | `NOTT-LZ-SECURITY-KEY` |
| `RUL-LZ-PREPROD-NOTIFY-NETWORK-KEY` | Preprod dedicated | 43 network lifecycle events | `NOTT-LZ-NETWORK-KEY` |
| `RUL-LZ-PREPROD-NOTIFY-SECURITY-KEY` | Preprod dedicated | 6 Notifications subscription lifecycle events | `NOTT-LZ-SECURITY-KEY` |
| `RUL-LZ-CLOUDGUARD-KEY` | Tenancy home region | 6 Cloud Guard problem and status events | `NOTT-LZ-CLOUDGUARD-KEY` |
| `RUL-LZ-IAM-KEY` | Tenancy home region | 21 IAM identity provider, group, policy, user, and credential events | `NOTT-LZ-IAM-KEY` |

### Alarms

The Scope column identifies the monitored resource coverage. Alarm resources are created centrally in the shared security compartment.

| Alarm key | Alarm name | Description | Scope | Namespace | Severity | Pending duration | Destination topic | Enabled |
|---|---|---|---|---|---|---|---|---|
| `AL-LZ-VNIC-CONNTRACK-WARNING-KEY` | `al-lz-vnic-conntrack-warning` | Connection table utilization is approaching capacity | Shared network | `oci_vcn` | WARNING | `PT10M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-CONNTRACK-CRITICAL-KEY` | `al-lz-vnic-conntrack-critical` | Connection table utilization is near exhaustion | Shared network | `oci_vcn` | CRITICAL | `PT5M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-VNIC-CONNTRACK-FULL-KEY` | `al-lz-vnic-conntrack-full` | The VNIC connection tracking table is full | Shared network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-VNIC-INGRESS-CONNTRACK-DROPS-KEY` | `al-lz-vnic-ingress-conntrack-drops` | Ingress packets were dropped because conntrack was full | Shared network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-VNIC-EGRESS-CONNTRACK-DROPS-KEY` | `al-lz-vnic-egress-conntrack-drops` | Egress packets were dropped because conntrack was full | Shared network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-VNIC-INGRESS-THROTTLE-DROPS-KEY` | `al-lz-vnic-ingress-throttle-drops` | Ingress packets were dropped by VNIC throttling | Shared network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-VNIC-EGRESS-THROTTLE-DROPS-KEY` | `al-lz-vnic-egress-throttle-drops` | Egress packets were dropped by VNIC throttling | Shared network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-VNIC-SMARTNIC-NETWORK-DROPS-KEY` | `al-lz-vnic-smartnic-network-drops` | SmartNIC dropped packets received from the network because its buffer was exhausted | Shared network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-VNIC-SMARTNIC-HOST-DROPS-KEY` | `al-lz-vnic-smartnic-host-drops` | SmartNIC dropped host packets because its buffer was exhausted | Shared network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-VNIC-EGRESS-SECURITY-DROPS-KEY` | `al-lz-vnic-egress-security-drops` | Egress packets were rejected by a security rule | Shared network | `oci_vcn` | WARNING | `PT5M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-PROD-VNIC-CONNTRACK-WARNING-KEY` | `al-lz-prod-vnic-conntrack-warning` | Connection table utilization is approaching capacity | Prod dedicated | `oci_vcn` | WARNING | `PT10M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-PROD-VNIC-CONNTRACK-CRITICAL-KEY` | `al-lz-prod-vnic-conntrack-critical` | Connection table utilization is near exhaustion | Prod dedicated | `oci_vcn` | CRITICAL | `PT5M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PROD-VNIC-CONNTRACK-FULL-KEY` | `al-lz-prod-vnic-conntrack-full` | The VNIC connection tracking table is full | Prod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PROD-VNIC-INGRESS-CONNTRACK-DROPS-KEY` | `al-lz-prod-vnic-ingress-conntrack-drops` | Ingress packets were dropped because conntrack was full | Prod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PROD-VNIC-EGRESS-CONNTRACK-DROPS-KEY` | `al-lz-prod-vnic-egress-conntrack-drops` | Egress packets were dropped because conntrack was full | Prod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PROD-VNIC-INGRESS-THROTTLE-DROPS-KEY` | `al-lz-prod-vnic-ingress-throttle-drops` | Ingress packets were dropped by VNIC throttling | Prod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PROD-VNIC-EGRESS-THROTTLE-DROPS-KEY` | `al-lz-prod-vnic-egress-throttle-drops` | Egress packets were dropped by VNIC throttling | Prod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PROD-VNIC-SMARTNIC-NETWORK-DROPS-KEY` | `al-lz-prod-vnic-smartnic-network-drops` | SmartNIC dropped packets received from the network because its buffer was exhausted | Prod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PROD-VNIC-SMARTNIC-HOST-DROPS-KEY` | `al-lz-prod-vnic-smartnic-host-drops` | SmartNIC dropped host packets because its buffer was exhausted | Prod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PROD-VNIC-EGRESS-SECURITY-DROPS-KEY` | `al-lz-prod-vnic-egress-security-drops` | Egress packets were rejected by a security rule | Prod dedicated | `oci_vcn` | WARNING | `PT5M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-PREPROD-VNIC-CONNTRACK-WARNING-KEY` | `al-lz-preprod-vnic-conntrack-warning` | Connection table utilization is approaching capacity | Preprod dedicated | `oci_vcn` | WARNING | `PT10M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-PREPROD-VNIC-CONNTRACK-CRITICAL-KEY` | `al-lz-preprod-vnic-conntrack-critical` | Connection table utilization is near exhaustion | Preprod dedicated | `oci_vcn` | CRITICAL | `PT5M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PREPROD-VNIC-CONNTRACK-FULL-KEY` | `al-lz-preprod-vnic-conntrack-full` | The VNIC connection tracking table is full | Preprod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PREPROD-VNIC-INGRESS-CONNTRACK-DROPS-KEY` | `al-lz-preprod-vnic-ingress-conntrack-drops` | Ingress packets were dropped because conntrack was full | Preprod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PREPROD-VNIC-EGRESS-CONNTRACK-DROPS-KEY` | `al-lz-preprod-vnic-egress-conntrack-drops` | Egress packets were dropped because conntrack was full | Preprod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PREPROD-VNIC-INGRESS-THROTTLE-DROPS-KEY` | `al-lz-preprod-vnic-ingress-throttle-drops` | Ingress packets were dropped by VNIC throttling | Preprod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PREPROD-VNIC-EGRESS-THROTTLE-DROPS-KEY` | `al-lz-preprod-vnic-egress-throttle-drops` | Egress packets were dropped by VNIC throttling | Preprod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PREPROD-VNIC-SMARTNIC-NETWORK-DROPS-KEY` | `al-lz-preprod-vnic-smartnic-network-drops` | SmartNIC dropped packets received from the network because its buffer was exhausted | Preprod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PREPROD-VNIC-SMARTNIC-HOST-DROPS-KEY` | `al-lz-preprod-vnic-smartnic-host-drops` | SmartNIC dropped host packets because its buffer was exhausted | Preprod dedicated | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-PREPROD-VNIC-EGRESS-SECURITY-DROPS-KEY` | `al-lz-preprod-vnic-egress-security-drops` | Egress packets were rejected by a security rule | Preprod dedicated | `oci_vcn` | WARNING | `PT5M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY` | `al-lz-network-lb-unhealthy-backend` | At least one backend in a backend set is unhealthy | Shared network | `oci_lbaas` | CRITICAL | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-NETWORK-LB-BACKEND-TIMEOUT-KEY` | `al-lz-network-lb-backend-timeout` | A backend request timed out | Shared network | `oci_lbaas` | CRITICAL | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Enabled |
| `AL-LZ-NETWORK-NLB-UNHEALTHY-BACKEND-KEY` | `al-lz-network-nlb-unhealthy-backend` | At least one NLB backend is unhealthy | Shared network | `oci_nlb` | CRITICAL | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-NLB-NO-HEALTHY-BACKENDS-KEY` | `al-lz-network-nlb-no-healthy-backends` | The NLB has no healthy backend | Shared network | `oci_nlb` | CRITICAL | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-NLB-INGRESS-SECURITY-DROPS-KEY` | `al-lz-network-nlb-ingress-security-drops` | Ingress packets were dropped by a security list | Shared network | `oci_nlb` | WARNING | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-NLB-EGRESS-SECURITY-DROPS-KEY` | `al-lz-network-nlb-egress-security-drops` | Egress packets were dropped by a security list | Shared network | `oci_nlb` | WARNING | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-COMPUTE-VM-UNRESPONSIVE-KEY` | `al-lz-compute-vm-unresponsive` | The instance is not responding to the accessibility probe | Shared network | `oci_compute_instance_health` | CRITICAL | `PT2M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-COMPUTE-FILE-SYSTEM-ANOMALY-KEY` | `al-lz-compute-file-system-anomaly` | The instance health service detected a file-system issue | Shared network | `oci_compute_instance_health` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-COMPUTE-INFRASTRUCTURE-ISSUE-KEY` | `al-lz-compute-infrastructure-issue` | OCI reported an infrastructure issue for the instance | Shared network | `oci_compute_infrastructure_health` | CRITICAL | `PT2M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-COMPUTE-BARE-METAL-DEFECT-KEY` | `al-lz-compute-bare-metal-defect` | OCI reported a bare-metal health defect | Shared network | `oci_compute_infrastructure_health` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-COMPUTE-MAINTENANCE-SCHEDULED-KEY` | `al-lz-compute-maintenance-scheduled` | OCI reported scheduled maintenance | Shared network | `oci_compute_infrastructure_health` | WARNING | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-COMPUTE-CPU-WARNING-KEY` | `al-lz-compute-cpu-warning` | Mean CPU utilization is at least 75% | Shared network | `oci_computeagent` | WARNING | `PT10M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-COMPUTE-CPU-CRITICAL-KEY` | `al-lz-compute-cpu-critical` | Mean CPU utilization is at least 90% | Shared network | `oci_computeagent` | CRITICAL | `PT5M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-COMPUTE-MEMORY-WARNING-KEY` | `al-lz-compute-memory-warning` | Mean memory utilization is at least 75% | Shared network | `oci_computeagent` | WARNING | `PT10M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-COMPUTE-MEMORY-CRITICAL-KEY` | `al-lz-compute-memory-critical` | Mean memory utilization is at least 90% | Shared network | `oci_computeagent` | CRITICAL | `PT5M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-BLOCK-VOLUME-THROTTLED-IO-KEY` | `al-lz-block-volume-throttled-io` | One or more volume operations were throttled | Shared network | `oci_blockstore` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-NOTIFICATION-DELIVERY-FAILED-KEY` | `al-lz-notification-delivery-failed` | Notifications could not deliver one or more messages | Shared security | `oci_notification` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-EVENT-DELIVERY-FAILED-KEY` | `al-lz-event-delivery-failed` | An Events rule could not deliver to one or more actions | Shared security | `oci_cloudevents` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-AUDIT-CONNECTOR-INTERNAL-ERRORS-KEY` | `al-lz-audit-connector-internal-errors` | Connector Hub reported errors moving data | Shared security | `oci_service_connector_hub` | CRITICAL | `PT15M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-AUDIT-CONNECTOR-SOURCE-ERRORS-KEY` | `al-lz-audit-connector-source-errors` | The connector repeatedly failed to read Audit logs | Shared security | `oci_service_connector_hub` | WARNING | `PT30M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-AUDIT-CONNECTOR-TARGET-ERRORS-KEY` | `al-lz-audit-connector-target-errors` | The connector repeatedly failed to write to Object Storage | Shared security | `oci_service_connector_hub` | CRITICAL | `PT30M` | `NOTT-LZ-SECURITY-KEY` | Enabled |
| `AL-LZ-AUDIT-CONNECTOR-STALE-KEY` | `al-lz-audit-connector-stale` | The most recently processed Audit record is more than 12 hours old | Shared security | `oci_service_connector_hub` | CRITICAL | `PT30M` | `NOTT-LZ-SECURITY-KEY` | Enabled |

### Notifications

All notification topics are created in the shared security compartment. The published blueprint includes an `email.address@example.com` placeholder subscription that must be replaced with an operational recipient before deployment.

| Topic key | Topic name | Scope | Subscription protocol | Default subscription | Description |
|---|---|---|---|---|---|
| `NOTT-LZ-CLOUDGUARD-KEY` | `nott-lz-cloudguard` | Shared security | `EMAIL` | `email.address@example.com` | Cloud Guard related notifications |
| `NOTT-LZ-IAM-KEY` | `nott-lz-iam` | Shared security | `EMAIL` | `email.address@example.com` | IAM related notifications |
| `NOTT-LZ-NETWORK-KEY` | `nott-lz-network` | Shared security | `EMAIL` | `email.address@example.com` | Network related notifications |
| `NOTT-LZ-SECURITY-KEY` | `nott-lz-security` | Shared security | `EMAIL` | `email.address@example.com` | General notifications |

### VCN Flow Logs

VCN Flow Logs are included in the non-`_pre` observability configurations (`oneoe_observability_cis1.json` and `oneoe_observability_cis2.json`).

| Flow log key | Scope | Target resource type | Target network compartment | Log group key |
|---|---|---|---|---|
| `LOG-LZ-SUBNET-FLOW-KEY` | Shared network | Subnet | `CMP-LZ-NETWORK-KEY` | `LGRP-LZ-VCN-FLOW-KEY` |
| `LOG-LZ-VCN-FLOW-KEY` | Shared network | VCN | `CMP-LZ-NETWORK-KEY` | `LGRP-LZ-VCN-FLOW-KEY` |
| `LOG-LZ-PROD-SUBNET-FLOW-KEY` | Prod dedicated | Subnet | `CMP-LZ-PROD-NETWORK-KEY` | `LGRP-LZ-PROD-VCN-FLOW-KEY` |
| `LOG-LZ-PROD-VCN-FLOW-KEY` | Prod dedicated | VCN | `CMP-LZ-PROD-NETWORK-KEY` | `LGRP-LZ-PROD-VCN-FLOW-KEY` |
| `LOG-LZ-PREPROD-SUBNET-FLOW-KEY` | Preprod dedicated | Subnet | `CMP-LZ-PREPROD-NETWORK-KEY` | `LGRP-LZ-PREPROD-VCN-FLOW-KEY` |
| `LOG-LZ-PREPROD-VCN-FLOW-KEY` | Preprod dedicated | VCN | `CMP-LZ-PREPROD-NETWORK-KEY` | `LGRP-LZ-PREPROD-VCN-FLOW-KEY` |


# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
