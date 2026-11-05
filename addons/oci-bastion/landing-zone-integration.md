# OCI Bastion Landing Zone integration

## Enable Bastion

Add the optional top-level `bastion` block to a [Blueprint Factory source configuration](../oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md#10-bastion), alongside `hub`. In Landing Zone Studio, enable **OCI Bastion** in **Foundation** and enter the same client CIDRs and maximum session lifetime.

```jsonnet
bastion: {
  client_cidr_block_allow_list: ['203.0.113.10/32'],
  max_session_ttl_in_seconds: 3600,
},
```

Replace the example TEST-NET address with your approved workstation or corporate/VPN public egress CIDR. Use the address OCI sees, which can differ from the workstation's private address.

| Input | Contract |
|---|---|
| `bastion` | Optional object. Omitted or `null` disables Bastion provisioning and its operator grants. |
| `client_cidr_block_allow_list` | Required when enabled: 1 to 20 canonical IPv4 CIDRs. `/0` is rejected. Host bits must be zero for network prefixes, for example `203.0.113.0/24`. Prefer individual approved `/32` addresses where practical. |
| `max_session_ttl_in_seconds` | Optional integer from `1800` to `10800` inclusive; default `3600`. This is the Bastion maximum; a session can request a shorter supported lifetime. |

The [Bastion example](../oci-lz-blueprint-factory/examples/07-bastion.json) is a hub-only Hub E lab configuration. Select and review the hub model required for your deployment. Generate it with the normal [Factory workflow](../oci-lz-blueprint-factory/README.md#4-generation-workflow), then deploy through the existing Landing Zone phases.

## Generated resources and responsibilities

The generated `bastions_configuration` in the security outputs includes one standard Bastion in the shared security compartment, targeting the hub's private `mgmt` subnet, with DNS proxy/FQDN/SOCKS5 support enabled. The selected CIS level and complete or regional stack scope determine the usual security output files. No new output file or standalone deployment stack is needed.

The Factory configures the Bastion resource and conditional IAM permissions. Operators create sessions after deployment. Public keys, private keys, session OCIDs and target credentials are not Factory inputs. A dynamic session has no fixed target IP, port or VM username.

Create and delete the Bastion through the normal Landing Zone deployment principal, which must already have the IAM and network permissions required by the Orchestrator. Bastion service permissions alone do not provide the additional network permissions needed for creation/deletion. This add-on does not expand security administrators' shared-network management rights.

**Manual post-deployment configuration required:** record the Bastion's actual private endpoint IP, permit the required target ports, and verify private DNS and the complete request/return path. Do not derive an endpoint address from the subnet's host offsets. A successful tunnel listener alone does not prove target access.

| Target | Required TCP port | Target-side source |
|---|---:|---|
| Database Actions, APEX or another private HTTPS interface | `443` | Actual Bastion private endpoint `/32`, or an approved source range covering it. |
| Linux SSH server | `22` | Same source review. |
| Windows RDP service | `3389` | Same source review; also enable RDP and its host firewall rule. |

If a firewall translates the source, use the source observed at the destination. Review NSGs, security lists and host firewalls together. The public client allowlist controls entry to Bastion; it does not grant access to these target ports. Database listener ports are separate from database web-interface HTTPS access.

Oracle's [creation prerequisites](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-bastion.htm) include a service gateway and its route. Check the generated hub management path and [private DNS configuration](../oci-private-dns/README.md). Preserve the approved inspection path for Hub A/B/C; Hub C also requires working firewall appliances and NLB backends. Hub E uses DRG routing without a network firewall.

## Trace access in Landing Zone Studio

Foundation shows the generated Bastion in shared security. The network diagram connects the operator workstation to that managed service and its private endpoint association in the hub management subnet. The Draw.io export preserves the same service, ownership and subnet association.

From the traffic-flow view, select **Operator → environment** or **Operator → Shared platforms**, then choose a generated private subnet. This includes configured platform networks when project networking is disabled. Platforms without a generated subnet do not gain an invented endpoint. The preview follows the generated route rows and only shows firewall inspection where those routes traverse a firewall.

These are configured route previews, not proof of a deployed connection. Verify the dynamic session, actual target address, target NSG/security rules, firewall policy and private DNS. Routed spoke access remains subject to the [topology validation](#validate-the-selected-topology) below.

## IAM and regional deployment

The integration reuses existing Landing Zone administrator groups; it creates no Bastion-specific group.

| Existing role | Bastion access when enabled |
|---|---|
| Landing Zone security administrators | Bastion service permissions in shared security, including allowlist/session oversight. Creation and deletion also require the separate network prerequisites held by the deployment principal. |
| Network, project and platform administrators | Use the shared-security Bastion and manage its sessions, with supporting resource metadata reads. |
| Auditors | Existing read-only audit access. |

Session permissions belong to the compartment containing the Bastion, rather than the VM or database compartment. Security administrators can update the Bastion allowlist and oversee sessions after deployment within their service permissions. Keep Factory-managed settings in the source configuration to avoid later deployment drift. Dynamic-session IAM does not restrict destinations by the operator's project: network controls and target authentication must enforce the intended access. Review group membership and the rendered policy scope before deployment. See [Bastion IAM policy requirements](https://docs.oracle.com/en-us/iaas/Content/Bastion/Reference/bastionpolicyreference.htm).

Complete scope emits IAM. Regional scope creates a regional Bastion but does not emit home-owned IAM; deploy or update the complete Home stack with Bastion enabled first, using the matching compartments and administrator groups, then provide the usual Home dependencies to the regional stack. Each region has its own Bastion and sessions.

## Validate the selected topology

Oracle explicitly documents a same-VCN boundary. The single-hub, cross-VCN dynamic pattern is observed behavior that needs validation beyond that documented boundary; see the [service-boundary notice](./README.md#hub-placement-and-service-boundary).

Before handing access to operators:

1. Confirm the public client CIDR, Bastion FQDN/SOCKS5 setting, operator IAM and session lifetime.
2. Verify hub/target subnet routes, DRG attachment tables, return routes, DNS and the selected firewall path. For Hub C, include appliance configuration, symmetric flow and any source translation.
3. From each supported operator OS, test the private database HTTPS URL, Linux SSH and Windows RDP. Validate any `ssh -L` use against the dynamic session in that environment before relying on it.
4. Confirm that an unapproved source, denied destination and expired/deleted session fail. Stop the tunnel and verify local access ends.

These are deployment acceptance checks, not claims that every Hub A/B/C/E and client combination has been live-tested by this add-on.

## Updating an existing Landing Zone

Generate from the source configuration and review a Terraform plan before applying. Enabling Bastion adds its security resource and shared-security operator grants. An absent or `null` block adds neither; older unconditional network/project Bastion grants are removed by the updated IAM generation. Audit read access remains.

For a regional deployment, update Home IAM before the regional apply. Review whether existing operators need the new shared-security session scope. Check existing target rules for historical example endpoint addresses and replace them with the actual deployed source. An existing Bastion without FQDN/SOCKS5 support may require replacement; review that lifecycle change and active sessions in the plan. Disabling the block removes a Factory-managed Bastion, so terminate active work and review resource deletion first.

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
