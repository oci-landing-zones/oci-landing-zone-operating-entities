# OCI Bastion Dynamic Port Forwarding Session

Use an OCI Bastion dynamic port forwarding session when one hub Bastion service should provide controlled operator access to multiple private endpoints or spokes.

Dynamic forwarding supports SOCKS5. It can also carry explicit local forwards with `ssh -L`, which is useful for clients that are not SOCKS-aware, such as a normal SSH client connecting to a private VM or SQL Developer connecting to a private database endpoint.

## 1. Why This Is The Preferred Service Pattern For Hub And Spoke

The desired Landing Zone pattern is often one Bastion in the hub that can reach private targets in multiple spokes. Static port forwarding and managed SSH are better suited to targets in the Bastion's VCN. Dynamic port forwarding is the service pattern validated for hub-to-spoke access when routing and security allow it.

A June 29, 2026 validation confirmed:

- hub Bastion in `eu-frankfurt-1`;
- hub and spoke connected through a DRG;
- hub route table pointed spoke CIDR to the DRG;
- spoke route table returned hub CIDR to the DRG;
- spoke target allowed TCP `22` from the hub bastion subnet;
- dynamic session worked from hub Bastion to a private spoke VM when the Bastion was created with DNS proxy/SOCKS5 enabled.

The same validation found:

- a Bastion created without DNS proxy/SOCKS5 accepted the SSH connection but rejected target channel opens;
- fixed port forwarding rejected the spoke target because it was outside the Bastion VCN.

Because OCI documentation states that a Bastion is associated with one VCN, customer designs should explicitly validate this pattern in their own topology and keep per-VCN Bastions or VM-based bastion as alternatives.

## 2. Benefits And Downsides

| Benefits | Downsides |
|---|---|
| One hub Bastion service can support many routed targets after validation. | Requires FQDN/SOCKS5 support on the Bastion. |
| Works well for private VMs, private UI apps, OIC internal endpoints, and private database endpoints. | Some applications are not SOCKS-aware and need local `-L` forwards over the dynamic session. |
| No customer-managed bastion host OS. | Target routes, firewalls, security rules, and DNS must all be correct. |
| Browser SOCKS5 preserves original application hostnames better than localhost HTTPS forwarding. | Session TTL requires operators to recreate sessions. |

## 3. Landing Zone Requirements

| Requirement | Details |
|---|---|
| Bastion placement | Hub security or management compartment, targeting a private hub management subnet. |
| FQDN/SOCKS5 | Enable when creating the Bastion. With OCI CLI, use `--dns-proxy-status ENABLED`. |
| Client allowlist | Bastion client CIDR allowlist contains only approved public workstation or VPN egress CIDRs. |
| Routing | Hub and spoke route tables, DRG route tables, and firewall routes provide a complete return path. |
| Target rules | Target subnet or NSG allows required ports from the Bastion private endpoint IP or hub bastion subnet CIDR. |
| DNS | Hub path resolves private endpoint FQDNs. Use the Private DNS add-on when central resolution is needed. |
| Host firewall | Target OS firewall allows the same ports as OCI security rules. |

## 4. Create The Bastion With FQDN/SOCKS5 Enabled

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

After creation, record the actual Bastion private endpoint IP and use it in target security rules when the customer requires `/32` source scoping.

## 5. Create A Dynamic Session

OCI CLI shape:

```bash
oci bastion session create-session-create-dynamic-port-forwarding-session-target-resource-details \
  --bastion-id <bastion_ocid> \
  --display-name <session_name> \
  --key-details '{"publicKeyContent":"<public_key_content>"}' \
  --session-ttl-in-seconds 3600
```

Some OCI CLI versions also expose the shorter alias `oci bastion session create-dynamic-port-forwarding`. Use the command form available in the customer's installed CLI version.

The Console can also create a **Dynamic port forwarding (SOCKS5) session** and provide the SSH command.

## 6. Pattern A: SOCKS5 Browser Access For Private UI Or OIC

Use this when the browser must keep the original endpoint FQDN, such as OIC internal endpoints, internal HTTPS applications, OAuth redirects, or certificates tied to the service hostname.

Mac, Linux, or Windows OpenSSH:

```bash
ssh -i <private_key_path> \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -N \
  -D 127.0.0.1:1080 \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

Configure the browser:

```text
SOCKS host: 127.0.0.1
SOCKS port: 1080
Proxy DNS through SOCKS: enabled when available
```

Then browse to the private endpoint FQDN, for example:

```text
https://<private_oic_endpoint_fqdn>
```

If the browser cannot proxy DNS through SOCKS, configure private DNS or a hosts-file entry so the FQDN resolves to the private endpoint IP through the customer-approved path.

## 7. Pattern B: Local Forward Over Dynamic Session

Use this when the target client is not SOCKS-aware or when connecting to one known private endpoint.

Validated SSH-to-private-VM shape:

```bash
ssh -i <private_key_path> \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -N \
  -L 127.0.0.1:2227:<target_private_ip>:22 \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

Then connect to the private VM through the local port:

```bash
ssh -i <target_private_key_path> -p 2227 <target_user>@127.0.0.1
```

Private HTTPS endpoint:

```bash
ssh -i <private_key_path> \
  -o ExitOnForwardFailure=yes \
  -N \
  -L 127.0.0.1:8443:<private_app_fqdn_or_ip>:443 \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

Then browse to `https://127.0.0.1:8443`, or preserve the application hostname when TLS or redirects require it.

## 8. Windows PuTTY

### SOCKS5 dynamic tunnel

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
   - **Source port**: `1080`
   - **Dynamic** selected
   - **Auto** selected
8. Select **Add**.
9. Select **Open** and keep the PuTTY session open.
10. Configure the browser to use SOCKS5 `127.0.0.1:1080`.

### Local forward over dynamic session

Use PuTTY **Tunnels** with **Local** selected:

```text
Source port: 2227
Destination: <target_private_ip>:22
```

Open the PuTTY session, then use an SSH client to connect to `127.0.0.1:2227`.

## 9. SQL Developer And Private ATP

For a database client that does not use SOCKS5 directly, use local forwarding over the dynamic session:

```bash
ssh -i <private_key_path> \
  -o ExitOnForwardFailure=yes \
  -N \
  -L 127.0.0.1:1522:<adb_private_endpoint_fqdn_or_ip>:1521 \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

Then configure SQL Developer with the database wallet and customer-approved credentials. Use `127.0.0.1` and port `1522` when the connection type supports host and port override.

If the wallet/TLS flow requires the database endpoint hostname, preserve that hostname through DNS, hosts-file mapping, or a SOCKS-aware JDBC/client configuration. Do not silently replace the endpoint hostname with localhost if that breaks certificate validation.

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `channel open failed: administratively prohibited` | Bastion was not created with FQDN/SOCKS5 enabled, the session type is wrong, or Bastion policy blocks dynamic target opens. Recreate the Bastion with `--dns-proxy-status ENABLED` and recreate the dynamic session. |
| Fixed port forwarding cannot target a spoke | Static port forwarding is VCN-bound in practice and should use a per-VCN Bastion or dynamic pattern. |
| SSH tunnel opens but target times out | Hub/spoke route, DRG route import, firewall policy, security list/NSG, or host firewall is blocking traffic. |
| Browser cannot open private FQDN | Browser DNS is not going through SOCKS, private DNS is missing, or the target endpoint is not reachable from the Bastion path. |
| SQL Developer cannot connect | Check wallet/TLS hostname behavior, local port, target security rules, database endpoint DNS, and whether port `1521` is allowed. |
| Session expires | Create a new dynamic session and restart the local tunnel. |
| Package install on private VM fails during validation | The private VM may lack NAT, service gateway, mirror, or repository access. Bastion proves administrative connectivity, not package repository access. |

## 11. Validation Commands

Before giving the customer the access pattern, validate each layer:

```bash
# Keep the tunnel open in terminal 1.
ssh -i <private_key_path> \
  -o ExitOnForwardFailure=yes \
  -N \
  -L 127.0.0.1:2227:<target_private_ip>:22 \
  -p 22 \
  <bastion_session_ocid>@host.bastion.<region>.oci.oraclecloud.com
```

```bash
# Validate from terminal 2.
ssh -i <target_private_key_path> \
  -o BatchMode=yes \
  -o ConnectTimeout=30 \
  -p 2227 \
  <target_user>@127.0.0.1 \
  'hostname; hostname -I; uptime'
```

For HTTP validation:

```bash
curl -v --max-time 10 http://127.0.0.1:<local_port>/
```

If HTTP fails but SSH works, check the target service listener, OCI security rules, and the target host firewall.

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
