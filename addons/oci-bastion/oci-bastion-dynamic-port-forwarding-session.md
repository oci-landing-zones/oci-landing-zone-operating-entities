# OCI Bastion dynamic port forwarding sessions

Complete the [Bastion setup](./README.md#setup) before creating a session. Use the [macOS](./macos.md) or [Windows](./windows.md) guide for workstation commands.

## Before connecting

You need the Bastion OCID, its region, an authorized OCI identity, a local SSH key pair and the actual private target hostname/IP and port. Register the session key's public half with OCI; keep the private half on the workstation. The target VM's SSH key or Windows account and the database account are separate credentials.

Verify that the Bastion is active with FQDN/SOCKS5 enabled, your current public egress IP is allowlisted, and the target permits traffic from the Bastion path. Private hostnames must resolve there. Dynamic sessions do not require the Oracle Cloud Agent Bastion plugin on the target. A Linux target still needs an SSH server for SSH access, and a Windows target needs an enabled RDP service for RDP access.

## Create a session in the Console

1. In the intended region and compartment, open **Identity & Security > Bastion** and select the deployed Bastion.
2. Select **Sessions > Create session**, then **Dynamic port forwarding (SOCKS5) session**.
3. Enter a session name and upload or paste your OpenSSH public key. Do not upload the private key.
4. Set a lifetime between 30 minutes and the Bastion maximum, up to 3 hours. Create the session and wait until it is **Active**.
5. Select **Copy SSH command** from that session's actions. Retain the exact session OCID and Bastion host from the command; follow the OS guide to bind the listener to `127.0.0.1`.

The username in that command is the session identifier, not the target VM's operating-system user. Keep the tunnel terminal open while using the session. See Oracle's [creation](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-session-dynamic-port-forwarding.htm) and [connection](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/connect-dynamic-port-forwarding.htm) guides.

## Create a session with OCI CLI

The OS guides use the documented generic command `oci bastion session create`, with this target-details JSON:

```json
{"sessionType":"DYNAMIC_PORT_FORWARDING"}
```

They pass the JSON through a local file so native-shell quote handling does not change it. Supply the session public key using `--ssh-public-key-file`, a supported session TTL, and your configured CLI profile and region. Wait for creation to succeed, then get the session's details or copy its SSH command in the Console. Do not supply a fixed target resource for this session type. See the [CLI command reference](https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/bastion/session/create.html).

## Application access

For a private Oracle database web interface, copy the **private access URL** for Database Actions or APEX from the database's tools page. In the dedicated Firefox profile configured by the OS guide, open that original HTTPS URL and authenticate as an enabled database user. The target rule must allow TCP 443. The browser sends the hostname through SOCKS5; the Bastion path must resolve it. Keep TLS certificate validation enabled. See [Database Actions](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/connect-database-actions.html) and [private endpoint network requirements](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html).

For a Linux VM, configure the SSH client to use the SOCKS5 listener and connect to the VM's private name/IP using the VM account and key. Verify the VM host-key fingerprint through an approved source before trusting it.

For Windows RDP, the OS guides add `-L 127.0.0.1:13389:<windows-private-ip>:3389` to the SSH connection authenticated to the dynamic session. The RDP client connects to `127.0.0.1:13389`. This is a client-side local listener on an OCI **dynamic** session; it does not create another OCI session type. OpenSSH documents local forwarding, but Oracle does not explicitly document this combination. Validate it with the intended Bastion, network and client before use. Verify the remote Windows identity/certificate and use the VM account; do not disable NLA or certificate checks to make a tunnel work.

## Lifetime and cleanup

The session expires at its configured TTL. SSH keepalives can prevent idle disconnects; they do not extend that TTL. Create a new dynamic session, copy its new SSH target and restart the tunnel after expiry. Changes to the Bastion client allowlist require a new session to take effect. See [Oracle troubleshooting](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/troubleshooting_connect_session_failed.htm).

When finished, close the target clients, stop the tunnel with **Ctrl+C**, restore Firefox's previous proxy setting or close its dedicated profile, and delete the Bastion session in the Console. CLI users can delete it with the command in their OS guide. Session deletion does not delete the persistent Bastion. Protect and rotate keys according to your organization's policy; do not commit keys, credentials or session details to a source repository.

## Troubleshooting

| Symptom | Check |
|---|---|
| Session creation is unauthorized | Selected region/compartment, existing group membership, shared-security session permissions and supporting metadata reads. Regional deployments need Home IAM first. |
| SSH authentication fails or connection closes | Session state/expiry, matching private key, copied session OCID/host, current public egress CIDR. Check host keys rather than disabling verification. |
| `Address already in use` | Choose another loopback listener port and update the client to match. |
| Listener opens but target access fails | Destination port, target service/host firewall, NSG/security list, actual Bastion source, DRG/return routes and inspection policy. `ExitOnForwardFailure` checks local listener setup, not destination reachability. |
| Private URL cannot resolve | SOCKS v5 and proxy DNS enabled, private DNS from Bastion, and no private target accidentally listed under Firefox **No Proxy For**. |
| Browser shows a certificate error or wrong redirect | Use the original private HTTPS URL and trusted certificate chain. Do not change the URL to `https://127.0.0.1:1080` or bypass TLS verification. |
| RDP fails | Confirm the local `-L` port, Windows private IP/3389, RDP service, Windows account/NLA and the environment's dynamic-session forwarding validation. |
| Access stops after inactivity or expiry | Keep the tunnel open; check session TTL. For diagnostics use SSH `-v`, as Oracle recommends, rather than `-vv` or `-vvv`. |

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
