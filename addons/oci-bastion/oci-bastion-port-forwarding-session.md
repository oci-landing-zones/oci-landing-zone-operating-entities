# OCI Bastion SSH Port Forwarding Session

Use an OCI Bastion SSH port forwarding session when the operator needs one local tunnel to one private target IP or FQDN and one TCP port.

This is the simplest service-based pattern for private VM SSH, Windows RDP, Autonomous Database private endpoints, MySQL, and a single internal HTTPS application.

## 1. When To Use

Use port forwarding when:

- the target is one known endpoint and one port;
- the target does not need to run OpenSSH or Oracle Cloud Agent;
- the customer wants a temporary OCI-managed access tunnel;
- SQL Developer, RDP, SSH, browser, or another client can connect to `localhost` and the chosen local port.

Do not use this as the default one-hub-to-all-spokes service pattern. A validated test found fixed port forwarding rejected a spoke VM target when the Bastion was associated with the hub VCN. For cross-spoke access from one hub Bastion service, use [dynamic port forwarding](./oci-bastion-dynamic-port-forwarding-session.md) and validate the customer topology.

## 2. Benefits And Downsides

| Benefits | Downsides |
|---|---|
| No customer-managed jump host OS. | One session maps to one target endpoint and one target port. |
| Target does not need OpenSSH or Cloud Agent. | Not convenient for many endpoints. |
| Works well for private databases and RDP. | For strict OCI-documented behavior, keep the Bastion in the target VCN. |
| Maps cleanly to OpenSSH `-L` and PuTTY local tunnels. | Browser-based HTTPS apps can have hostname or certificate issues when accessed as localhost. |

## 3. Landing Zone Requirements

| Requirement | Details |
|---|---|
| Bastion placement | Same VCN as the target for conservative service behavior, or a customer-validated alternative. |
| Client CIDR allowlist | Only approved workstation/VPN egress CIDRs. |
| Target security rules | Allow the target port from the Bastion private endpoint IP or approved bastion subnet CIDR. |
| Routing | Bastion subnet must route to target subnet and target must have a return path. |
| DNS | Required when using FQDN targets or when TLS/application behavior depends on hostnames. |
| Host firewall | Target operating system must allow the destination port. |

## 4. Create A Port Forwarding Session

In the OCI Console:

1. Open the Bastion resource.
2. Select **Sessions**.
3. Create an **SSH port forwarding session**.
4. Enter the target private IP or select the target instance.
5. Enter the target port.
6. Add the operator public key.
7. Set a short session TTL.
8. Create the session.
9. Copy the generated SSH command.

OCI CLI shape:

```bash
oci bastion session create-port-forwarding \
  --bastion-id <bastion_ocid> \
  --target-private-ip <target_private_ip> \
  --target-port <target_port> \
  --key-details '{"publicKeyContent":"<public_key_content>"}' \
  --session-ttl-in-seconds 3600
```

Use the current OCI CLI command reference for exact parameter names supported by the installed CLI version.

## 5. Connect From Mac Or Linux

The Console returns an OpenSSH command. The pattern is:

```bash
ssh -i <private_key_path> \
  -N \
  -L 127.0.0.1:<local_port>:<target_private_ip_or_fqdn>:<target_port> \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

Keep the terminal open while the tunnel is used.

Example for SSH to a private VM:

```bash
ssh -i ~/.ssh/id_rsa \
  -N \
  -L 127.0.0.1:2222:<target_private_ip>:22 \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

Then open a second terminal:

```bash
ssh -i ~/.ssh/id_rsa -p 2222 opc@127.0.0.1
```

## 6. Connect From Windows OpenSSH

PowerShell example:

```powershell
ssh -i C:\Users\<user>\.ssh\<key_file> `
  -N `
  -L 127.0.0.1:<local_port>:<target_private_ip_or_fqdn>:<target_port> `
  -p 22 `
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

Keep the PowerShell window open while using the target client.

## 7. Connect From Windows PuTTY

1. Convert the private key to `.ppk` with PuTTYgen if needed.
2. Open PuTTY.
3. Set **Host Name** to:

```text
<bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

4. Set **Port** to `22`.
5. Under **Connection > SSH**, select **Don't start a shell or command at all** if available.
6. Under **Connection > SSH > Auth**, select the `.ppk` private key.
7. Under **Connection > SSH > Tunnels**, set:
   - **Source port**: `<local_port>`
   - **Destination**: `<target_private_ip_or_fqdn>:<target_port>`
   - **Local** selected
8. Select **Add**.
9. Select **Open** and keep the PuTTY session open.
10. Connect the application client to `127.0.0.1:<local_port>`.

For RDP, use target port `3389`, then open the RDP client to `127.0.0.1:<local_port>`.

## 8. Private UI Or OIC Internal Endpoint

For one HTTPS endpoint:

```bash
ssh -i <private_key_path> \
  -N \
  -L 127.0.0.1:8443:<private_ui_or_oic_fqdn>:443 \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

Then browse to:

```text
https://127.0.0.1:8443
```

If the application requires its original FQDN for TLS certificates, cookies, redirects, or OAuth callbacks, prefer [dynamic port forwarding](./oci-bastion-dynamic-port-forwarding-session.md) with a browser SOCKS5 proxy. If local forwarding is still used, map the application hostname to `127.0.0.1` in the local hosts file and bind the matching local port, often `443`, according to customer workstation policy.

## 9. SQL Developer And Private Autonomous Database

For Autonomous Database private endpoint access:

1. Confirm the database private endpoint is reachable from the Bastion subnet.
2. Allow TCP `1521` from the Bastion private endpoint IP or bastion subnet CIDR to the database endpoint.
3. Create a port forwarding session to target port `1521`.
4. Open a local tunnel:

```bash
ssh -i <private_key_path> \
  -N \
  -L 127.0.0.1:1522:<adb_private_endpoint_fqdn_or_ip>:1521 \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

5. In SQL Developer, create a database connection using the customer-approved wallet and credentials.
6. Configure the connection to use `127.0.0.1` and local port `1522` when the selected connection type allows host and port override.

If the wallet/TLS flow requires the database private endpoint hostname, preserve that hostname with DNS or hosts-file handling rather than silently replacing it with `localhost`.

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Session creation rejects the target | Target is outside the Bastion VCN or the target identifier is invalid. Use per-VCN Bastion or dynamic forwarding. |
| Local port is already in use | Choose a different local port. |
| Browser opens but certificate or redirect fails | Application expects its original hostname. Use SOCKS5 or preserve hostname locally. |
| SQL Developer cannot connect | Check wallet settings, local port, target security rules, database endpoint DNS, and whether TLS hostname expectations are preserved. |
| Tunnel opens but target times out | Route table, firewall policy, security list/NSG, or host firewall is blocking the target port. |
| Tunnel stops working | Session TTL expired. Create a new session. |

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
