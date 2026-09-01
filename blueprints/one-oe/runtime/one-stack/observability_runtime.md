# One-OE Observability Runtime

This inventory summarizes the observability resources deployed by the published One-OE runtime profile. Use it as a concise operational reference for deployed Events, alarms, and VCN Flow Logs. For MQL design, compartment placement, threshold selection, validation, and operational guidance, see [Observability Best Practices](observability_best_practices.md).

## Runtime inventory

The tables reflect both `oneoe_observability_cis1.json` and `oneoe_observability_cis2.json`. Network and security event rules are also emitted for each configured environment; the standard profile includes `prod` and `preprod`. Compute and Block Volume alarms are emitted for every project in its own compartment; the standard profile has 42 alarms. All alarms are deployed disabled. CIS2 additionally encrypts the Audit Service Connector bucket with a KMS key.

### Events

| Rule key | Scope | Event coverage | Destination topic |
|---|---|---|---|
| `RUL-LZ-NOTIFY-NETWORK-KEY` | Landing Zone network compartment | 43 VCN, routing, security list, NSG, DRG, gateway, public IP, and DHCP option lifecycle events | `NOTT-LZ-NETWORK-KEY` |
| `RUL-LZ-NOTIFY-SECURITY-KEY` | Landing Zone security compartment | 6 Notifications subscription lifecycle events | `NOTT-LZ-SECURITY-KEY` |
| `RUL-LZ-PROD-NOTIFY-NETWORK-KEY` | Prod network compartment | 43 network lifecycle events | `NOTT-LZ-NETWORK-KEY` |
| `RUL-LZ-PROD-NOTIFY-SECURITY-KEY` | Prod security compartment | 6 Notifications subscription lifecycle events | `NOTT-LZ-SECURITY-KEY` |
| `RUL-LZ-PREPROD-NOTIFY-NETWORK-KEY` | Preprod network compartment | 43 network lifecycle events | `NOTT-LZ-NETWORK-KEY` |
| `RUL-LZ-PREPROD-NOTIFY-SECURITY-KEY` | Preprod security compartment | 6 Notifications subscription lifecycle events | `NOTT-LZ-SECURITY-KEY` |
| `RUL-LZ-CLOUDGUARD-KEY` | Tenancy home region | 6 Cloud Guard problem and status events | `NOTT-LZ-CLOUDGUARD-KEY` |
| `RUL-LZ-IAM-KEY` | Tenancy home region | 21 IAM identity provider, group, policy, user, and credential events | `NOTT-LZ-IAM-KEY` |

### Alarms

| Alarm key | Alarm name | Description | Scope | Namespace | Severity | Pending duration | Destination topic | Enabled |
|---|---|---|---|---|---|---|---|---|
| `AL-LZ-VNIC-CONNTRACK-WARNING-KEY` | `al-lz-vnic-conntrack-warning` | Connection table utilization is approaching capacity | Landing Zone network | `oci_vcn` | WARNING | `PT10M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-CONNTRACK-CRITICAL-KEY` | `al-lz-vnic-conntrack-critical` | Connection table utilization is near exhaustion | Landing Zone network | `oci_vcn` | CRITICAL | `PT5M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-CONNTRACK-FULL-KEY` | `al-lz-vnic-conntrack-full` | The VNIC connection tracking table is full | Landing Zone network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-INGRESS-CONNTRACK-DROPS-KEY` | `al-lz-vnic-ingress-conntrack-drops` | Ingress packets were dropped because conntrack was full | Landing Zone network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-EGRESS-CONNTRACK-DROPS-KEY` | `al-lz-vnic-egress-conntrack-drops` | Egress packets were dropped because conntrack was full | Landing Zone network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-INGRESS-THROTTLE-DROPS-KEY` | `al-lz-vnic-ingress-throttle-drops` | Ingress packets were dropped by VNIC throttling | Landing Zone network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-EGRESS-THROTTLE-DROPS-KEY` | `al-lz-vnic-egress-throttle-drops` | Egress packets were dropped by VNIC throttling | Landing Zone network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-SMARTNIC-NETWORK-DROPS-KEY` | `al-lz-vnic-smartnic-network-drops` | SmartNIC dropped packets received from the network because its buffer was exhausted | Landing Zone network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-SMARTNIC-HOST-DROPS-KEY` | `al-lz-vnic-smartnic-host-drops` | SmartNIC dropped host packets because its buffer was exhausted | Landing Zone network | `oci_vcn` | CRITICAL | `PT1M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-VNIC-EGRESS-SECURITY-DROPS-KEY` | `al-lz-vnic-egress-security-drops` | Egress packets were rejected by a security rule | Landing Zone network | `oci_vcn` | WARNING | `PT5M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-LB-UNHEALTHY-BACKEND-KEY` | `al-lz-network-lb-unhealthy-backend` | At least one backend in a backend set is unhealthy | Landing Zone network | `oci_lbaas` | CRITICAL | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-LB-BACKEND-TIMEOUT-KEY` | `al-lz-network-lb-backend-timeout` | A backend request timed out | Landing Zone network | `oci_lbaas` | CRITICAL | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-NLB-UNHEALTHY-BACKEND-KEY` | `al-lz-network-nlb-unhealthy-backend` | At least one NLB backend is unhealthy | Landing Zone network | `oci_nlb` | CRITICAL | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-NLB-NO-HEALTHY-BACKENDS-KEY` | `al-lz-network-nlb-no-healthy-backends` | The NLB has no healthy backend | Landing Zone network | `oci_nlb` | CRITICAL | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-NLB-INGRESS-SECURITY-DROPS-KEY` | `al-lz-network-nlb-ingress-security-drops` | Ingress packets were dropped by a security list | Landing Zone network | `oci_nlb` | WARNING | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-NETWORK-NLB-EGRESS-SECURITY-DROPS-KEY` | `al-lz-network-nlb-egress-security-drops` | Egress packets were dropped by a security list | Landing Zone network | `oci_nlb` | WARNING | `PT2M` | `NOTT-LZ-NETWORK-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-VM-UNRESPONSIVE-KEY` | `al-lz-<env>-<project>-compute-vm-unresponsive` | The instance is not responding to the accessibility probe | Project compartment | `oci_compute_instance_health` | CRITICAL | `PT2M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-FILE-SYSTEM-ANOMALY-KEY` | `al-lz-<env>-<project>-compute-file-system-anomaly` | The instance health service detected a file-system issue | Project compartment | `oci_compute_instance_health` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-INFRASTRUCTURE-ISSUE-KEY` | `al-lz-<env>-<project>-compute-infrastructure-issue` | OCI reported an infrastructure issue for the instance | Project compartment | `oci_compute_infrastructure_health` | CRITICAL | `PT2M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-BARE-METAL-DEFECT-KEY` | `al-lz-<env>-<project>-compute-bare-metal-defect` | OCI reported a bare-metal health defect | Project compartment | `oci_compute_infrastructure_health` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-MAINTENANCE-SCHEDULED-KEY` | `al-lz-<env>-<project>-compute-maintenance-scheduled` | OCI reported scheduled maintenance | Project compartment | `oci_compute_infrastructure_health` | WARNING | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-CPU-WARNING-KEY` | `al-lz-<env>-<project>-compute-cpu-warning` | Mean CPU utilization is at least 75% | Project compartment | `oci_computeagent` | WARNING | `PT10M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-CPU-CRITICAL-KEY` | `al-lz-<env>-<project>-compute-cpu-critical` | Mean CPU utilization is at least 90% | Project compartment | `oci_computeagent` | CRITICAL | `PT5M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-MEMORY-WARNING-KEY` | `al-lz-<env>-<project>-compute-memory-warning` | Mean memory utilization is at least 75% | Project compartment | `oci_computeagent` | WARNING | `PT10M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-COMPUTE-MEMORY-CRITICAL-KEY` | `al-lz-<env>-<project>-compute-memory-critical` | Mean memory utilization is at least 90% | Project compartment | `oci_computeagent` | CRITICAL | `PT5M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-<ENV>-<PROJECT>-BLOCK-VOLUME-THROTTLED-IO-KEY` | `al-lz-<env>-<project>-block-volume-throttled-io` | One or more volume operations were throttled | Project compartment | `oci_blockstore` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-NOTIFICATION-DELIVERY-FAILED-KEY` | `al-lz-notification-delivery-failed` | Notifications could not deliver one or more messages | Shared observability services | `oci_notification` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-EVENT-DELIVERY-FAILED-KEY` | `al-lz-event-delivery-failed` | An Events rule could not deliver to one or more actions | Shared observability services | `oci_cloudevents` | CRITICAL | `PT1M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-AUDIT-CONNECTOR-INTERNAL-ERRORS-KEY` | `al-lz-audit-connector-internal-errors` | Connector Hub reported errors moving data | Shared observability services | `oci_service_connector_hub` | CRITICAL | `PT15M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-AUDIT-CONNECTOR-SOURCE-ERRORS-KEY` | `al-lz-audit-connector-source-errors` | The connector repeatedly failed to read Audit logs | Shared observability services | `oci_service_connector_hub` | WARNING | `PT30M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-AUDIT-CONNECTOR-TARGET-ERRORS-KEY` | `al-lz-audit-connector-target-errors` | The connector repeatedly failed to write to Object Storage | Shared observability services | `oci_service_connector_hub` | CRITICAL | `PT30M` | `NOTT-LZ-SECURITY-KEY` | Disabled |
| `AL-LZ-AUDIT-CONNECTOR-STALE-KEY` | `al-lz-audit-connector-stale` | The most recently processed Audit record is more than 12 hours old | Shared observability services | `oci_service_connector_hub` | CRITICAL | `PT30M` | `NOTT-LZ-SECURITY-KEY` | Disabled |

### VCN Flow Logs

VCN Flow Logs are included in the non-`_pre` observability configurations (`oneoe_observability_cis1.json` and `oneoe_observability_cis2.json`).

| Flow log key | Scope | Target resource type | Target network compartment | Log group key |
|---|---|---|---|---|
| `LOG-LZ-SUBNET-FLOW-KEY` | Landing Zone | Subnet | `CMP-LZ-NETWORK-KEY` | `LGRP-LZ-VCN-FLOW-KEY` |
| `LOG-LZ-VCN-FLOW-KEY` | Landing Zone | VCN | `CMP-LZ-NETWORK-KEY` | `LGRP-LZ-VCN-FLOW-KEY` |
| `LOG-LZ-PROD-SUBNET-FLOW-KEY` | Production environment | Subnet | `CMP-LZ-PROD-NETWORK-KEY` | `LGRP-LZ-PROD-VCN-FLOW-KEY` |
| `LOG-LZ-PROD-VCN-FLOW-KEY` | Production environment | VCN | `CMP-LZ-PROD-NETWORK-KEY` | `LGRP-LZ-PROD-VCN-FLOW-KEY` |
| `LOG-LZ-PREPROD-SUBNET-FLOW-KEY` | Pre-production environment | Subnet | `CMP-LZ-PREPROD-NETWORK-KEY` | `LGRP-LZ-PREPROD-VCN-FLOW-KEY` |
| `LOG-LZ-PREPROD-VCN-FLOW-KEY` | Pre-production environment | VCN | `CMP-LZ-PREPROD-NETWORK-KEY` | `LGRP-LZ-PREPROD-VCN-FLOW-KEY` |

## Deployment notes

- VCN Flow Logs are present only in non-`_pre` configurations: `oneoe_observability_cis1.json` and `oneoe_observability_cis2.json`.
- Enable an alarm only after validating its metric compartment, MQL query, threshold, destination topic, and response runbook.
- The inventory is generated from the declarative source in [`gen/builders/observability.libsonnet`](../../../../gen/builders/observability.libsonnet).
