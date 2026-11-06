# OCI Bastion access
## An OCI Open LZ add-on for private resource access

## Overview

Use **OCI Bastion dynamic port forwarding (SOCKS5) sessions** to reach private database web interfaces and virtual machines from an operator workstation. The [Blueprint Factory](../oci-lz-blueprint-factory/README.md) and [Landing Zone Studio](../oci-landingzone-studio/README.md) can provision one OCI Bastion in the hub. Operators create temporary sessions and connect with their own SSH keys.

This documentation-only add-on explains the configuration and operator workflow. Deployment uses the existing Landing Zone security and network outputs; this directory has no separate Terraform stack.

| Access scenario | Client configuration |
|---|---|
| Private Oracle Database Actions or APEX | Browser using the local SOCKS5 proxy and proxy-side DNS; open the original private HTTPS URL. |
| Private Linux VM | SSH client using the SOCKS5 proxy, with the VM's own username and key. |
| Private Windows VM | RDP client using a loopback local forward on the dynamic Bastion session. Validate this path before use. |

## How SOCKS5 works

The SSH client listens on a local address such as `127.0.0.1:1080`. A SOCKS5-aware application supplies its destination hostname and TCP port to that listener. SSH carries the connection to OCI Bastion, which connects to the private destination through the configured network path.

```text
Browser or SSH client -> 127.0.0.1:1080 -> SSH -> OCI Bastion -> private target
```

SOCKS5 identifies the destination; SSH encrypts the workstation-to-Bastion connection. HTTPS or the target SSH connection still protects the application connection and authenticates the target. Only applications configured to use the proxy send traffic through it. This tunnel does not provide a workstation VPN or UDP forwarding. The local port is a proxy port, so a normal SSH, database, or RDP client cannot connect directly to it without SOCKS support.

Private hostnames must resolve from the Bastion path. Configure applications to pass hostnames through SOCKS5 so they use private DNS there. Keep database and application URLs unchanged to preserve TLS certificate checks and redirects. See the [OpenSSH manual](https://man.openbsd.org/ssh.1) and [proxy DNS behavior](https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md).

## Hub placement and service boundary

The integration selects one Bastion in the shared security compartment, attached to the hub management subnet, with FQDN/SOCKS5 support enabled. Review the routes, target rules, private DNS and inspection path for the selected Hub A, B, C or E.

> [!IMPORTANT]
> Oracle's [Bastion documentation](https://docs.oracle.com/en-us/iaas/Content/Bastion/Concepts/bastionoverview.htm) states that a Bastion is associated with a single VCN and cannot access targets in another VCN. Hub-to-spoke dynamic forwarding is an observed pattern beyond that documented boundary. Validate it in the intended topology and confirm its acceptability before relying on it. The examples here do not constitute a new live validation or a guarantee of cross-VCN support.

## Configuration and guides

1. [Configure the Landing Zone integration](./landing-zone-integration.md): enable Bastion, review IAM, deploy the generated files and prepare target access.
2. [Create and operate a dynamic session](./oci-bastion-dynamic-port-forwarding-session.md): prerequisites, session lifecycle and troubleshooting.
3. Follow the [macOS guide](./macos.md) or [Windows guide](./windows.md) for database web access, Linux SSH and Windows RDP.

Use a short session lifetime, restrict the public client allowlist, and bind workstation listeners to loopback. Target credentials remain separate from the Bastion session key. Close the tunnel and delete the session when work ends.

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
