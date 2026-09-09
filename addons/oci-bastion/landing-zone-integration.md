# OCI Bastion Landing Zone Integration

This document describes how bastion access integrates with OCI Landing Zones. It is a design and implementation guide for repository users and maintainers. It does not change generator behavior by itself.

## 1. Current Landing Zone Support

The repository already prepares several bastion prerequisites:

| Area | Existing behavior |
|---|---|
| Hub network | One-OE hub models create a private management subnet. The hub management security list includes an example inbound SSH rule from a Bastion service private endpoint IP. |
| IAM | Network administrators can manage bastion sessions in network scopes and use bastions in security scopes. Security administrators can manage `bastion-family` in security scopes. Project administrators can manage sessions in project compartments and use bastions in security compartments. |
| Spoke routing | One-OE hub-and-spoke topologies use DRG attachments and route tables to connect hub and spoke networks. Firewall hub models require the access path to follow the selected inspection topology. |
| DNS | The Private DNS add-on can centralize private DNS resolution across hub and spokes. This is important for private endpoints and UI applications that require the original hostname. |
| VM jump host example | The multi-OE service provider runtime includes a `jump_host_config.json` example that creates a private jump host with Cloud Agent plugins enabled. |

The One-OE generator currently derives an example Bastion private endpoint `/32` from the hub management subnet. Treat this as a placeholder for generated security rules. After an OCI Bastion is created, verify the actual private endpoint IP and update target security rules if the real IP differs.

## 2. Integration Principles

1. Keep private resources private. Bastion access should not require public IPs on target VMs, private databases, or internal application endpoints.
2. Place the access entry point in the hub, preferably in a security or network management compartment.
3. Use the selected hub model's route and firewall path. Administrative traffic is still traffic that must be inspected when the hub model requires inspection.
4. Scope source access tightly. The Bastion client CIDR allowlist should contain only approved customer workstation or VPN egress ranges.
5. Scope target access tightly. Target subnets or NSGs should allow only required ports from the Bastion private endpoint IP or the approved bastion subnet CIDR.
6. Use private DNS for endpoint hostnames. UI applications, OIC, and TLS-protected services often need the original hostname to work cleanly.
7. Keep session lifetime short. OCI Bastion sessions are temporary and should be recreated as needed.

## 3. Recommended Placement

### OCI Bastion service

Place the OCI Bastion resource in the hub security compartment or the hub network/security management scope, targeting a private hub management subnet that has routed access to the private targets.

For dynamic hub-to-spoke access, create the Bastion with FQDN/SOCKS5 support enabled. With OCI CLI this is represented by:

```bash
oci bastion bastion create \
  --bastion-type standard \
  --compartment-id <security_compartment_ocid> \
  --target-subnet-id <hub_management_subnet_ocid> \
  --name <bastion_name> \
  --dns-proxy-status ENABLED \
  --client-cidr-list '["<approved_client_public_cidr>"]' \
  --max-session-ttl 10800
```

Use the customer-approved deployment method. For repository examples, avoid public raw GitHub URLs as the default customer path. Prefer Terraform CLI or customer-controlled CI/CD. If OCI Resource Manager is used, stage files in a customer-controlled private Object Storage bucket or approved private GitHub source.

### VM-based bastion

Place the VM in a private hub management subnet. The VM should have no public IP. Operators reach it through an approved access path such as VPN, FastConnect, OCI Bastion service, Secure Desktops, or another customer-approved private operator network.

Use a VM-based bastion when the customer needs to install endpoint agents, custom tools, browser tooling, SQL clients, inspection tools, or compliance software on the bastion itself.

## 4. Network Requirements

For any bastion pattern, verify the complete path:

| Requirement | What to verify |
|---|---|
| Client to OCI Bastion | Client public IP or VPN egress CIDR is in the Bastion client CIDR allowlist. |
| Hub to spoke routing | Hub route table sends spoke CIDRs to the DRG or firewall path. Spoke route table returns hub/bastion subnet CIDRs through the DRG or firewall path. |
| DRG routing | DRG route tables import and advertise the required hub and spoke CIDRs. |
| Firewall policy | Hub firewall policy allows required ports from the bastion source to the private target and allows return traffic. |
| Target security list or NSG | Target subnet or NSG allows the target port from the Bastion private endpoint IP or the bastion subnet CIDR. |
| Host firewall | Target operating system firewall allows the target port. OCI security rules alone are not enough if the host firewall blocks the connection. |
| DNS | The operator path can resolve private endpoint FQDNs to private IPs when the target is FQDN-based. |

Example target rules:

| Target | Port | Source |
|---|---:|---|
| Private Linux VM | `22` | Bastion private endpoint `/32` or bastion subnet CIDR |
| Private Windows VM | `3389` | Bastion private endpoint `/32` or bastion subnet CIDR |
| Autonomous Database private endpoint | `1521` | Bastion private endpoint `/32` or bastion subnet CIDR |
| Internal HTTPS application or OIC endpoint | `443` | Bastion private endpoint `/32` or bastion subnet CIDR |

## 5. IAM Requirements

Minimum OCI Bastion service duties usually split into two roles:

| Role | Typical permissions |
|---|---|
| Security administrator | Manage Bastion resources in the security compartment. |
| Operator or application administrator | Use the Bastion and manage sessions for the resources they administer. |

The repository's generated IAM policies already include bastion-related permission patterns. For a customized customer design, review whether the intended operators have:

- `use bastion` on the compartment that contains the Bastion resource;
- `manage bastion-session` where sessions are created;
- read access to target Compute instances when using managed SSH or target-instance selection;
- read/use network permissions where the Bastion target subnet is selected;
- any database or application credentials required by the target service.

Do not grant broad `manage bastion-family in tenancy` to normal operators when a compartment-scoped policy is sufficient.

## 6. Choosing A Pattern

Use this decision sequence after the customer's baseline landing zone design, hub model, network scope, and CIDRs are known:

1. If the customer needs installed agents or persistent tools on the access host, use [VM-based bastion in the hub](./vm-bastion-in-hub.md).
2. If the target is a private Compute instance that supports Oracle Cloud Agent Bastion plugin and OpenSSH, use [Managed SSH](./oci-bastion-managed-ssh-session.md).
3. If the target is one known service endpoint and one TCP port, use [SSH port forwarding](./oci-bastion-port-forwarding-session.md).
4. If one hub Bastion should reach many spokes or many endpoints, use [dynamic port forwarding](./oci-bastion-dynamic-port-forwarding-session.md), with FQDN/SOCKS5 enabled and customer topology validation.
5. If the customer requires only OCI-documented same-VCN service behavior, deploy one Bastion per target VCN or use a VM-based hub bastion.

## 7. What The Landing Zone Should And Should Not Do

Generated or prepared by the Landing Zone where supported:

- compartments and administrator groups;
- IAM policies for Bastion administrators and session users;
- hub and spoke VCNs, subnets, DRG attachments, route tables, gateways, and security rules;
- DNS forwarding and resolver views when the Private DNS add-on is used;
- logging, alarms, and vulnerability scanning where configured.

Customer-specific setup:

- OCI Bastion resource creation when not produced by a published runtime;
- bastion session creation and expiration management;
- SSH key pair handling;
- VM bastion OS hardening, patching, host firewall, and agents;
- target service credentials;
- SQL Developer, browser, PuTTY, OpenSSH, and SOCKS5 client configuration;
- final customer security, regulatory, and compliance review.

## 8. Validation Checklist

Before handing over the design:

- Confirm the hub model and whether firewall inspection is mandatory.
- Confirm target VCNs, subnets, FQDNs, and ports.
- Confirm hub-to-target and target-to-hub route tables.
- Confirm target security rules use the actual Bastion private endpoint IP or approved subnet CIDR.
- Confirm client public CIDRs are tightly scoped.
- Confirm DNS resolution from the bastion path.
- Confirm a short-lived session can connect to each target type.
- Confirm host firewalls permit the same ports as OCI security rules.
- Confirm session expiration and key rotation procedures are documented.

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
