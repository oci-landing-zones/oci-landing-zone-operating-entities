# OCI Landing Zone Observability Baseline and Alarm Best Practices

> A governed baseline for OCI Monitoring alarms, Events, Logging,
> Notifications, and safe integration with OCI Landing Zone observability
> configurations.

## Contents

- [Purpose and scope](#purpose-and-scope)
- [Align with the Landing Zone observability design](#align-with-the-landing-zone-observability-design)
- [Understand MQL before defining alarms](#understand-mql-before-defining-alarms)
- [Place alarms and metrics in the correct compartments](#place-alarms-and-metrics-in-the-correct-compartments)
- [Map operational conditions to severity](#map-operational-conditions-to-severity)
- [Recommended baseline alarms](#recommended-baseline-alarms)
- [Notifications, Events, and Logging](#notifications-events-and-logging)
- [Safe Terraform and Landing Zone integration](#safe-terraform-and-landing-zone-integration)
- [Validation and recurring review](#validation-and-recurring-review)

## Purpose and scope

This guide is for platform, infrastructure, SRE, and observability teams that
operate an OCI Landing Zone or want to adopt the same governed observability
model.

The baseline is workload-agnostic. It does not define a universal SLO.
Thresholds must reflect customer impact, redundancy, scaling, resource size,
traffic patterns, and recovery objectives.

The baseline contains recommended OCI service alarms only. Workload extensions,
such as OKE or Exadata, should carry their own service-specific observability
definitions.


Use the current
[OCI Monitoring overview](https://docs.oracle.com/en-us/iaas/Content/Monitoring/home.htm)
as the service authority.

Apply Oracle's
[alarm best practices](https://docs.oracle.com/en-us/iaas/Content/Monitoring/Concepts/alarmsbestpractices.htm)
when selecting intervals, severity, routing, suppression, and review.

## Align with the Landing Zone observability design

For OCI Landing Zone deployments, align the examples with the public
[One-OE runtime observability configurations](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe/runtime/one-stack).

The current One-OE configuration model includes:

- Monitoring alarms;
- Events rules;
- Notifications topics and subscriptions;
- VCN and subnet flow logs;
- Logging groups;
- Service Connector Hub export of Audit logs to Object Storage.

The baseline definitions should be represented in the observability JSON model
and generated through the Landing Zone workflow. Avoid creating a parallel
standalone Terraform owner for the same resources.


## Understand MQL before defining alarms

OCI Monitoring Query Language expressions operate on metric streams and
aggregated data. Review the
[MQL reference](https://docs.oracle.com/en-us/iaas/Content/Monitoring/Reference/mql.htm)
before creating alarms.

![OCI Monitoring Query Language syntax](https://docs.oracle.com/en-us/iaas/Content/Monitoring/images/monitoring-mql.svg)

### Basic syntax

A numeric chart query contains a metric, interval, and statistic:

```text
CpuUtilization[5m].mean()
```

An alarm query adds a Boolean predicate:

```text
CpuUtilization[5m].mean() >= 90
```

A filter selects streams whose dimensions match:

```text
unhealthyBackendServers[1m]{lbComponent = "backendSet"}.max() > 0
```

Grouping combines streams that share a dimension value:

```text
CpuUtilization[5m].groupBy(resourceId).mean() >= 90
```

The [MQL `groupBy()` guidance](https://docs.oracle.com/en-us/iaas/Content/Monitoring/Tasks/query-metric-groupby.htm)
warns that grouping aggregates streams. Use it only when that aggregation
preserves the intended resource identity.

### Preserve resource identity

Without grouping or a resource filter, several streams can satisfy one alarm.
That can be correct for a fleet alarm, but it can also hide which resource is
affected.

For a per-instance CPU alarm:

```text
CpuUtilization[5m].groupBy(resourceId).mean() >= 90
```

For one selected instance:

```text
CpuUtilization[5m]{resourceId = "<RESOURCE_OCID>"}.mean() >= 90
```


Do not group streams with different units or meanings. Avoid fleet-wide sums of
percentages, because adding per-resource percentages does not produce a valid
fleet percentage.

### Select the statistic by metric kind

| Metric kind | Common MQL statistic | Check before use |
|---|---|---|
| Gauge | `last()`, `mean()`, `min()`, `max()` | Confirm what the value represents |
| Monotonic counter | `rate()` or `increment()` | Confirm resets and output units |
| Interval count | `sum()` or `count()` | Confirm whether points already contain counts |
| Latency observations | `mean()` or `percentile()` | Confirm unit and supported statistic |
| Binary state | `max()` or `min()` | Confirm whether `0` or `1` is unhealthy |

OCI `rate()` returns the average rate of change per second.

Do not use `sum()` on a cumulative counter when the required signal is a rate.
That adds sampled cumulative values and can produce a meaningless result.

### Separate aggregation from persistence

The MQL interval aggregates metric points. The alarm's pending duration is the
time the Boolean condition must remain true before the state changes from
`OK` to `FIRING`.

This is also called the trigger delay. It is not the MQL interval.

| Failure mode | Starting pending duration |
|---|---:|
| Binary failure or packet drop | 1–3 minutes |
| Resource unavailable | 2–5 minutes |
| Critical saturation | 5 minutes |
| Warning saturation | 10–15 minutes |
| Capacity trend | 15–30 minutes |

Choose an interval equal to or longer than the metric's emission frequency.

This rule is part of
[Oracle alarm best practices](https://docs.oracle.com/en-us/iaas/Content/Monitoring/Concepts/alarmsbestpractices.htm#Select_the_Correct_Alarm_Interval_for_Your_Metric).

### Use absence carefully

An absence query can detect a continuously publishing resource:

```text
CpuUtilization[1m].groupBy(resourceId).absent(5m)
```

Do not enable absence alarms for stopped, ephemeral, scheduled, or
scale-to-zero resources.

An empty threshold query is not proof of health. Check region, metric
compartment, permissions, time range, namespace, metric spelling, ingestion,
dimensions, and the service's emission rules.

## Place alarms and metrics in the correct compartments

OCI separates the compartment that contains the alarm from the compartment
that contains the evaluated metric.

- `compartment_id` is the alarm resource's compartment.
- `metric_compartment_id` is the compartment containing the metric streams.
- `metric_compartment_id_in_subtree` controls the exceptional subtree case.

By default, an alarm evaluates only the selected metric compartment. It does not
automatically apply to child compartments.

Subtree evaluation can be enabled only when the metric compartment is the
tenancy root, and it requires tenancy-level permissions. It should not replace
an intentional Landing Zone compartment design.

The current API behavior is documented in the
[Monitoring alarm model](https://docs.oracle.com/en-us/iaas/tools/python/latest/api/monitoring/models/oci.monitoring.models.Alarm.html).

### Recommended Landing Zone placement

| Landing Zone scope | Expected resources and namespaces | Placement guidance |
|---|---|---|
| Hub and spoke network compartments | VNICs `oci_vcn`, Load Balancers `oci_lbaas`, Network Load Balancers `oci_nlb` | Evaluate the metric compartment that owns each network resource |
| Security compartment | Notifications `oci_notification`; security service metrics, Events, Logging, Vault logs, and Audit export when enabled | Verify each deployed service and metric namespace; do not infer metrics from compartment purpose |
| Project compartments | Compute `oci_computeagent`, instance health, infrastructure health, Block Volume `oci_blockstore`, Functions, API Gateway, Streaming, and Object Storage when deployed | Create or target alarms for the project compartment that contains each metric |
| Workload extensions | OKE, Exadata, and other platform-specific namespaces | Keep alarms with the Workload Extension observability configuration |

This table describes expected placement. Confirm
every namespace in Metrics Explorer before creating an alarm.

### Compute workloads and VNICs are different

Compute metrics normally follow the instance or volume resource compartment.
VNIC metrics do not.

Oracle states that a VNIC and its `oci_vcn` metrics reside in the subnet's
compartment. The VNIC attachment resides in the instance compartment.

This distinction is documented in the
[VNIC metrics reference](https://docs.oracle.com/en-us/iaas/Content/Network/Reference/vnicmetrics.htm#Required_IAM_Policy).

If an instance is in a project compartment but its subnet is in a network
compartment:

- query `oci_computeagent` in the project compartment;
- query `oci_vcn` in the subnet's network compartment; 
- grant metric-reading policy in the correct compartments.

Do not place one alarm in a parent compartment and assume it covers both.

## Map operational conditions to severity

Use operational condition and required response together.

| Operational condition | Baseline severity | Meaning |
|---|---|---|
| Unavailable | Critical | The resource is unreachable, unhealthy, or missing an expected liveness signal |
| At risk | Warning by default | Capacity or health is approaching customer impact |
| Nonoptimal | Warning or Informational | Performance is outside the preferred range without immediate impact |
| Operational event | Depends on impact | A state change or discrete occurrence needs attention or traceability |

Promote an at-risk condition to Critical when immediate operator action is
required. Oracle's own CPU at-risk example uses Critical, so severity must
follow response urgency rather than the label alone.

OCI alarm severities are `CRITICAL`, `ERROR`, `WARNING`, and `INFO`, as shown in
the [alarm message format](https://docs.oracle.com/en-us/iaas/Content/Monitoring/alarm-message-format.htm).

All enabled alarms should be sent to the approved monitoring or incident
platform. Severity controls urgency, workflow, and escalation inside that
platform.

Do not create separate, ungoverned delivery paths for each severity. Secondary
email or chat routes can supplement the monitoring platform.

## Recommended baseline alarms

The catalog uses Landing Zone scopes instead of rollout tiers. It contains
recommended baseline alarms only.

Validate every metric identifier, dimension, unit, interval, and query in the
target region and metric compartment before enabling it.

Each alarm needs an owner, a short description, a runbook, a destination, and
an explicitly chosen pending duration.

### Network compartments

#### VNIC connection tracking

Namespace: `oci_vcn`.

Oracle describes `VnicConntrackUtilPercent` as the total utilization percentage
from 0 to 100 of the connection tracking table.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Conntrack warning | Connection table utilization is approaching capacity | Warning | `VnicConntrackUtilPercent[5m].groupBy(resourceId).max() >= 80` | 10 min |
| Conntrack critical | Connection table utilization is near exhaustion | Critical | `VnicConntrackUtilPercent[5m].groupBy(resourceId).max() >= 90` | 5 min |
| Conntrack full | The VNIC connection tracking table is full | Critical | `VnicConntrackIsFull[1m].groupBy(resourceId).max() > 0` | 1 min |
| Ingress conntrack drops | Ingress packets were dropped because conntrack was full | Critical | `VnicIngressDropsConntrackFull[1m].groupBy(resourceId).sum() > 0` | 1 min |
| Egress conntrack drops | Egress packets were dropped because conntrack was full | Critical | `VnicEgressDropsConntrackFull[1m].groupBy(resourceId).sum() > 0` | 1 min |

These metric descriptions and dimensions come from the
[VNIC metrics reference](https://docs.oracle.com/en-us/iaas/Content/Network/Reference/vnicmetrics.htm#Available_Metrics__oci_vcn).

If warning and critical ranges overlap, the monitoring platform must
deduplicate them. Alternatively, use an upper bound for the warning range.

#### VNIC throttling and buffer exhaustion

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Ingress throttle drops | Ingress packets were dropped by VNIC throttling | Critical | `VnicIngressDropsThrottle[1m].groupBy(resourceId).sum() > 0` | 1 min |
| Egress throttle drops | Egress packets were dropped by VNIC throttling | Critical | `VnicEgressDropsThrottle[1m].groupBy(resourceId).sum() > 0` | 1 min |
| SmartNIC drops from network | SmartNIC dropped packets received from the network because its buffer was exhausted | Critical | `SmartnicBufferDropsFromNetwork[1m].groupBy(resourceId).sum() > 0` | 1 min |
| SmartNIC drops from host | SmartNIC dropped host packets because its buffer was exhausted | Critical | `SmartnicBufferDropsFromHost[1m].groupBy(resourceId).sum() > 0` | 1 min |

SmartNIC buffer alarms apply to bare metal. Keep them disabled for VM-only
fleets.

#### VNIC security-rule drops

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Egress security-list drops | Egress packets were rejected by a security rule | Warning | `VnicEgressDropsSecurityList[5m].groupBy(resourceId).sum() > 0` | 5 min |
| Ingress security-list drops | Ingress packets exceeded the approved drop baseline | Disabled candidate | `VnicIngressDropsSecurityList[5m].groupBy(resourceId).sum() > <INGRESS_DROP_THRESHOLD>` | 10 min |

Ingress drops can be routine on exposed resources. Establish a baseline before
enabling the candidate.

#### Load Balancer

Namespace: `oci_lbaas`. Metrics emit every 60 seconds.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Unhealthy backend | At least one backend in a backend set is unhealthy | Critical | `unhealthyBackendServers[1m]{lbComponent = "backendSet"}.max() > 0` | 2 min |
| Backend timeout | A backend request timed out | Critical | `backendTimeouts[1m]{lbComponent = "backendSet"}.sum() > 0` | 2 min |
| Backend 5xx | Backend error count exceeded the workload threshold | Disabled candidate | `httpResponses5xx[5m]{lbComponent = "backendSet"}.sum() > <HTTP_5XX_THRESHOLD>` | 5 min |
| TLS handshake failures | Failed TLS handshakes exceeded the workload threshold | Disabled candidate | `FailedSslHandshake[5m]{lbComponent = "loadBalancer"}.sum() > <TLS_FAILURE_THRESHOLD>` | 5 min |

Confirm names and dimensions in the
[Load Balancer metrics reference](https://docs.oracle.com/en-us/iaas/Content/Balance/Reference/loadbalancermetrics.htm).

Prefer a validated error ratio when aligned request and error streams are
available. A single 5xx response does not always justify paging.

#### Network Load Balancer

Namespace: `oci_nlb`.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Unhealthy backend | At least one NLB backend is unhealthy | Critical | `UnhealthyBackendsPerNlb[1m].groupBy(resourceId).max() > 0` | 2 min |
| No healthy backends | The NLB has no healthy backend | Critical | `HealthyBackendsPerNlb[1m].groupBy(resourceId).min() < 1` | 2 min |
| Ingress security drops | Ingress packets were dropped by a security list | Warning | `IngressPacketsDroppedBySL[1m].groupBy(resourceId).sum() > 0` | 2 min |
| Egress security drops | Egress packets were dropped by a security list | Warning | `EgressPacketsDroppedBySL[1m].groupBy(resourceId).sum() > 0` | 2 min |

Validate the catalog against the
[Network Load Balancer metrics reference](https://docs.oracle.com/en-us/iaas/Content/NetworkLoadBalancer/Metrics/metrics.htm).

Exclude expected maintenance and intentional scale-to-zero behavior.

### Project compartments

#### Compute accessibility and infrastructure health

Namespaces: `oci_compute_instance_health` and
`oci_compute_infrastructure_health`.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| VM unresponsive | The instance is not responding to the accessibility probe | Critical | `instance_accessibility_status[1m].groupBy(resourceId).max() > 0` | 2 min |
| File-system anomaly | The instance health service detected a file-system issue | Critical | `InstanceFileSystemStatus[5m].groupBy(resourceId).max() > 0` | 1 min |
| Infrastructure issue | OCI reported an infrastructure issue for the instance | Critical | `instance_status[1m].groupBy(resourceId).max() > 0` | 2 min |
| Bare-metal defect | OCI reported a bare-metal health defect | Critical | `health_status[1m].groupBy(resourceId).max() > 0` | 1 min |
| Maintenance scheduled | OCI reported scheduled maintenance | Warning | `maintenance_status[5m].groupBy(resourceId).max() > 0` | 1 min |

See the
[instance health metrics](https://docs.oracle.com/en-us/iaas/Content/Compute/References/compute-health-metrics.htm).

Also review the
[infrastructure health metrics](https://docs.oracle.com/en-us/iaas/Content/Compute/References/infrastructurehealthmetrics.htm).

Route maintenance to the infrastructure owner and change workflow. A planned
maintenance signal is not automatically an outage.

#### Compute utilization

Namespace: `oci_computeagent`. These metrics require the Compute Instance
Monitoring plugin and access to OCI Monitoring.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| CPU warning | Mean CPU utilization is at least 75% | Warning | `CpuUtilization[5m].groupBy(resourceId).mean() >= 75` | 10 min |
| CPU critical | Mean CPU utilization is at least 90% | Critical | `CpuUtilization[5m].groupBy(resourceId).mean() >= 90` | 5 min |
| Memory warning | Mean memory utilization is at least 75% | Warning | `MemoryUtilization[5m].groupBy(resourceId).mean() >= 75` | 10 min |
| Memory critical | Mean memory utilization is at least 90% | Critical | `MemoryUtilization[5m].groupBy(resourceId).mean() >= 90` | 5 min |
| Allocation stalls | Memory allocation stalls occurred | Disabled candidate | `MemoryAllocationStalls[5m].groupBy(resourceId).increment() > 0` | 5 min |
| Compute telemetry absent | Expected compute telemetry was absent for five minutes | Disabled candidate | `CpuUtilization[1m].groupBy(resourceId).absent(5m)` | 1 min |

The thresholds are starting points. A small VM and a memory-dense VM can have
the same utilization percentage but very different remaining capacity.

Tune thresholds using absolute capacity, workload headroom, scaling behavior,
and time-to-exhaustion. Review the
[Compute instance metrics reference](https://docs.oracle.com/en-us/iaas/Content/Compute/References/computemetrics.htm).

Compute disk and network byte or operation metrics are cumulative counters. Use
`rate()` or `increment()` for throughput and operations.

#### Block Volume

Namespace: `oci_blockstore`.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Throttled I/O | One or more volume operations were throttled | Critical | `VolumeThrottledIOs[1m].groupBy(resourceId).sum() > 0` | 1 min |
| Replication upload stale | Replica upload age exceeded the workload RPO | Disabled candidate | `VolumeReplicationSecondsSinceLastUpload[5m].groupBy(resourceId).max() > <RPO_SECONDS>` | 5 min |
| Replica sync stale | Replica synchronization age exceeded the workload RPO | Disabled candidate | `VolumeReplicationSecondsSinceLastSync[5m].groupBy(resourceId).max() > <RPO_SECONDS>` | 5 min |

Replication thresholds must come from the workload recovery-point objective.
See the
[Block Volume metrics reference](https://docs.oracle.com/en-us/iaas/Content/Block/References/volumemetrics-reference.htm).

### Security and shared-services compartments

#### Notification delivery

Namespace: `oci_notification`.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Notification delivery failed | Notifications could not deliver one or more messages | Critical | `FailedMessagesCount[5m].groupBy(resourceId).sum() > 0` | 1 min |

See the
[Notifications metrics reference](https://docs.oracle.com/en-us/iaas/Content/Notification/Reference/notificationmetrics-reference.htm).

Do not create an absence alarm for `FailedMessagesCount`. The stream can exist
only when a delivery failure occurs.

Route this alarm through an independent topic or Streaming destination where
possible.

#### Vault and security-service visibility

Use Audit events for management operations. Enable Key Management service logs
for cryptographic operations when required by the security design.

Oracle explains Audit and service-log coverage in
[Monitoring key usage](https://docs.oracle.com/en-us/iaas/Content/KeyManagement/Tasks/managingkeys-usage.htm).

The available log category is defined in the
[Key Management logging reference](https://docs.oracle.com/en-us/iaas/Content/Logging/Reference/details_for_kms.htm).

If Secrets are deployed, validate the current `oci_secrets` metrics and their
dimensions before adding alarms.

### Platform and service-specific coverage

Do not mix platform alarms into the Landing Zone baseline:

- OKE alarms belong to the OKE Workload Extension.
- ExaCS and ExaCC alarms belong to their Workload Extensions.
- Functions and API Gateway can be enabled for project compartments.
- Streaming and Object Storage can be enabled for project or security
  compartments when deployed there.

Each extension must define its own metrics, descriptions, dimensions,
thresholds, and runbooks.

The Landing Zone repository already provides
[workload-extension observability configurations](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/workload-extensions)
for supported extension families.

## Notifications, Events, and Logging

Events and logs often provide better evidence for availability, control-plane
change, and incident reconstruction than a utilization alarm.

### Send enabled alarms to the monitoring platform

Every enabled alarm should reach the approved monitoring or incident platform.
Use severity to control urgency and escalation there.

Confirm that every Notifications subscription is active before relying on it.
Test the path only within an approved validation window.

Use an independent destination for a Notifications delivery-failure alarm.

The [Events and Notifications strategy](https://docs.oracle.com/en-us/iaas/Content/cloud-adoption-framework/events-notifications-strategy.htm)
explains how alarms, event rules, service connectors, and Notifications work
together.


### Event inventory

Events rules filter resource state changes and route them to Notifications,
Streaming, or Functions.

See the
[Events overview](https://docs.oracle.com/en-us/iaas/Content/Events/Concepts/eventsoverview.htm).

The source configurations are in the
[One-OE blueprint directory](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe).

#### Network events

The network rule contains these exact upstream event types:

| Resource family | Monitored event types |
|---|---|
| VCN | `com.oraclecloud.virtualnetwork.createvcn`<br>`com.oraclecloud.virtualnetwork.deletevcn`<br>`com.oraclecloud.virtualnetwork.updatevcn` |
| Route table | `com.oraclecloud.virtualnetwork.createroutetable`<br>`com.oraclecloud.virtualnetwork.deleteroutetable`<br>`com.oraclecloud.virtualnetwork.updateroutetable`<br>`com.oraclecloud.virtualnetwork.changeroutetablecompartment` |
| Security list | `com.oraclecloud.virtualnetwork.createsecuritylist`<br>`com.oraclecloud.virtualnetwork.deletesecuritylist`<br>`com.oraclecloud.virtualnetwork.updatesecuritylist`<br>`com.oraclecloud.virtualnetwork.changesecuritylistcompartment` |
| Network security group | `com.oraclecloud.virtualnetwork.createnetworksecuritygroup`<br>`com.oraclecloud.virtualnetwork.deletenetworksecuritygroup`<br>`com.oraclecloud.virtualnetwork.updatenetworksecuritygroup`<br>`com.oraclecloud.virtualnetwork.updatenetworksecuritygroupsecurityrules`<br>`com.oraclecloud.virtualnetwork.changenetworksecuritygroupcompartment` |
| Dynamic routing gateway | `com.oraclecloud.virtualnetwork.createdrg`<br>`com.oraclecloud.virtualnetwork.deletedrg`<br>`com.oraclecloud.virtualnetwork.updatedrg` |
| DRG attachment | `com.oraclecloud.virtualnetwork.createdrgattachment`<br>`com.oraclecloud.virtualnetwork.deletedrgattachment`<br>`com.oraclecloud.virtualnetwork.updatedrgattachment` |
| Internet gateway | `com.oraclecloud.virtualnetwork.createinternetgateway`<br>`com.oraclecloud.virtualnetwork.deleteinternetgateway`<br>`com.oraclecloud.virtualnetwork.updateinternetgateway`<br>`com.oraclecloud.virtualnetwork.changeinternetgatewaycompartment` |
| Local peering gateway | `com.oraclecloud.virtualnetwork.createlocalpeeringgateway`<br>`com.oraclecloud.virtualnetwork.deletelocalpeeringgateway.end`<br>`com.oraclecloud.virtualnetwork.updatelocalpeeringgateway`<br>`com.oraclecloud.virtualnetwork.changelocalpeeringgatewaycompartment` |
| NAT gateway | `com.oraclecloud.natgateway.createnatgateway`<br>`com.oraclecloud.natgateway.deletenatgateway`<br>`com.oraclecloud.natgateway.updatenatgateway`<br>`com.oraclecloud.natgateway.changenatgatewaycompartment` |
| Service gateway | `com.oraclecloud.servicegateway.createservicegateway`<br>`com.oraclecloud.servicegateway.deleteservicegateway.end`<br>`com.oraclecloud.servicegateway.attachserviceid`<br>`com.oraclecloud.servicegateway.detachserviceid`<br>`com.oraclecloud.servicegateway.updateservicegateway`<br>`com.oraclecloud.servicegateway.changeservicegatewaycompartment` |
| Public IP | `com.oraclecloud.virtualnetwork.changepublicipcompartment`<br>`com.oraclecloud.virtualnetwork.createpublicip` |
| DHCP options | `com.oraclecloud.virtualnetwork.changedhcpoptionscompartment` |

The blueprint does not monitor every possible update or delete event for every
network family.

Review the current
[services that produce Events](https://docs.oracle.com/en-us/iaas/Content/Events/Reference/eventsproducers.htm)
when broader coverage is required.

#### Notifications subscription events

The security rule contains:

- `com.oraclecloud.notification.createsubscription`;
- `com.oraclecloud.notification.deletesubscription`;
- `com.oraclecloud.notification.getunsubscription`;
- `com.oraclecloud.notification.movesubscription`;
- `com.oraclecloud.notification.resendsubscriptionconfirmation`;
- `com.oraclecloud.notification.updatesubscription`.

These events detect subscription lifecycle changes. They do not prove that a
subscription is active or that messages are delivered.

Use the `oci_notification` failure alarm and an approved end-to-end test for
delivery assurance.

### One-OE home-region event inventory

Home-region rules cover Cloud Guard and IAM changes.

#### Cloud Guard events

- `com.oraclecloud.cloudguard.problemdetected`;
- `com.oraclecloud.cloudguard.problemdismissed`;
- `com.oraclecloud.cloudguard.problemremediated`;
- `com.oraclecloud.cloudguard.announcements`;
- `com.oraclecloud.cloudguard.status`;
- `com.oraclecloud.cloudguard.problemthresholdreached`.

Problem detection and threshold events should reach the security monitoring
platform. Dismissal and remediation events should update or close the same
incident rather than create unrelated incidents.

#### IAM events

| Resource family | Monitored event types |
|---|---|
| Identity provider | `com.oraclecloud.identitycontrolplane.createidentityprovider`<br>`com.oraclecloud.identitycontrolplane.deleteidentityprovider`<br>`com.oraclecloud.identitycontrolplane.updateidentityprovider` |
| IdP group mapping | `com.oraclecloud.identitycontrolplane.createidpgroupmapping`<br>`com.oraclecloud.identitycontrolplane.deleteidpgroupmapping`<br>`com.oraclecloud.identitycontrolplane.updateidpgroupmapping` |
| Group membership and group | `com.oraclecloud.identitycontrolplane.addusertogroup`<br>`com.oraclecloud.identitycontrolplane.removeuserfromgroup`<br>`com.oraclecloud.identitycontrolplane.creategroup`<br>`com.oraclecloud.identitycontrolplane.deletegroup`<br>`com.oraclecloud.identitycontrolplane.updategroup` |
| IAM policy | `com.oraclecloud.identitycontrolplane.createpolicy`<br>`com.oraclecloud.identitycontrolplane.deletepolicy`<br>`com.oraclecloud.identitycontrolplane.updatepolicy` |
| User | `com.oraclecloud.identitycontrolplane.createuser`<br>`com.oraclecloud.identitycontrolplane.deleteuser`<br>`com.oraclecloud.identitycontrolplane.updateuser`<br>`com.oraclecloud.identitycontrolplane.updateusercapabilities`<br>`com.oraclecloud.identitycontrolplane.updateuserstate` |
| User credentials | `com.oraclecloud.identityControlPlane.UpdateSwiftPassword`<br>`com.oraclecloud.identityControlPlane.CreateOrResetPassword` |

The last two strings intentionally preserve the capitalization used in the
current public blueprint. Do not normalize event type casing without checking
the current producer reference and deployed behavior.

### Events delivery alarms

Events service metrics use the `oci_cloudevents` namespace and are emitted
automatically for configured rules.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Event delivery failed | An Events rule could not deliver to one or more actions | Critical | `DeliveryFailedEvents[1m].groupBy(resourceId).sum() > 0` | 1 min |
| Event volume spike | Published event volume exceeded the approved baseline | Disabled candidate | `PublishedEvents[5m].groupBy(eventType).sum() > <MAX_EVENTS_PER_5M>` | 10 min |

The metric names and dimensions are defined in the
[Events metrics reference](https://docs.oracle.com/en-us/iaas/Content/Events/Reference/eventsmetrics.htm).

Do not create an absence alarm for `MatchedEvents` or
`DeliverySucceedEvents`. A quiet environment can legitimately emit or match no
events.

Use Events rule metrics for delivery health. Use the event payload and incident
platform for the meaning and lifecycle of the matched control-plane change.

Avoid one rule per alarm. Group only compatible event types with the same
destination, owner, and response.

### Enable and retain the right logs

OCI Logging provides Audit, service, and custom logs. This baseline focuses on
Audit and OCI service logs.

Enable VCN flow logs at the VCN or subnet scope required by the design. Flow
logs support network auditing and security-list or NSG troubleshooting.

See [Logging overview](https://docs.oracle.com/en-us/iaas/Content/Logging/Concepts/loggingoverview.htm)
and [VCN flow logs](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/vcn-flow-logs.htm).

Define capture filters, retention, access, and cost controls. Flow logs are
diagnostic records, not metric alarms.

Use Service Connector Hub to export Audit logs to Object Storage when retention
beyond the native Audit window is required.

The One-OE observability configuration contains a governed example with a
Logging source, Audit log selection, and Object Storage target.

Protect the destination bucket with retention, encryption, least privilege,
and lifecycle controls that match the organization's policy.

### Logging and Audit-pipeline alarms

Raw log records are not MQL metric streams. A native alarm can evaluate Logging
service metrics, Events metrics, or Connector Hub metrics.

A content-based log alarm needs an explicit Logging-to-Monitoring connector,
custom metric, or external monitoring/SIEM rule.

That content-detection path is an optional extension. Do not add synthetic
custom metrics to the generic Landing Zone baseline without a separate metric
contract, ownership decision, and cardinality review.

#### Logging ingestion

Logging service metrics use the `oci_logging` namespace.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Flow-log ingestion absent | A continuously active flow log stopped ingesting data | Disabled candidate | `BytesIngested[5m]{logSourceService = "flowlogs"}.groupBy(logObjectId).absent(15m)` | 1 min |
| Flow-log ingestion spike | Flow-log bytes exceeded the approved volume baseline | Disabled candidate | `BytesIngested[5m]{logSourceService = "flowlogs"}.groupBy(logObjectId).sum() > <MAX_BYTES_PER_5M>` | 10 min |

`BytesIngested` measures bytes read from the log source. The available
dimensions are documented in the
[Logging metrics reference](https://docs.oracle.com/en-us/iaas/Content/Logging/metrics.htm).

Enable the absence candidate only when traffic and continuous publication are
expected. A quiet VCN, capture filter, disabled log, or `_pre` configuration can
legitimately produce no flow-log data.

Rejected-traffic spikes, scanning patterns, sensitive-port access, and unusual
egress require flow-log content analysis. Implement those in the approved SIEM
or a separately governed log-to-metric pipeline.

#### Audit export through Connector Hub

The One-OE connector reads Audit logs and writes them to Object Storage.
Connector Hub service metrics use `oci_service_connector_hub`.

| Alarm | Description | Severity | MQL | Pending |
|---|---|---|---|---:|
| Connector internal errors | Connector Hub reported errors moving data | Critical | `ServiceConnectorHubErrors[5m].groupBy(connectorId).sum() > 0` | 15 min |
| Persistent source errors | The connector repeatedly failed to read Audit logs | Warning | `ErrorsAtSource[15m].groupBy(errorCode,connectorId).min() > 0` | 30 min |
| Persistent target errors | The connector repeatedly failed to write to Object Storage | Critical | `ErrorsAtTarget[15m].groupBy(errorCode,connectorId).min() > 0` | 30 min |
| Audit export stale | The most recently processed Audit record is more than 12 hours old | Critical | `DataFreshness[1h].groupBy(connectorId).mean() > 43200000` | 30 min |
| No source bytes | No Audit bytes were read when source activity was expected | Disabled candidate | `BytesReadFromSource[15m].groupBy(connectorId).sum() == 0` | 30 min |

`43200000` is 12 hours in milliseconds. Tune it below the maximum tolerable
archive gap.

Oracle recommends a trigger delay of 30 minutes or more for intermittent
source and data-freshness failures.

See the
[Connector Hub metrics reference](https://docs.oracle.com/en-us/iaas/Content/connector-hub/metrics-reference.htm).

Oracle also provides
[Connector troubleshooting alarm examples](https://docs.oracle.com/en-us/iaas/Content/connector-hub/troubleshooting.htm).

Enable Connector Hub `runlog` service logs. They record run start, completion,
and success or failure.

See the
[Connector Hub logging schema](https://docs.oracle.com/en-us/iaas/Content/Logging/Reference/details-for-service-connector-hub.htm).

Do not infer an archive outage from zero bytes alone. Confirm that source Audit
activity was expected and check connector errors, freshness, permissions,
bucket access, and lifecycle state.

#### Recommended response routing

| Signal | Recommended owner and response |
|---|---|
| Event delivery failure | Platform operations; restore the rule action or destination |
| Cloud Guard problem event | Security operations; correlate with the existing problem |
| IAM or network change event | Security or platform operations; validate authorization and change record |
| Flow-log ingestion absence | Network/security operations; validate enablement, capture filters, traffic, and Logging health |
| Connector source error | Platform operations; validate Audit source access and connector policy |
| Connector target error | Platform/storage operations; validate bucket, policy, quota, and service health |
| Audit export stale | Security and platform operations; restore export before the retention objective is breached |


### Inventory before changing configuration

Inventory:

- existing alarms and suppressions;
- Notifications topics and subscription states;
- Events rules and destinations;
- log groups and VCN flow-log enablement;
- Service Connector Hub connectors and archive buckets;
- Terraform state addresses and module versions;
- resources managed by another stack, repository, or team.

Classify every desired object:

| Observed state | Required action |
|---|---|
| Already managed by the Landing Zone state | Preserve its address and update through the current configuration |
| Exists in OCI but is absent from state | Use a reviewed import or adoption workflow |
| Managed by another state or system | Exclude it or complete an explicit ownership transfer |
| Does not exist | Create it additively after a clean reviewed plan |
| Ownership is unknown | Stop; do not import, replace, update, or delete |

One OCI object must map to one Terraform resource address.

### Map the alarm fields explicitly

The observability JSON and underlying
[`oci_monitoring_alarm`](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/monitoring_alarm)
resource must preserve:

- the alarm compartment;
- metric compartment and optional subtree setting;
- namespace and Boolean MQL query;
- severity and enabled state;
- pending duration;
- message format and body;
- notification destinations;
- repeat duration;
- per-dimension notification behavior.

Do not enable a definition merely because its namespace appears in a
compartment. Validate the exact metric and query first.

### Protect production resources

The integration remains disabled until explicitly selected.

Adopt existing resources before changing behavior. Require an adoption-only
plan with no unintended create, update, replacement, or deletion.

Reject plans containing:

- an unapproved deletion or replacement;
- changes outside the observability scope;
- duplicate topics, subscriptions, Events rules, alarms, or log resources;
- an ownership change without an approved import or `moved` block;
- a module or provider upgrade bundled into the alarm change; or
- a destination change that can interrupt production notification.

Apply only the exact reviewed saved plan through the established Landing Zone
pipeline.

After apply, run a fresh plan and validate alarm state, MQL results,
destinations, Events rules, flow logs, and Service Connector Hub health.

Do not trigger a production incident notification without an approved test
window.

Never commit Terraform state, plans, raw provider output, customer identifiers,
endpoints, private names, or credentials.

## Validation and recurring review

### Pre-enable checklist

- [ ] The alarm and metric compartments are correct.
- [ ] Hierarchy behavior is explicit.
- [ ] The namespace exists in the selected region and metric compartment.
- [ ] The metric identifier and casing match the current service reference.
- [ ] The numeric query returns the intended streams.
- [ ] Resource identity and grouping are correct.
- [ ] The statistic matches the metric kind.
- [ ] Units and arithmetic are correct.
- [ ] The interval is not shorter than emission frequency.
- [ ] Pending duration matches the failure mode.
- [ ] Severity matches response urgency.
- [ ] The threshold reflects resource size and workload behavior.
- [ ] The destination and subscription are active.
- [ ] The monitoring platform receives the expected message.
- [ ] The alarm has an owner, description, and runbook.
- [ ] Terraform ownership is unambiguous.
- [ ] Absence alarms exclude stopped and ephemeral resources.
- [ ] Related Events and Logging coverage has been assessed.

Use the
[alarm troubleshooting guide](https://docs.oracle.com/en-us/iaas/Content/Monitoring/troubleshooting-alarms.htm)
when an alarm does not fire, clear, or deliver as expected.

### Weekly review

Review false positives, missed incidents, notification noise, recipients,
missing owners, empty queries, stale suppressions, threshold drift, uncovered
resources, and obsolete resource references.

Tune threshold, severity, notification method, frequency, and audience as
recommended by
[Oracle alarm best practices](https://docs.oracle.com/en-us/iaas/Content/Monitoring/Concepts/alarmsbestpractices.htm#Routinely_Tune_Your_Alarms).

### Quarterly and event-driven review

Perform a broader review after:

- incidents;
- major scaling changes;
- Landing Zone or Workload Extension changes;
- new OCI service adoption;
- SLO, RTO, or RPO changes;
- provider or module upgrades;
- changes to Events, Logging, retention, or incident-routing policy.
