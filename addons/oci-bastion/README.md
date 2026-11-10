# OCI Bastion access

An OCI Open LZ add-on for private resource access.

Enable native **OCI Bastion service** and use **dynamic SOCKS5 sessions for private** web interface and VM access. Including macOS and Windows guides.

## Table of contents

- [Setup](#setup)
  - [Enable Bastion](#enable-bastion)
  - [Generated resources and responsibilities](#generated-resources-and-responsibilities)
  - [Prepare target access](#prepare-target-access)
  - [Validate access](#validate-access)
- [Operator access](#operator-access)
  - [Session and workstation guides](#session-and-workstation-guides)
  - [Access a private OKE API](#access-a-private-oke-api)
  - [How SOCKS5 works](#how-socks5-works)
- [License](#license)

## Setup

### Enable Bastion

In [Landing Zone Studio](https://oci-landing-zones.github.io/oci-landing-zone-operating-entities/), enable **OCI Bastion** in **Foundation** and enter the approved client CIDRs and maximum session lifetime. Alternatively, add the optional top-level `bastion` block to a [Blueprint Factory source configuration](../oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md#10-bastion), alongside `hub`.

```jsonnet
bastion: {
  client_cidr_block_allow_list: ['203.0.113.10/32'],
  max_session_ttl_in_seconds: 3600,
},
```

Replace the example IP CIDR with your approved workstation or corporate/VPN public egress CIDR. Use the address OCI sees, which can differ from the workstation's private address.

| Input | Contract |
|---|---|
| `bastion` | Optional object. Omitted or `null` disables Bastion provisioning and its operator grants. |
| `client_cidr_block_allow_list` | Required when enabled: 1 to 20 canonical IPv4 CIDRs. `/0` is rejected. Host bits must be zero for network prefixes, for example `203.0.113.0/24`. Prefer individual approved `/32` addresses where practical. |
| `max_session_ttl_in_seconds` | Optional integer from `1800` to `10800` inclusive; default `3600`. This is the Bastion maximum; a session can request a shorter supported lifetime. |

### Generated resources and responsibilities

The Landing Zone provisions one standard Bastion in the shared security compartment, targeting the hub's private `mgmt` subnet, with DNS proxy/FQDN/SOCKS5 support enabled. Review the routes, target rules, private DNS and inspection path for the selected Hub A, B, C or E.

The add-on configures the Bastion resource and conditional IAM permissions. Operators create sessions after deployment. Public keys, private keys and session OCIDs remain outside Terraform inputs. A dynamic session has no fixed target IP, port or VM username.

Bastion session permissions allow operators to use the service. Access to a private target also requires network rules and target credentials.

### Prepare target access

**Manual post-deployment configuration required:** record the Bastion's actual private endpoint IP, permit the required target ports, and verify private DNS and the complete request/return path. Do not derive an endpoint address from the subnet's host offsets. A successful tunnel listener alone does not prove target access.

| Target | Required TCP port | Target-side source |
|---|---:|---|
| Database Actions, APEX or another private HTTPS interface | `443` | Actual Bastion private endpoint `/32`, or an approved source range covering it. |
| Linux SSH server | `22` | Same source review. |
| Windows RDP service | `3389` | Same source review; also enable RDP and its host firewall rule. |
| OKE private Kubernetes API | `6443` | Same source review; allow the Bastion path in the API endpoint's NSG/security rules. |

If a firewall translates the source, use the source observed at the destination. Review NSGs, security lists and host firewalls together. The public client allowlist controls entry to Bastion; it does not grant access to these target ports. Database listener ports are separate from database web-interface HTTPS access.

### Validate access

Before handing access to operators:

1. Confirm the public client CIDR, Bastion FQDN/SOCKS5 setting, operator IAM and session lifetime.
2. Verify hub/target subnet routes, DRG attachment tables, return routes, DNS and the selected firewall path. For Hub C, include appliance configuration, symmetric flow and any source translation.
3. From each supported operator OS, test the private database HTTPS URL, Linux SSH and Windows RDP. Validate any `ssh -L` use against the dynamic session in that environment before relying on it.
4. Confirm that an unapproved source, denied destination and expired/deleted session fail. Stop the tunnel and verify local access ends.

## Operator access

Operators create temporary sessions and connect with their own SSH keys. Each application uses the local SOCKS5 proxy or a local forward as described below.

| Access scenario | Client configuration |
|---|---|
| Private Oracle Database Actions or APEX | Browser using the local SOCKS5 proxy and proxy-side DNS; open the original private HTTPS URL. |
| Private Linux VM | SSH client using the SOCKS5 proxy, with the VM's own username and key. |
| Private Windows VM | RDP client using a loopback local forward on the dynamic Bastion session. Validate this path before use. |
| Private OKE Kubernetes API | `kubectl` using the cluster's kubeconfig proxy setting; see [OKE access](#access-a-private-oke-api). |

### Session and workstation guides

- [Create and operate a dynamic session](./oci-bastion-dynamic-port-forwarding-session.md): prerequisites, Console and CLI session creation, lifetime, cleanup and troubleshooting.
- [macOS operator guide](./macos.md): workstation commands for database web access, Linux SSH and Windows RDP.
- [Windows operator guide](./windows.md): PowerShell, browser, SSH and RDP client configuration.

Use a short session lifetime, restrict the public client allowlist, and bind workstation listeners to loopback. Target credentials remain separate from the Bastion session key. Close the tunnel and delete the session when work ends.

### Access a private OKE API

1. Follow [Oracle's local cluster access setup](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengdownloadkubeconfigfile.htm) to install compatible `kubectl` and configure your own OKE kubeconfig. Select `--kube-endpoint PRIVATE_ENDPOINT` when generating it. Keep the generated server address, CA data and OCI authentication settings.
2. Start the Bastion SOCKS5 tunnel on `127.0.0.1:1080` using the [macOS](./macos.md#2-start-the-socks5-tunnel) or [Windows](./windows.md#2-start-the-socks5-tunnel) instructions and keep it running.
3. In the existing OKE `clusters[].cluster` entry in your kubeconfig, add this field alongside `server`:

   ```yaml
   proxy-url: socks5://127.0.0.1:1080
   ```

From another terminal, use your OKE context and an authorized namespace:

```sh
kubectl --context your-oke-context get pods --namespace your-namespace
```

OCI authentication and Kubernetes permissions still apply. Remove `proxy-url` from that cluster entry when returning to direct access. See the [Kubernetes SOCKS5 guide](https://kubernetes.io/docs/tasks/extend-kubernetes/socks5-proxy-access-api/) for proxy configuration details.

### How SOCKS5 works

The SSH client listens on a local address such as `127.0.0.1:1080`. A SOCKS5-aware application supplies its destination hostname and TCP port to that listener. SSH carries the connection to OCI Bastion, which connects to the private destination through the configured network path.

```text
Browser or SSH client -> 127.0.0.1:1080 -> SSH -> OCI Bastion -> private target
```

SOCKS5 identifies the destination; SSH encrypts the workstation-to-Bastion connection. HTTPS or the target SSH connection still protects the application connection and authenticates the target. Only applications configured to use the proxy send traffic through it. This tunnel does not provide a workstation VPN or UDP forwarding. The local port is a proxy port, so a normal SSH, database, or RDP client cannot connect directly to it without SOCKS support.

Private hostnames must resolve from the Bastion path. Configure applications to pass hostnames through SOCKS5 so they use private DNS there. Keep database and application URLs unchanged to preserve TLS certificate checks and redirects. See the [OpenSSH manual](https://man.openbsd.org/ssh.1) and [proxy DNS behavior](https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md).

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
