# **[OCI Bastion Access](#)**
## **An OCI Open LZ [Addon](#) for Private Administrative Access**

&nbsp;

**Table of Contents**

[1. Overview](#1-overview)<br>
[2. Access Options](#2-access-options)<br>
[3. Recommended Landing Zone Pattern](#3-recommended-landing-zone-pattern)<br>
[4. Common Customer Requests](#4-common-customer-requests)<br>
[5. Documents](#5-documents)<br>
[6. Reviewed Sources](#6-reviewed-sources)<br>

&nbsp;

## 1. Overview

This add-on describes how to integrate bastion access with OCI Landing Zones. It focuses on private access from an operator workstation to resources that do not have public endpoints, such as private compute instances, private Autonomous Database endpoints, private Oracle Integration endpoints, and internal application UIs.

The add-on covers two bastion families:

- **VM-based bastion in the hub**: a customer-managed Compute instance placed in the hub VCN.
- **OCI Bastion service in the hub**: an Oracle-managed Bastion resource placed on a hub subnet, with sessions created when access is needed.

The Landing Zone should prepare the network, IAM, compartment, DNS, route, and security-rule prerequisites. The bastion resource, bastion sessions, target host configuration, and customer endpoint validation remain customer-owned unless a specific published runtime or future generator feature creates them.

&nbsp;

## 2. Access Options

| Option | Best fit | Benefits | Downsides |
|---|---|---|---|
| [VM-based bastion in the hub](./vm-bastion-in-hub.md) | Customers that need endpoint agents, custom tooling, long-running operator sessions, or a managed jump host workflow. | Customer can install monitoring, EDR, proxy, database, browser, file transfer, or compliance agents on the bastion. Works with normal SSH jump host patterns. Can reach multiple spokes when routing and security allow it. | Customer owns OS patching, hardening, keys, logging, capacity, agent lifecycle, and drift. A compromised bastion is a high-value target. |
| [OCI Bastion managed SSH session](./oci-bastion-managed-ssh-session.md) | Short-lived SSH access to Compute instances that satisfy OCI Bastion managed SSH requirements. | No customer-managed jump host OS. Sessions are temporary. Good for controlled SSH to private instances. | Compute target only. Requires the Bastion plugin and OpenSSH on the target instance. Not the right pattern for databases, private HTTP UIs, or generic TCP services. |
| [OCI Bastion SSH port forwarding session](./oci-bastion-port-forwarding-session.md) | One known target IP or hostname and one known TCP port, such as private VM SSH, RDP, ATP on 1521, MySQL on 3306, or an internal HTTPS endpoint. | No SSH server is required on the target service. Simple for one endpoint and one port. Works well with SQL Developer and browser access when DNS/TLS constraints are handled. | Fixed target. OCI Bastion service scope is VCN-bound; use a bastion in the target VCN or validate an alternative design. Not convenient for many endpoints. |
| [OCI Bastion dynamic port forwarding session](./oci-bastion-dynamic-port-forwarding-session.md) | One hub Bastion service used to reach multiple routed spokes or multiple private endpoints, especially when the client can use SOCKS5 or when a local `-L` forward is created over the dynamic session. | Best service-based pattern for hub-and-spoke operator access. Can support SSH, UI access, and database tools through one hub bastion when routing, DNS, firewall policy, and target security rules permit it. | Requires Bastion FQDN/SOCKS5 support to be enabled. Some clients are not SOCKS-aware and need local forwards. Must be validated per customer topology because OCI Bastion is associated with one VCN. |

&nbsp;

## 3. Recommended Landing Zone Pattern

Use a **central hub access pattern** when possible:

1. Place the access entry point in the hub security or network management scope.
2. Keep customer resources private in spokes or platform VCNs.
3. Route access from the hub to spokes through the Landing Zone DRG and firewall path where the selected hub model requires inspection.
4. Allow only the required target ports from the bastion private endpoint IP or the bastion subnet CIDR.
5. Keep the customer workstation public IP ranges tightly scoped in the OCI Bastion client CIDR allowlist.
6. Use private DNS so operators can use service FQDNs instead of raw private IP addresses where TLS or application redirects require the original hostname.

For production environments, route the bastion-to-target path through the approved inspection point for the selected hub model. Do not bypass the firewall just because the session is administrative.

For OCI Bastion service, the most practical hub-to-spoke pattern is **dynamic port forwarding with FQDN/SOCKS5 enabled**. A validated June 29, 2026 test confirmed that a hub Bastion dynamic session could forward to a private VM in a spoke over DRG routing when:

- the Bastion was created with DNS proxy/SOCKS5 enabled;
- hub and spoke route tables had return routes;
- the spoke target security list allowed the required port from the hub bastion subnet;
- the target host firewall allowed the required port.

The conservative service boundary still matters: OCI documentation states that a Bastion resource is associated with a single VCN. Use per-VCN Bastions or VM-based bastion when the customer requires only documented same-VCN service behavior.

&nbsp;

## 4. Common Customer Requests

| Request | Recommended pattern |
|---|---|
| Access a private Linux VM | Managed SSH if the target meets managed SSH requirements. Port forwarding or dynamic forwarding when a simpler SSH tunnel is preferred. VM bastion if persistent tooling or agents are needed. |
| Access a private Windows VM | Port forwarding to RDP port `3389`, then connect the RDP client to localhost. Use PuTTY or Windows OpenSSH to hold the tunnel. |
| Access private Autonomous Database with SQL Developer | Port forwarding to the private database endpoint on `1521`, or dynamic forwarding with a local `-L` forward to the database endpoint. Configure SQL Developer to connect to localhost and the chosen local port, using the wallet and database settings required by the database. |
| Access Oracle Integration over an internal endpoint | Prefer dynamic SOCKS5 forwarding so the browser can keep the original FQDN, or use a local HTTPS forward if hostname and certificate handling are acceptable. Private DNS must resolve the OIC internal endpoint from the hub path. |
| Access a UI-based private application | Dynamic SOCKS5 for browser-based access to many hostnames, or local port forwarding for one HTTPS endpoint. Preserve hostnames when TLS certificates or application redirects depend on them. |
| Install agents on the access host | VM-based bastion in the hub. OCI Bastion service is managed and cannot host customer agents. |

&nbsp;

## 5. Documents

| Document | Purpose |
|---|---|
| [Landing Zone integration](./landing-zone-integration.md) | How bastion access maps to existing One-OE hub, IAM, network, security list, DNS, and runtime behavior. |
| [VM-based bastion in the hub](./vm-bastion-in-hub.md) | Customer-managed bastion host design, setup, SSH, SOCKS5, PuTTY, SQL Developer, and operational considerations. |
| [OCI Bastion managed SSH session](./oci-bastion-managed-ssh-session.md) | Managed SSH session requirements and operator flow for private Compute instances. |
| [OCI Bastion SSH port forwarding session](./oci-bastion-port-forwarding-session.md) | Static local forwarding for private SSH, RDP, ATP, MySQL, and HTTPS endpoints. |
| [OCI Bastion dynamic port forwarding session](./oci-bastion-dynamic-port-forwarding-session.md) | Dynamic SOCKS5 and local forwards over dynamic sessions, including the validated hub-to-spoke pattern. |

&nbsp;

## 6. Reviewed Sources

Repository sources reviewed:

- [One-OE one-stack runtime documentation](/blueprints/one-oe/runtime/one-stack/readme.md)
- [Hub model add-on documentation](/addons/oci-hub-models/readme.md)
- [Private DNS add-on](/addons/oci-private-dns/README.md)
- `gen/hub/hub_common.libsonnet`
- `gen/builders/iam/tenancy_policies.libsonnet`
- `gen/builders/iam/project_policies.libsonnet`
- `blueprints/multi-oe/service-providers/runtime/mgmt-plane/network/jump_host_config.json`

Oracle documentation reviewed:

- [Creating a Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-bastion.htm)
- [Connecting to Sessions in Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/connectingtosessions.htm)
- [Bastion IAM Policies](https://docs.oracle.com/en-us/iaas/Content/Bastion/Reference/bastionpolicyreference.htm)
- [Creating a Managed SSH Session in Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-session-managed-ssh.htm)
- [Connecting to a Managed SSH Session](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/connect-managed-ssh.htm)
- [Creating a Port Forwarding Session in Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-session-port-forwarding.htm)
- [Connecting to a Port Forwarding Session](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/connect-port-forwarding.htm)
- [Creating a Dynamic Port Forwarding Session in Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-session-dynamic-port-forwarding.htm)
- [Connecting to a Dynamic Port Forwarding Session](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/connect-dynamic-port-forwarding.htm)
- [OCI CLI Bastion create command](https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/bastion/bastion/create.html)

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
